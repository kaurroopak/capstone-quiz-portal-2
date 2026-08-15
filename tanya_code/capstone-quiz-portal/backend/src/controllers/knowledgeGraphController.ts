import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';

async function getStudentTopicMastery(userId: string): Promise<Map<string, number>> {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, status: 'COMPLETED' },
    include: { quiz: { include: { questions: true } } }
  });
  const topicScores: Map<string, number[]> = new Map();
  attempts.forEach((att) => {
    const topicId = att.quiz.topicId;
    const qCount = att.quiz.questions.length || 1;
    const pct = ((att.score || 0) / qCount) * 100;
    if (!topicScores.has(topicId)) topicScores.set(topicId, []);
    topicScores.get(topicId)!.push(pct);
  });
  const mastery = new Map<string, number>();
  topicScores.forEach((scores, topicId) => {
    mastery.set(topicId, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
  });
  return mastery;
}

async function getClassTopicMastery(): Promise<Map<string, number>> {
  const attempts = await prisma.quizAttempt.findMany({
    where: { status: 'COMPLETED' },
    include: { quiz: { include: { questions: true } } }
  });
  const topicScores: Map<string, number[]> = new Map();
  attempts.forEach((att) => {
    const topicId = att.quiz.topicId;
    const qCount = att.quiz.questions.length || 1;
    const pct = ((att.score || 0) / qCount) * 100;
    if (!topicScores.has(topicId)) topicScores.set(topicId, []);
    topicScores.get(topicId)!.push(pct);
  });
  const mastery = new Map<string, number>();
  topicScores.forEach((scores, topicId) => {
    mastery.set(topicId, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
  });
  return mastery;
}

function getMasteryStatus(mastery: number | null): 'mastered' | 'learning' | 'weak' | 'unknown' {
  if (mastery === null) return 'unknown';
  if (mastery >= 75) return 'mastered';
  if (mastery >= 40) return 'learning';
  return 'weak';
}

export const getKnowledgeGraph = async (req: AuthRequest, res: Response) => {
  try {
    const topics = await prisma.topic.findMany({
      include: {
        chapter: true,
        prerequisites: { include: { prerequisite: true } },
        quizzes: { include: { _count: { select: { questions: true } } } }
      }
    });
    const classMastery = await getClassTopicMastery();

    const nodes = topics.map((topic) => {
      const mastery = classMastery.has(topic.id) ? classMastery.get(topic.id)! : null;
      const quizCount = topic.quizzes.length;
      return {
        data: {
          id: topic.id,
          label: topic.name,
          chapter: topic.chapter.name,
          mastery,
          status: getMasteryStatus(mastery),
          quizCount,
          importance: Math.min(0.3 + quizCount * 0.15, 1.0)
        }
      };
    });

    const edges: any[] = [];
    topics.forEach((topic) => {
      topic.prerequisites.forEach((prereq) => {
        edges.push({
          data: {
            id: `${prereq.prerequisiteId}->${topic.id}`,
            source: prereq.prerequisiteId,
            target: topic.id
          }
        });
      });
    });

    const students = await prisma.user.findMany({ where: { role: 'STUDENT' } });
    return res.json({
      nodes,
      edges,
      students: students.map((s) => ({ id: s.id, username: s.username, email: s.email }))
    });
  } catch (error) {
    console.error('Knowledge graph error:', error);
    return res.status(500).json({ error: 'Failed to build knowledge graph.' });
  }
};

export const getStudentKnowledgeGraph = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, username: true, email: true }
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const topics = await prisma.topic.findMany({
      include: {
        chapter: true,
        prerequisites: true,
        quizzes: { include: { _count: { select: { questions: true } } } }
      }
    });
    const studentMastery = await getStudentTopicMastery(studentId);

    const nodes = topics.map((topic) => {
      const mastery = studentMastery.has(topic.id) ? studentMastery.get(topic.id)! : null;
      const quizCount = topic.quizzes.length;
      return {
        data: {
          id: topic.id,
          label: topic.name,
          chapter: topic.chapter.name,
          mastery,
          status: getMasteryStatus(mastery),
          quizCount,
          importance: Math.min(0.3 + quizCount * 0.15, 1.0)
        }
      };
    });

    const edges: any[] = [];
    topics.forEach((topic) => {
      topic.prerequisites.forEach((prereq) => {
        edges.push({
          data: {
            id: `${prereq.prerequisiteId}->${topic.id}`,
            source: prereq.prerequisiteId,
            target: topic.id
          }
        });
      });
    });

    const weakTopics = nodes
      .filter((n) => n.data.status === 'weak')
      .map((n) => ({ id: n.data.id, label: n.data.label, mastery: n.data.mastery }));

    return res.json({ nodes, edges, student, weakTopics });
  } catch (error) {
    console.error('Student knowledge graph error:', error);
    return res.status(500).json({ error: 'Failed to build student knowledge graph.' });
  }
};
