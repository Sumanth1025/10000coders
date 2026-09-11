from pydantic import BaseModel


class IncidentCreate(BaseModel):
    description: str
    location: str


class IncidentResponse(BaseModel):
    id: int
    description: str
    location: str
    incident_type: str | None
    severity: str | None
    risk_score: float | None
    people_affected: bool
    rescue_required: bool
    recommended_actions: list[str]
    status: str

    class Config:
        from_attributes = True