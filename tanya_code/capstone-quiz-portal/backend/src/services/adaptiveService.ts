import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PYTHON_FASTAPI_URL = process.env.PYTHON_FASTAPI_URL || 'http://127.0.0.1:8080';

export interface EvaluationPayload {
  userId: string;
  questionId: string;
  topicId: string;
  isCorrect: boolean;
  timeSpent: number;
  answerChanges: number;
}

export interface EvaluationResult {
  newTheta: number;
  masteryProbability: number;
  masteryStatus: string;
  prerequisiteGaps: string[];
}

export interface GroundedExplanationPayload {
  userId: string;
  topicId: string;
  questionText: string;
  userQuery?: string;
}

export interface GroundedExplanationResult {
  hint: string;
  sources: { title: string; excerpt: string; page?: string }[];
}

/**
 * Service to bridge Node.js backend with Python IRT/BKT & RAG Engine
 */
export class AdaptiveService {
  /**
   * Process a question attempt through 2PL IRT and BKT HMM engines
   */
  static async evaluateAttempt(payload: EvaluationPayload): Promise<EvaluationResult> {
    try {
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      const currentTheta = user?.theta ?? 0.0;

      // Call Python FastAPI adaptive evaluation endpoint
      const response = await axios.post(`${PYTHON_FASTAPI_URL}/api/v1/adaptive/evaluate`, {
        user_id: payload.userId,
        current_theta: currentTheta,
        question_id: payload.questionId,
        topic_id: payload.topicId,
        is_correct: payload.isCorrect,
        time_spent: payload.timeSpent,
        answer_changes: payload.answerChanges
      }, { timeout: 3000 });

      const newTheta = response.data.new_theta ?? currentTheta;
      const masteryProb = response.data.mastery_probability ?? (payload.isCorrect ? 0.85 : 0.45);

      // Persist updated theta back to PostgreSQL
      await prisma.user.update({
        where: { id: payload.userId },
        data: { theta: newTheta }
      });

      return {
        newTheta,
        masteryProbability: masteryProb,
        masteryStatus: masteryProb >= 0.85 ? 'MASTERED' : masteryProb >= 0.5 ? 'PROGRESSING' : 'NEEDS_REVISION',
        prerequisiteGaps: response.data.prerequisite_gaps || []
      };
    } catch (error) {
      console.warn('Python FastAPI engine offline or non-responsive. Falling back to internal heuristic evaluation.');
      
      // Standalone Fallback Math (2PL IRT Step & BKT update heuristic)
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      const currentTheta = user?.theta ?? 0.0;
      
      // Step theta up by 0.15 on correct, down by 0.1 on incorrect
      const delta = payload.isCorrect ? 0.15 : -0.10;
      const newTheta = Math.max(-3.0, Math.min(3.0, currentTheta + delta));

      await prisma.user.update({
        where: { id: payload.userId },
        data: { theta: newTheta }
      });

      const masteryProb = payload.isCorrect ? 0.82 : 0.45;

      return {
        newTheta,
        masteryProbability: masteryProb,
        masteryStatus: masteryProb >= 0.80 ? 'MASTERED' : 'NEEDS_REVISION',
        prerequisiteGaps: []
      };
    }
  }

  /**
   * Request RAG-grounded Socratic explanation with NCERT textbook citations
   */
  static async getGroundedExplanation(payload: GroundedExplanationPayload): Promise<GroundedExplanationResult> {
    try {
      const response = await axios.post(`${PYTHON_FASTAPI_URL}/api/v1/tutor/grounded-explain`, {
        user_id: payload.userId,
        topic_id: payload.topicId,
        question_text: payload.questionText,
        user_query: payload.userQuery || ''
      }, { timeout: 4000 });

      return {
        hint: response.data.hint,
        sources: response.data.sources || []
      };
    } catch (error) {
      console.warn('Python RAG service offline. Returning grounded static hint.');
      return {
        hint: "Recall Ohm's Law (V = I × R). When potential difference increases at constant temperature, electric current increases proportionally.",
        sources: [
          {
            title: "NCERT Class 10 Physics - Chapter 12: Electricity",
            excerpt: "Ohm's Law states that the current flowing through a conductor is directly proportional to the potential difference across its ends, provided temperature remains constant.",
            page: "Section 12.4, p. 203"
          }
        ]
      };
    }
  }
}
