import os
import json

from dotenv import load_dotenv
from google import genai

# Load .env and make sure it overrides any old environment variable
load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY")

print("GEMINI KEY LOADED:", bool(api_key))
print("GEMINI KEY END:", api_key[-4:] if api_key else "NONE")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=api_key)


def analyze_incident(description: str, location: str):

    prompt = f"""
You are an emergency incident intelligence analyst.

Analyze the following crisis report.

REPORT:
{description}

LOCATION:
{location}

Your task is to classify the emergency and provide actionable
emergency intelligence.

Rules:

1. incident_type must be exactly one of:
   Flood, Fire, Accident, Medical, Earthquake, Storm, Other

2. severity must be exactly one of:
   Low, Medium, High, Critical

3. risk_score must be a number between 0 and 100.

4. people_affected should be true when people are reported or
   reasonably indicated to be injured, trapped, missing, affected,
   or evacuated.

5. rescue_required should be true when immediate rescue or
   emergency intervention appears necessary.

6. Recommended actions must be practical, concise emergency actions.

7. Do not invent specific facts that are not present in the report.

Return only the requested structured JSON.
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": {
                "type": "OBJECT",
                "properties": {
                    "incident_type": {
                        "type": "STRING",
                        "enum": [
                            "Flood",
                            "Fire",
                            "Accident",
                            "Medical",
                            "Earthquake",
                            "Storm",
                            "Other"
                        ]
                    },
                    "severity": {
                        "type": "STRING",
                        "enum": [
                            "Low",
                            "Medium",
                            "High",
                            "Critical"
                        ]
                    },
                    "risk_score": {
                        "type": "NUMBER"
                    },
                    "people_affected": {
                        "type": "BOOLEAN"
                    },
                    "rescue_required": {
                        "type": "BOOLEAN"
                    },
                    "recommended_actions": {
                        "type": "ARRAY",
                        "items": {
                            "type": "STRING"
                        }
                    }
                },
                "required": [
                    "incident_type",
                    "severity",
                    "risk_score",
                    "people_affected",
                    "rescue_required",
                    "recommended_actions"
                ]
            }
        }
    )

    result = response.text

    print("GEMINI RESPONSE:")
    print(result)

    return json.loads(result)