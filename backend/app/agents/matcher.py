"""
The Matcher agent, as a LangGraph state graph with three nodes:

  fetch_context -> score_fit -> save_result

Why a graph instead of one function: this is the shape that scales —
adding a step later means adding a node and an edge, not rewriting a
monolithic function. It's also what makes the "multi-agent orchestration"
resume claim genuinely true rather than just a single LLM call with a
fancy name.
"""
from typing import TypedDict
from langgraph.graph import StateGraph, END

from app.core.supabase_client import service_client
from app.core.llm import call_llm_json

SCORE_SYSTEM_PROMPT = """You are a job-fit analysis assistant. Given a
candidate's skill profile and a job description, score how well they
match and identify skill gaps. Respond ONLY with a JSON object in this
exact shape:

{
  "fit_score": <number 0-100>,
  "skill_gaps": ["skills the job requires that the candidate profile doesn't show"],
  "reasoning": "2-3 sentence explanation of the score, written for the candidate to read"
}
"""


class MatchState(TypedDict):
    user_id: str
    job_id: str
    skill_profile: dict
    job_title: str
    job_description: str
    fit_score: float
    skill_gaps: list
    reasoning: str


def fetch_context(state: MatchState) -> MatchState:
    """Load the user's skill profile and the job description from Supabase."""
    profile_res = (
        service_client.table("profiles")
        .select("skill_profile")
        .eq("id", state["user_id"])
        .single()
        .execute()
    )
    job_res = (
        service_client.table("jobs")
        .select("title, description")
        .eq("id", state["job_id"])
        .single()
        .execute()
    )

    state["skill_profile"] = profile_res.data["skill_profile"]
    state["job_title"] = job_res.data["title"]
    state["job_description"] = job_res.data["description"]
    return state


def score_fit(state: MatchState) -> MatchState:
    """Ask the LLM to score fit and identify gaps."""
    result = call_llm_json(
        system_prompt=SCORE_SYSTEM_PROMPT,
        user_prompt=(
            f"Candidate skill profile:\n{state['skill_profile']}\n\n"
            f"Job title: {state['job_title']}\n"
            f"Job description:\n{state['job_description']}"
        ),
    )
    state["fit_score"] = result["fit_score"]
    state["skill_gaps"] = result["skill_gaps"]
    state["reasoning"] = result["reasoning"]
    return state


def save_result(state: MatchState) -> MatchState:
    """Persist the match — upsert so re-running a match updates it instead of duplicating."""
    service_client.table("matches").upsert(
        {
            "user_id": state["user_id"],
            "job_id": state["job_id"],
            "fit_score": state["fit_score"],
            "skill_gaps": state["skill_gaps"],
            "reasoning": state["reasoning"],
        },
        on_conflict="user_id,job_id",
    ).execute()
    return state


def build_matcher_graph():
    graph = StateGraph(MatchState)
    graph.add_node("fetch_context", fetch_context)
    graph.add_node("score_fit", score_fit)
    graph.add_node("save_result", save_result)

    graph.set_entry_point("fetch_context")
    graph.add_edge("fetch_context", "score_fit")
    graph.add_edge("score_fit", "save_result")
    graph.add_edge("save_result", END)

    return graph.compile()


matcher_graph = build_matcher_graph()


def run_matcher(user_id: str, job_id: str) -> dict:
    result = matcher_graph.invoke({"user_id": user_id, "job_id": job_id})
    return {
        "fit_score": result["fit_score"],
        "skill_gaps": result["skill_gaps"],
        "reasoning": result["reasoning"],
    }