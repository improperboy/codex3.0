from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.chatbot import router as chatbot_router

app = FastAPI(title="HackMate Chatbot Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hackmate-frontend.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chatbot_router, prefix="/chatbot", tags=["chatbot"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "chatbot"}
