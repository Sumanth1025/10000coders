from sqlalchemy import Column, Integer, String, Boolean, Float, Text
from database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)

    description = Column(Text, nullable=False)

    incident_type = Column(String(50))

    severity = Column(String(20))

    risk_score = Column(Float)

    location = Column(String(200))

    people_affected = Column(Boolean, default=False)

    people_trapped = Column(Boolean, default=False)

    rescue_required = Column(Boolean, default=False)

    road_blocked = Column(Boolean, default=False)

    summary = Column(Text)

    recommended_actions = Column(Text)

    status = Column(
        String(30),
        default="Reported"
    )