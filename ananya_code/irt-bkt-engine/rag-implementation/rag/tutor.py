"""
tutor.py — LLM tutor prompt assembly and invocation via Ollama.
"""

from typing import List, Dict, Optional
import requests
from .models import TutoringContext, TutoringResponse
from .config import MAX_TUTOR_RESPONSE_WORDS, OLLAMA_HOST, OLLAMA_MODEL

def _build_prompt(context: TutoringContext) -> str:
    retrieved_text = ""
    for r_chunk in context.retrieved_chunks:
        retrieved_text += f"\n--- [Source: {r_chunk.chunk.source}, Part {r_chunk.chunk.chunk_index+1}] ---\n"
        retrieved_text += f"{r_chunk.chunk.text}\n"

    mastery_pct = round(context.mastery_probability * 100, 1)
    prereqs = ', '.join(context.prerequisite_gaps) if context.prerequisite_gaps else 'None'
    misconception = context.misconception_tag if context.misconception_tag else 'None'

    # ── TIER 1: STRUGGLING (theta < -1.0) ────────────────────────────────────
    if context.theta < -1.0:
        return f"""You are a patient, encouraging physics tutor helping a STRUGGLING student (Class 10, age 14-15).
This student finds physics very difficult and needs maximum support. Their current mastery is only {mastery_pct}%.

STUDENT CONTEXT:
- Topic: {context.concept_name}
- They answered: "{context.student_answer}"
- Correct answer: "{context.correct_answer}"
- Their misconception: {misconception}
- Prerequisite gaps: {prereqs}

RETRIEVED TEXTBOOK:
{retrieved_text}

YOUR JOB (follow each step exactly):
1. ACKNOWLEDGE: Gently say it's okay to get it wrong — mistakes are how we learn. Tell them which answer was correct in one simple sentence.
2. BASICS FIRST: Before explaining this topic, address their prerequisite gaps ({prereqs}) — tell them they MUST review those first as they are the building blocks.
3. SIMPLE EXPLANATION: Explain {context.concept_name} in the SIMPLEST possible terms. Use a very relatable real-life analogy from everyday Indian life (cricket, cooking, traffic, etc.). Avoid all jargon.
4. STEP BY STEP: Break down exactly WHY "{context.correct_answer}" is right, one small logical step at a time. Number each step.
5. EASY GUIDING QUESTION: End with a very simple yes/no or fill-in-the-blank question to check their understanding. Make it easy enough to rebuild their confidence.
Keep your response under {MAX_TUTOR_RESPONSE_WORDS} words. Be warm, simple, and encouraging — never condescending.
"""

    # ── TIER 2: DEVELOPING (theta -1.0 to 1.0) ───────────────────────────────
    elif context.theta <= 1.0:
        return f"""You are a supportive physics tutor helping a DEVELOPING student (Class 10, age 14-15).
This student has a basic foundation but needs help connecting concepts. Their mastery is {mastery_pct}%.

STUDENT CONTEXT:
- Topic: {context.concept_name}
- They answered: "{context.student_answer}"
- Correct answer: "{context.correct_answer}"
- Their misconception: {misconception}
- Prerequisite gaps: {prereqs}

RETRIEVED TEXTBOOK:
{retrieved_text}

YOUR JOB (follow each step exactly):
1. ACKNOWLEDGE: Briefly confirm if they were right or wrong. If wrong, point out the specific misconception ({misconception}) that led them astray.
2. CONCEPT EXPLANATION: Explain {context.concept_name} using the textbook content. Use one analogy to make it concrete. Connect it to what they already know from the prerequisite gaps ({prereqs}).
3. WHY THEY WERE WRONG: Specifically explain why "{context.student_answer}" is incorrect and why "{context.correct_answer}" is right. Address the misconception directly.
4. GUIDING QUESTION: End with a medium-difficulty application question that requires them to apply the concept to a slightly new scenario — not just recall a fact.
Keep your response under {MAX_TUTOR_RESPONSE_WORDS} words. Be clear, direct, and specific.
"""

    # ── TIER 3: ADVANCED (theta > 1.0) ───────────────────────────────────────
    else:
        return f"""You are a physics tutor engaging with an ADVANCED student (Class 10, age 14-15).
This student has strong fundamentals and is ready for deeper intellectual challenge. Their mastery is {mastery_pct}%.

STUDENT CONTEXT:
- Topic: {context.concept_name}
- They answered: "{context.student_answer}"
- Correct answer: "{context.correct_answer}"
- Their misconception: {misconception}

RETRIEVED TEXTBOOK:
{retrieved_text}

YOUR JOB (follow each step exactly):
1. ACKNOWLEDGE: Briefly confirm their answer. If correct, validate it with a single sentence. If wrong, note the subtle conceptual slip without dwelling on basics.
2. DEEP DIVE: Go BEYOND the textbook. Explain the deeper physics principle behind {context.concept_name} — the "why behind the why." Discuss edge cases, exceptions, or how this concept connects to a related advanced concept (e.g., real-world physics, engineering applications, or a related NCERT chapter).
3. MATHEMATICAL INTUITION: Where appropriate, reference the formula or equation and explain intuitively what each variable represents and how changing them affects the outcome.
4. CHALLENGING GUIDING QUESTION: End with a genuinely challenging, multi-step problem or thought experiment that pushes them beyond textbook recall and requires synthesis of multiple concepts. This should be hard enough to make them think for several minutes.
Keep your response under {MAX_TUTOR_RESPONSE_WORDS} words. Treat this student as an intellectual equal — be rigorous, precise, and challenging.
"""


def generate_tutoring_response(context: TutoringContext) -> TutoringResponse:
    """Generate a tutoring response using the Gemini API."""
    chunk_ids = [f"{rc.chunk.concept_id}_{rc.chunk.chunk_index}" for rc in context.retrieved_chunks]
    
    if not OLLAMA_HOST:
        # Fallback for when Ollama is missing
        return TutoringResponse(
            response_text="[Ollama Config missing] AI Tutor suggests you review the retrieved context.",
            retrieved_chunk_ids=chunk_ids,
            turn_number=context.turn_number
        )
        
    prompt = _build_prompt(context)
    
    try:
        # Call local Ollama API
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        }
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=90)
        response.raise_for_status()
        result_json = response.json()
        response_text = result_json.get("response", "").strip()
    except Exception as e:
        # Graceful fallback if the LLM call fails (Ollama not running, etc.)
        print(f"WARNING: Ollama API call failed: {e}")
        
        # Build a fallback response from the retrieved chunks
        fallback_parts = []
        for rc in context.retrieved_chunks:
            fallback_parts.append(rc.chunk.text)
        
        if fallback_parts:
            # Create a more Socratic-style fallback instead of just dumping the textbook
            response_text = (
                f"Let's review {context.concept_name} together. "
                f"The textbook mentions that: '{fallback_parts[0][:150]}...' "
                f"Based on this rule, how would you approach the problem differently? "
                f"Think about what happens to the other variables when one changes."
            )
        else:
            response_text = (
                f"Let's review {context.concept_name} together. "
                f"The correct answer was: {context.correct_answer}. "
                f"Try thinking about what makes this answer right."
            )
    
    return TutoringResponse(
        response_text=response_text,
        retrieved_chunk_ids=chunk_ids,
        turn_number=context.turn_number
    )

