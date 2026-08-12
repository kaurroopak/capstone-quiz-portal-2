import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentChapters } from './pages/student/Chapters';
import { TakeQuiz } from './pages/student/TakeQuiz';
import { QuizResults } from './pages/student/QuizResults';
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { ChapterManagement } from './pages/teacher/ChapterManagement';
import { QuizManagement } from './pages/teacher/QuizManagement';
import { Analytics } from './pages/teacher/Analytics';
import { Profile } from './pages/Profile';
import { StudyConcept } from './pages/student/StudyConcept';
import { AiTutor } from './pages/student/AiTutor';
import { StudyList } from './pages/student/StudyList';
import { KnowledgeGraph } from './pages/teacher/KnowledgeGraph';

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Only render Sidebar for authenticated users, hiding it on login */}
        {isAuthenticated && <Sidebar />}

        <div className={isAuthenticated ? 'main-content' : 'full-width-content'} style={{ width: isAuthenticated ? 'calc(100% - 250px)' : '100%', minHeight: '100vh' }}>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={!isAuthenticated ? <Login /> : (user?.role === 'TEACHER' ? <Navigate to="/teacher/dashboard" /> : <Navigate to="/student/dashboard" />)} />

            {/* Student Protected Routes */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute allowedRole="STUDENT">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/chapters" element={
              <ProtectedRoute allowedRole="STUDENT">
                <StudentChapters />
              </ProtectedRoute>
            } />
            <Route path="/student/quiz/:id" element={
              <ProtectedRoute allowedRole="STUDENT">
                <TakeQuiz />
              </ProtectedRoute>
            } />
            <Route path="/student/results/:attemptId" element={
              <ProtectedRoute allowedRole="STUDENT">
                <QuizResults />
              </ProtectedRoute>
            } />
            <Route path="/student/study" element={
              <ProtectedRoute allowedRole="STUDENT">
                <StudyList />
              </ProtectedRoute>
            } />
            <Route path="/student/study/:topicId" element={
              <ProtectedRoute allowedRole="STUDENT">
                <StudyConcept />
              </ProtectedRoute>
            } />
            <Route path="/student/ai-tutor" element={
              <ProtectedRoute allowedRole="STUDENT">
                <AiTutor />
              </ProtectedRoute>
            } />
            <Route path="/student/knowledge-graph" element={
              <ProtectedRoute allowedRole="STUDENT">
                <KnowledgeGraph />
              </ProtectedRoute>
            } />

            {/* Teacher Protected Routes */}
            <Route path="/teacher/dashboard" element={
              <ProtectedRoute allowedRole="TEACHER">
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/chapters" element={
              <ProtectedRoute allowedRole="TEACHER">
                <ChapterManagement />
              </ProtectedRoute>
            } />
            <Route path="/teacher/quizzes" element={
              <ProtectedRoute allowedRole="TEACHER">
                <QuizManagement />
              </ProtectedRoute>
            } />
            <Route path="/teacher/analytics/student/:studentId" element={
              <ProtectedRoute allowedRole="TEACHER">
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/teacher/analytics/quiz/:quizId" element={
              <ProtectedRoute allowedRole="TEACHER">
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/teacher/knowledge-graph" element={
              <ProtectedRoute allowedRole="TEACHER">
                <KnowledgeGraph />
              </ProtectedRoute>
            } />

            {/* Shared Profile Route */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />

            {/* Default Catch-All Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
