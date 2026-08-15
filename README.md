# 🚀 Synapse Physics — Adaptive Class 10 Learning Platform

> **IRT + BKT Powered · NCERT Aligned · JEE-Style Quiz Portal**

A full-stack adaptive learning platform for Class 10 Physics, combining:
- **React + Vite frontend** — JEE NTA-style quiz portal with dark UI
- **Node.js + Express backend** — REST API with Prisma ORM + SQLite
- **Python FastAPI ML Engine** — IRT (2PL) + BKT (HMM) adaptive scoring + RAG AI Tutor

---

## 📁 Project Structure

```
Capstone-Combine/
├── start.ps1                          ← 🟢 ONE-CLICK LAUNCHER (run this!)
│
├── tanya_code/capstone-quiz-portal/
│   ├── backend/                       ← Express + Prisma (Port 5000)
│   │   ├── src/
│   │   │   ├── index.ts               ← Server entry point
│   │   │   ├── routes/                ← All API routes
│   │   │   ├── controllers/           ← Auth, Quiz, Analytics, AI Tutor
│   │   │   ├── services/              ← adaptiveService (bridges to Python ML)
│   │   │   └── middleware/            ← JWT auth, file upload
│   │   ├── prisma/
│   │   │   ├── schema.prisma          ← Database models
│   │   │   ├── seed.ts                ← Basic seed
│   │   │   ├── seedPhysics.ts         ← Physics chapters + questions seed
│   │   │   └── seedSynapse.ts         ← Synapse knowledge graph seed
│   │   └── .env                       ← ✅ Created — DB + JWT + ML URL
│   │
│   └── frontend/                      ← React + Vite (Port 5173)
│       └── src/
│           ├── pages/student/         ← Dashboard, Quiz, AI Tutor, Progress
│           ├── pages/teacher/         ← Analytics, Quiz Management, Reports
│           └── api/client.ts          ← Axios → http://localhost:5000/api
│
└── ananya_code/irt-bkt-engine/
    ├── setup_venv.ps1                 ← Python environment setup
    ├── requirements_combined.txt      ← All Python deps in one file
    ├── bkt-engine/
    │   ├── bkt/                       ← BKT HMM implementation
    │   ├── examples/                  ← BKT orchestrator mock
    │   └── demo_ui/
    │       └── backend.py             ← FastAPI ML Engine (Port 8080)
    ├── irt-engine/
    │   └── irt/                       ← 2PL IRT theta estimation
    └── rag-implementation/
        └── integration/               ← RAG orchestrator for AI Tutor
```

---

## ⚡ Quick Start (3 steps)

### Step 1 — Prerequisites (install once)

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v20+ LTS | https://nodejs.org |
| Python | v3.10+ | https://python.org |
| Git | Latest | https://git-scm.com |

### Step 2 — First-time Setup

Open **PowerShell** in this folder and run:

```powershell
# Install backend dependencies + set up database
cd tanya_code\capstone-quiz-portal\backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts

# Install frontend dependencies
cd ..\..\..
cd tanya_code\capstone-quiz-portal\frontend
npm install

# Set up Python ML engine
cd ..\..\..
cd ananya_code\irt-bkt-engine
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements_combined.txt
```

> **ExecutionPolicy error?** Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Step 3 — Launch Everything

```powershell
# From the root Capstone-Combine folder:
.\start.ps1
```

This opens 3 PowerShell windows and launches:
- 🟢 Backend at `http://localhost:5000`
- 🔵 ML Engine at `http://localhost:8080`  
- 🟡 Frontend at `http://localhost:5173`

Then opens your browser automatically! 🎉

---

## 🏗️ Manual Start (alternative)

Open 3 separate PowerShell windows:

| Window | Directory | Command |
|--------|-----------|---------|
| 🟢 Backend | `backend\` | `npm run dev` |
| 🔵 Python ML | `demo_ui\` | `uvicorn backend:app --port 8080 --reload` |
| 🟡 Frontend | `frontend\` | `npm run dev` |

---

## 🧪 Test Accounts

After seeding, create accounts via the signup page:

| Role | Username | Email | Password |
|------|----------|-------|----------|
| Student | `student1` | `s1@test.com` | `password123` |
| Teacher | `teacher1` | `t1@test.com` | `password123` |

---

## 📊 Features

### Student
- **Dashboard** — IRT θ (theta) ability score, BKT mastery %, streak, accuracy
- **Take Quiz** — JEE NTA-style exam with timer & question palette
- **AI Tutor** — Ask Physics questions, get NCERT-aligned Socratic hints
- **Study Material** — NCERT notes, formulas, worked examples per topic
- **Knowledge Graph** — Visual concept map with mastery overlay
- **My Progress** — Historical quiz performance charts

### Teacher
- **Dashboard** — Class overview: avg score, at-risk students
- **Quiz Management** — Create quizzes, upload Excel questions
- **Analytics** — Per-student & per-quiz drill-down, concept heatmap
- **PTM Report** — One-click printable Parent-Teacher Meeting PDF
- **Knowledge Graph** — Full class mastery visualization

---

## 📋 Excel Question Upload Format

| Column | Required | Example |
|--------|----------|---------|
| `question` | ✅ | "What is the speed of light in vacuum?" |
| `option_a` | ✅ | "3 × 10⁸ m/s" |
| `option_b` | ✅ | "3 × 10⁶ m/s" |
| `option_c` | ✅ | "3 × 10¹⁰ m/s" |
| `option_d` | ✅ | "3 × 10⁴ m/s" |
| `answer` | ✅ | "A" (must be A, B, C, or D) |
| `difficulty` | ✅ | "EASY", "MEDIUM", or "HARD" |
| `image` | ❌ | `diagram.png` (filename only) |

---

## 🔧 Troubleshooting

**"Cannot find module"** → `Remove-Item -Recurse -Force node_modules; npm install`

**Prisma migration fails** → `npx prisma migrate reset --force; npx prisma migrate dev --name init`

**Port already in use** → `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`

**Python venv activation blocked** → `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Frontend blank page** → Check backend is running at `http://localhost:5000/health`

---

## 🔗 API Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/chapters` | List all chapters & topics |
| GET/POST | `/api/ai/ask` | AI Tutor chat |
| POST | `/api/quizzes/:id/start` | Start quiz attempt |
| POST | `/api/attempts/:id/submit` | Submit quiz |
| GET | `/api/analytics/student` | Student dashboard data |
| GET | `/api/analytics/teacher` | Teacher dashboard data |
| GET | `/api/knowledge-graph/me` | Student knowledge graph |

**Python ML Engine (Port 8080):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/adaptive/evaluate` | IRT theta + BKT mastery update |
| POST | `/api/v1/tutor/grounded-explain` | RAG-grounded AI hint |
| GET | `/docs` | FastAPI Swagger UI |

---

*Synapse Physics v1.0 — Built for real classroom use*
