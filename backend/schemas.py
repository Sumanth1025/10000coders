from pydantic import BaseModel


class IncidentCreate(BaseModel):
    description: str
    location: str


class IncidentStatusUpdate(BaseModel):
    status: str


class IncidentResponse(BaseModel):
    id: int

    description: str

    location: str
    latitude: float | None
    longitude: float | None

    incident_type: str | None

    severity: str | None

    risk_score: float | None

    people_affected: bool

    people_trapped: bool

    rescue_required: bool

    road_blocked: bool

    summary: str | None

    recommended_actions: list[str]

    status: str

    priority: str

    priority_score: float

    class Config:
        from_attributes = True