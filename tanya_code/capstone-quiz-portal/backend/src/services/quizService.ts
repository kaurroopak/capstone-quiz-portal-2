import prisma from '../config/db';
import { getQuizProgress, deleteQuizProgress } from '../config/redis';
import { CorrectAnswer, AttemptStatus } from '@prisma/client';
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

  if (attempt.status === AttemptStatus.COMPLETED) {
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
    const selectedAnswer = (answerData.selectedAnswer || null) as CorrectAnswer | null;
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
      status: AttemptStatus.COMPLETED,
      submittedAt,
      timeSpent,
      score
    },
    include: {
      responses: true
    }
  });

  // 6. Evaluate IRT Theta and BKT Mastery for Student
  try {
    const topicId = attempt.quiz.topicId;
    for (const question of questions) {
      const answerData = mergedAnswers[question.id] || {};
      const selectedAnswer = answerData.selectedAnswer || null;
      const isCorrect = selectedAnswer === question.correctAnswer;
      const timeSpent = typeof answerData.timeSpent === 'number' ? answerData.timeSpent : 0;
      const answerChanges = typeof answerData.answerChanges === 'number' ? answerData.answerChanges : 0;

      await AdaptiveService.evaluateAttempt({
        userId: attempt.userId,
        questionId: question.id,
        topicId: topicId,
        isCorrect: isCorrect,
        timeSpent: timeSpent,
        answerChanges: answerChanges
      });
    }
  } catch (err) {
    console.warn('Adaptive evaluation failed silently:', err);
  }

  // 7. Clean up Redis cache
  await deleteQuizProgress(attemptId);

  return updatedAttempt;
};
