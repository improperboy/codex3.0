from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, CurrentUser
from schemas.admin import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse
from models.announcement import Post
from routers.activity_logs import log_activity

router = APIRouter()


def _get_or_404(db: Session, post_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return post


@router.get("/", response_model=list[AnnouncementResponse])
def list_announcements(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    skip = (page - 1) * per_page
    q = db.query(Post)
    if current_user.role != "admin":
        q = q.filter(
            (Post.target_roles == None) |  # noqa: E711
            (Post.target_roles.like(f'%"{current_user.role}"%'))
        )
    posts = q.order_by(Post.is_pinned.desc(), Post.created_at.desc()).offset(skip).limit(per_page).all()
    return posts


@router.get("/{post_id}", response_model=AnnouncementResponse)
def get_announcement(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return _get_or_404(db, post_id)


@router.post("/", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    post = Post(
        title=payload.title,
        content=payload.content,
        link_url=payload.link_url,
        link_text=payload.link_text,
        author_id=current_user.user_id,
        is_pinned=payload.is_pinned,
        target_roles=payload.target_roles,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    log_activity(db, current_user.user_id, "create_announcement", "announcement", post.id, f"Created announcement '{post.title}'")
    return post


@router.put("/{post_id}", response_model=AnnouncementResponse)
def update_announcement(
    post_id: int,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    post = _get_or_404(db, post_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(post, field, value)
    db.commit()
    db.refresh(post)
    log_activity(db, current_user.user_id, "update_announcement", "announcement", post.id, f"Updated announcement '{post.title}'")
    return post


@router.delete("/{post_id}", status_code=204)
def delete_announcement(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    post = _get_or_404(db, post_id)
    title = post.title
    db.delete(post)
    db.commit()
    log_activity(db, current_user.user_id, "delete_announcement", "announcement", post_id, f"Deleted announcement '{title}'")
