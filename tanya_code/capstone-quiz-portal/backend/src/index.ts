import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import { connectRedis } from './config/redis';
import { initCronJobs } from './services/cronService';
import { generateExcelTemplate } from './services/templateGenerator';

// Load Environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for simplicity in development, restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Set up directory for uploaded question images
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Mount Router
app.use('/api', routes);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const bootstrap = async () => {
  try {
    // 0. Generate excel bulk upload template
    generateExcelTemplate();

    // 1. Attempt Redis connection (non-fatal, has fallback)
    try {
      await connectRedis();
    } catch (redisErr) {
      console.warn('Redis unavailable — using in-memory fallback for quiz progress.');
    }

    // 2. Initialize Cron Jobs
    initCronJobs();

    // 3. Start Express Server
    app.listen(PORT, () => {
      console.log(`\n🚀 Synapse Physics Backend running on port ${PORT}`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads/`);
      console.log(`❤️  Health: http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('Failed to bootstrap backend service:', error);
    process.exit(1);
  }
};

bootstrap();
