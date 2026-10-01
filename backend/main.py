from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from database import get_db


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="StudentOS API",
    description="Backend API for the StudentOS platform",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

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


# =========================================================
# PYDANTIC MODELS
# =========================================================

class SubjectCreate(BaseModel):
    name: str
    short_name: str
    progress: int = 0
    topics: int = 0
    assignments: int = 0
    color: str = "blue"


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    subject_id: int
    due_date: str | None = None
    priority: str = "Medium"
    status: str = "Pending"


class StudySessionCreate(BaseModel):
    subject_id: int

    # IMPORTANT:
    # Use real datetime objects instead of plain strings.
    start_time: datetime

    end_time: datetime | None = None

    duration_minutes: int = 0

    topic: str | None = None

    notes: str | None = None


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():
    return {
        "message": "StudentOS backend is running 🚀"
    }


# =========================================================
# SUBJECTS API
# =========================================================

@app.get("/subjects")
def get_subjects(
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            """
            SELECT *
            FROM subjects
            ORDER BY id
            """
        )
    )

    subjects = result.mappings().all()

    return {
        "subjects": subjects
    }


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


@app.post("/subjects")
def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db)
):

    try:

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

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create subject: {str(error)}"
        )


@app.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    subject: SubjectCreate,
    db: Session = Depends(get_db)
):

    try:

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

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update subject: {str(error)}"
        )


@app.delete("/subjects/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db)
):

    try:

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

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete subject: {str(error)}"
        )


# =========================================================
# TASKS API
# =========================================================

@app.get("/tasks")
def get_tasks(
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            """
            SELECT
                tasks.id,
                tasks.title,
                tasks.description,
                tasks.subject_id,
                subjects.name AS subject_name,
                subjects.short_name AS subject_short_name,
                tasks.due_date,
                tasks.priority,
                tasks.status,
                tasks.created_at
            FROM tasks
            JOIN subjects
                ON tasks.subject_id = subjects.id
            ORDER BY
                tasks.due_date NULLS LAST,
                tasks.id
            """
        )
    )

    tasks = result.mappings().all()

    return {
        "tasks": tasks
    }


