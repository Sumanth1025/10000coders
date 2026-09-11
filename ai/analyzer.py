import os

from dotenv import load_dotenv
from google import genai

from .prompts import SYSTEM_PROMPT
from .schemas import IncidentAnalysis


# Load .env
load_dotenv()


# Get Gemini API key
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY not found. "
        "Add GEMINI_API_KEY to the project's .env file."
    )


# Gemini client
client = genai.Client(api_key=api_key)


# Gemini model
MODEL = "gemini-3.5-flash-lite"

def analyze_incident(description: str) -> IncidentAnalysis:
    """
    Analyze an emergency incident using Gemini.

    Input:
        Natural-language incident description.

    Output:
        Structured IncidentAnalysis object.
    """

    if not description or not description.strip():
        raise ValueError("Incident description cannot be empty.")

    response = client.models.generate_content(
        model=MODEL,
        contents=[
            SYSTEM_PROMPT,
            f"\nIncident Report:\n{description.strip()}",
        ],
        config={
            "response_mime_type": "application/json",
            "response_schema": IncidentAnalysis,
        },
    )

    if response.parsed is None:
        raise RuntimeError(
            "Gemini did not return structured incident analysis."
        )

    return response.parsed


def calculate_risk_score(result: IncidentAnalysis) -> int:
    """
    Calculate a transparent 0-100 risk score.

    Gemini extracts the facts.
    Python calculates the score.
    """

    severity_points = {
        "low": 10,
        "medium": 25,
        "high": 40,
        "critical": 50,
    }

    score = severity_points.get(
        result.severity.lower(),
        10,
    )

    if result.people_affected:
        score += 10

    if result.people_trapped:
        score += 25

    if result.rescue_required:
        score += 15

    if result.road_blocked:
        score += 10

    return min(score, 100)


def analyze_incident_with_score(description: str) -> dict:
    """
    Complete CrisisIQ AI pipeline.

    Returns a normal Python dictionary so the backend
    can easily save it to the database.
    """

    result = analyze_incident(description)

    data = result.model_dump()

    data["risk_score"] = calculate_risk_score(result)

    return data