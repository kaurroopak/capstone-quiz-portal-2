import prisma from '../config/db';
import { getQuizProgress, deleteQuizProgress } from '../config/redis';
import { AdaptiveService } from './adaptiveService';

export const submitQuizAttempt = async (attemptId: string, clientAnswers?: any): Promise<any> => {
  // 1. Fetch the attempt along with quiz and questions
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: true
        }
      }
    }
  });

  if (!attempt) {
    throw new Error('Quiz attempt not found');
  }

  if (attempt.status === 'COMPLETED') {
    return attempt;
  }

  // 2. Fetch answers from Redis (auto-save state)
  const cachedProgress = await getQuizProgress(attemptId);
  const cachedAnswers = cachedProgress?.responses || {};

  // Merge client-submitted answers with cached answers (client overrides if available)
  const mergedAnswers = { ...cachedAnswers, ...(clientAnswers || {}) };

  // 3. Compute score and save responses
  let correctCount = 0;
  const questions = attempt.quiz.questions;
  const totalQuestions = questions.length;

  const responsePromises = questions.map(async (question) => {
    const answerData = mergedAnswers[question.id] || {};
    const selectedAnswer = (answerData.selectedAnswer || null) as string | null;
    const timeSpent = typeof answerData.timeSpent === 'number' ? answerData.timeSpent : 0;
    const answerChanges = typeof answerData.answerChanges === 'number' ? answerData.answerChanges : 0;

    const isCorrect = selectedAnswer === question.correctAnswer;
    if (isCorrect) {
      correctCount++;
    }

    // Save response to DB
    return prisma.questionResponse.upsert({
      where: {
        quizAttemptId_questionId: {
          quizAttemptId: attemptId,
          questionId: question.id
        }
      },
      update: {
        selectedAnswer,
        timeSpent,
        answerChanges
      },
      create: {
        quizAttemptId: attemptId,
        questionId: question.id,
        selectedAnswer,
        timeSpent,
        answerChanges
      }
    });
  });

  // Execute all upserts
  await Promise.all(responsePromises);

  // 4. Calculate total time spent
  const startedTime = new Date(attempt.startedAt).getTime();
  const submittedAt = new Date();
  const rawTimeSpentSec = Math.round((submittedAt.getTime() - startedTime) / 1000);
  // Cap time spent at quiz duration + 10s buffer max to prevent negative or overly inflated values
  const maxAllowedDuration = attempt.quiz.duration + 10;
  const timeSpent = Math.min(rawTimeSpentSec, maxAllowedDuration);

  // Score represents the percentage of correct answers (0-100) or raw score. Let's store raw score (number of correct answers)
  const score = correctCount;

  // 5. Update attempt in Database
  const updatedAttempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'COMPLETED',
      submittedAt,
      timeSpent,
      score
    },
    include: {
      responses: true
    }
  });

  // 6. Evaluate IRT Theta and BKT Mastery for Student
  // Capture theta BEFORE evaluation so we can show the delta to the student
  let thetaBefore = 0.0;
  let thetaAfter = 0.0;
  let masteryProbability = 0.5;
  let prerequisiteGaps: string[] = [];

  try {
    const userBefore = await prisma.user.findUnique({ where: { id: attempt.userId }, select: { theta: true } });
    thetaBefore = userBefore?.theta ?? 0.0;

    const topicId = attempt.quiz.topicId;
    const allAnswers = questions.map((question) => {
      const answerData = mergedAnswers[question.id] || {};
      const selectedAnswer = answerData.selectedAnswer || null;
      const isCorrect = selectedAnswer === question.correctAnswer;
      const timeSpentQ = typeof answerData.timeSpent === 'number' ? answerData.timeSpent : 0;
      const answerChangesQ = typeof answerData.answerChanges === 'number' ? answerData.answerChanges : 0;
      return { questionId: question.id, topicId, isCorrect, timeSpent: timeSpentQ, answerChanges: answerChangesQ };
    });

    // Use batch evaluate for a single, coherent theta update
    const evalResult = await AdaptiveService.evaluateQuiz({
      userId: attempt.userId,
      answers: allAnswers
    });

    thetaAfter = evalResult.newTheta;
    masteryProbability = evalResult.masteryProbability;
    prerequisiteGaps = evalResult.prerequisiteGaps;

    // Persist updated theta to user record
    await prisma.user.update({
      where: { id: attempt.userId },
      data: { theta: thetaAfter }
    });
  } catch (err) {
    console.warn('Adaptive evaluation failed silently:', err);
    thetaAfter = thetaBefore;
  }

  // 7. Clean up Redis cache
  await deleteQuizProgress(attemptId);

  return {
    ...updatedAttempt,
    adaptiveUpdate: {
      thetaBefore: parseFloat(thetaBefore.toFixed(3)),
      thetaAfter: parseFloat(thetaAfter.toFixed(3)),
      thetaDelta: parseFloat((thetaAfter - thetaBefore).toFixed(3)),
      masteryProbability: parseFloat(masteryProbability.toFixed(3)),
      prerequisiteGaps
    }
  };
};
