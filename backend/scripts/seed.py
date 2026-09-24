import asyncio
import uuid
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.skill import Skill
from app.models.employee import Employee, EmployeeSkill, EmployeeProject
from app.models.project import Project
from app.models.initiative import Initiative, InitiativeSkill


SKILLS_DATA = [
    # Languages
    {"name": "Python", "category": "Languages", "desc": "High-level programming language for backend & AI"},
    {"name": "TypeScript", "category": "Languages", "desc": "Typed JavaScript for scalable web apps"},
    {"name": "JavaScript", "category": "Languages", "desc": "Standard web scripting language"},
    {"name": "Go", "category": "Languages", "desc": "Fast compiled language for high-throughput microservices"},
    {"name": "Rust", "category": "Languages", "desc": "Memory-safe systems programming language"},
    {"name": "SQL", "category": "Languages", "desc": "Relational query language"},
    {"name": "Java", "category": "Languages", "desc": "Enterprise object-oriented language"},

    # Frameworks
    {"name": "FastAPI", "category": "Frameworks", "desc": "Modern high-performance async Python web framework"},
    {"name": "React", "category": "Frameworks", "desc": "Component-based UI library"},
    {"name": "Next.js", "category": "Frameworks", "desc": "Full-stack React framework with SSR"},
    {"name": "Node.js", "category": "Frameworks", "desc": "JavaScript runtime for backend services"},
    {"name": "Django", "category": "Frameworks", "desc": "Batteries-included Python web framework"},
    {"name": "Tailwind CSS", "category": "Frameworks", "desc": "Utility-first CSS framework"},
    {"name": "GraphQL", "category": "Frameworks", "desc": "Declarative API query language"},

    # Cloud & DevOps
    {"name": "AWS", "category": "Cloud", "desc": "Amazon Web Services cloud platform"},
    {"name": "Docker", "category": "Cloud", "desc": "Container packaging and virtualization platform"},
    {"name": "Kubernetes", "category": "Cloud", "desc": "Container orchestration engine"},
    {"name": "Terraform", "category": "Cloud", "desc": "Infrastructure as code declarative tool"},
    {"name": "CI/CD", "category": "Cloud", "desc": "Continuous integration and deployment pipelines"},
    {"name": "GCP", "category": "Cloud", "desc": "Google Cloud Platform"},

    # Data & AI
    {"name": "PostgreSQL", "category": "Data/AI", "desc": "Advanced open source relational database"},
    {"name": "pgvector", "category": "Data/AI", "desc": "Vector similarity search extension for Postgres"},
    {"name": "PyTorch", "category": "Data/AI", "desc": "Deep learning and neural network framework"},
    {"name": "LangChain", "category": "Data/AI", "desc": "Framework for developing LLM applications"},
    {"name": "RAG Systems", "category": "Data/AI", "desc": "Retrieval-Augmented Generation architectures"},
    {"name": "Redis", "category": "Data/AI", "desc": "In-memory caching and message broker"},
    {"name": "Elasticsearch", "category": "Data/AI", "desc": "Distributed search and analytics engine"},

    # Practices & Domains
    {"name": "System Architecture", "category": "Practices", "desc": "Large-scale distributed systems design"},
    {"name": "Microservices", "category": "Practices", "desc": "Decoupled service-oriented architectures"},
    {"name": "Agile Leadership", "category": "Practices", "desc": "Scrum and high-velocity team orchestration"},
    {"name": "Fintech & Payments", "category": "Domains", "desc": "High security financial ledger architectures"},
    {"name": "Healthcare & HIPAA", "category": "Domains", "desc": "HIPAA compliance and clinical data standards"},
]

