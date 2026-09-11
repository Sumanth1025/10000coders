import json
import sys
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

# ============================================================
# CONNECT BACKEND TO PROJECT-LEVEL AI PACKAGE
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from database import engine, Base, get_db
from models import Incident

from schemas import (
    IncidentCreate,
    IncidentResponse,
    IncidentStatusUpdate,
)

from ai.analyzer import analyze_incident_with_score


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


def migrate_database():
    """
    Add new AI fields to an existing SQLite database
    without deleting existing incidents.
    """

    inspector = inspect(engine)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("incidents")
    }

    new_columns = {
        "people_trapped": "BOOLEAN DEFAULT 0",
        "road_blocked": "BOOLEAN DEFAULT 0",
        "summary": "TEXT",
    }

    with engine.begin() as connection:

        for column_name, column_definition in new_columns.items():

            if column_name not in existing_columns:

                connection.execute(
                    text(
                        f"ALTER TABLE incidents "
                        f"ADD COLUMN {column_name} "
                        f"{column_definition}"
                    )
                )


migrate_database()


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="CrisisIQ API",
    description="AI-powered Crisis Intelligence Platform",
    version="2.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# NORMALIZATION
# ============================================================

INCIDENT_TYPE_MAP = {
    "fire": "Fire",
    "flood": "Flood",
    "accident": "Accident",
    "medical": "Medical",
    "earthquake": "Earthquake",
    "building_collapse": "Building Collapse",
    "landslide": "Landslide",
    "storm": "Storm",
    "missing_person": "Missing Person",
    "other": "Other",
}


SEVERITY_MAP = {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
    "critical": "Critical",
}


def normalize_incident_type(value):
    if not value:
        return "Other"

    return INCIDENT_TYPE_MAP.get(
        str(value).lower(),
        str(value).title(),
    )


def normalize_severity(value):
    if not value:
        return "Low"

    return SEVERITY_MAP.get(
        str(value).lower(),
        str(value).title(),
    )


# ============================================================
# PRIORITY ENGINE
# ============================================================

def calculate_priority(incident):
    """
    CrisisIQ Priority Engine

    P1 = Critical disaster/crisis
    P2 = Urgent emergency
    P3 = Moderate incident
    P4 = Low priority
    """

    severity = str(incident.severity or "").strip().lower()
    incident_type = str(incident.incident_type or "").strip().lower()
    risk = max(0.0, min(100.0, float(incident.risk_score or 0)))

    # ==================================================
    # P1 — CRITICAL DISASTERS
    # These ALWAYS receive P1
    # ==================================================

    p1_types = {
        "fire",
        "flood",
        "earthquake",
        "building collapse",
        "building_collapse",
        "tsunami",
        "cyclone",
        "storm",
        "landslide",
        "chemical accident",
        "industrial accident",
        "major accident",
    }

    if incident_type in p1_types:
        return "P1", 400 + risk

    # ==================================================
    # P2 — URGENT
    # ==================================================

    p2_types = {
        "accident",
        "medical",
        "missing person",
    }

    if incident_type in p2_types:
        return "P2", 300 + risk

    # ==================================================
    # P1 based on extreme severity
    # ==================================================

    if severity == "critical" or risk >= 90:
        return "P1", 400 + risk

    # ==================================================
    # P2 based on high severity / rescue
    # ==================================================

    if severity == "high" or risk >= 65 or incident.rescue_required:
        return "P2", 300 + risk

    # ==================================================
    # P3 — MODERATE
    # ==================================================

    if severity == "medium" or risk >= 35:
        return "P3", 200 + risk

    # ==================================================
    # P4 — LOW
    # ==================================================

    return "P4", 100 + risk


# ============================================================
# RESPONSE CONVERTER
# ============================================================

