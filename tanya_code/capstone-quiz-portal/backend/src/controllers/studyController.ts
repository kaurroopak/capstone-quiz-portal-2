import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const getStudyContent = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;

    const content = await prisma.topicContent.findUnique({
      where: { topicId }
    });

    if (!content) {
      // Return a blank structure so the frontend can render default states safely
      return res.json({
        topicId,
        learnText: 'No conceptual introduction has been written for this topic yet.',
        notes: '• No additional notes available.',
        examples: 'No solved examples added yet.',
        formula: 'No equations listed.'
      });
    }

    return res.json(content);
  } catch (error) {
    console.error('Error fetching study content:', error);
    return res.status(500).json({ error: 'Failed to retrieve topic study material.' });
  }
};

export const saveStudyContent = async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const { learnText, notes, examples, formula } = req.body;

    if (!learnText || !notes || !examples || !formula) {
      return res.status(400).json({ error: 'All study content fields (learnText, notes, examples, formula) are required.' });
    }

    const content = await prisma.topicContent.upsert({
      where: { topicId },
      update: {
        learnText: learnText.trim(),
        notes: notes.trim(),
        examples: examples.trim(),
        formula: formula.trim()
      },
      create: {
        topicId,
        learnText: learnText.trim(),
        notes: notes.trim(),
        examples: examples.trim(),
        formula: formula.trim()
      }
    });

    return res.json({ message: 'Study material updated successfully', content });
  } catch (error) {
    console.error('Error saving study content:', error);
    return res.status(500).json({ error: 'Failed to save topic study material.' });
  }
};