EMPLOYEES_DATA = [
    {
        "name": "Sarah Chen",
        "email": "sarah.chen@nexus.corp",
        "title": "Principal AI Architect",
        "department": "Data & AI",
        "seniority": "Principal",
        "years_experience": 11.5,
        "availability": "Available",
        "location": "San Francisco, CA",
        "bio": "Specialized in production RAG systems, LLM orchestration, and high-throughput vector search pipelines. Led AI infrastructure migrations for Fortune 500 financial institutions.",
        "certifications": ["AWS Certified Solutions Architect - Professional", "Databricks Generative AI Master"],
        "skills": [
            ("Python", 5, 10.0, True),
            ("FastAPI", 5, 6.0, True),
            ("RAG Systems", 5, 3.5, True),
            ("LangChain", 4, 3.0, True),
            ("pgvector", 5, 2.5, True),
            ("PostgreSQL", 5, 9.0, True),
            ("PyTorch", 4, 6.0, True),
            ("Docker", 4, 7.0, True),
            ("System Architecture", 5, 8.0, True),
        ],
        "projects": [
            ("Enterprise GenAI Knowledge Graph", "Lead AI Architect", ["Python", "FastAPI", "pgvector", "LangChain"], "Engineered enterprise RAG assistant serving 25k employees with sub-200ms latency."),
            ("Real-Time Fraud Detection Engine", "Staff ML Engineer", ["PyTorch", "Python", "Kafka", "PostgreSQL"], "Built low-latency model inference reducing false positive alerts by 42%."),
        ]
    },
    {
        "name": "Alex Rivera",
        "email": "alex.rivera@nexus.corp",
        "title": "Senior Full-Stack Engineer",
        "department": "Engineering",
        "seniority": "Senior",
        "years_experience": 7.0,
        "availability": "Available",
        "location": "New York, NY",
        "bio": "Full-stack specialist with deep experience in React TypeScript design systems, async FastAPI services, and scalable cloud deployments.",
        "certifications": ["AWS Certified Developer Associate", "Meta Frontend Certified"],
        "skills": [
            ("React", 5, 7.0, True),
            ("TypeScript", 5, 6.0, True),
            ("Tailwind CSS", 5, 4.0, True),
            ("FastAPI", 4, 4.0, True),
            ("Python", 4, 5.0, True),
            ("PostgreSQL", 4, 5.0, True),
            ("Next.js", 4, 3.0, True),
            ("Docker", 4, 4.0, True),
        ],
        "projects": [
            ("Customer Portal 3.0 Redesign", "Lead Frontend Engineer", ["React", "TypeScript", "Tailwind CSS"], "Delivered unified dashboard increasing daily user engagement by 65%."),
            ("Omni-Channel Booking API", "Backend Engineer", ["FastAPI", "Python", "PostgreSQL", "Docker"], "Engineered async microservices handling 15M daily transactions."),
        ]
    },
    {
        "name": "Marcus Vance",
        "email": "marcus.vance@nexus.corp",
        "title": "Lead Cloud Infrastructure Engineer",
        "department": "Cloud Infrastructure",
        "seniority": "Lead",
        "years_experience": 9.0,
        "availability": "Partially Available",
        "location": "Austin, TX",
        "bio": "DevOps and cloud resilience architect focused on Kubernetes container orchestrations, multi-region failovers, and automated Terraform infrastructure.",
        "certifications": ["Certified Kubernetes Administrator (CKA)", "AWS DevOps Engineer Professional", "HashiCorp Terraform Associate"],
        "skills": [
            ("Kubernetes", 5, 6.0, True),
            ("Docker", 5, 8.0, True),
            ("AWS", 5, 8.0, True),
            ("Terraform", 5, 6.0, True),
            ("CI/CD", 5, 7.0, True),
            ("Python", 3, 4.0, True),
            ("Go", 4, 4.0, True),
        ],
        "projects": [
            ("Zero-Downtime Multi-Region Migration", "Lead Cloud Architect", ["AWS", "Kubernetes", "Terraform"], "Migrated 80+ microservices to multi-region EKS with 99.999% uptime."),
        ]
    },
    {
        "name": "Elena Rostova",
        "email": "elena.rostova@nexus.corp",
        "title": "Senior Data & ML Engineer",
        "department": "Data & AI",
        "seniority": "Senior",
        "years_experience": 6.5,
        "availability": "Available",
        "location": "Seattle, WA",
        "bio": "Data pipelines and machine learning platform engineer with proven track record in vector search, vector embeddings, and real-time streaming architectures.",
        "certifications": ["Google Professional Data Engineer", "AWS Machine Learning Specialty"],
        "skills": [
            ("Python", 5, 6.0, True),
            ("PostgreSQL", 4, 5.0, True),
            ("pgvector", 4, 2.0, True),
            ("PyTorch", 4, 4.0, True),
            ("FastAPI", 3, 3.0, True),
            ("Docker", 4, 4.0, True),
            ("SQL", 5, 6.5, True),
        ],
        "projects": [
            ("Semantic Product Catalog Search", "Senior ML Engineer", ["pgvector", "Python", "FastAPI"], "Replaced legacy lexical search with vector semantic embeddings improving conversion 28%."),
        ]
    },
    {
        "name": "David Kim",
        "email": "david.kim@nexus.corp",
        "title": "Frontend UI/UX Specialist",
        "department": "Product & Design",
        "seniority": "Mid",
        "years_experience": 4.0,
        "availability": "Available",
        "location": "San Francisco, CA",
        "bio": "Passionate about creating fluid, glassmorphic, accessible user interfaces with React, Tailwind CSS, and Framer Motion.",
        "certifications": ["Nielsen Norman UX Master"],
        "skills": [
            ("React", 5, 4.0, True),
            ("TypeScript", 4, 3.5, True),
            ("Tailwind CSS", 5, 4.0, True),
            ("JavaScript", 4, 4.0, True),
            ("Next.js", 3, 2.0, False),
        ],
        "projects": [
            ("Enterprise Design System Component Kit", "Frontend Specialist", ["React", "TypeScript", "Tailwind CSS"], "Unified 40+ UI components across 5 internal SaaS tools."),
        ]
    }
]

