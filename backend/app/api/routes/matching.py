from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.match import MatchOut
from app.services.matching_service import MatchingService

router = APIRouter(prefix="/initiatives", tags=["Matching"])


@router.post("/{initiative_id}/match", response_model=List[MatchOut])
async def run_initiative_matching(
    initiative_id: UUID,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute AI multi-dimensional matching engine for initiative talent discovery."""
    service = MatchingService(db)
    try:
        return await service.compute_matches_for_initiative(initiative_id=initiative_id, limit=limit)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{initiative_id}/matches", response_model=List[MatchOut])
async def get_initiative_matches(
    initiative_id: UUID,
    min_score: float = Query(0.0, ge=0.0, le=100.0),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch computed matches and gap breakdown for an initiative."""
    service = MatchingService(db)
    matches = await service.match_repo.get_matches_for_initiative(
        initiative_id=initiative_id,
        min_score=min_score,
        limit=limit,
    )
    if not matches:
        # If no matches exist yet, run matching automatically
        try:
            return await service.compute_matches_for_initiative(initiative_id=initiative_id, limit=limit)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return matches