@app.get("/tasks/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            """
            SELECT
                tasks.id,
                tasks.title,
                tasks.description,
                tasks.subject_id,
                subjects.name AS subject_name,
                subjects.short_name AS subject_short_name,
                tasks.due_date,
                tasks.priority,
                tasks.status,
                tasks.created_at
            FROM tasks
            JOIN subjects
                ON tasks.subject_id = subjects.id
            WHERE tasks.id = :task_id
            """
        ),
        {
            "task_id": task_id
        }
    )

    task = result.mappings().first()

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return {
        "task": task
    }


@app.post("/tasks")
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db)
):

    try:

        subject_result = db.execute(
            text(
                """
                SELECT id
                FROM subjects
                WHERE id = :subject_id
                """
            ),
            {
                "subject_id": task.subject_id
            }
        )

        subject = subject_result.first()

        if subject is None:
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        result = db.execute(
            text(
                """
                INSERT INTO tasks
                (
                    title,
                    description,
                    subject_id,
                    due_date,
                    priority,
                    status
                )
                VALUES
                (
                    :title,
                    :description,
                    :subject_id,
                    :due_date,
                    :priority,
                    :status
                )
                RETURNING id
                """
            ),
            {
                "title": task.title,
                "description": task.description,
                "subject_id": task.subject_id,
                "due_date": task.due_date,
                "priority": task.priority,
                "status": task.status,
            }
        )

        new_task_id = result.scalar_one()

        db.commit()

        created_task = db.execute(
            text(
                """
                SELECT
                    tasks.id,
                    tasks.title,
                    tasks.description,
                    tasks.subject_id,
                    subjects.name AS subject_name,
                    subjects.short_name AS subject_short_name,
                    tasks.due_date,
                    tasks.priority,
                    tasks.status,
                    tasks.created_at
                FROM tasks
                JOIN subjects
                    ON tasks.subject_id = subjects.id
                WHERE tasks.id = :task_id
                """
            ),
            {
                "task_id": new_task_id
            }
        ).mappings().one()

        return {
            "message": "Task created successfully",
            "task": created_task
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create task: {str(error)}"
        )


@app.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db)
):

    try:

        subject_result = db.execute(
            text(
                """
                SELECT id
                FROM subjects
                WHERE id = :subject_id
                """
            ),
            {
                "subject_id": task.subject_id
            }
        )

        subject = subject_result.first()

        if subject is None:
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        result = db.execute(
            text(
                """
                UPDATE tasks
                SET
                    title = :title,
                    description = :description,
                    subject_id = :subject_id,
                    due_date = :due_date,
                    priority = :priority,
                    status = :status
                WHERE id = :task_id
                RETURNING id
                """
            ),
            {
                "task_id": task_id,
                "title": task.title,
                "description": task.description,
                "subject_id": task.subject_id,
                "due_date": task.due_date,
                "priority": task.priority,
                "status": task.status,
            }
        )

        updated_task_id = result.scalar()

        if updated_task_id is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        db.commit()

        updated_task = db.execute(
            text(
                """
                SELECT
                    tasks.id,
                    tasks.title,
                    tasks.description,
                    tasks.subject_id,
                    subjects.name AS subject_name,
                    subjects.short_name AS subject_short_name,
                    tasks.due_date,
                    tasks.priority,
                    tasks.status,
                    tasks.created_at
                FROM tasks
                JOIN subjects
                    ON tasks.subject_id = subjects.id
                WHERE tasks.id = :task_id
                """
            ),
            {
                "task_id": task_id
            }
        ).mappings().one()

        return {
            "message": "Task updated successfully",
            "task": updated_task
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update task: {str(error)}"
        )


@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db)
):

    try:

        result = db.execute(
            text(
                """
                DELETE FROM tasks
                WHERE id = :task_id
                RETURNING *
                """
            ),
            {
                "task_id": task_id
            }
        )

        deleted_task = result.mappings().first()

        if deleted_task is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        db.commit()

        return {
            "message": "Task deleted successfully",
            "task": deleted_task
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete task: {str(error)}"
        )


# =========================================================
# STUDY SESSIONS API
# =========================================================

@app.get("/study-sessions")
def get_study_sessions(
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            """
            SELECT
                study_sessions.id,
                study_sessions.subject_id,
                subjects.name AS subject_name,
                subjects.short_name AS subject_short_name,
                study_sessions.start_time,
                study_sessions.end_time,
                study_sessions.duration_minutes,
                study_sessions.topic,
                study_sessions.notes,
                study_sessions.created_at
            FROM study_sessions
            JOIN subjects
                ON study_sessions.subject_id = subjects.id
            ORDER BY study_sessions.start_time DESC
            """
        )
    )

    sessions = result.mappings().all()

    return {
        "study_sessions": sessions
    }


@app.get("/study-sessions/{session_id}")
def get_study_session(
    session_id: int,
    db: Session = Depends(get_db)
):

    result = db.execute(
        text(
            """
            SELECT
                study_sessions.id,
                study_sessions.subject_id,
                subjects.name AS subject_name,
                subjects.short_name AS subject_short_name,
                study_sessions.start_time,
                study_sessions.end_time,
                study_sessions.duration_minutes,
                study_sessions.topic,
                study_sessions.notes,
                study_sessions.created_at
            FROM study_sessions
            JOIN subjects
                ON study_sessions.subject_id = subjects.id
            WHERE study_sessions.id = :session_id
            """
        ),
        {
            "session_id": session_id
        }
    )

    session = result.mappings().first()

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Study session not found"
        )

    return {
        "study_session": session
    }


# =========================================================
# CREATE STUDY SESSION
# =========================================================

@app.post("/study-sessions")
def create_study_session(
    study_session: StudySessionCreate,
    db: Session = Depends(get_db)
):

    try:

        # -------------------------------------------------
        # CHECK SUBJECT
        # -------------------------------------------------

        subject_result = db.execute(
            text(
                """
                SELECT id
                FROM subjects
                WHERE id = :subject_id
                """
            ),
            {
                "subject_id": study_session.subject_id
            }
        )

        subject = subject_result.first()

        if subject is None:
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        # -------------------------------------------------
        # INSERT SESSION
        # -------------------------------------------------

        result = db.execute(
            text(
                """
                INSERT INTO study_sessions
                (
                    subject_id,
                    start_time,
                    end_time,
                    duration_minutes,
                    topic,
                    notes
                )
                VALUES
                (
                    :subject_id,
                    :start_time,
                    :end_time,
                    :duration_minutes,
                    :topic,
                    :notes
                )
                RETURNING id
                """
            ),
            {
                "subject_id": study_session.subject_id,
                "start_time": study_session.start_time,
                "end_time": study_session.end_time,
                "duration_minutes": study_session.duration_minutes,
                "topic": study_session.topic,
                "notes": study_session.notes,
            }
        )

        new_session_id = result.scalar_one()

        # -------------------------------------------------
        # COMMIT
        # -------------------------------------------------

        db.commit()

        # -------------------------------------------------
        # FETCH CREATED SESSION
        # -------------------------------------------------

        created_session = db.execute(
            text(
                """
                SELECT
                    study_sessions.id,
                    study_sessions.subject_id,
                    subjects.name AS subject_name,
                    subjects.short_name AS subject_short_name,
                    study_sessions.start_time,
                    study_sessions.end_time,
                    study_sessions.duration_minutes,
                    study_sessions.topic,
                    study_sessions.notes,
                    study_sessions.created_at
                FROM study_sessions
                JOIN subjects
                    ON study_sessions.subject_id = subjects.id
                WHERE study_sessions.id = :session_id
                """
            ),
            {
                "session_id": new_session_id
            }
        ).mappings().one()

        return {
            "message": "Study session created successfully",
            "study_session": created_session
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:

        db.rollback()

        print("STUDY SESSION CREATE ERROR:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create study session: {str(error)}"
        )


# =========================================================
# UPDATE STUDY SESSION
# =========================================================

@app.put("/study-sessions/{session_id}")
def update_study_session(
    session_id: int,
    study_session: StudySessionCreate,
    db: Session = Depends(get_db)
):

    try:

        subject_result = db.execute(
            text(
                """
                SELECT id
                FROM subjects
                WHERE id = :subject_id
                """
            ),
            {
                "subject_id": study_session.subject_id
            }
        )

        subject = subject_result.first()

        if subject is None:
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        result = db.execute(
            text(
                """
                UPDATE study_sessions
                SET
                    subject_id = :subject_id,
                    start_time = :start_time,
                    end_time = :end_time,
                    duration_minutes = :duration_minutes,
                    topic = :topic,
                    notes = :notes
                WHERE id = :session_id
                RETURNING id
                """
            ),
            {
                "session_id": session_id,
                "subject_id": study_session.subject_id,
                "start_time": study_session.start_time,
                "end_time": study_session.end_time,
                "duration_minutes": study_session.duration_minutes,
                "topic": study_session.topic,
                "notes": study_session.notes,
            }
        )

        updated_session_id = result.scalar()

        if updated_session_id is None:
            raise HTTPException(
                status_code=404,
                detail="Study session not found"
            )

        db.commit()

        updated_session = db.execute(
            text(
                """
                SELECT
                    study_sessions.id,
                    study_sessions.subject_id,
                    subjects.name AS subject_name,
                    subjects.short_name AS subject_short_name,
                    study_sessions.start_time,
                    study_sessions.end_time,
                    study_sessions.duration_minutes,
                    study_sessions.topic,
                    study_sessions.notes,
                    study_sessions.created_at
                FROM study_sessions
                JOIN subjects
                    ON study_sessions.subject_id = subjects.id
                WHERE study_sessions.id = :session_id
                """
            ),
            {
                "session_id": session_id
            }
        ).mappings().one()

        return {
            "message": "Study session updated successfully",
            "study_session": updated_session
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update study session: {str(error)}"
        )


# =========================================================
# DELETE STUDY SESSION
# =========================================================

@app.delete("/study-sessions/{session_id}")
def delete_study_session(
    session_id: int,
    db: Session = Depends(get_db)
):

    try:

        result = db.execute(
            text(
                """
                DELETE FROM study_sessions
                WHERE id = :session_id
                RETURNING *
                """
            ),
            {
                "session_id": session_id
            }
        )

        deleted_session = result.mappings().first()

        if deleted_session is None:
            raise HTTPException(
                status_code=404,
                detail="Study session not found"
            )

        db.commit()

        return {
            "message": "Study session deleted successfully",
            "study_session": deleted_session
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete study session: {str(error)}"
        )