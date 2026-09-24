import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    initiative_id = Column(UUID(as_uuid=True), ForeignKey("initiatives.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    overall_score = Column(Float, nullable=False)  # 0.00 - 100.00
    skill_score = Column(Float, nullable=False)
    semantic_score = Column(Float, nullable=False)
    experience_score = Column(Float, nullable=False)
    evidence_score = Column(Float, nullable=False)
    rank = Column(Integer, nullable=True)
    explanation = Column(Text, nullable=True)  # LLM-generated narrative explanation
    gap_summary = Column(JSONB, nullable=True)  # Structured gap breakdown
    evidence_items = Column(JSONB, nullable=True)  # Highlighted proof points
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        CheckConstraint("overall_score >= 0.0 AND overall_score <= 100.0", name="check_overall_score_range"),
    )

    # Relationships
    initiative = relationship("Initiative", back_populates="matches")
    employee = relationship("Employee", back_populates="matches")
    match_skills = relationship("MatchSkill", back_populates="match", cascade="all, delete-orphan")


class MatchSkill(Base):
    __tablename__ = "match_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    required_proficiency = Column(Integer, nullable=False)
    employee_proficiency = Column(Integer, nullable=False, default=0)
    match_type = Column(String(50), nullable=False)  # Direct, Transferable, Partial, Missing
    score = Column(Float, nullable=False, default=0.0)

    # Relationships
    match = relationship("Match", back_populates="match_skills")
    skill = relationship("Skill")
