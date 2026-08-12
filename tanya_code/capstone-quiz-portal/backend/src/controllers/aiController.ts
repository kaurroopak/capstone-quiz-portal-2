import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { AdaptiveService } from '../services/adaptiveService';

export const getChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const messages = await prisma.aiChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    return res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({ error: 'Failed to retrieve AI tutor chat logs.' });
  }
};

export const askTutor = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { message, topicId, questionText } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const query = message.trim();
    const queryLower = query.toLowerCase();

    // 1. Log student query message
    const userMessage = await prisma.aiChatMessage.create({
      data: {
        userId,
        message: query,
        sender: 'USER'
      }
    });

    let reply = '';
    let sourcesList: any[] = [];

    // Try fetching RAG grounded explanation from Python RAG service if topicId or questionText is passed
    if (topicId || questionText) {
      try {
        const ragResult = await AdaptiveService.getGroundedExplanation({
          userId,
          topicId: topicId || 'physics-general',
          questionText: questionText || query,
          userQuery: query
        });
        reply = ragResult.hint;
        sourcesList = ragResult.sources;
      } catch (e) {
        console.warn('RAG service fallback activated');
      }
    }

    if (!reply) {
      if (queryLower.includes('ohm') || queryLower.includes('electricity') || queryLower.includes('resistance')) {
        reply = `Hello! Let's explore **Electricity & Ohm's Law** together. This is a foundational topic for your Class 10 Physics board exams.

**Ohm's Law** tells us that the current ($I$) passing through a conductor is directly proportional to the potential difference ($V$) across it, as long as temperature remains constant.

### The Formula:
$$V = I \\times R$$
- **V** = Potential Difference (Volts, $V$)
- **I** = Current (Amperes, $A$)
- **R** = Resistance (Ohms, $\\Omega$)

### 📌 NCERT Reference:
> [NCERT Class 10 Physics - Chapter 12: Electricity, Section 12.4, p. 203]

### 💡 Socratic Hint for Understanding:
If you double the resistance $R$ while keeping voltage $V$ constant, what happens to the electric current $I$? Try to calculate it using $I = V / R$!`;
        sourcesList = [{
          title: "NCERT Class 10 Physics - Chapter 12: Electricity",
          excerpt: "The electric current flowing through a metallic conductor is directly proportional to the potential difference across its ends, provided temperature remains constant.",
          page: "Section 12.4, p. 203"
        }];
      } else if (queryLower.includes('light') || queryLower.includes('refraction') || queryLower.includes('mirror') || queryLower.includes('lens')) {
        reply = `Hello! Let's review **Light: Reflection & Refraction**.

In Class 10 Physics, we use the **Mirror Formula** and **Lens Formula** to calculate image positions:

### Mirror Formula:
$$\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}$$

### Lens Formula:
$$\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}$$

### 📌 NCERT Reference:
> [NCERT Class 10 Physics - Chapter 10: Light, Section 10.2.1, p. 165]

### 💡 Socratic Hint:
Remember the Cartesian Sign Convention: Object distance $u$ is ALWAYS taken as negative ($-u$).`;
        sourcesList = [{
          title: "NCERT Class 10 Physics - Chapter 10: Light",
          excerpt: "Distance of the object from its pole is taken as negative according to the Cartesian sign convention.",
          page: "Section 10.2.1, p. 165"
        }];
      } else {
        reply = `Hello! I am your Socratic AI Physics Tutor.

I am here to guide you step-by-step through Class 10 Physics topics:
- 💡 **Light — Reflection & Refraction**
- 👁️ **Human Eye & Colourful World**
- ⚡ **Electricity & Circuits**
- 🧲 **Magnetic Effects of Electric Current**

Ask me any question or tell me what concept you want to master today!`;
      }
    }

    // 3. Save AI's response log
    const aiMessage = await prisma.aiChatMessage.create({
      data: {
        userId,
        message: reply,
        sender: 'AI'
      }
    });

    return res.json({
      userMessage,
      aiMessage,
      sources: sourcesList
    });
  } catch (error) {
    console.error('AI Tutor conversation error:', error);
    return res.status(500).json({ error: 'Failed to communicate with AI Tutor.' });
  }
};

