from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401  (ensures models are registered before create_all)
from app.routers import export, extraction, meta_analysis, prisma_flow, projects, screening, search

app = FastAPI(title="PRISMA Review Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


app.include_router(projects.router)
app.include_router(search.router)
app.include_router(screening.router)
app.include_router(prisma_flow.router)
app.include_router(extraction.router)
app.include_router(meta_analysis.router)
app.include_router(export.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
