import { Response } from 'express';
import prisma from '../config/db';
import { AdaptiveService } from '../services/adaptiveService';
import { saveQuizProgress, getQuizProgress } from '../config/redis';
import { submitQuizAttempt } from '../services/quizService';
import { AuthRequest } from '../middleware/auth';
import path from 'path';

// Teacher: Create a Quiz
export const createQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, topicId, duration, isActive, shuffle, difficulty } = req.body;

    if (!title || !topicId || !duration || !difficulty) {
      return res.status(400).json({ error: 'Title, topicId, duration, and difficulty are required.' });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        topicId,
        duration: parseInt(duration), // in seconds
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        shuffle: shuffle !== undefined ? Boolean(shuffle) : false,
        difficulty: difficulty as string
      }
    });

    return res.status(201).json(quiz);
  } catch (error) {
    console.error('Create quiz error:', error);
    return res.status(500).json({ error: 'Failed to create quiz.' });
  }
};

// Teacher: Get all quizzes with stats
export const getQuizzes = async (req: AuthRequest, res: Response) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        topic: {
          include: { chapter: true }
        },
        _count: {
          select: { questions: true, attempts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(quizzes);
  } catch (error) {
    console.error('Get quizzes error:', error);
    return res.status(500).json({ error: 'Failed to fetch quizzes.' });
  }
};

// Student & Teacher: Get Quiz detail (strips answers if Student)
export const getQuizById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isTeacher = req.user?.role === 'TEACHER';

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: true,
        topic: {
          include: { chapter: true }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Security: If user is student, we strip the correct answers from questions list
    if (!isTeacher) {
      quiz.questions = quiz.questions.map((q) => {
        const { correctAnswer, ...rest } = q;
        return rest as any;
      });

      // Handle shuffling if requested
      if (quiz.shuffle) {
        quiz.questions.sort(() => Math.random() - 0.5);
      }
    }

    return res.json(quiz);
  } catch (error) {
    console.error('Get quiz by id error:', error);
    return res.status(500).json({ error: 'Failed to retrieve quiz details.' });
  }
};

// Teacher: Add manual question
export const addQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const { text, optionA, optionB, optionC, optionD, correctAnswer, difficulty } = req.body;

    if (!text || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !difficulty) {
      return res.status(400).json({ error: 'All question fields are required.' });
    }

    const question = await prisma.question.create({
      data: {
        quizId,
        text: text.trim(),
        optionA: optionA.trim(),
        optionB: optionB.trim(),
        optionC: optionC.trim(),
        optionD: optionD.trim(),
        correctAnswer: correctAnswer as string,
        difficulty: difficulty as string
      }
    });

    return res.status(201).json(question);
  } catch (error) {
    console.error('Add question error:', error);
    return res.status(500).json({ error: 'Failed to add question.' });
  }
};

// Teacher: Upload image for a question
export const uploadQuestionImage = async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const question = await prisma.question.update({
      where: { id: questionId },
      data: { imageUrl }
    });

    return res.json({ message: 'Image uploaded successfully', question });
  } catch (error) {
    console.error('Upload image error:', error);
    return res.status(500).json({ error: 'Failed to upload question image.' });
  }
};

// Teacher: Smart Image Uploader (Links image file with placeholder Excel references)
export const smartUploadImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const originalName = req.file.originalname; // e.g. "triangle.png"
    const relativeUrl = `/uploads/${req.file.filename}`;

    // Find and update all questions that have this originalName as their imageUrl placeholder
    const updateResult = await prisma.question.updateMany({
      where: {
        imageUrl: originalName
      },
      data: {
        imageUrl: relativeUrl
      }
    });

    return res.json({
      message: `Image processed. Linked to ${updateResult.count} Excel-imported placeholder question(s).`,
      imageUrl: relativeUrl,
      linkedCount: updateResult.count
    });
  } catch (error) {
    console.error('Smart upload error:', error);
    return res.status(500).json({ error: 'Failed to process smart image upload.' });
  }
};

// Student: Start quiz attempt
export const startQuizAttempt = async (req: AuthRequest, res: Response) => {
  try {
    // Accept quizId from route params (/quizzes/:quizId/start) OR body (/attempts/start)
    const quizId = req.params.quizId || req.body.quizId;
    const userId = req.user?.id;

    if (!userId || !quizId) {
      return res.status(400).json({ error: 'QuizId is required.' });
    }

    // Verify quiz exists and is active
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz || !quiz.isActive) {
      return res.status(400).json({ error: 'Quiz is not available or inactive.' });
    }

    // Check if there is an existing incomplete attempt. If so, return it so they can resume!
    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId,
        quizId,
        status: 'IN_PROGRESS'
      },
      include: {
        quiz: {
          include: {
            questions: true
          }
        }
      }
    });

    if (existingAttempt) {
      // Fetch progress from Redis to restore state
      const cachedProgress = await getQuizProgress(existingAttempt.id);

      // Security strip correct answers from questions
      existingAttempt.quiz.questions = existingAttempt.quiz.questions.map((q) => {
        const { correctAnswer, ...rest } = q;
        return rest as any;
      });

      return res.json({
        message: 'Resumed existing quiz attempt',
        attempt: existingAttempt,
        cachedProgress: cachedProgress || { responses: {} }
      });
    }

    // Create a new attempt
    const newAttempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        status: 'IN_PROGRESS'
      },
      include: {
        quiz: {
          include: {
            questions: true
          }
        }
      }
    });

    // Save empty cache state in Redis
    const initialProgress = { responses: {} };
    await saveQuizProgress(newAttempt.id, initialProgress);

    // Strip correct answers from response
    newAttempt.quiz.questions = newAttempt.quiz.questions.map((q) => {
      const { correctAnswer, ...rest } = q;
      return rest as any;
    });

    return res.status(201).json({
      message: 'New quiz attempt started',
      attempt: newAttempt,
      cachedProgress: initialProgress
    });
  } catch (error) {
    console.error('Start quiz error:', error);
    return res.status(500).json({ error: 'Failed to start quiz attempt.' });
  }
};

