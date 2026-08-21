import { Router } from 'express';
import { signup, login, updateProfile } from '../controllers/authController';
import { getChapters, createChapter, createTopic, importExcel } from '../controllers/chapterController';
import { getStudyContent, saveStudyContent, markTopicAsLearned } from '../controllers/studyController';
import { getChatHistory, askTutor } from '../controllers/aiController';
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  addQuestion,
  uploadQuestionImage,
  smartUploadImage,
  startQuizAttempt,
  autoSaveAttempt,
  submitQuiz,
  toggleQuizStatus,
  getAttemptResults,
  getAttemptEvaluations
} from '../controllers/quizController';
import {
  getStudentDashboard,
  getTeacherDashboard,
  getStudentDetailReport,
  getQuizDetailReport
} from '../controllers/analyticsController';
import { getKnowledgeGraph, getStudentKnowledgeGraph } from '../controllers/knowledgeGraphController';
import { authenticateJWT, requireTeacher, requireStudent } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// --- Public Auth Routes ---
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.put('/auth/profile', authenticateJWT, updateProfile);

// --- Protected Routes (Student & Teacher) ---
router.get('/chapters', authenticateJWT, getChapters);
router.get('/quizzes/:id', authenticateJWT, getQuizById);
router.get('/attempts/:attemptId/results', authenticateJWT, getAttemptResults);
router.get('/attempts/:attemptId/evaluations', authenticateJWT, getAttemptEvaluations);

// Study & AI Tutor routes
router.get('/study/:topicId', authenticateJWT, getStudyContent);
router.post('/study/:topicId', authenticateJWT, requireTeacher, saveStudyContent);
router.post('/study/:topicId/learn-viewed', authenticateJWT, requireStudent, markTopicAsLearned);

// AI routes - both /ai-tutor/chat (legacy) and /ai/ask (new JEE portal) paths supported
router.get('/ai-tutor/chat', authenticateJWT, getChatHistory);
router.post('/ai-tutor/chat', authenticateJWT, askTutor);
router.get('/ai/history', authenticateJWT, getChatHistory);
router.post('/ai/ask', authenticateJWT, askTutor);

// --- Teacher Only Routes ---
router.post('/chapters/manual', authenticateJWT, requireTeacher, createChapter);
router.post('/topics/manual', authenticateJWT, requireTeacher, createTopic);
router.post('/chapters/import', authenticateJWT, requireTeacher, upload.single('file'), importExcel);

router.get('/quizzes', authenticateJWT, requireTeacher, getQuizzes);
router.post('/quizzes/create', authenticateJWT, requireTeacher, createQuiz);
router.post('/quizzes/:quizId/questions', authenticateJWT, requireTeacher, addQuestion);
router.put('/quizzes/:id/toggle', authenticateJWT, requireTeacher, toggleQuizStatus);

router.post('/quizzes/questions/:questionId/image', authenticateJWT, requireTeacher, upload.single('image'), uploadQuestionImage);
router.post('/quizzes/questions/smart-upload', authenticateJWT, requireTeacher, upload.single('image'), smartUploadImage);

router.get('/analytics/teacher', authenticateJWT, requireTeacher, getTeacherDashboard);
router.get('/analytics/student/:studentId', authenticateJWT, requireTeacher, getStudentDetailReport);
router.get('/analytics/quiz/:quizId', authenticateJWT, requireTeacher, getQuizDetailReport);

// --- Student Only Routes ---
// /quizzes/:id/start (new JEE portal path) and /attempts/start (legacy) both work
router.post('/quizzes/:quizId/start', authenticateJWT, requireStudent, startQuizAttempt);
router.post('/attempts/start', authenticateJWT, requireStudent, startQuizAttempt);
router.post('/attempts/:attemptId/save', authenticateJWT, requireStudent, autoSaveAttempt);
router.post('/attempts/:attemptId/submit', authenticateJWT, requireStudent, submitQuiz);
router.get('/analytics/student', authenticateJWT, requireStudent, getStudentDashboard);

// Knowledge Graph (available to all authenticated users)
router.get('/knowledge-graph', authenticateJWT, getKnowledgeGraph);
router.get('/knowledge-graph/student/:studentId', authenticateJWT, getStudentKnowledgeGraph);
router.get('/knowledge-graph/me', authenticateJWT, requireStudent, async (req: any, res) => {
  req.params.studentId = req.user?.id;
  return getStudentKnowledgeGraph(req, res);
});

export default router;
