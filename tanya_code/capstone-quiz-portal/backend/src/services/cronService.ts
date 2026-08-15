import cron from 'node-cron';
import prisma from '../config/db';
import { submitQuizAttempt } from './quizService';

export const initCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('[Cron] Checking for expired quiz attempts...');

    try {
      const now = new Date();

      // Find all in-progress attempts
      const activeAttempts = await prisma.quizAttempt.findMany({
        where: {
          status: 'IN_PROGRESS'
        },
        include: {
          quiz: true
        }
      });

      for (const attempt of activeAttempts) {
        const startedAtTime = new Date(attempt.startedAt).getTime();
        // duration is in seconds
        const quizDurationMs = attempt.quiz.duration * 1000;
        const bufferMs = 15 * 1000; // 15 seconds grace period
        const expiryTime = startedAtTime + quizDurationMs + bufferMs;

        if (now.getTime() > expiryTime) {
          console.log(`[Cron] Auto-submitting expired quiz attempt: ${attempt.id} for user: ${attempt.userId}`);
          try {
            await submitQuizAttempt(attempt.id);
            console.log(`[Cron] Successfully submitted attempt: ${attempt.id}`);
          } catch (err) {
            console.error(`[Cron] Error auto-submitting attempt ${attempt.id}:`, err);
          }
        }
      }
    } catch (error) {
      console.error('[Cron] Error checking for expired quiz attempts:', error);
    }
  });

  console.log('[Cron] Cron jobs initialized successfully');
};
