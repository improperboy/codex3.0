from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.submissions import router as submissions_router

app = FastAPI(
    title="HackMate Submission Service",
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

app.include_router(submissions_router, prefix="/submissions", tags=["submissions"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "submission"}
