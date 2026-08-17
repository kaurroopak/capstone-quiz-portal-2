# Synapse Physics — Data Flow Documentation

## Architecture Overview

```
Browser (React)  ←→  Node/Express API (port 5000)  ←→  Python FastAPI ML Engine (port 8080)
                              ↕
                         SQLite (Prisma)
                              ↕
                         Redis (session cache)
```

---

## 1. Content → Practice → Mastery Loop

### Step A — Student opens the Learn tab
1. `GET /study/:topicId` → returns `TopicContent` (learnText, notes, formula, examples) from SQLite
2. Student reads content, clicks **Mark as Learned**
3. `POST /study/:topicId/learn-viewed` → adds topicId to `User.learnedTopics`, awards +10 XP, saves to SQLite
4. Frontend unlocks the **Practice tab** and shows an XP burst animation

### Step B — Quiz attempt (IRT/BKT evaluation)
1. Student starts quiz: `POST /attempts/start` → creates `QuizAttempt` in SQLite + saves to Redis
2. Auto-save every 5s: `POST /attempts/:id/save` → persists `responses` to Redis
3. Submit: `POST /attempts/:id/submit` →
   - Merges Redis cache + client payload
   - Scores each question, saves `QuestionResponse` to SQLite
   - Calls `AdaptiveService.evaluateAttempt()` **per question**:
     - Bridges to Python: `POST /api/v1/adaptive/evaluate` with `{user_id, current_theta, question_id, topic_id, is_correct, time_spent}`
     - Python 2PL IRT engine computes new θ; BKT HMM updates mastery P(L)
     - Node saves new `User.theta` to SQLite
   - Cleans Redis session
4. `GET /analytics/student` now returns updated `theta`, per-topic `averageScore` (BKT proxy), and `lastQuizDelta`
5. Frontend fetches updated analytics → mastery bars animate to new values on the Module page

### Step C — UI refresh after submission
- `QuizResults` page shows per-question AI evaluations (via `GET /attempts/:id/evaluations`)
- Module page re-fetches analytics on next load — mastery bar reflects the new BKT score
- Dashboard `lastQuizDelta` card shows plain-language feedback: e.g., "+75% on Ohm's Law — 3 correct out of 4"

---

## 2. RAG + LLM Tutor Flow

### Inline Tutor (Module page — Ask the Tutor tab)
1. Student types a question
2. Frontend sends: `POST /ai-tutor/chat` with:
   ```json
   {
     "message": "...",
     "topicId": "...",
     "theta": 0.82,
     "topicMastery": 68,
     "hintLevel": 0
   }
   ```
3. Node `aiController.askTutor`:
   - Computes **register** from mastery: `beginner (<40%) → Socratic | advanced (≥75%) → technical`
   - Prepends personalization context to the `userQuery`:
     `"[Student level: intermediate, θ=+0.82, mastery=68%, hint-level=0] <original question>"`
   - Calls `AdaptiveService.getGroundedExplanation()` → bridges to Python:
     `POST /api/v1/tutor/grounded-explain` with `{user_id, topic_id, question_text, user_query}`
   - Python RAG orchestrator retrieves NCERT chunks by cosine similarity → passes to LLM
   - Returns `{hint, sources: [{title, excerpt, page}]}`
4. Frontend renders AI response as a chat bubble + **NCERT citation chips** (e.g., "📌 Chapter 12, Section 12.4, p.203")
5. If student clicks "Still stuck?", `hintLevel` increments — next request gets a more direct answer

### Escalation Logic
| hintLevel | Response style |
|-----------|----------------|
| 0 | Socratic question ("What happens to I if R doubles?") |
| 1 | Guided explanation with formula |
| 2+ | Direct answer with worked example |

---

## 3. Skill Tree Data Flow

1. `GET /knowledge-graph/me` → calls `getStudentKnowledgeGraph(userId)`
   - Fetches all topics with `TopicPrerequisite` edges
   - Aggregates completed attempt scores per topic (BKT mastery proxy)
   - Returns `{nodes: [{data: {id, label, chapter, mastery, status}}], edges: [{data: {source, target}}]}`
2. Frontend `StudentSkillTree` computes SVG positions by chapter grouping
3. Node color = mastery ramp (grey→amber→green), node size scales with mastery %
4. Clicking a node navigates to `/student/study/:topicId` (the Module page)

---

## 4. XP & Gamification Events

| Action | XP |
|--------|----|
| Open Learn tab (first time per topic) | +10 |
| Complete a quiz attempt | +20 (planned) |
| Ask tutor a question | +5 (planned) |

XP is stored in `User.xp` (SQLite). The sidebar shows level + XP progress bar computed as `Math.floor(xp / 100) + 1`.