def incident_to_response(incident):

    priority, priority_score = calculate_priority(
        incident
    )


    try:

        recommended_actions = json.loads(
            incident.recommended_actions or "[]"
        )

    except (json.JSONDecodeError, TypeError):

        recommended_actions = []


    return {
        "id": incident.id,

        "description": incident.description,

        "location": incident.location,

        "incident_type": incident.incident_type,

        "severity": incident.severity,

        "risk_score": incident.risk_score,

        "people_affected": bool(
            incident.people_affected
        ),

        "people_trapped": bool(
            incident.people_trapped
        ),

        "rescue_required": bool(
            incident.rescue_required
        ),

        "road_blocked": bool(
            incident.road_blocked
        ),

        "summary": incident.summary,

        "recommended_actions": recommended_actions,

        "status": incident.status,

        "priority": priority,

        "priority_score": priority_score,
    }


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "CrisisIQ API is running 🚨",
        "status": "online",
        "ai_engine": "Gemini",
        "version": "2.0.0",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "ai": "connected",
    }


# ============================================================
# CREATE INCIDENT
# ============================================================

@app.post(
    "/incidents",
    response_model=IncidentResponse,
)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # AI ANALYSIS
    # --------------------------------------------------------

    try:

        analysis = analyze_incident_with_score(
            incident.description
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}",
        )


    # --------------------------------------------------------
    # NORMALIZE AI OUTPUT
    # --------------------------------------------------------

    incident_type = normalize_incident_type(
        analysis.get("incident_type")
    )

    severity = normalize_severity(
        analysis.get("severity")
    )


    risk_score = float(
        analysis.get("risk_score", 0)
    )


    # --------------------------------------------------------
    # CREATE DATABASE RECORD
    # --------------------------------------------------------

    new_incident = Incident(

        description=incident.description,

        # User-entered location is authoritative.
        location=incident.location,

        incident_type=incident_type,

        severity=severity,

        risk_score=risk_score,

        people_affected=bool(
            analysis.get("people_affected", False)
        ),

        people_trapped=bool(
            analysis.get("people_trapped", False)
        ),

        rescue_required=bool(
            analysis.get("rescue_required", False)
        ),

        road_blocked=bool(
            analysis.get("road_blocked", False)
        ),

        summary=analysis.get("summary"),

        recommended_actions=json.dumps(
            analysis.get(
                "recommended_actions",
                []
            )
        ),

        status="Analyzed",
    )


    db.add(new_incident)

    db.commit()

    db.refresh(new_incident)


    return incident_to_response(
        new_incident
    )


# ============================================================
# GET ALL INCIDENTS
# ============================================================

@app.get(
    "/incidents",
    response_model=list[IncidentResponse],
)
def get_incidents(
    db: Session = Depends(get_db),
):

    incidents = (
        db.query(Incident)
        .order_by(Incident.id.desc())
        .all()
    )


    return [
        incident_to_response(incident)
        for incident in incidents
    ]


# ============================================================
# GET SINGLE INCIDENT
# ============================================================

@app.get(
    "/incidents/{incident_id}",
    response_model=IncidentResponse,
)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
):

    incident = (
        db.query(Incident)
        .filter(
            Incident.id == incident_id
        )
        .first()
    )


    if not incident:

        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )


    return incident_to_response(
        incident
    )


# ============================================================
# UPDATE STATUS
# ============================================================

@app.patch(
    "/incidents/{incident_id}/status",
    response_model=IncidentResponse,
)
def update_incident_status(
    incident_id: int,
    status_update: IncidentStatusUpdate,
    db: Session = Depends(get_db),
):

    incident = (
        db.query(Incident)
        .filter(
            Incident.id == incident_id
        )
        .first()
    )


    if not incident:

        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )


    allowed_statuses = [
        "Reported",
        "Analyzed",
        "Dispatched",
        "In Progress",
        "Resolved",
        "Closed",
    ]


    if status_update.status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid status",
                "allowed_statuses": allowed_statuses,
            },
        )


    incident.status = status_update.status


    db.commit()

    db.refresh(incident)


    return incident_to_response(
        incident
    )


# ============================================================
# DELETE INCIDENT
# ============================================================

@app.delete(
    "/incidents/{incident_id}"
)
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
):

    incident = (
        db.query(Incident)
        .filter(
            Incident.id == incident_id
        )
        .first()
    )


    if not incident:

        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )


    db.delete(incident)

    db.commit()


    return {
        "message": "Incident deleted successfully",
        "incident_id": incident_id,
    }