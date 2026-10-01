from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from database import get_db


app = FastAPI(
    title="StudentOS API",
    description="Backend API for the StudentOS platform",
    version="1.0.0",
)


# ========================================
# CORS
# ========================================

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


# ========================================
# Request schema
# ========================================

class SubjectCreate(BaseModel):
    name: str
    short_name: str
    progress: int = 0
    topics: int = 0
    assignments: int = 0
    color: str = "blue"


# ========================================
# Home
# ========================================

@app.get("/")
def home():

    return {
        "message": "StudentOS backend is running 🚀"
    }


# ========================================
# Get all subjects
# ========================================

@app.get("/subjects")
def get_subjects(
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            "SELECT * FROM subjects ORDER BY id"
        )
    )

    subjects = result.mappings().all()

    return {
        "subjects": subjects
    }


# ========================================
# Get one subject
# ========================================

@app.get("/subjects/{subject_id}")
def get_subject(
    subject_id: int,
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            """
            SELECT *
            FROM subjects
            WHERE id = :subject_id
            """
        ),
        {
            "subject_id": subject_id
        }
    )

    subject = result.mappings().first()

    if subject is None:

        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    return {
        "subject": subject
    }


# ========================================
# Create a new subject
# ========================================

@app.post("/subjects")
def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            """
            INSERT INTO subjects
            (
                name,
                short_name,
                progress,
                topics,
                assignments,
                color
            )
            VALUES
            (
                :name,
                :short_name,
                :progress,
                :topics,
                :assignments,
                :color
            )
            RETURNING *
            """
        ),
        {
            "name": subject.name,
            "short_name": subject.short_name,
            "progress": subject.progress,
            "topics": subject.topics,
            "assignments": subject.assignments,
            "color": subject.color,
        }
    )

    new_subject = result.mappings().one()

    db.commit()

    return {
        "message": "Subject created successfully",
        "subject": new_subject
    }


# ========================================
# Update an existing subject
# ========================================

@app.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    subject: SubjectCreate,
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            """
            UPDATE subjects
            SET
                name = :name,
                short_name = :short_name,
                progress = :progress,
                topics = :topics,
                assignments = :assignments,
                color = :color
            WHERE id = :subject_id
            RETURNING *
            """
        ),
        {
            "subject_id": subject_id,
            "name": subject.name,
            "short_name": subject.short_name,
            "progress": subject.progress,
            "topics": subject.topics,
            "assignments": subject.assignments,
            "color": subject.color,
        }
    )

    updated_subject = result.mappings().first()

    if updated_subject is None:

        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    db.commit()

    return {
        "message": "Subject updated successfully",
        "subject": updated_subject
    }


# ========================================
# Delete a subject
# ========================================

@app.delete("/subjects/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            """
            DELETE FROM subjects
            WHERE id = :subject_id
            RETURNING *
            """
        ),
        {
            "subject_id": subject_id
        }
    )

    deleted_subject = result.mappings().first()

    if deleted_subject is None:

        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    db.commit()

    return {
        "message": "Subject deleted successfully",
        "subject": deleted_subject
    }