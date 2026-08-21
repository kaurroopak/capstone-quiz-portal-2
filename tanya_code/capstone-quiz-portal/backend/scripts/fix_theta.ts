import prisma from '../src/config/db';
import { AdaptiveService } from '../src/services/adaptiveService';

async function main() {
  console.log('Re-evaluating past quiz attempts to fix Theta...');

  const attempts = await prisma.quizAttempt.findMany({
    where: { status: 'COMPLETED' },
    include: {
      quiz: { include: { questions: true } },
      responses: true
    }
  });

  for (const attempt of attempts) {
    if (attempt.responses.length === 0) continue;

    console.log(`Re-evaluating attempt ${attempt.id} for user ${attempt.userId}`);

    const allAnswers = attempt.quiz.questions.map((q) => {
      const resp = attempt.responses.find(r => r.questionId === q.id);
      const isCorrect = resp?.selectedAnswer === q.correctAnswer;
      return {
        questionId: q.id,
        topicId: attempt.quiz.topicId,
        isCorrect: isCorrect,
        timeSpent: resp?.timeSpent || 0,
        answerChanges: resp?.answerChanges || 0
      };
    });

    try {
      const evalResult = await AdaptiveService.evaluateQuiz({
        userId: attempt.userId,
        answers: allAnswers
      });
      
      console.log(`New Theta: ${evalResult.newTheta}`);

      await prisma.user.update({
        where: { id: attempt.userId },
        data: { theta: evalResult.newTheta }
      });
    } catch (e) {
      console.error(`Failed to evaluate attempt ${attempt.id}:`, e);
    }
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
