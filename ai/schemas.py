from typing import List, Optional
from pydantic import BaseModel


class IncidentAnalysis(BaseModel):
    incident_type: str
    severity: str
    location: Optional[str] = None

    people_affected: bool
    people_trapped: bool
    rescue_required: bool
    road_blocked: bool

    summary: str
    recommended_actions: List[str]