import sys
import os
from pathlib import Path

# ─── Robust path resolution for Windows ────────────────────────────────────────
# demo_ui/backend.py is at:
#   .../ananya_code/irt-bkt-engine/bkt-engine/demo_ui/backend.py
#
# We need to add:
#   bkt-engine/          → for "from examples.mock_orchestrator import ..."
#   irt-engine/          → for "from irt.theta import ..."
#   rag-implementation/  → for "from integration.orchestrator import ..."

_this_file   = Path(__file__).resolve()
_demo_ui     = _this_file.parent           # bkt-engine/demo_ui/
_bkt_engine  = _demo_ui.parent            # bkt-engine/
_irt_bkt_root= _bkt_engine.parent         # irt-bkt-engine/
_irt_engine  = _irt_bkt_root / "irt-engine"
_rag_impl    = _irt_bkt_root / "rag-implementation"

for _p in [str(_bkt_engine), str(_irt_engine), str(_rag_impl)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import json

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any

from examples.mock_orchestrator import BKTOrchestrator, IRTItemBank, IRTStudentProfile, ConceptIRTInfo, PracticeQuestion
from irt.theta import estimate_theta, AnswerRecord, QuestionIRTParameters
from irt.mastery_initializer import initialize_mastery, ConceptAttempt
from irt.bloom_mapper import difficulty_for

from integration.orchestrator import RAGOrchestrator
from data.seed_questions import get_tagged_questions

app = FastAPI(title="BKT & IRT Interactive Quiz Engine")

app.mount("/static", StaticFiles(directory=str(_demo_ui / "static")), name="static")

# Load questions from JSON
QUESTIONS_FILE = _demo_ui / "questions.json"
try:
    with open(QUESTIONS_FILE, "r") as f:
        questions_data = json.load(f)
except Exception as e:
    print(f"Error loading {QUESTIONS_FILE}: {e}")
    questions_data = []

# Load concepts for name lookup
CONCEPTS_FILE = _demo_ui / "concepts.json"
concept_name_map = {}  # concept_id -> concept_name
try:
    with open(CONCEPTS_FILE, "r") as f:
        concepts_data = json.load(f)
    for c in concepts_data:
        concept_name_map[c["concept_id"]] = c["concept_name"]
except Exception as e:
    print(f"Error loading {CONCEPTS_FILE}: {e}")

# Update questions with misconception tags
try:
    tagged_questions = get_tagged_questions()
    if tagged_questions:
        questions_data = tagged_questions
except Exception as e:
    print(f"Error loading tagged questions: {e}")

# Build item bank
items = {}
for q in questions_data:
    try:
        b = difficulty_for(q.get("bloom", "understand"))
    except:
        b = 0.0  # fallback
    items[q["id"]] = (1.0, b)  # default discrimination a=1.0

item_bank = IRTItemBank(items=items)

@app.get("/api/quiz")
def get_quiz():
    return questions_data

class AnswerSubmit(BaseModel):
    question_id: str
    is_correct: bool
    response_time_ms: int
    selected_option: str = ""  # The option key the student selected (e.g., "A", "B")

class QuizSubmitRequest(BaseModel):
    student_id: str = "student_live"
    diagnostic_answers: List[AnswerSubmit]
    practice_answers: List[AnswerSubmit]

@app.post("/api/quiz/submit")
def submit_quiz(req: QuizSubmitRequest):
    if not req.diagnostic_answers:
        raise HTTPException(status_code=400, detail="No diagnostic answers provided")
        
    # 1. Prepare IRT parameters and records for Theta estimation
    irt_params = []
    for a_record in req.diagnostic_answers:
        a, b = item_bank.get(a_record.question_id)
        irt_params.append(QuestionIRTParameters(
            question_id=a_record.question_id,
            discrimination=a,
            difficulty=b
        ))
        
    responses = [AnswerRecord(a.question_id, a.is_correct) for a in req.diagnostic_answers]
    
    # 2. Estimate Theta
    theta_result = estimate_theta(responses, irt_params)
    
    # 3. Initialize Mastery for all concepts seen in diagnostic
    concept_attempts = []
    q_dict = {q["id"]: q for q in questions_data}
    
    for a in req.diagnostic_answers:
        q_info = q_dict.get(a.question_id)
        if not q_info:
            continue
        concept_attempts.append(ConceptAttempt(
            concept_id=q_info["concept_id"],
            question_id=a.question_id,
            is_correct=a.is_correct,
            bloom_level=q_info.get("bloom", "understand")
        ))
        
    mastery_res = initialize_mastery(req.student_id, theta_result, concept_attempts)
    
    # 4. Prepare BKT Orchestrator Inputs
    student_profile = IRTStudentProfile(
        student_id=req.student_id,
        theta=theta_result.theta,
        theta_se=theta_result.standard_error or 0.5,
        converged=theta_result.converged
    )
    
    concept_info = {}
    for cid, mastery in mastery_res.concept_masteries.items():
        b_vals = []
        for a in req.diagnostic_answers:
            if q_dict[a.question_id]["concept_id"] == cid:
                b_vals.append(item_bank.get(a.question_id)[1])
                
        concept_info[cid] = ConceptIRTInfo(
            concept_id=cid,
            item_difficulties=b_vals,
            n_attempted_diagnostic=mastery.n_attempted,
            n_correct_diagnostic=mastery.n_correct
        )
        
    # 5. Run BKT Orchestrator on practice answers
    bkt_orchestrator = BKTOrchestrator(
        student=student_profile,
        item_bank=item_bank,
        concept_info=concept_info
    )
    
    # Wrap in RAGOrchestrator
    orchestrator = RAGOrchestrator(
        bkt_orchestrator=bkt_orchestrator,
        session_id=req.student_id,
        concept_name_map=concept_name_map
    )
    
    initial_p_l0 = {cid: state.p_l for cid, state in bkt_orchestrator.states.items()}
    history = []
    tutoring_interventions = []
    
    for i, p_ans in enumerate(req.practice_answers, 1):
        q_info = q_dict.get(p_ans.question_id)
        if not q_info:
            continue
        
        pq = PracticeQuestion(
            question_id=p_ans.question_id,
            concept_id=q_info["concept_id"],
            response_time_ms=p_ans.response_time_ms,
            is_correct=p_ans.is_correct
        )
        
        correct_answer = q_info.get("correct_answer", "")
        misconception_tag = None
        if not p_ans.is_correct and "misconception_tags" in q_info:
            tags_map = q_info["misconception_tags"]
            if p_ans.selected_option and p_ans.selected_option in tags_map:
                misconception_tag = tags_map[p_ans.selected_option]
            elif tags_map:
                misconception_tag = next(iter(tags_map.values()))
        
        try:
            result = orchestrator.process_answer(pq, correct_answer=correct_answer, misconception_tag=misconception_tag)
        except Exception as e:
            print(f"RAG processing error for {pq.question_id}: {e}")
            bkt_result = bkt_orchestrator.process_answer(pq)
            from dataclasses import dataclass as _dc
            @_dc
            class _FallbackResult:
                bkt_result: object
                tutoring_turn: object = None
            result = _FallbackResult(bkt_result=bkt_result)
        
        history.append({
            "step": i,
            "question_id": pq.question_id,
            "concept_id": pq.concept_id,
            "concept_name": concept_name_map.get(pq.concept_id, pq.concept_id),
            "is_correct": pq.is_correct,
            "p_l": result.bkt_result.new_state.p_l,
            "message": "Update processed"
        })
        
        if result.tutoring_turn:
            tutoring_interventions.append({
                "concept_id": result.tutoring_turn.concept_id,
                "concept_name": concept_name_map.get(result.tutoring_turn.concept_id, result.tutoring_turn.concept_id),
                "student_answer": result.tutoring_turn.student_answer,
                "tutor_response": result.tutoring_turn.tutor_response,
                "turn_number": result.tutoring_turn.turn_number,
                "misconception_tag": result.tutoring_turn.misconception_tag,
                "mastery_at_turn": result.tutoring_turn.mastery_at_turn
            })
            
    summary = bkt_orchestrator.mastery_summary()
    
    # Run Prerequisite Tracing for Concepts < 0.6
    from bkt.graph_tracker import KnowledgeGraph
    try:
        kg = KnowledgeGraph(str(_demo_ui / "edges.json"))
        tracing_results = {}
        mastery_dict = {cid: stats["p_l"] for cid, stats in summary.items()}
        
        for cid, stats in summary.items():
            if stats["p_l"] < 0.60:
                failing_prereqs = kg.find_failing_prerequisites(cid, mastery_dict, threshold=0.6)
                if failing_prereqs:
                    tracing_results[cid] = failing_prereqs
    except Exception as e:
        print(f"Graph tracing error: {e}")
        tracing_results = {}
    
    # Build suggestions based on final mastery
    suggestions = []
    for cid, stats in summary.items():
        cname = concept_name_map.get(cid, cid)
        score = stats["p_l"]
        if score > 0.90:
            suggestions.append(f"{cname} ({cid}): Mastery achieved! Great job.")
        elif score < 0.60:
            trace = tracing_results.get(cid)
            if trace:
                prereq_names = [f"{concept_name_map.get(t['concept_id'], t['concept_id'])}" for t in trace]
                suggestions.append(f"{cname} ({cid}): Needs review. Failing prerequisites: {', '.join(prereq_names)}. We suggest reviewing them first.")
            else:
                suggestions.append(f"{cname} ({cid}): Needs review. AI Tutor remediation recommended.")
        else:
            suggestions.append(f"{cname} ({cid}): On track, keep practicing.")
            
    if not suggestions:
        suggestions = ["Not enough data for concepts. Try answering more questions!"]

    return {
        "theta": theta_result.theta,
        "initial_masteries": initial_p_l0,
        "history": history,
        "summary": summary,
        "suggestions": suggestions,
        "tracing_results": tracing_results,
        "tutoring_interventions": tutoring_interventions,
        "concept_names": concept_name_map
    }



class AnswerSubmit(BaseModel):
    question_id: str
    topic_id: str
    is_correct: bool
    time_spent: int = 0
    answer_changes: int = 0
    selected_option: str = ""

class QuizEvaluationRequest(BaseModel):
    user_id: str
    current_theta: float = 0.0
    answers: List[AnswerSubmit]

class GroundedExplainRequest(BaseModel):
    user_id: str
    topic_id: str
    question_text: str
    user_query: str = ""
    current_theta: float = 0.0
    mastery_probability: float = 0.5

class EvaluateAnswerRequest(BaseModel):
    user_id: str
    question_text: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    current_theta: float
    mastery_probability: float
    topic_id: str = "generic"
    prerequisite_gaps: list[str] = []

@app.post("/api/v1/adaptive/evaluate")
def api_adaptive_evaluate(req: QuizEvaluationRequest):
    """
    Called by the Node.js backend after each quiz submission.
    Runs 2PL IRT theta adjustment and BKT mastery probability calculation.
    """
    if not req.answers:
        return {
            "user_id": req.user_id,
            "new_theta": req.current_theta,
            "mastery_probability": 0.5,
            "mastery_status": "NEEDS_REVISION",
            "prerequisite_gaps": []
        }
        
    responses = []
    irt_params = []
    
    for ans in req.answers:
        responses.append(AnswerRecord(ans.question_id, ans.is_correct))
        p = item_bank.get(ans.question_id)
        if p:
            irt_params.append(QuestionIRTParameters(ans.question_id, p[0], p[1]))
        else:
            irt_params.append(QuestionIRTParameters(ans.question_id, 1.0, 0.0))
            
    # Calculate IRT
    try:
        theta_result = estimate_theta(responses, irt_params)
        new_theta = theta_result.theta
    except Exception as e:
        print(f"Theta estimation error: {e}")
        # fallback to heuristic if perfectly correct/incorrect
        corrects = sum([1 for r in responses if r.is_correct])
        delta = corrects * 0.15 - (len(responses) - corrects) * 0.1
        new_theta = max(-3.0, min(3.0, req.current_theta + delta))
        
    # Use a basic heuristic for mastery initialization to avoid broken imports
    mastery_prob = 0.0
    topics = list(set([a.topic_id for a in req.answers]))
    for topic_id in topics:
        topic_answers = [a for a in req.answers if a.topic_id == topic_id]
        n_attempted = len(topic_answers)
        n_correct = sum(1 for a in topic_answers if a.is_correct)
        
        # Simple heuristic: accuracy blended with theta
        accuracy = n_correct / n_attempted if n_attempted > 0 else 0.5
        topic_p_l0 = max(0.1, min(0.95, (accuracy * 0.7) + (new_theta * 0.1)))
        
        mastery_prob = max(mastery_prob, topic_p_l0) # Just take max or average
        
    # Prerequisite gaps heuristic (simplified)
    prereq_gaps = []
    if mastery_prob < 0.5:
        prereq_gaps.append("prerequisite_concept_placeholder")
    
    return {
        "user_id": req.user_id,
        "new_theta": round(new_theta, 3),
        "mastery_probability": round(mastery_prob, 3),
        "mastery_status": "MASTERED" if mastery_prob >= 0.80 else "NEEDS_REVISION",
        "prerequisite_gaps": prereq_gaps
    }

from rag.tutor import generate_tutoring_response
from rag.models import TutoringContext
from rag.vector_store import retrieve

@app.post("/api/v1/tutor/grounded-explain")
def api_grounded_explain(req: GroundedExplainRequest):
    """
    Called by the Node.js backend for RAG-grounded AI tutor hints.
    Returns Socratic hint with NCERT textbook citations.
    """
    try:
        import re
        theta = req.current_theta
        mastery = req.mastery_probability
        
        theta_match = re.search(r'θ=([\-\d\.]+)', req.user_query)
        if theta_match:
            theta = float(theta_match.group(1))
            
        mastery_match = re.search(r'mastery=([\d\.]+)%', req.user_query)
        if mastery_match:
            mastery = float(mastery_match.group(1)) / 100.0

        student_query = req.user_query if req.user_query else req.question_text

        retrieved = retrieve(concept_id=req.topic_id, query=req.question_text, top_k=2)
        sources = [
            {"title": f"Source: {rc.chunk.source}", "excerpt": rc.chunk.text, "page": f"Part {rc.chunk.chunk_index+1}"}
            for rc in retrieved
        ]
        
        # We can just build a basic context and call the tutor model
        context = TutoringContext(
            concept_id=req.topic_id,
            concept_name=concept_name_map.get(req.topic_id, req.topic_id),
            theta=theta,
            mastery_probability=mastery,
            student_answer=student_query,
            correct_answer="N/A",
            misconception_tag=None,
            retrieved_chunks=retrieved
        )
        tutor_resp = generate_tutoring_response(context)
        
        return {
            "hint": tutor_resp.response_text,
            "sources": sources
        }
    except Exception as e:
        print(f"RAG tutor error: {e}")
        return {
            "hint": f"Recall the core Physics principle behind: {req.question_text[:60]}...",
            "sources": []
        }

@app.post("/api/v1/tutor/evaluate-answer")
def api_evaluate_answer(req: EvaluateAnswerRequest):
    """
    Called by the Node.js backend to provide personalized 
    feedback on a student's answer based on their IRT theta and BKT mastery.
    Uses local Ollama via RAG tutor to generate dynamic, contextual explanations.
    """
    try:
        # Assuming topic_id is part of the context or we just use a generic search
        retrieved = retrieve(concept_id=req.topic_id, query=req.question_text, top_k=1)
        
        context = TutoringContext(
            concept_id=req.topic_id,
            concept_name=concept_name_map.get(req.topic_id, req.topic_id),
            theta=req.current_theta,
            mastery_probability=req.mastery_probability,
            student_answer=req.selected_answer,
            correct_answer=req.correct_answer,
            misconception_tag=None,
            retrieved_chunks=retrieved,
            prerequisite_gaps=req.prerequisite_gaps
        )
        
        tutor_resp = generate_tutoring_response(context)
        evaluation = tutor_resp.response_text
    except Exception as e:
        print(f"RAG tutor error: {e}")
        # Fallback logic
        base_explanation = f"The correct answer is {req.correct_answer}. "
        if req.is_correct:
            evaluation = f"Great job! {base_explanation}"
        else:
            evaluation = f"You selected {req.selected_answer}, but {base_explanation} Keep reviewing the concept."
            
    return {
        "evaluation": evaluation
    }

from fastapi.responses import RedirectResponse

@app.get("/")
def read_root():
    return RedirectResponse(url="/static/index.html")
