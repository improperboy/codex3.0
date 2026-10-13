from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.event_wizard import router as event_wizard_router

app = FastAPI(title="HackMate AI Service", version="1.0.0")

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

app.include_router(event_wizard_router, prefix="/ai", tags=["ai"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai"}
