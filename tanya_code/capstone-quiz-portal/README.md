# Class 10 Quiz Portal

A full-stack, play-based education quiz portal web app designed specifically for Class 10 students. Built using the required high-performance tech stack: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, node-cron, React 18, and Vite.

## Features

- **Gamified Educational UI**: Duolingo-like feel with rounded cards, chunky buttons, indigo/blue accents, progress bars, and transition animations.
- **Student Dashboard**: Track completed quizzes, average accuracy, strengths vs. weaknesses across chapters, active practice streak, and an interactive SVG progress chart.
- **Teacher Dashboard**: Overview of classes, class accuracy, quiz management panels, student master logs, and a list of students needing attention (< 50% accuracy).
- **Quiz Engine**: Real-time quiz taking (one-by-one or scrollable layout), automatic Redis-backed autosaves every 5 seconds, circular countdown timer, question diagram support, and cron-based auto-submission for expired attempts.
- **Detailed Analytics**: Tracks exact time spent per individual question, question option answer change counts, and lists students needing attention.
- **Excel Bulk Upload**: Teachers can manually define chapters/topics or upload spreadsheets. Provides validation error feedback row-by-row on formatting mismatches.

---

## Tech Stack

- **Backend**: Node.js + Express + TypeScript, Prisma ORM, PostgreSQL, Redis, node-cron, Multer, SheetJS (`xlsx`)
- **Frontend**: React 18 + Vite + React Router v6 + Axios
- **Database**: PostgreSQL (Prisma ORM)
- **Caching & State Cache**: Redis

---

## Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Docker](https://www.docker.com/) (to run PostgreSQL & Redis locally)

---

## Setup & Running Instructions

Follow these exact steps to run the application locally:

### Step 1: Start PostgreSQL & Redis Containers
From the root directory, boot the database and Redis services using Docker Compose:
```bash
docker compose up -d
```
*Note: PostgreSQL exposes on port `5432` and Redis on port `6389` to prevent collisions.*

### Step 2: Install Dependencies
Install all package dependencies for the root orchestrator, backend, and frontend with a single command from the root directory:
```bash
npm run install:all
```

### Step 3: Run Database Migrations
Synchronize your PostgreSQL database with the Prisma schema:
```bash
npm run db:migrate
```

### Step 4: Seed Database
Seed the database with default Student and Teacher accounts, syllabus topics, and sample quizzes:
```bash
npm run db:seed
```

### Step 5: Start Development Servers
Start both the Express backend API (port `5000`) and the Vite React frontend dev server concurrently:
```bash
npm run dev
```

The frontend will run on http://localhost:5173 and the backend API on http://localhost:5000.

---

## Default Accounts for Testing

Once the database is seeded, log in with the following default accounts:

### 👩‍🏫 Teacher Account
- **Email / Username**: `teacher@quiz.com` or `teacher`
- **Password**: `password123`

### ✏️ Student Account
- **Email / Username**: `student@quiz.com` or `student10`
- **Password**: `password123`

---

## Excel Bulk Upload Specification

The spreadsheet template is automatically generated on server boot and is available in the root folder as `sample_template.xlsx` or via the dashboard download link.

The template must have the following columns:
1. **Chapter Name**: Text (e.g. `Mathematics - Quadratic Equations`)
2. **Topic Name**: Text (e.g. `Nature of Roots`)
3. **Question Text**: Text (e.g. `If D < 0, what is the nature of the roots?`)
4. **Option A**: Option description text
5. **Option B**: Option description text
6. **Option C**: Option description text
7. **Option D**: Option description text
8. **Correct Answer**: Must be a single letter: `A`, `B`, `C`, or `D`
9. **Difficulty**: Must be `EASY`, `MEDIUM`, or `HARD` (case-insensitive)
10. **Image Reference**: Optional filename (e.g. `roots_graph.png`). When you upload the diagram file via the **Smart Image Linker** on the Quiz Management page, it automatically hooks itself to these placeholder questions.

---

## Folder Structure

```text
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # PostgreSQL Prisma Schema
│   │   └── seed.ts         # Database Seed Script
│   ├── src/
│   │   ├── config/         # Prisma and Redis Initializers
│   │   ├── controllers/    # API controllers
│   │   ├── middleware/     # Auth and file upload guards
│   │   ├── routes/         # Router declarations
│   │   ├── services/       # Excel parsing, Cron, and grading
│   │   └── index.ts        # Server entry point
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client
│   │   ├── components/     # Route guards, sidebars
│   │   ├── context/        # Global Auth Context
│   │   ├── pages/          # Dashboards, quiz takings, results, logins
│   │   ├── App.tsx         # Route router mappings
│   │   ├── index.css       # Playful Duolingo Theme
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml      # Docker container configs
├── sample_template.xlsx    # Downloadable Excel template
├── README.md
└── package.json            # Root runner
```
