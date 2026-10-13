from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def chatbot_root():
    return {"message": "Chatbot service ready"}
