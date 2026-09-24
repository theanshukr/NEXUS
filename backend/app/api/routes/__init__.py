from app.api.routes.auth import router as auth_router
from app.api.routes.skills import router as skills_router
from app.api.routes.employees import router as employees_router
from app.api.routes.initiatives import router as initiatives_router
from app.api.routes.matching import router as matching_router
from app.api.routes.dashboard import router as dashboard_router

__all__ = [
    "auth_router",
    "skills_router",
    "employees_router",
    "initiatives_router",
    "matching_router",
    "dashboard_router",
]
