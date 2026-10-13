from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.users import router as users_router

app = FastAPI(
    title="HackMate User Service",
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

app.include_router(users_router, prefix="/users", tags=["users"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "user"}
