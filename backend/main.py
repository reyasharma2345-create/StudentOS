from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db


app = FastAPI(
    title="StudentOS API",
    description="Backend API for the StudentOS platform",
    version="1.0.0",
)


# Allow the React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "StudentOS backend is running 🚀"
    }


@app.get("/subjects")
def get_subjects(db: Session = Depends(get_db)):
    result = db.execute(
        text("SELECT * FROM subjects ORDER BY id")
    )

    subjects = result.mappings().all()

    return {
        "subjects": subjects
    }