import uuid
from datetime import date, datetime, timezone
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    Column,
    Date,
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


class Initiative(Base):
    __tablename__ = "initiatives"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    business_unit = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="Draft")  # Draft, Analyzing, Active, Staffed, Completed
    target_start_date = Column(Date, nullable=True)
    target_end_date = Column(Date, nullable=True)
    team_size = Column(Integer, nullable=False, default=3)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    raw_requirements = Column(Text, nullable=True)
    embedding = Column(Vector(1536), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    required_skills = relationship("InitiativeSkill", back_populates="initiative", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="initiative", cascade="all, delete-orphan")


class InitiativeSkill(Base):
    __tablename__ = "initiative_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    initiative_id = Column(UUID(as_uuid=True), ForeignKey("initiatives.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    min_proficiency = Column(Integer, nullable=False, default=3)  # 1-5
    importance = Column(String(50), nullable=False, default="Required")  # Required, Preferred, Nice-to-have
    weight = Column(Float, nullable=False, default=1.0)
    source = Column(String(50), default="ai_extracted")  # ai_extracted, manual

    __table_args__ = (
        CheckConstraint("min_proficiency >= 1 AND min_proficiency <= 5", name="check_min_proficiency_range"),
    )

    # Relationships
    initiative = relationship("Initiative", back_populates="required_skills")
    skill = relationship("Skill", back_populates="initiative_skills")
