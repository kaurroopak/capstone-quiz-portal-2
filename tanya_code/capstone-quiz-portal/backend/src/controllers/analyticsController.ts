import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';

// Student Dashboard: Progress stats and charts
export const getStudentDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch all completed quiz attempts for the student
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      include: {
        quiz: {
          include: {
            topic: {
              include: { chapter: true }
            },
            _count: {
              select: { questions: true }
            }
          }
        }
      },
      orderBy: { startedAt: 'asc' }
    });

    const totalAttempts = attempts.length;

    // Calculate average score and total time spent
    let totalScorePercent = 0;
    let totalTimeSpent = 0;

    attempts.forEach((att) => {
      const questionsCount = att.quiz._count?.questions || 1;
      const scoreRaw = att.score || 0;
      const percentage = (scoreRaw / questionsCount) * 100;
      totalScorePercent += percentage;
      totalTimeSpent += att.timeSpent || 0;
    });

    const averageAccuracy = totalAttempts > 0 ? Math.round(totalScorePercent / totalAttempts) : 0;

    // Calculate Streak
    // Group attempts by date (local date YYYY-MM-DD string)
    const dates = new Set<string>();
    attempts.forEach((att) => {
      const dateStr = new Date(att.startedAt).toISOString().split('T')[0];
      dates.add(dateStr);
    });

    let currentStreak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Start checking from today or yesterday
    let checkDate = new Date();
    let checkDateStr = checkDate.toISOString().split('T')[0];

    if (!dates.has(checkDateStr)) {
      // If no attempt today, check if there was one yesterday to maintain the streak
      if (dates.has(yesterdayStr)) {
        checkDate = yesterday;
        checkDateStr = yesterdayStr;
      }
    }

    // Run backward counting consecutive days
    while (dates.has(checkDateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      checkDateStr = checkDate.toISOString().split('T')[0];
    }

    // Strong vs Weak topics calculation
    // Group score percentages by topic
    const topicPerformance: { [topicId: string]: { name: string; chapterName: string; scores: number[] } } = {};

    attempts.forEach((att) => {
      const topicId = att.quiz.topicId;
      const topicName = att.quiz.topic.name;
      const chapterName = att.quiz.topic.chapter.name;
      const questionsCount = att.quiz._count?.questions || 1;
      const scoreRaw = att.score || 0;
      const percentage = (scoreRaw / questionsCount) * 100;

      if (!topicPerformance[topicId]) {
        topicPerformance[topicId] = { name: topicName, chapterName, scores: [] };
      }
      topicPerformance[topicId].scores.push(percentage);
    });

    const strongTopics: any[] = [];
    const weakTopics: any[] = [];
    const improvingTopics: any[] = [];

    Object.keys(topicPerformance).forEach((topicId) => {
      const data = topicPerformance[topicId];
      const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;

      const info = {
        topicId,
        topicName: data.name,
        chapterName: data.chapterName,
        averageScore: Math.round(avg),
        attemptsCount: data.scores.length
      };

      if (avg >= 75) {
        strongTopics.push(info);
      } else if (avg < 40) {
        weakTopics.push(info);
      } else {
        improvingTopics.push(info);
      }
    });

    // Progress-over-time (graph representation)
    const progressChart = attempts.slice(-10).map((att) => {
      const questionsCount = att.quiz._count?.questions || 1;
      const percentage = Math.round(((att.score || 0) / questionsCount) * 100);
      return {
        quizTitle: att.quiz.title,
        scorePercent: percentage,
        date: new Date(att.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      };
    });

    // Recent activity list
    const recentActivity = attempts.slice(-5).reverse().map((att) => {
      const questionsCount = att.quiz._count?.questions || 1;
      return {
        attemptId: att.id,
        quizId: att.quiz.id,
        quizTitle: att.quiz.title,
        topicName: att.quiz.topic.name,
        score: att.score,
        totalQuestions: questionsCount,
        percentage: Math.round(((att.score || 0) / questionsCount) * 100),
        timeSpent: att.timeSpent,
        date: att.startedAt
      };
    });

    return res.json({
      summary: {
        totalAttempts,
        averageAccuracy,
        totalTimeSpent, // in seconds
        currentStreak
      },
      strongTopics,
      weakTopics,
      improvingTopics,
      progressChart,
      recentActivity
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    return res.status(500).json({ error: 'Failed to retrieve student dashboard stats.' });
  }
};

// Teacher Dashboard: Overview stats
export const getTeacherDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Fetch count of students
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT' }
    });

    // 2. Fetch count of attempts completed this week (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const quizzesTakenThisWeek = await prisma.quizAttempt.count({
      where: {
        status: 'COMPLETED',
        submittedAt: { gte: oneWeekAgo }
      }
    });

    // 3. Fetch all completed quiz attempts for grading calculations
    const completedAttempts = await prisma.quizAttempt.findMany({
      where: { status: 'COMPLETED' },
      include: {
        quiz: {
          include: {
            questions: true
          }
        },
        user: true
      }
    });

    // 4. Calculate class accuracy average
    let totalScorePercent = 0;
    completedAttempts.forEach((att) => {
      const questionsCount = att.quiz.questions?.length || 1;
      const pct = ((att.score || 0) / questionsCount) * 100;
      totalScorePercent += pct;
    });
    const classAverageMastery = completedAttempts.length > 0
      ? Math.round(totalScorePercent / completedAttempts.length)
      : 0;

    // 5. Group attempts per student to identify at-risk learners
    const studentStats: { [userId: string]: { username: string; email: string; totalScore: number; attemptsCount: number } } = {};

    completedAttempts.forEach((att) => {
      const userId = att.userId;
      const questionsCount = att.quiz.questions?.length || 1;
      const pct = ((att.score || 0) / questionsCount) * 100;

      if (!studentStats[userId]) {
        studentStats[userId] = {
          username: att.user.username,
          email: att.user.email,
          totalScore: 0,
          attemptsCount: 0
        };
      }

      studentStats[userId].totalScore += pct;
      studentStats[userId].attemptsCount++;
    });

    const atRiskStudents: any[] = [];
    Object.keys(studentStats).forEach((userId) => {
      const data = studentStats[userId];
      const avgScore = Math.round(data.totalScore / data.attemptsCount);

      if (avgScore < 50) {
        atRiskStudents.push({
          id: userId,
          username: data.username,
          email: data.email,
          averageAccuracy: avgScore,
          totalAttempts: data.attemptsCount
        });
      }
    });

    // Sort at-risk students by lowest average accuracy
    atRiskStudents.sort((a, b) => a.averageAccuracy - b.averageAccuracy);

    // 6. Fetch quizzes list with topics and attempt counts
    const quizzesList = await prisma.quiz.findMany({
      include: {
        topic: true,
        attempts: {
          where: { status: 'COMPLETED' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const quizzesOverview = quizzesList.map((q) => ({
      id: q.id,
      title: q.title,
      topicName: q.topic.name,
      difficulty: q.difficulty,
      isActive: q.isActive,
      attemptsCount: q.attempts.length
    }));

    return res.json({
      stats: {
        totalStudents,
        classAverageMastery,
        atRiskCount: atRiskStudents.length,
        quizzesTakenThisWeek
      },
      atRiskStudents,
      quizzes: quizzesOverview
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    return res.status(500).json({ error: 'Failed to retrieve teacher dashboard stats.' });
  }
};

// Teacher: Get specific student report
export const getStudentDetailReport = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.user.findUnique({
      where: { id: studentId, role: 'STUDENT' },
      select: { id: true, username: true, email: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId: studentId,
        status: 'COMPLETED'
      },
      include: {
        quiz: {
          include: {
            topic: {
              include: { chapter: true }
            },
            questions: true
          }
        },
        responses: {
          include: {
            question: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Format attempts report
    const formattedAttempts = attempts.map((att) => {
      const qCount = att.quiz.questions.length;
      const pct = Math.round(((att.score || 0) / qCount) * 100);

      // Question responses detail
      const questionDetails = att.responses.map((resp) => {
        const isCorrect = resp.selectedAnswer === resp.question.correctAnswer;
        return {
          questionId: resp.questionId,
          questionText: resp.question.text,
          selectedAnswer: resp.selectedAnswer,
          correctAnswer: resp.question.correctAnswer,
          isCorrect,
          timeSpent: resp.timeSpent,
          answerChanges: resp.answerChanges
        };
      });

      return {
        attemptId: att.id,
        quizTitle: att.quiz.title,
        topicName: att.quiz.topic.name,
        chapterName: att.quiz.topic.chapter.name,
        score: att.score,
        totalQuestions: qCount,
        percentage: pct,
        timeSpent: att.timeSpent,
        submittedAt: att.submittedAt,
        questions: questionDetails
      };
    });

    return res.json({
      student,
      attempts: formattedAttempts
    });
  } catch (error) {
    console.error('Student detail report error:', error);
    return res.status(500).json({ error: 'Failed to retrieve detailed student report.' });
  }
};

// Teacher: Get specific quiz report
export const getQuizDetailReport = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        topic: { include: { chapter: true } },
        questions: true
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        status: 'COMPLETED'
      },
      include: {
        user: true,
        responses: true
      }
    });

    const totalAttempts = attempts.length;
    let totalScore = 0;
    let totalTime = 0;

    attempts.forEach((att) => {
      totalScore += att.score || 0;
      totalTime += att.timeSpent || 0;
    });

    const avgScore = totalAttempts > 0 ? parseFloat((totalScore / totalAttempts).toFixed(2)) : 0;
    const avgTimeSpent = totalAttempts > 0 ? Math.round(totalTime / totalAttempts) : 0;

    // Compile Question Performance Stats
    const questionsPerformance = quiz.questions.map((question) => {
      // Find all responses for this question across attempts
      let correctCount = 0;
      let totalTimeSpentOnQuestion = 0;
      let totalChangesOnQuestion = 0;
      let attemptsOnQuestion = 0;

      attempts.forEach((att) => {
        const resp = att.responses.find((r) => r.questionId === question.id);
        if (resp) {
          attemptsOnQuestion++;
          totalTimeSpentOnQuestion += resp.timeSpent;
          totalChangesOnQuestion += resp.answerChanges;
          if (resp.selectedAnswer === question.correctAnswer) {
            correctCount++;
          }
        }
      });

      const accuracy = attemptsOnQuestion > 0
        ? Math.round((correctCount / attemptsOnQuestion) * 100)
        : 0;

      const avgTime = attemptsOnQuestion > 0
        ? parseFloat((totalTimeSpentOnQuestion / attemptsOnQuestion).toFixed(1))
        : 0;

      const avgChanges = attemptsOnQuestion > 0
        ? parseFloat((totalChangesOnQuestion / attemptsOnQuestion).toFixed(1))
        : 0;

      return {
        questionId: question.id,
        questionText: question.text,
        correctAnswer: question.correctAnswer,
        attemptsCount: attemptsOnQuestion,
        correctCount,
        accuracyPercent: accuracy,
        averageTimeSpent: avgTime,
        averageAnswerChanges: avgChanges
      };
    });

    return res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        duration: quiz.duration,
        topicName: quiz.topic.name,
        chapterName: quiz.topic.chapter.name,
        questionsCount: quiz.questions.length
      },
      stats: {
        totalAttempts,
        averageScore: avgScore,
        averageTimeSpent: avgTimeSpent, // in seconds
        classAccuracyPercent: Math.round((avgScore / quiz.questions.length) * 100)
      },
      questions: questionsPerformance,
      attempts: attempts.map(att => ({
        attemptId: att.id,
        studentName: att.user.username,
        studentEmail: att.user.email,
        score: att.score,
        timeSpent: att.timeSpent,
        submittedAt: att.submittedAt
      }))
    });
  } catch (error) {
    console.error('Quiz detail report error:', error);
    return res.status(500).json({ error: 'Failed to retrieve detailed quiz report.' });
  }
};
