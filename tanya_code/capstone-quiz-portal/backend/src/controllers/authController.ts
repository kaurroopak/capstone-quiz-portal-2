import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'quiz_portal_jwt_secret_key_class_10_2026!';
const JWT_EXPIRY = '8h';

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields (username, email, password, role) are required.' });
    }

    if (role !== 'STUDENT' && role !== 'TEACHER') {
      return res.status(400).json({ error: 'Invalid role. Must be STUDENT or TEACHER.' });
    }

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim().toLowerCase() },
          { email: email.trim().toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username.trim().toLowerCase()) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: role as string
      }
    });

    // Create JWT
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { loginIdentifier, password } = req.body; // Can be username or email

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Login identifier (email/username) and password are required.' });
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: loginIdentifier.trim().toLowerCase() },
          { email: loginIdentifier.trim().toLowerCase() }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { learningStyle, readingSpeed, workingMemory, processingSpeed } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        learningStyle: learningStyle !== undefined ? String(learningStyle).trim() : undefined,
        readingSpeed: readingSpeed !== undefined ? String(readingSpeed).trim() : undefined,
        workingMemory: workingMemory !== undefined ? String(workingMemory).trim() : undefined,
        processingSpeed: processingSpeed !== undefined ? String(processingSpeed).trim() : undefined
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        learningStyle: true,
        readingSpeed: true,
        workingMemory: true,
        processingSpeed: true
      }
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile settings.' });
  }
};

