from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, CurrentUser
from schemas.notification import (
    AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse,
)
from services.push_service import (
    get_announcements, get_announcement_by_id,
    create_announcement, update_announcement, delete_announcement,
)

router = APIRouter()


@router.get("/", response_model=list[AnnouncementResponse])
def list_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    _, posts = get_announcements(db, role=current_user.role, skip=skip, limit=limit)
    return posts


@router.get("/{post_id}", response_model=AnnouncementResponse)
def get_announcement(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    post = get_announcement_by_id(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return post


@router.post("/", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return create_announcement(db, payload, current_user.user_id)


@router.put("/{post_id}", response_model=AnnouncementResponse)
def update_post(
    post_id: int,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    post = get_announcement_by_id(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return update_announcement(db, post, payload)


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    post = get_announcement_by_id(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Announcement not found")
    delete_announcement(db, post)
