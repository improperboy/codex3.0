from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.rounds import router as rounds_router
from routers.scores import router as scores_router
from routers.rankings import router as rankings_router

app = FastAPI(
    title="HackMate Scoring Service",
    version="1.0.0",
    swagger_ui_parameters={"persistAuthorization": True},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hackmate-frontend-ten.vercel.app",
        "https://hackmate.dulify.in",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rounds_router, prefix="/rounds", tags=["rounds"])
app.include_router(scores_router, prefix="/scores", tags=["scores"])
app.include_router(rankings_router, prefix="/rankings", tags=["rankings"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "scoring"}