INITIATIVES_DATA = [
    {
        "title": "Enterprise GenAI Workforce Capability Platform",
        "description": "Build an enterprise AI platform that ingests unstructured strategic initiatives, extracts skill requirements via LLM, and calculates multi-dimensional match scores with explainable evidence.",
        "business_unit": "Enterprise AI & Strategy",
        "status": "Active",
        "target_start_date": date(2026, 10, 1),
        "target_end_date": date(2026, 12, 31),
        "team_size": 4,
        "required_skills": [
            ("FastAPI", 4, "Required", 1.5),
            ("React", 4, "Required", 1.4),
            ("Python", 4, "Required", 1.3),
            ("PostgreSQL", 4, "Required", 1.2),
            ("pgvector", 4, "Required", 1.5),
            ("RAG Systems", 4, "Preferred", 1.2),
            ("Docker", 3, "Preferred", 1.0),
            ("System Architecture", 4, "Required", 1.4),
        ]
    },
    {
        "title": "Global Multi-Cloud Resilience & Observability Hub",
        "description": "Establish automated Terraform orchestration and Kubernetes deployment telemetry for zero-downtime distributed computing.",
        "business_unit": "Cloud Infrastructure",
        "status": "Draft",
        "target_start_date": date(2026, 11, 1),
        "target_end_date": date(2027, 2, 28),
        "team_size": 3,
        "required_skills": [
            ("Kubernetes", 5, "Required", 1.5),
            ("Terraform", 4, "Required", 1.4),
            ("AWS", 4, "Required", 1.3),
            ("Docker", 4, "Required", 1.1),
            ("CI/CD", 4, "Preferred", 1.0),
        ]
    }
]


async def seed_database():
    print("🌱 Starting NEXUS database seeding...")
    async with AsyncSessionLocal() as db:
        # Create default manager user
        user = User(
            email="manager@nexus.ai",
            password_hash=get_password_hash("password123"),
            name="Alex Mercer (Talent Lead)",
            role="lead",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"✅ Created User: {user.email} (password: password123)")

        # Create skills
        skill_lookup = {}
        for s in SKILLS_DATA:
            skill = Skill(
                name=s["name"],
                category=s["category"],
                description=s["desc"],
            )
            db.add(skill)
            skill_lookup[s["name"]] = skill
        await db.commit()
        print(f"✅ Seeded {len(SKILLS_DATA)} Skills")

        # Create employees & skills
        for emp_info in EMPLOYEES_DATA:
            emp = Employee(
                name=emp_info["name"],
                email=emp_info["email"],
                title=emp_info["title"],
                department=emp_info["department"],
                seniority=emp_info["seniority"],
                years_experience=emp_info["years_experience"],
                availability=emp_info["availability"],
                location=emp_info["location"],
                bio=emp_info["bio"],
                certifications=emp_info["certifications"],
            )
            db.add(emp)
            await db.commit()
            await db.refresh(emp)

            # Add employee skills
            for s_name, prof, exp, ver in emp_info["skills"]:
                if s_name in skill_lookup:
                    emp_skill = EmployeeSkill(
                        employee_id=emp.id,
                        skill_id=skill_lookup[s_name].id,
                        proficiency=prof,
                        years_experience=exp,
                        verified=ver,
                        last_used=date(2026, 6, 1),
                        evidence_count=3 if ver else 1,
                    )
                    db.add(emp_skill)

            # Add projects
            for p_name, role, tech, outcomes in emp_info["projects"]:
                proj = Project(
                    name=p_name,
                    client="Nexus Internal",
                    description=outcomes,
                    domain="Enterprise Platform",
                    start_date=date(2025, 1, 1),
                    end_date=date(2026, 1, 1),
                )
                db.add(proj)
                await db.commit()
                await db.refresh(proj)

                emp_proj = EmployeeProject(
                    employee_id=emp.id,
                    project_id=proj.id,
                    role=role,
                    technologies_used=tech,
                    outcomes=outcomes,
                )
                db.add(emp_proj)

            await db.commit()
        print(f"✅ Seeded {len(EMPLOYEES_DATA)} Employees with Skills & Projects")

        # Create Initiatives
        for init_info in INITIATIVES_DATA:
            init = Initiative(
                title=init_info["title"],
                description=init_info["description"],
                business_unit=init_info["business_unit"],
                status=init_info["status"],
                target_start_date=init_info["target_start_date"],
                target_end_date=init_info["target_end_date"],
                team_size=init_info["team_size"],
                created_by=user.id,
            )
            db.add(init)
            await db.commit()
            await db.refresh(init)

            for s_name, min_prof, imp, wt in init_info["required_skills"]:
                if s_name in skill_lookup:
                    init_skill = InitiativeSkill(
                        initiative_id=init.id,
                        skill_id=skill_lookup[s_name].id,
                        min_proficiency=min_prof,
                        importance=imp,
                        weight=wt,
                        source="ai_extracted",
                    )
                    db.add(init_skill)

            await db.commit()
        print(f"✅ Seeded {len(INITIATIVES_DATA)} Strategic Initiatives")

    print("🎉 Database seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
