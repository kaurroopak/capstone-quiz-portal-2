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

    # Convert theta to descriptive ability level for the LLM prompt
    if context.theta < -1.0:
        ability = "low (struggling)"
    elif context.theta > 1.0:
        ability = "high (advanced)"
    else:
        ability = "average"
        
    mastery_pct = round(context.mastery_probability * 100, 1)

    return f"""You are an AI physics tutor for a Class 9 Science student (age 13-15).
You must use the retrieved textbook context to help the student learn. 

CONTEXT:
- Concept: {context.concept_name}
- Student's ability level (theta): {context.theta:.2f} ({ability})
- Student answered: {context.student_answer}
- Correct answer: {context.correct_answer}
- Misconception tag: {context.misconception_tag if context.misconception_tag else 'None'}
- Prerequisite concepts they need to review: {', '.join(context.prerequisite_gaps) if context.prerequisite_gaps else 'None'}

RETRIEVED TEXTBOOK CONTEXT:
{retrieved_text}

INSTRUCTIONS:
1. Briefly acknowledge their answer. (If they got it wrong, gently point out why using the misconception tag if present).
2. CLEARLY EXPLAIN the relevant physics concept using ONLY the retrieved textbook context. Use simple, concrete analogies appropriate for a 14-year-old.
3. If they have prerequisite concepts to review, explicitly advise them to review those specific topics first before mastering this concept.
4. END WITH A GUIDING QUESTION to check their understanding. Do not give them the final answer directly, but give them enough information to figure it out.
5. Keep your total response under {MAX_TUTOR_RESPONSE_WORDS} words.
6. Format your response cleanly using short paragraphs or bullet points.
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

