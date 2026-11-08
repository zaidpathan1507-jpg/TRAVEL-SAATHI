from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from database import get_db
from serializers import load_experiences

router = APIRouter()


@router.get("/experiences")
def get_experiences() -> List[Dict[str, Any]]:
    """Full catalog of experiences, in the shape the React app uses"""
    with get_db() as db:
        return load_experiences(db)


@router.get("/experiences/{exp_id}")
def get_experience(exp_id: str) -> Dict[str, Any]:
    """A single experience by id"""
    with get_db() as db:
        found = load_experiences(db, only_id=exp_id)
        if not found:
            raise HTTPException(status_code=404, detail="Experience not found")
        return found[0]
