from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.teams import router as teams_router
from routers.join_requests import router as join_router
from routers.invitations import router as inv_router

app = FastAPI(
    title="HackMate Team Service",
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

app.include_router(teams_router, prefix="/teams", tags=["teams"])
app.include_router(join_router, prefix="/teams", tags=["join-requests"])
app.include_router(inv_router, prefix="/teams", tags=["invitations"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "team"}