// Student: Auto-save quiz progress (called every 5 seconds)
export const autoSaveAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { responses } = req.body; // format: { [questionId]: { selectedAnswer, timeSpent, answerChanges } }

    if (!responses) {
      return res.status(400).json({ error: 'Progress data (responses) is required.' });
    }

    // Verify attempt belongs to user and is active
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt || attempt.userId !== req.user?.id || attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Invalid or closed quiz attempt.' });
    }

    // Save to Redis
    await saveQuizProgress(attemptId, { responses });

    return res.json({ message: 'Progress saved successfully.' });
  } catch (error) {
    console.error('Auto-save progress error:', error);
    return res.status(500).json({ error: 'Failed to auto-save quiz progress.' });
  }
};

// Student: Submit quiz attempt
export const submitQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { responses } = req.body; // Optional final selections

    // Verify attempt status
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt || attempt.userId !== req.user?.id) {
      return res.status(404).json({ error: 'Quiz attempt not found.' });
    }

    if (attempt.status === 'COMPLETED') {
      return res.status(400).json({ error: 'This quiz has already been submitted.' });
    }

    // Evaluate attempt
    const completedAttempt = await submitQuizAttempt(attemptId, responses);

    return res.json({
      message: 'Quiz submitted successfully',
      attempt: completedAttempt,
      adaptiveUpdate: (completedAttempt as any).adaptiveUpdate || null
    });
  } catch (error: any) {
    console.error('Submit quiz error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit quiz attempt.' });
  }
};

// Teacher: Toggle quiz active/inactive status
export const toggleQuizStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ error: 'isActive Boolean is required.' });
    }

    const quiz = await prisma.quiz.update({
      where: { id },
      data: { isActive: Boolean(isActive) }
    });

    return res.json({ message: `Quiz status updated to ${quiz.isActive ? 'Active' : 'Inactive'}`, quiz });
  } catch (error) {
    console.error('Toggle quiz status error:', error);
    return res.status(500).json({ error: 'Failed to toggle quiz status.' });
  }
};

// Student & Teacher: Get finished attempt results
export const getAttemptResults = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;
    const isTeacher = req.user?.role === 'TEACHER';

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: true,
            topic: { include: { chapter: true } }
          }
        },
        responses: {
          include: { question: true }
        }
      }
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Quiz attempt not found.' });
    }

    // Security: Student can only view their own attempts
    if (!isTeacher && attempt.userId !== userId) {
      return res.status(403).json({ error: 'Access denied. You cannot view this attempt.' });
    }

    return res.json(attempt);
  } catch (error) {
    console.error('Get attempt results error:', error);
    return res.status(500).json({ error: 'Failed to retrieve attempt results.' });
  }
};


export const getAttemptEvaluations = async (req: any, res: any) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;
    const isTeacher = req.user?.role === 'TEACHER';

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        user: true,
        quiz: true,
        responses: {
          include: { question: true }
        }
      }
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Quiz attempt not found.' });
    }

    if (!isTeacher && attempt.userId !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const topicPrereqs = await prisma.topicPrerequisite.findMany({
      where: { topicId: attempt.quiz.topicId },
      include: { prerequisite: true }
    });
    const prereqNames = topicPrereqs.map(p => p.prerequisite.name);

    const evaluations: Record<string, string> = {};
    const questionsCount = attempt.responses.length || 1;
    const scorePercent = Math.round(((attempt.score || 0) / questionsCount) * 100);
    const masteryProb = scorePercent / 100;

    for (const response of attempt.responses) {
      const evalText = await AdaptiveService.getDetailedEvaluation({
        userId: attempt.userId,
        questionText: response.question.text,
        selectedAnswer: response.selectedAnswer || 'None',
        correctAnswer: response.question.correctAnswer,
        isCorrect: response.selectedAnswer === response.question.correctAnswer,
        currentTheta: attempt.user.theta,
        masteryProbability: masteryProb,
        topicId: attempt.quiz.topicId,
        prerequisiteGaps: prereqNames
      });
      evaluations[response.questionId] = evalText;
    }

    return res.json({ evaluations });
  } catch (error) {
    console.error('Failed to get attempt evaluations:', error);
    return res.status(500).json({ error: 'Failed to retrieve evaluations.' });
  }
};
