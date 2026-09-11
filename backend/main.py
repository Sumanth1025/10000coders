import json

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from models import Incident
from schemas import IncidentCreate, IncidentResponse
from ai_analyzer import analyze_incident


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="CrisisIQ API",
    description="AI-powered Crisis Intelligence Platform",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "CrisisIQ API is running 🚨",
        "status": "online"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.post("/incidents", response_model=IncidentResponse)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db)
):

    # 1. Send raw report to AI
    try:
        analysis = analyze_incident(
            incident.description,
            incident.location
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )

    # 2. Create database record
    new_incident = Incident(
        description=incident.description,
        location=incident.location,

        incident_type=analysis["incident_type"],
        severity=analysis["severity"],
        risk_score=analysis["risk_score"],

        people_affected=analysis["people_affected"],
        rescue_required=analysis["rescue_required"],

        recommended_actions=json.dumps(
            analysis["recommended_actions"]
        ),

        status="Analyzed"
    )

    # 3. Save to database
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)

    # 4. Convert JSON string back into list
    new_incident.recommended_actions = json.loads(
        new_incident.recommended_actions
    )

    return new_incident


@app.get("/incidents", response_model=list[IncidentResponse])
def get_incidents(
    db: Session = Depends(get_db)
):

    incidents = (
        db.query(Incident)
        .order_by(Incident.id.desc())
        .all()
    )

    for incident in incidents:
        incident.recommended_actions = json.loads(
            incident.recommended_actions
        )

    return incidents