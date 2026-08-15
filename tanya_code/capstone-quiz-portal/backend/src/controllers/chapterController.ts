import { Request, Response } from 'express';
import fs from 'fs';
import prisma from '../config/db';
import { parseExcelFile } from '../services/excelService';

export const getChapters = async (req: Request, res: Response) => {
  try {
    const chapters = await prisma.chapter.findMany({
      include: {
        topics: {
          include: {
            quizzes: {
              where: { isActive: true },
              select: {
                id: true,
                title: true,
                difficulty: true,
                duration: true,
                _count: {
                  select: { questions: true }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    return res.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return res.status(500).json({ error: 'Failed to retrieve chapters.' });
  }
};

export const createChapter = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Chapter name is required.' });
    }

    const nameTrimmed = name.trim();
    const existing = await prisma.chapter.findUnique({
      where: { name: nameTrimmed }
    });

    if (existing) {
      return res.status(400).json({ error: 'Chapter with this name already exists.' });
    }

    const chapter = await prisma.chapter.create({
      data: { name: nameTrimmed }
    });

    return res.status(201).json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    return res.status(500).json({ error: 'Failed to create chapter.' });
  }
};

export const createTopic = async (req: Request, res: Response) => {
  try {
    const { name, chapterId } = req.body;
    if (!name || !name.trim() || !chapterId) {
      return res.status(400).json({ error: 'Topic name and chapterId are required.' });
    }

    // Verify chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found.' });
    }

    const nameTrimmed = name.trim();

    // Check unique combination
    const existing = await prisma.topic.findUnique({
      where: {
        name_chapterId: {
          name: nameTrimmed,
          chapterId
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Topic already exists in this chapter.' });
    }

    const topic = await prisma.topic.create({
      data: {
        name: nameTrimmed,
        chapterId
      }
    });

    return res.status(201).json(topic);
  } catch (error) {
    console.error('Error creating topic:', error);
    return res.status(500).json({ error: 'Failed to create topic.' });
  }
};

export const importExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an Excel file.' });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Parse and validate the Excel
    const parseResult = parseExcelFile(fileBuffer);

    // Clean up file
    fs.unlinkSync(filePath);

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        rowErrors: parseResult.errors
      });
    }

    // DB import transaction/sequence
    const importSummary = {
      chaptersCreated: 0,
      topicsCreated: 0,
      questionsCreated: 0
    };

    for (const row of parseResult.data) {
      // 1. Find or create Chapter
      let chapter = await prisma.chapter.findUnique({
        where: { name: row.chapterName.trim() }
      });
      if (!chapter) {
        chapter = await prisma.chapter.create({
          data: { name: row.chapterName.trim() }
        });
        importSummary.chaptersCreated++;
      }

      // 2. Find or create Topic under Chapter
      let topic = await prisma.topic.findUnique({
        where: {
          name_chapterId: {
            name: row.topicName.trim(),
            chapterId: chapter.id
          }
        }
      });
      if (!topic) {
        topic = await prisma.topic.create({
          data: {
            name: row.topicName.trim(),
            chapterId: chapter.id
          }
        });
        importSummary.topicsCreated++;
      }

      // 3. Find or create a default Quiz for this topic so questions can be practiced immediately
      let defaultQuiz = await prisma.quiz.findFirst({
        where: {
          topicId: topic.id,
          title: `${topic.name} Practice Quiz`
        }
      });

      if (!defaultQuiz) {
        defaultQuiz = await prisma.quiz.create({
          data: {
            title: `${topic.name} Practice Quiz`,
            description: `Automated practice quiz containing questions imported for ${topic.name}.`,
            topicId: topic.id,
            duration: 600, // default 10 minutes (600 seconds)
            isActive: true,
            shuffle: true,
            difficulty: 'MEDIUM'
          }
        });
      }

      // 4. Create Question
      await prisma.question.create({
        data: {
          quizId: defaultQuiz.id,
          text: row.questionText,
          optionA: row.optionA,
          optionB: row.optionB,
          optionC: row.optionC,
          optionD: row.optionD,
          correctAnswer: row.correctAnswer as string,
          difficulty: row.difficulty as string,
          imageUrl: row.imageRef || null // Store initial ref if exists, teacher can upload later
        }
      });
      importSummary.questionsCreated++;
    }

    return res.json({
      message: 'Excel import completed successfully!',
      summary: importSummary
    });
  } catch (error: any) {
    console.error('Excel import error:', error);
    return res.status(500).json({ error: 'Failed to process Excel import.' });
  }
};
