from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from routers.auth import router as auth_router

app = FastAPI(
    title="HackMate Auth Service",
    version="1.0.0",
    swagger_ui_parameters={"persistAuthorization": True},
)

# Register bearer scheme so Swagger shows the Authorize button
bearer_scheme = HTTPBearer()

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

app.include_router(auth_router, prefix="/auth", tags=["auth"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "auth"}
