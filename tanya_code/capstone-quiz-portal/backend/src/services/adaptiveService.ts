import axios from 'axios';
import prisma from '../config/db';

const PYTHON_FASTAPI_URL = process.env.ML_ENGINE_URL || 'http://127.0.0.1:8080';

export interface EvaluationPayload {
  userId: string;
  questionId: string;
  topicId: string;
  isCorrect: boolean;
  timeSpent: number;
  answerChanges: number;
}

export interface QuizEvaluationPayload {
  userId: string;
  answers: {
    questionId: string;
    topicId: string;
    isCorrect: boolean;
    timeSpent: number;
    answerChanges: number;
  }[];
}

export interface DetailedEvaluationPayload {
  userId: string;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  currentTheta: number;
  masteryProbability: number;
  topicId?: string;
  prerequisiteGaps?: string[];
}

export interface EvaluationResult {
  newTheta: number;
  masteryProbability: number;
  masteryStatus: string;
  prerequisiteGaps: string[];
}

export class AdaptiveService {
  static async evaluateAttempt(payload: EvaluationPayload): Promise<EvaluationResult> {
    try {
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      const currentTheta = user?.theta ?? 0.0;

      const response = await axios.post(`${PYTHON_FASTAPI_URL}/api/v1/adaptive/evaluate`, {
        user_id: payload.userId,
        current_theta: currentTheta,
        question_id: payload.questionId,
        topic_id: payload.topicId,
        is_correct: payload.isCorrect,
        time_spent: payload.timeSpent,
        answer_changes: payload.answerChanges
      }, { timeout: 120000 });

      const newTheta = response.data.new_theta ?? currentTheta;
      const masteryProb = response.data.mastery_probability ?? (payload.isCorrect ? 0.85 : 0.45);

      return {
        newTheta,
        masteryProbability: masteryProb,
        masteryStatus: masteryProb >= 0.85 ? 'MASTERED' : masteryProb >= 0.5 ? 'PROGRESSING' : 'NEEDS_REVISION',
        prerequisiteGaps: response.data.prerequisite_gaps || []
      };
    } catch (err) {
      console.error('Python ML backend evaluation failed:', err);
      return {
        newTheta: payload.isCorrect ? 0.1 : -0.1,
        masteryProbability: payload.isCorrect ? 0.8 : 0.2,
        masteryStatus: 'PROGRESSING',
        prerequisiteGaps: []
      };
    }
  }

  static async evaluateQuiz(payload: QuizEvaluationPayload): Promise<EvaluationResult> {
    try {
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      const currentTheta = user?.theta ?? 0.0;

      const snakeCaseAnswers = payload.answers.map(ans => ({
        question_id: ans.questionId,
        topic_id: ans.topicId,
        is_correct: ans.isCorrect,
        time_spent: ans.timeSpent,
        answer_changes: ans.answerChanges
      }));

      const response = await axios.post(`${PYTHON_FASTAPI_URL}/api/v1/adaptive/evaluate`, {
        user_id: payload.userId,
        current_theta: currentTheta,
        answers: snakeCaseAnswers
      }, { timeout: 120000 });

      const newTheta = response.data.new_theta ?? currentTheta;
      const masteryProb = response.data.mastery_probability ?? 0.5;

      return {
        newTheta,
        masteryProbability: masteryProb,
        masteryStatus: masteryProb >= 0.85 ? 'MASTERED' : masteryProb >= 0.5 ? 'PROGRESSING' : 'NEEDS_REVISION',
        prerequisiteGaps: response.data.prerequisite_gaps || []
      };
    } catch (err) {
      console.error('Python ML backend quiz evaluation failed:', err);
      return {
        newTheta: 0.0,
        masteryProbability: 0.5,
        masteryStatus: 'PROGRESSING',
        prerequisiteGaps: []
      };
    }
  }

  static async getDetailedEvaluation(payload: DetailedEvaluationPayload): Promise<string> {
    try {
      const response = await axios.post(`${PYTHON_FASTAPI_URL}/api/v1/tutor/evaluate-answer`, {
        user_id: payload.userId,
        question_text: payload.questionText,
        selected_answer: payload.selectedAnswer,
        correct_answer: payload.correctAnswer,
        is_correct: payload.isCorrect,
        current_theta: payload.currentTheta,
        mastery_probability: payload.masteryProbability,
        topic_id: payload.topicId || "generic",
        prerequisite_gaps: payload.prerequisiteGaps || []
      }, { timeout: 120000 });

      return response.data.evaluation;
    } catch (err) {
      console.error('Python ML backend detailed evaluation failed:', err);
      return `You selected ${payload.selectedAnswer}, but the correct answer is ${payload.correctAnswer}. Keep reviewing!`;
    }
  }

  static async getGroundedExplanation(payload: any): Promise<any> {
    try {
      const response = await axios.post(`${PYTHON_FASTAPI_URL}/api/v1/tutor/hint`, {
        user_id: payload.userId,
        topic_id: payload.topicId,
        question_text: payload.questionText,
        user_query: payload.userQuery
      }, { timeout: 120000 });

      return {
        hint: response.data.hint || 'Here is a hint based on your query.',
        sources: response.data.sources || []
      };
    } catch (err) {
      console.error('Python ML backend hint generation failed:', err);
      return {
        hint: 'I am unable to connect to the knowledge base right now. Please try again later.',
        sources: []
      };
    }
  }
}
