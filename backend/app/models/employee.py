import uuid
from datetime import date, datetime, timezone
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    Boolean,
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


class Employee(Base):
    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    seniority = Column(String(50), nullable=False, index=True)  # Junior, Mid, Senior, Lead, Principal, Staff
    years_experience = Column(Float, nullable=False, default=0.0)
    availability = Column(String(50), nullable=False, default="Available")  # Available, Partially Available, Allocated
    location = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    certifications = Column(ARRAY(String), default=list)
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
    skills = relationship("EmployeeSkill", back_populates="employee", cascade="all, delete-orphan")
    projects = relationship("EmployeeProject", back_populates="employee", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="employee", cascade="all, delete-orphan")


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    proficiency = Column(Integer, nullable=False)  # 1-5
    years_experience = Column(Float, nullable=False, default=0.0)
    verified = Column(Boolean, default=False)
    last_used = Column(Date, nullable=True)
    evidence_count = Column(Integer, default=0)

    __table_args__ = (
        CheckConstraint("proficiency >= 1 AND proficiency <= 5", name="check_proficiency_range"),
    )

    # Relationships
    employee = relationship("Employee", back_populates="skills")
    skill = relationship("Skill", back_populates="employee_skills")


class EmployeeProject(Base):
    __tablename__ = "employee_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(255), nullable=False)
    technologies_used = Column(ARRAY(String), default=list)
    outcomes = Column(Text, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="projects")
    project = relationship("Project", back_populates="employee_projects")
