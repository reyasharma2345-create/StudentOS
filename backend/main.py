from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import Optional
from database import get_db
import os
import httpx
from pypdf import PdfReader
from dotenv import load_dotenv
from google import genai
from google.genai import types
import json
import re


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash-lite"
)

gemini_client = None

if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )

# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="StudentOS API"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# BASIC ROUTES
# ============================================================

@app.get("/")
def root():
    return {
        "message": "StudentOS Backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# ============================================================
# SUBJECTS
# ============================================================

class SubjectCreate(BaseModel):
    name: str


def get_subject_syllabus_stats(
    subject_id: int,
    db: Session
):
    query = text("""
        SELECT
            COUNT(st.id) AS total_topics,
            COUNT(st.id) FILTER (
                WHERE LOWER(TRIM(st.status)) = 'completed'
            ) AS completed_topics
        FROM syllabus_topics st
        JOIN syllabus_units su
            ON st.unit_id = su.id
        WHERE su.subject_id = :subject_id
    """)

    row = db.execute(
        query,
        {
            "subject_id": subject_id
        }
    ).mappings().first()

    total_topics = (
        int(row["total_topics"] or 0)
        if row
        else 0
    )

    completed_topics = (
        int(row["completed_topics"] or 0)
        if row
        else 0
    )

    if total_topics > 0:
        progress = round(
            (completed_topics / total_topics) * 100
        )
    else:
        progress = 0

    return {
        "syllabus_topics": total_topics,
        "completed_topics": completed_topics,
        "progress": progress
    }


def calculate_subject_progress(
    subject_id: int,
    db: Session
):
    stats = get_subject_syllabus_stats(
        subject_id,
        db
    )

    return stats["progress"]


def calculate_overall_progress(
    subjects,
    db: Session
):
    total_topics = 0
    completed_topics = 0

    for subject in subjects:

        stats = get_subject_syllabus_stats(
            subject["id"],
            db
        )

        total_topics += stats["syllabus_topics"]
        completed_topics += stats["completed_topics"]

    if total_topics == 0:
        return 0

    return round(
        (completed_topics / total_topics) * 100
    )


@app.get("/subjects")
def get_subjects(
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT
            id,
            name
        FROM subjects
        ORDER BY id
    """)

    subjects = db.execute(
        query
    ).mappings().all()

    result = []

    for subject in subjects:

        stats = get_subject_syllabus_stats(
            subject["id"],
            db
        )

        result.append({
            "id": subject["id"],
            "name": subject["name"],
            "progress": stats["progress"],
            "syllabus_topics": stats["syllabus_topics"],
            "completed_topics": stats["completed_topics"]
        })

    return result


@app.get("/subjects/{subject_id}")
def get_subject(
    subject_id: int,
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT
            id,
            name
        FROM subjects
        WHERE id = :subject_id
    """)

    subject = db.execute(
        query,
        {
            "subject_id": subject_id
        }
    ).mappings().first()

    if not subject:
        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    stats = get_subject_syllabus_stats(
        subject_id,
        db
    )

    return {
        "id": subject["id"],
        "name": subject["name"],
        "progress": stats["progress"],
        "syllabus_topics": stats["syllabus_topics"],
        "completed_topics": stats["completed_topics"]
    }


@app.get("/progress")
def get_overall_progress(
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT
            id,
            name
        FROM subjects
        ORDER BY id
    """)

    subjects = db.execute(
        query
    ).mappings().all()

    total_topics = 0
    completed_topics = 0

    for subject in subjects:

        stats = get_subject_syllabus_stats(
            subject["id"],
            db
        )

        total_topics += stats["syllabus_topics"]
        completed_topics += stats["completed_topics"]

    progress = (
        round(
            (completed_topics / total_topics) * 100
        )
        if total_topics > 0
        else 0
    )

    return {
        "progress": progress,
        "total_topics": total_topics,
        "completed_topics": completed_topics
    }


@app.post("/subjects")
def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db)
):
    query = text("""
        INSERT INTO subjects (
            name
        )
        VALUES (
            :name
        )
        RETURNING
            id,
            name
    """)

    row = db.execute(
        query,
        {
            "name": subject.name
        }
    ).mappings().first()

    db.commit()

    return {
        "id": row["id"],
        "name": row["name"],
        "progress": 0,
        "syllabus_topics": 0,
        "completed_topics": 0
    }


@app.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    subject: SubjectCreate,
    db: Session = Depends(get_db)
):
    query = text("""
        UPDATE subjects
        SET
            name = :name
        WHERE id = :subject_id
        RETURNING
            id,
            name
    """)

    row = db.execute(
        query,
        {
            "subject_id": subject_id,
            "name": subject.name
        }
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    db.commit()

    stats = get_subject_syllabus_stats(
        subject_id,
        db
    )

    return {
        "id": row["id"],
        "name": row["name"],
        "progress": stats["progress"],
        "syllabus_topics": stats["syllabus_topics"],
        "completed_topics": stats["completed_topics"]
    }


@app.delete("/subjects/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db)
):
    query = text("""
        DELETE FROM subjects
        WHERE id = :subject_id
        RETURNING id
    """)

    row = db.execute(
        query,
        {
            "subject_id": subject_id
        }
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    db.commit()

    return {
        "message": "Subject deleted successfully"
    }


# ============================================================
# TASKS
# ============================================================

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: Optional[int] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Pending"


@app.get("/tasks")
def get_tasks(
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT
            t.id,
            t.title,
            t.description,
            t.subject_id,
            s.name AS subject_name,
            t.due_date,
            t.priority,
            t.status,
            t.created_at
        FROM tasks t
        LEFT JOIN subjects s
            ON t.subject_id = s.id
        ORDER BY
            t.due_date NULLS LAST,
            t.id DESC
    """)

    tasks = db.execute(
        query
    ).mappings().all()

    return [
        dict(task)
        for task in tasks
    ]


@app.get("/tasks/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT
            t.id,
            t.title,
            t.description,
            t.subject_id,
            s.name AS subject_name,
            t.due_date,
            t.priority,
            t.status,
            t.created_at
        FROM tasks t
        LEFT JOIN subjects s
            ON t.subject_id = s.id
        WHERE t.id = :task_id
    """)

    task = db.execute(
        query,
        {
            "task_id": task_id
        }
    ).mappings().first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return dict(task)


@app.post("/tasks")
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db)
):
    query = text("""
        INSERT INTO tasks (
            title,
            description,
            subject_id,
            due_date,
            priority,
            status
        )
        VALUES (
            :title,
            :description,
            :subject_id,
            :due_date,
            :priority,
            :status
        )
        RETURNING
            id,
            title,
            description,
            subject_id,
            due_date,
            priority,
            status,
            created_at
    """)

    row = db.execute(
        query,
        {
            "title": task.title,
            "description": task.description,
            "subject_id": task.subject_id,
            "due_date": task.due_date,
            "priority": task.priority,
            "status": task.status
        }
    ).mappings().first()

    db.commit()

    return dict(row)


@app.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db)
):
    query = text("""
        UPDATE tasks
        SET
            title = :title,
            description = :description,
            subject_id = :subject_id,
            due_date = :due_date,
            priority = :priority,
            status = :status
        WHERE id = :task_id
        RETURNING
            id,
            title,
            description,
            subject_id,
            due_date,
            priority,
            status,
            created_at
    """)

    row = db.execute(
        query,
        {
            "task_id": task_id,
            "title": task.title,
            "description": task.description,
            "subject_id": task.subject_id,
            "due_date": task.due_date,
            "priority": task.priority,
            "status": task.status
        }
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    db.commit()

    return dict(row)


@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    query = text("""
        DELETE FROM tasks
        WHERE id = :task_id
        RETURNING id
    """)

    row = db.execute(
        query,
        {
            "task_id": task_id
        }
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    db.commit()

    return {
        "message": "Task deleted successfully"
    }


# ============================================================
# STUDY SESSIONS
# ============================================================

class StudySessionCreate(BaseModel):
    subject_id: Optional[int] = None
    topic: Optional[str] = None
    duration_minutes: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    session_date: Optional[datetime] = None
    notes: Optional[str] = None


@app.get("/study-sessions")
def get_study_sessions(
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT
            ss.id,
            ss.subject_id,
            s.name AS subject_name,
            ss.topic,
            ss.duration_minutes,
            ss.start_time,
            ss.end_time,
            ss.notes,
            ss.created_at
        FROM study_sessions ss
        LEFT JOIN subjects s
            ON ss.subject_id = s.id
        ORDER BY
            ss.start_time DESC,
            ss.id DESC
    """)

    sessions = db.execute(
        query
    ).mappings().all()

    return [
        dict(session)
        for session in sessions
    ]


@app.get("/study-sessions/{session_id}")
def get_study_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT
            ss.id,
            ss.subject_id,
            s.name AS subject_name,
            ss.topic,
            ss.duration_minutes,
            ss.start_time,
            ss.end_time,
            ss.notes,
            ss.created_at
        FROM study_sessions ss
        LEFT JOIN subjects s
            ON ss.subject_id = s.id
        WHERE ss.id = :session_id
    """)

    session = db.execute(
        query,
        {
            "session_id": session_id
        }
    ).mappings().first()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Study session not found"
        )

    return dict(session)


@app.post("/study-sessions")
def create_study_session(
    session: StudySessionCreate,
    db: Session = Depends(get_db)
):
    start_time = (
        session.start_time
        or session.session_date
        or datetime.now()
    )

    end_time = session.end_time

    if end_time is None:
        end_time = start_time + timedelta(
            minutes=session.duration_minutes
        )

    query = text("""
        INSERT INTO study_sessions (
            subject_id,
            topic,
            duration_minutes,
            start_time,
            end_time,
            notes
        )
        VALUES (
            :subject_id,
            :topic,
            :duration_minutes,
            :start_time,
            :end_time,
            :notes
        )
        RETURNING
            id,
            subject_id,
            topic,
            duration_minutes,
            start_time,
            end_time,
            notes,
            created_at
    """)

    row = db.execute(
        query,
        {
            "subject_id": session.subject_id,
            "topic": session.topic,
            "duration_minutes": session.duration_minutes,
            "start_time": start_time,
            "end_time": end_time,
            "notes": session.notes
        }
    ).mappings().first()

    db.commit()

    return dict(row)


@app.put("/study-sessions/{session_id}")
def update_study_session(
    session_id: int,
    session: StudySessionCreate,
    db: Session = Depends(get_db)
):
    start_time = (
        session.start_time
        or session.session_date
    )

    if start_time is None:
        start_time = datetime.now()

    end_time = session.end_time

    if end_time is None:
        end_time = start_time + timedelta(
            minutes=session.duration_minutes
        )

    query = text("""
        UPDATE study_sessions
        SET
            subject_id = :subject_id,
            topic = :topic,
            duration_minutes = :duration_minutes,
            start_time = :start_time,
            end_time = :end_time,
            notes = :notes
        WHERE id = :session_id
        RETURNING
            id,
            subject_id,
            topic,
            duration_minutes,
            start_time,
            end_time,
            notes,
            created_at
    """)

    row = db.execute(
        query,
        {
            "session_id": session_id,
            "subject_id": session.subject_id,
            "topic": session.topic,
            "duration_minutes": session.duration_minutes,
            "start_time": start_time,
            "end_time": end_time,
            "notes": session.notes
        }
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Study session not found"
        )

    db.commit()

    return dict(row)


@app.delete("/study-sessions/{session_id}")
def delete_study_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    query = text("""
        DELETE FROM study_sessions
        WHERE id = :session_id
        RETURNING id
    """)

    row = db.execute(
        query,
        {
            "session_id": session_id
        }
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Study session not found"
        )

    db.commit()

    return {
        "message": "Study session deleted successfully"
    }


# ============================================================
# SYLLABUS
# ============================================================

def build_syllabus(
    subject_id: int,
    db: Session
):
    units_query = text("""
        SELECT
            id,
            unit_number,
            unit_name
        FROM syllabus_units
        WHERE subject_id = :subject_id
        ORDER BY unit_number
    """)

    units = db.execute(
        units_query,
        {
            "subject_id": subject_id
        }
    ).mappings().all()

    result = []

    for unit in units:

        topics_query = text("""
            SELECT
                id,
                topic_name,
                status,
                mastery
            FROM syllabus_topics
            WHERE unit_id = :unit_id
            ORDER BY id
        """)

        topics = db.execute(
            topics_query,
            {
                "unit_id": unit["id"]
            }
        ).mappings().all()

        result.append({
            "id": unit["id"],
            "unit_number": unit["unit_number"],
            "unit_name": unit["unit_name"],
            "topics": [
                dict(topic)
                for topic in topics
            ]
        })

    return result


@app.get("/syllabus/{subject_id}")
def get_syllabus(
    subject_id: int,
    db: Session = Depends(get_db)
):
    subject_query = text("""
        SELECT
            id,
            name
        FROM subjects
        WHERE id = :subject_id
    """)

    subject = db.execute(
        subject_query,
        {
            "subject_id": subject_id
        }
    ).mappings().first()

    if not subject:
        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    result = build_syllabus(
        subject_id,
        db
    )

    return {
        "subject_id": subject_id,
        "subject_name": subject["name"],
        "units": result
    }


@app.get("/subjects/{subject_id}/syllabus")
def get_subject_syllabus(
    subject_id: int,
    db: Session = Depends(get_db)
):
    subject_query = text("""
        SELECT
            id,
            name
        FROM subjects
        WHERE id = :subject_id
    """)

    subject = db.execute(
        subject_query,
        {
            "subject_id": subject_id
        }
    ).mappings().first()

    if not subject:
        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    return build_syllabus(
        subject_id,
        db
    )


class TopicStatusUpdate(BaseModel):
    status: Optional[str] = None
    mastery: Optional[int] = None


@app.put("/syllabus/topics/{topic_id}")
def update_syllabus_topic(
    topic_id: int,
    update: TopicStatusUpdate,
    db: Session = Depends(get_db)
):
    if update.mastery is not None:

        if update.mastery < 0 or update.mastery > 100:

            raise HTTPException(
                status_code=400,
                detail="Mastery must be between 0 and 100"
            )

    query = text("""
        UPDATE syllabus_topics
        SET
            status = COALESCE(:status, status),
            mastery = COALESCE(:mastery, mastery)
        WHERE id = :topic_id
        RETURNING
            id,
            unit_id,
            topic_name,
            status,
            mastery
    """)

    row = db.execute(
        query,
        {
            "topic_id": topic_id,
            "status": update.status,
            "mastery": update.mastery
        }
    ).mappings().first()

    if not row:

        raise HTTPException(
            status_code=404,
            detail="Syllabus topic not found"
        )

    db.commit()

    return dict(row)


# ============================================================
# SYLLABUS TOPIC SEARCH
# ============================================================

def ai_find_syllabus_topic(
    query: str,
    subject_id: Optional[int],
    db: Session
):
    """
    Search syllabus topics by exact or partial topic name.

    This is intentionally separate from the mutation tools so the
    AI can resolve a human topic name into a real database topic ID
    before changing completion or mastery.
    """

    if not query or not query.strip():

        return {
            "success": False,
            "error": "Topic search query cannot be empty"
        }

    search_query = query.strip()

    sql = text("""
        SELECT
            st.id,
            st.topic_name,
            st.status,
            st.mastery,
            su.id AS unit_id,
            su.unit_number,
            su.unit_name,
            su.subject_id,
            s.name AS subject_name
        FROM syllabus_topics st
        JOIN syllabus_units su
            ON st.unit_id = su.id
        JOIN subjects s
            ON su.subject_id = s.id
        WHERE
            LOWER(st.topic_name) LIKE LOWER(:search)
            AND (
                :subject_id IS NULL
                OR su.subject_id = :subject_id
            )
        ORDER BY
            CASE
                WHEN LOWER(st.topic_name) = LOWER(:exact_query)
                    THEN 0
                WHEN LOWER(st.topic_name) LIKE LOWER(:starts_with)
                    THEN 1
                ELSE 2
            END,
            st.id
        LIMIT 10
    """)

    rows = db.execute(
        sql,
        {
            "search": f"%{search_query}%",
            "exact_query": search_query,
            "starts_with": f"{search_query}%"
            ,
            "subject_id": subject_id
        }
    ).mappings().all()

    topics = []

    for row in rows:

        topics.append({
            "id": row["id"],
            "topic_name": row["topic_name"],
            "status": row["status"],
            "mastery": row["mastery"],
            "unit_id": row["unit_id"],
            "unit_number": row["unit_number"],
            "unit_name": row["unit_name"],
            "subject_id": row["subject_id"],
            "subject_name": row["subject_name"]
        })

    return {
        "success": True,
        "count": len(topics),
        "topics": topics
    }


# ============================================================
# SYLLABUS PDF UPLOAD
# ============================================================

@app.post("/syllabus/upload")
async def upload_syllabus(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    upload_directory = "uploads"

    os.makedirs(
        upload_directory,
        exist_ok=True
    )

    file_path = os.path.join(
        upload_directory,
        file.filename
    )

    content = await file.read()

    with open(
        file_path,
        "wb"
    ) as output_file:

        output_file.write(content)

    try:

        reader = PdfReader(file_path)

        extracted_text = ""

        for page in reader.pages:

            page_text = page.extract_text()

            if page_text:
                extracted_text += page_text + "\n"

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Could not read PDF: {str(error)}"
        )

    return {
        "message": "Syllabus PDF uploaded successfully",
        "filename": file.filename,
        "pages": len(reader.pages),
        "text_length": len(extracted_text)
    }


# ============================================================
# RESEARCH / OPENALEX
# ============================================================

async def search_openalex(
    query: str,
    limit: int = 5
):
    url = "https://api.openalex.org/works"

    params = {
        "filter": f"display_name.search:{query}",
        "per_page": limit
    }

    async with httpx.AsyncClient(
        timeout=20
    ) as client:

        response = await client.get(
            url,
            params=params
        )

        response.raise_for_status()

        return response.json()


def extract_abstract(
    inverted_index
):
    if not inverted_index:
        return ""

    words = []

    for word, positions in inverted_index.items():

        for position in positions:

            words.append(
                (position, word)
            )

    words.sort(
        key=lambda item: item[0]
    )

    return " ".join(
        word
        for _, word in words
    )


@app.get("/research")
async def research(
    query: str,
    limit: int = 5
):
    if not query.strip():

        raise HTTPException(
            status_code=400,
            detail="Research query cannot be empty"
        )

    if limit < 1 or limit > 50:

        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 50"
        )

    try:

        data = await search_openalex(
            query,
            limit
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Research API error: {str(error)}"
        )

    results = []

    for work in data.get(
        "results",
        []
    ):

        authors = []

        for authorship in work.get(
            "authorships",
            []
        ):

            author = authorship.get(
                "author"
            )

            if author:

                authors.append(
                    author.get(
                        "display_name"
                    )
                )

        open_access = work.get(
            "open_access"
        ) or {}

        results.append({
            "id": work.get("id"),
            "title": work.get("title"),
            "publication_year": work.get(
                "publication_year"
            ),
            "publication_date": work.get(
                "publication_date"
            ),
            "type": work.get("type"),
            "doi": work.get("doi"),
            "cited_by_count": work.get(
                "cited_by_count",
                0
            ),
            "authors": authors,
            "abstract": extract_abstract(
                work.get(
                    "abstract_inverted_index"
                )
            ),
            "open_access": open_access.get(
                "is_oa",
                False
            )
        })

    return {
        "query": query,
        "count": len(results),
        "results": results
    }


# ============================================================
# AI INTENT
# ============================================================

class AIIntentRequest(BaseModel):
    message: str


def detect_ai_intent(
    message: str
):
    text_message = message.lower().strip()

    research_keywords = [
        "research",
        "paper",
        "papers",
        "journal",
        "study",
        "studies",
        "latest research",
        "literature",
        "citation",
        "citation paper",
        "academic paper"
    ]

    learning_keywords = [
        "explain",
        "teach",
        "learn",
        "what is",
        "how does",
        "how do",
        "difference",
        "meaning",
        "example",
        "understand"
    ]

    research_match = any(
        keyword in text_message
        for keyword in research_keywords
    )

    learning_match = any(
        keyword in text_message
        for keyword in learning_keywords
    )

    if research_match and learning_match:
        intent = "BOTH"

    elif research_match:
        intent = "RESEARCH"

    else:
        intent = "LEARN"

    return intent


@app.post("/ai/intent")
def ai_intent(
    request: AIIntentRequest
):
    intent = detect_ai_intent(
        request.message
    )

    return {
        "message": request.message,
        "intent": intent
    }


# ============================================================
# STUDENT CONTEXT
# ============================================================

class AIMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    message: str

    history: Optional[list[AIMessage]] = Field(
        default_factory=list
    )

    subject_id: Optional[int] = None


def get_student_context(
    db: Session,
    subject_id: Optional[int] = None
):
    # --------------------------------------------------------
    # SUBJECTS
    # --------------------------------------------------------

    subjects_query = text("""
        SELECT
            id,
            name
        FROM subjects
        ORDER BY id
    """)

    subjects = db.execute(
        subjects_query
    ).mappings().all()

    subject_context = []

    for subject in subjects:

        stats = get_subject_syllabus_stats(
            subject["id"],
            db
        )

        topics_query = text("""
            SELECT
                st.id,
                st.topic_name,
                st.status,
                st.mastery,
                su.unit_number,
                su.unit_name
            FROM syllabus_topics st
            JOIN syllabus_units su
                ON st.unit_id = su.id
            WHERE su.subject_id = :subject_id
            ORDER BY su.unit_number, st.id
        """)

        topics = db.execute(
            topics_query,
            {"subject_id": subject["id"]}
        ).mappings().all()

        topic_context = [
            {
                "id": topic["id"],
                "topic_name": topic["topic_name"],
                "status": topic["status"],
                "mastery": topic["mastery"],
                "unit_number": topic["unit_number"],
                "unit_name": topic["unit_name"]
            }
            for topic in topics
        ]

        subject_context.append({
            "id": subject["id"],
            "name": subject["name"],
            "progress": stats["progress"],
            "total_topics": stats["syllabus_topics"],
            "completed_topics": stats["completed_topics"],
            "topics": topic_context
        })

    # --------------------------------------------------------
    # PENDING TASKS
    # --------------------------------------------------------

    tasks_query = text("""
        SELECT
            t.id,
            t.title,
            t.description,
            t.due_date,
            t.priority,
            t.status,
            s.name AS subject_name
        FROM tasks t
        LEFT JOIN subjects s
            ON t.subject_id = s.id
        WHERE LOWER(
            COALESCE(t.status, 'Pending')
        ) != 'completed'
        ORDER BY
            t.due_date NULLS LAST,
            t.id DESC
        LIMIT 20
    """)

    tasks = db.execute(
        tasks_query
    ).mappings().all()

    task_context = []

    for task in tasks:

        task_context.append({
            "id": task["id"],
            "title": task["title"],
            "description": task["description"],
            "subject": task["subject_name"],
            "due_date": (
                task["due_date"].isoformat()
                if task["due_date"]
                else None
            ),
            "priority": task["priority"],
            "status": task["status"]
        })

    # --------------------------------------------------------
    # OVERALL PROGRESS
    # --------------------------------------------------------

    overall_query = text("""
        SELECT
            COUNT(st.id) AS total_topics,
            COUNT(st.id) FILTER (
                WHERE LOWER(TRIM(st.status)) = 'completed'
            ) AS completed_topics
        FROM syllabus_topics st
        JOIN syllabus_units su
            ON st.unit_id = su.id
    """)

    overall = db.execute(
        overall_query
    ).mappings().first()

    total_topics = (
        int(overall["total_topics"] or 0)
        if overall
        else 0
    )

    completed_topics = (
        int(overall["completed_topics"] or 0)
        if overall
        else 0
    )

    overall_progress = (
        round(
            (completed_topics / total_topics) * 100
        )
        if total_topics > 0
        else 0
    )

    # --------------------------------------------------------
    # SELECTED SUBJECT
    # --------------------------------------------------------

    selected_subject = None

    if subject_id is not None:

        selected_subject = next(
            (
                subject
                for subject in subject_context
                if subject["id"] == subject_id
            ),
            None
        )

    return {
        "overall_progress": overall_progress,
        "completed_topics": completed_topics,
        "total_topics": total_topics,
        "subjects": subject_context,
        "pending_tasks": task_context,
        "selected_subject": selected_subject
    }


# ============================================================
# AI ACTION FUNCTIONS
# ============================================================

def ai_mark_topic_completed(
    topic_id: int,
    db: Session
):
    query = text("""
        UPDATE syllabus_topics
        SET
            status = 'completed',
            mastery = 100
        WHERE id = :topic_id
        RETURNING
            id,
            unit_id,
            topic_name,
            status,
            mastery
    """)

    row = db.execute(
        query,
        {
            "topic_id": topic_id
        }
    ).mappings().first()

    if not row:

        return {
            "success": False,
            "error": "Syllabus topic not found"
        }

    db.commit()

    return {
        "success": True,
        "message": "Topic marked as completed",
        "topic": dict(row)
    }


def ai_update_topic_mastery(
    topic_id: int,
    mastery: int,
    db: Session
):
    if mastery < 0 or mastery > 100:

        return {
            "success": False,
            "error": "Mastery must be between 0 and 100"
        }

    status = (
        "completed"
        if mastery == 100
        else "in_progress"
    )

    query = text("""
        UPDATE syllabus_topics
        SET
            mastery = :mastery,
            status = :status
        WHERE id = :topic_id
        RETURNING
            id,
            unit_id,
            topic_name,
            status,
            mastery
    """)

    row = db.execute(
        query,
        {
            "topic_id": topic_id,
            "mastery": mastery,
            "status": status
        }
    ).mappings().first()

    if not row:

        return {
            "success": False,
            "error": "Syllabus topic not found"
        }

    db.commit()

    return {
        "success": True,
        "message": "Topic mastery updated",
        "topic": dict(row)
    }


def ai_create_task(
    title: str,
    description: Optional[str],
    subject_id: Optional[int],
    due_date: Optional[str],
    priority: str,
    status: str,
    db: Session
):
    parsed_due_date = None

    if due_date:

        try:

            parsed_due_date = datetime.fromisoformat(
                due_date.replace("Z", "+00:00")
            )

        except ValueError:

            return {
                "success": False,
                "error": "Invalid due_date format. Use ISO 8601."
            }

    if subject_id is not None:

        subject_check = db.execute(
            text("""
                SELECT id
                FROM subjects
                WHERE id = :subject_id
            """),
            {
                "subject_id": subject_id
            }
        ).first()

        if not subject_check:

            return {
                "success": False,
                "error": "Subject not found"
            }

    query = text("""
        INSERT INTO tasks (
            title,
            description,
            subject_id,
            due_date,
            priority,
            status
        )
        VALUES (
            :title,
            :description,
            :subject_id,
            :due_date,
            :priority,
            :status
        )
        RETURNING
            id,
            title,
            description,
            subject_id,
            due_date,
            priority,
            status,
            created_at
    """)

    row = db.execute(
        query,
        {
            "title": title,
            "description": description,
            "subject_id": subject_id,
            "due_date": parsed_due_date,
            "priority": priority,
            "status": status
        }
    ).mappings().first()

    db.commit()

    return {
        "success": True,
        "message": "Task created successfully",
        "task": dict(row)
    }


def ai_update_task(
    task_id: int,
    title: Optional[str],
    description: Optional[str],
    subject_id: Optional[int],
    due_date: Optional[str],
    priority: Optional[str],
    status: Optional[str],
    db: Session
):
    existing = db.execute(
        text("""
            SELECT
                id,
                title,
                description,
                subject_id,
                due_date,
                priority,
                status
            FROM tasks
            WHERE id = :task_id
        """),
        {
            "task_id": task_id
        }
    ).mappings().first()

    if not existing:

        return {
            "success": False,
            "error": "Task not found"
        }

    parsed_due_date = existing["due_date"]

    if due_date is not None:

        try:

            parsed_due_date = datetime.fromisoformat(
                due_date.replace("Z", "+00:00")
            )

        except ValueError:

            return {
                "success": False,
                "error": "Invalid due_date format. Use ISO 8601."
            }

    new_title = (
        title
        if title is not None
        else existing["title"]
    )

    new_description = (
        description
        if description is not None
        else existing["description"]
    )

    new_subject_id = (
        subject_id
        if subject_id is not None
        else existing["subject_id"]
    )

    new_priority = (
        priority
        if priority is not None
        else existing["priority"]
    )

    new_status = (
        status
        if status is not None
        else existing["status"]
    )

    if new_subject_id is not None:

        subject_check = db.execute(
            text("""
                SELECT id
                FROM subjects
                WHERE id = :subject_id
            """),
            {
                "subject_id": new_subject_id
            }
        ).first()

        if not subject_check:

            return {
                "success": False,
                "error": "Subject not found"
            }

    query = text("""
        UPDATE tasks
        SET
            title = :title,
            description = :description,
            subject_id = :subject_id,
            due_date = :due_date,
            priority = :priority,
            status = :status
        WHERE id = :task_id
        RETURNING
            id,
            title,
            description,
            subject_id,
            due_date,
            priority,
            status,
            created_at
    """)

    row = db.execute(
        query,
        {
            "task_id": task_id,
            "title": new_title,
            "description": new_description,
            "subject_id": new_subject_id,
            "due_date": parsed_due_date,
            "priority": new_priority,
            "status": new_status
        }
    ).mappings().first()

    db.commit()

    return {
        "success": True,
        "message": "Task updated successfully",
        "task": dict(row)
    }


def ai_delete_task(
    task_id: int,
    db: Session
):
    query = text("""
        DELETE FROM tasks
        WHERE id = :task_id
        RETURNING id, title
    """)

    row = db.execute(
        query,
        {
            "task_id": task_id
        }
    ).mappings().first()

    if not row:

        return {
            "success": False,
            "error": "Task not found"
        }

    db.commit()

    return {
        "success": True,
        "message": "Task deleted successfully",
        "task": dict(row)
    }


def ai_create_study_session(
    subject_id: Optional[int],
    topic: Optional[str],
    duration_minutes: int,
    start_time: Optional[str],
    end_time: Optional[str],
    notes: Optional[str],
    db: Session
):
    if duration_minutes <= 0:

        return {
            "success": False,
            "error": "duration_minutes must be greater than 0"
        }

    if subject_id is not None:

        subject_check = db.execute(
            text("""
                SELECT id
                FROM subjects
                WHERE id = :subject_id
            """),
            {
                "subject_id": subject_id
            }
        ).first()

        if not subject_check:

            return {
                "success": False,
                "error": "Subject not found"
            }

    parsed_start = None
    parsed_end = None

    if start_time:

        try:

            parsed_start = datetime.fromisoformat(
                start_time.replace("Z", "+00:00")
            )

        except ValueError:

            return {
                "success": False,
                "error": "Invalid start_time format"
            }

    if end_time:

        try:

            parsed_end = datetime.fromisoformat(
                end_time.replace("Z", "+00:00")
            )

        except ValueError:

            return {
                "success": False,
                "error": "Invalid end_time format"
            }

    if parsed_start is None:
        parsed_start = datetime.now()

    if parsed_end is None:

        parsed_end = parsed_start + timedelta(
            minutes=duration_minutes
        )

    query = text("""
        INSERT INTO study_sessions (
            subject_id,
            topic,
            duration_minutes,
            start_time,
            end_time,
            notes
        )
        VALUES (
            :subject_id,
            :topic,
            :duration_minutes,
            :start_time,
            :end_time,
            :notes
        )
        RETURNING
            id,
            subject_id,
            topic,
            duration_minutes,
            start_time,
            end_time,
            notes,
            created_at
    """)

    row = db.execute(
        query,
        {
            "subject_id": subject_id,
            "topic": topic,
            "duration_minutes": duration_minutes,
            "start_time": parsed_start,
            "end_time": parsed_end,
            "notes": notes
        }
    ).mappings().first()

    db.commit()

    return {
        "success": True,
        "message": "Study session created successfully",
        "study_session": dict(row)
    }


def ai_update_study_session(
    session_id: int,
    subject_id: Optional[int],
    topic: Optional[str],
    duration_minutes: Optional[int],
    start_time: Optional[str],
    end_time: Optional[str],
    notes: Optional[str],
    db: Session
):
    existing = db.execute(
        text("""
            SELECT
                id,
                subject_id,
                topic,
                duration_minutes,
                start_time,
                end_time,
                notes
            FROM study_sessions
            WHERE id = :session_id
        """),
        {
            "session_id": session_id
        }
    ).mappings().first()

    if not existing:

        return {
            "success": False,
            "error": "Study session not found"
        }

    new_subject_id = (
        subject_id
        if subject_id is not None
        else existing["subject_id"]
    )

    new_topic = (
        topic
        if topic is not None
        else existing["topic"]
    )

    new_duration = (
        duration_minutes
        if duration_minutes is not None
        else existing["duration_minutes"]
    )

    new_notes = (
        notes
        if notes is not None
        else existing["notes"]
    )

    if new_duration <= 0:

        return {
            "success": False,
            "error": "duration_minutes must be greater than 0"
        }

    if new_subject_id is not None:

        subject_check = db.execute(
            text("""
                SELECT id
                FROM subjects
                WHERE id = :subject_id
            """),
            {
                "subject_id": new_subject_id
            }
        ).first()

        if not subject_check:

            return {
                "success": False,
                "error": "Subject not found"
            }

    parsed_start = existing["start_time"]
    parsed_end = existing["end_time"]

    if start_time is not None:

        try:

            parsed_start = datetime.fromisoformat(
                start_time.replace("Z", "+00:00")
            )

        except ValueError:

            return {
                "success": False,
                "error": "Invalid start_time format"
            }

    if end_time is not None:

        try:

            parsed_end = datetime.fromisoformat(
                end_time.replace("Z", "+00:00")
            )

        except ValueError:

            return {
                "success": False,
                "error": "Invalid end_time format"
            }

    if parsed_end is None:

        parsed_end = parsed_start + timedelta(
            minutes=new_duration
        )

    query = text("""
        UPDATE study_sessions
        SET
            subject_id = :subject_id,
            topic = :topic,
            duration_minutes = :duration_minutes,
            start_time = :start_time,
            end_time = :end_time,
            notes = :notes
        WHERE id = :session_id
        RETURNING
            id,
            subject_id,
            topic,
            duration_minutes,
            start_time,
            end_time,
            notes,
            created_at
    """)

    row = db.execute(
        query,
        {
            "session_id": session_id,
            "subject_id": new_subject_id,
            "topic": new_topic,
            "duration_minutes": new_duration,
            "start_time": parsed_start,
            "end_time": parsed_end,
            "notes": new_notes
        }
    ).mappings().first()

    db.commit()

    return {
        "success": True,
        "message": "Study session updated successfully",
        "study_session": dict(row)
    }


def ai_delete_study_session(
    session_id: int,
    db: Session
):
    query = text("""
        DELETE FROM study_sessions
        WHERE id = :session_id
        RETURNING
            id,
            topic
    """)

    row = db.execute(
        query,
        {
            "session_id": session_id
        }
    ).mappings().first()

    if not row:

        return {
            "success": False,
            "error": "Study session not found"
        }

    db.commit()

    return {
        "success": True,
        "message": "Study session deleted successfully",
        "study_session": dict(row)
    }


# ============================================================
# AI TOOLS
# ============================================================

AI_TOOLS = [

    # --------------------------------------------------------
    # FIND SYLLABUS TOPIC
    # --------------------------------------------------------

    {
        "type": "function",
        "name": "find_syllabus_topic",
        "description": (
            "Search the StudentOS syllabus for a topic by exact "
            "or partial name. Use this before marking a topic "
            "completed or changing topic mastery when the exact "
            "topic ID is not already known. Never invent a topic ID."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "The topic name or keywords to search for."
                    )
                },
                "subject_id": {
                    "type": [
                        "integer",
                        "null"
                    ],
                    "description": (
                        "Optional subject ID. Prefer the selected "
                        "subject when one is available."
                    )
                }
            },
            "required": [
                "query",
                "subject_id"
            ],
            "additionalProperties": False
        },
        "strict": True
    },

    # --------------------------------------------------------
    # MARK TOPIC COMPLETED
    # --------------------------------------------------------

    {
        "type": "function",
        "name": "mark_topic_completed",
        "description": (
            "Mark a StudentOS syllabus topic as completed. "
            "Use this when the student explicitly says they "
            "finished or completed a topic. Only use a topic ID "
            "that came from find_syllabus_topic or explicit "
            "trusted context. Never invent an ID."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "topic_id": {
                    "type": "integer",
                    "description": "The real syllabus topic ID."
                }
            },
            "required": [
                "topic_id"
            ],
            "additionalProperties": False
        },
        "strict": True
    },

    # --------------------------------------------------------
    # UPDATE TOPIC MASTERY
    # --------------------------------------------------------

    {
        "type": "function",
        "name": "update_topic_mastery",
        "description": (
            "Update the student's mastery percentage for a "
            "syllabus topic. Mastery must be from 0 to 100. "
            "Only use a topic ID that came from "
            "find_syllabus_topic or explicit trusted context."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "topic_id": {
                    "type": "integer"
                },
                "mastery": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100
                }
            },
            "required": [
                "topic_id",
                "mastery"
            ],
            "additionalProperties": False
        },
        "strict": True
    },

    # --------------------------------------------------------
    # CREATE TASK
    # --------------------------------------------------------

    {
        "type": "function",
        "name": "create_task",
        "description": (
            "Create a new StudentOS task when the student "
            "explicitly asks to add or create a task."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "subject_id": {
                    "type": [
                        "integer",
                        "null"
                    ]
                },
                "due_date": {
                    "type": [
                        "string",
                        "null"
                    ],
                    "description": (
                        "ISO 8601 datetime, or null."
                    )
                },
                "priority": {
                    "type": "string",
                    "enum": [
                        "Low",
                        "Medium",
                        "High"
                    ]
                },
                "status": {
                    "type": "string"
                }
            },
            "required": [
                "title",
                "description",
                "subject_id",
                "due_date",
                "priority",
                "status"
            ],
            "additionalProperties": False
        },
        "strict": True
    },

    # --------------------------------------------------------
    # UPDATE TASK
    # --------------------------------------------------------

    {
        "type": "function",
        "name": "update_task",
        "description": (
            "Update an existing StudentOS task. "
            "Only use when the student explicitly asks "
            "to change a task."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "integer"
                },
                "title": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "description": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "subject_id": {
                    "type": [
                        "integer",
                        "null"
                    ]
                },
                "due_date": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "priority": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "status": {
                    "type": [
                        "string",
                        "null"
                    ]
                }
            },
            "required": [
                "task_id",
                "title",
                "description",
                "subject_id",
                "due_date",
                "priority",
                "status"
            ],
            "additionalProperties": False
        },
        "strict": True
    },

    # --------------------------------------------------------
    # DELETE TASK
    # --------------------------------------------------------

    {
        "type": "function",
        "name": "delete_task",
        "description": (
            "Delete a StudentOS task. "
            "Only use when the student explicitly asks "
            "to delete the task."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "integer"
                }
            },
            "required": [
                "task_id"
            ],
            "additionalProperties": False
        },
        "strict": True
    },

    # --------------------------------------------------------
    # CREATE STUDY SESSION
    # --------------------------------------------------------

    {
        "type": "function",
        "name": "create_study_session",
        "description": (
            "Create a StudentOS study session when the "
            "student explicitly asks to schedule or record "
            "a study session."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "subject_id": {
                    "type": [
                        "integer",
                        "null"
                    ]
                },
                "topic": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "duration_minutes": {
                    "type": "integer",
                    "minimum": 1
                },
                "start_time": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "end_time": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "notes": {
                    "type": [
                        "string",
                        "null"
                    ]
                }
            },
            "required": [
                "subject_id",
                "topic",
                "duration_minutes",
                "start_time",
                "end_time",
                "notes"
            ],
            "additionalProperties": False
        },
        "strict": True
    },

    # --------------------------------------------------------
    # UPDATE STUDY SESSION
    # --------------------------------------------------------

    {
        "type": "function",
        "name": "update_study_session",
        "description": (
            "Update an existing StudentOS study session."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "integer"
                },
                "subject_id": {
                    "type": [
                        "integer",
                        "null"
                    ]
                },
                "topic": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "duration_minutes": {
                    "type": [
                        "integer",
                        "null"
                    ]
                },
                "start_time": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "end_time": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "notes": {
                    "type": [
                        "string",
                        "null"
                    ]
                }
            },
            "required": [
                "session_id",
                "subject_id",
                "topic",
                "duration_minutes",
                "start_time",
                "end_time",
                "notes"
            ],
            "additionalProperties": False
        },
        "strict": True
    },

    # --------------------------------------------------------
    # DELETE STUDY SESSION
    # --------------------------------------------------------

    {
        "type": "function",
        "name": "delete_study_session",
        "description": (
            "Delete a StudentOS study session. "
            "Only use when the student explicitly asks."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "integer"
                }
            },
            "required": [
                "session_id"
            ],
            "additionalProperties": False
        },
        "strict": True
    }
]


# ============================================================
# EXECUTE AI TOOL
# ============================================================

def execute_ai_tool(
    tool_name: str,
    arguments: dict,
    db: Session
):
    try:

        # ----------------------------------------------------
        # FIND SYLLABUS TOPIC
        # ----------------------------------------------------

        if tool_name == "find_syllabus_topic":

            return ai_find_syllabus_topic(
                query=arguments["query"],
                subject_id=arguments["subject_id"],
                db=db
            )

        # ----------------------------------------------------
        # MARK TOPIC COMPLETED
        # ----------------------------------------------------

        if tool_name == "mark_topic_completed":

            return ai_mark_topic_completed(
                topic_id=arguments["topic_id"],
                db=db
            )

        # ----------------------------------------------------
        # UPDATE TOPIC MASTERY
        # ----------------------------------------------------

        if tool_name == "update_topic_mastery":

            return ai_update_topic_mastery(
                topic_id=arguments["topic_id"],
                mastery=arguments["mastery"],
                db=db
            )

        # ----------------------------------------------------
        # CREATE TASK
        # ----------------------------------------------------

        if tool_name == "create_task":

            return ai_create_task(
                title=arguments["title"],
                description=arguments["description"],
                subject_id=arguments["subject_id"],
                due_date=arguments["due_date"],
                priority=arguments["priority"],
                status=arguments["status"],
                db=db
            )

        # ----------------------------------------------------
        # UPDATE TASK
        # ----------------------------------------------------

        if tool_name == "update_task":

            return ai_update_task(
                task_id=arguments["task_id"],
                title=arguments["title"],
                description=arguments["description"],
                subject_id=arguments["subject_id"],
                due_date=arguments["due_date"],
                priority=arguments["priority"],
                status=arguments["status"],
                db=db
            )

        # ----------------------------------------------------
        # DELETE TASK
        # ----------------------------------------------------

        if tool_name == "delete_task":

            return ai_delete_task(
                task_id=arguments["task_id"],
                db=db
            )

        # ----------------------------------------------------
        # CREATE STUDY SESSION
        # ----------------------------------------------------

        if tool_name == "create_study_session":

            return ai_create_study_session(
                subject_id=arguments["subject_id"],
                topic=arguments["topic"],
                duration_minutes=arguments["duration_minutes"],
                start_time=arguments["start_time"],
                end_time=arguments["end_time"],
                notes=arguments["notes"],
                db=db
            )

        # ----------------------------------------------------
        # UPDATE STUDY SESSION
        # ----------------------------------------------------

        if tool_name == "update_study_session":

            return ai_update_study_session(
                session_id=arguments["session_id"],
                subject_id=arguments["subject_id"],
                topic=arguments["topic"],
                duration_minutes=arguments["duration_minutes"],
                start_time=arguments["start_time"],
                end_time=arguments["end_time"],
                notes=arguments["notes"],
                db=db
            )

        # ----------------------------------------------------
        # DELETE STUDY SESSION
        # ----------------------------------------------------

        if tool_name == "delete_study_session":

            return ai_delete_study_session(
                session_id=arguments["session_id"],
                db=db
            )

        return {
            "success": False,
            "error": f"Unknown AI tool: {tool_name}"
        }

    except Exception as error:

        db.rollback()

        print(
            f"AI tool execution failed: {repr(error)}"
        )

        return {
            "success": False,
            "error": "Tool execution failed"
        }


# ============================================================
# AI SYSTEM PROMPT
# ============================================================

def build_ai_system_prompt(
    student_context
):
    return f"""
You are StudentOS AI, the personal academic assistant inside the
StudentOS student management application.

Your job is to help the student learn, plan, organize, research,
and track academic progress.

IMPORTANT BEHAVIOR:

1. Teach concepts clearly and practically.

2. Adjust explanations for a beginner unless the student clearly
   demonstrates advanced knowledge.

3. For programming questions, provide runnable code when useful.

4. Explain code instead of only giving code.

5. Help with subjects such as:
   - Data Structures and Algorithms
   - C++
   - Python
   - Artificial Intelligence
   - Machine Learning
   - DBMS
   - OOP
   - Logic Design
   - Mathematics
   - Software Engineering
   - Projects
   - Research
   - Placement preparation

6. Do not invent facts, papers, citations, statistics, or sources.

7. Clearly distinguish between general knowledge and verified
   research information.

8. When the student asks for research or papers, explain that
   verified research should come from the research system.

9. Use the StudentOS context below to personalize answers.

10. Give realistic study plans based on the student's current
    progress and pending tasks.


STUDENTOS ACTIONS:

You have access to StudentOS tools.

Use an action tool only when the student's request clearly asks
you to perform that action.

IMPORTANT TOPIC RULE:

When the student refers to a syllabus topic by NAME rather than
providing an exact topic ID, you MUST use find_syllabus_topic
BEFORE using mark_topic_completed or update_topic_mastery.

Examples:

- "I finished linked lists."
  -> Search for "linked lists" first.
  -> If exactly one appropriate topic is found, use its real ID.
  -> Then mark that topic completed.

- "Set my linked lists mastery to 70%."
  -> Search for "linked lists" first.
  -> Use the returned real topic ID.
  -> Then update mastery to 70.

- "I finished Dijkstra's algorithm."
  -> Search for "Dijkstra's algorithm" first.
  -> Never guess the topic ID.

If multiple plausible topics are returned, do NOT choose randomly.
Ask the student which topic they mean.

If no topic is found, tell the student that the topic could not
be found.

NEVER invent a syllabus topic ID.

If the selected subject is available, prefer searching within
that subject.

Only call mark_topic_completed or update_topic_mastery after a
valid topic ID has been obtained from find_syllabus_topic or from
trusted existing context.

Other examples:

- "Add a task to revise DBMS"
  -> create a task.

- "Change task 5 to high priority"
  -> update task 5.

- "Delete task 5"
  -> delete task 5.

- "Record 2 hours of DSA study"
  -> create a study session.

- "Change my study session"
  -> update the requested session.

- "Delete my study session"
  -> delete it.

Do NOT perform unrelated actions.

For destructive actions such as deleting a task or study session,
only call the delete tool when the student explicitly requests
deletion.

Never claim that an action was completed unless the corresponding
tool actually succeeds.

If a tool reports an error, tell the student what went wrong rather
than pretending it worked.

If an action requires an ID and the ID is not available, do not
invent an ID. Use the appropriate lookup tool when available.


CURRENT STUDENT CONTEXT:

{json.dumps(student_context, indent=2, default=str)}
"""


# ============================================================
# AI RESPONSE HELPERS
# ============================================================

def response_output_to_input_items(
    response
):
    """
    Convert Responses API output items into dictionaries that can
    safely be supplied back as input when continuing a tool call
    conversation.
    """

    items = []

    for item in response.output:

        if hasattr(
            item,
            "model_dump"
        ):

            items.append(
                item.model_dump(
                    exclude_none=True
                )
            )

        else:

            items.append(item)

    return items


# ================================
# AI CHAT
# ================================

def extract_research_query(message: str) -> str:
    """
    Convert a natural-language research request into a clean
    academic search query.

    Examples:
        "Give me research papers on AI in education"
        -> "AI in education"

        "Show me papers about phishing detection"
        -> "phishing detection"

        "Find academic papers on generative AI"
        -> "generative AI"
    """

    text = re.sub(r"\s+", " ", message.strip())

    patterns = [
        r"^(?:give|show|find|provide|list)"
        r"\s+(?:me\s+)?"
        r"(?:some\s+)?"
        r"(?:research\s+)?"
        r"papers?"
        r"\s+(?:on|about|for)\s+"
        r"(.+?)\s*[?.!]*$",

        r"^(?:give|show|find|provide|list)"
        r"\s+(?:me\s+)?"
        r"(?:some\s+)?"
        r"(?:academic\s+)?"
        r"papers?"
        r"\s+(?:on|about|for)\s+"
        r"(.+?)\s*[?.!]*$",

        r"^(?:find|show|get)"
        r"\s+(?:the\s+)?"
        r"(?:latest\s+)?"
        r"(?:research\s+)?"
        r"(?:papers?|studies)"
        r"\s+(?:on|about|for)\s+"
        r"(.+?)\s*[?.!]*$",
    ]

    for pattern in patterns:
        match = re.match(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        if match:
            query = match.group(1).strip()

            if query:
                return query

    # Fallback cleanup for requests that don't exactly match
    # the patterns above.

    query = text

    prefixes = [
        r"^give me\s+",
        r"^show me\s+",
        r"^find me\s+",
        r"^find\s+",
        r"^show\s+",
        r"^give\s+",
        r"^provide\s+",
        r"^list\s+",
    ]

    for prefix in prefixes:
        query = re.sub(
            prefix,
            "",
            query,
            flags=re.IGNORECASE
        )

    query = re.sub(
        r"^(?:some\s+)?(?:research\s+)?papers?\s+"
        r"(?:on|about|for)\s+",
        "",
        query,
        flags=re.IGNORECASE
    )

    query = re.sub(
        r"^(?:academic\s+)?papers?\s+"
        r"(?:on|about|for)\s+",
        "",
        query,
        flags=re.IGNORECASE
    )

    query = query.strip(" ?.!")

    return query if query else text


def normalize_gemini_schema(schema):
    """Convert OpenAI-style JSON schemas into Gemini-compatible schemas."""
    if not isinstance(schema, dict):
        return schema

    normalized = {}

    for key, value in schema.items():

        if key in {"additionalProperties", "strict"}:
            continue

        if key == "type" and isinstance(value, list):

            non_null_types = [
                item
                for item in value
                if item != "null"
            ]

            if non_null_types:
                normalized["type"] = non_null_types[0]
                normalized["nullable"] = "null" in value

            continue

        if key == "properties" and isinstance(value, dict):

            normalized[key] = {
                name: normalize_gemini_schema(
                    prop_schema
                )
                for name, prop_schema in value.items()
            }

            continue

        if key == "items" and isinstance(value, dict):

            normalized[key] = normalize_gemini_schema(
                value
            )

            continue

        normalized[key] = value

    return normalized


def build_gemini_tools():
    """
    Convert the existing StudentOS AI tool definitions
    into Gemini function declarations.
    """

    declarations = []

    for tool in AI_TOOLS:

        if tool.get("type") != "function":
            continue

        declaration = types.FunctionDeclaration(
            name=tool["name"],
            description=tool.get(
                "description",
                ""
            ),
            parameters=normalize_gemini_schema(
                tool.get(
                    "parameters",
                    {}
                )
            )
        )

        declarations.append(
            declaration
        )

    return [
        types.Tool(
            function_declarations=declarations
        )
    ]


async def generate_gemini_response(
    contents,
    system_prompt: str
):
    """
    Generate a Gemini response while allowing
    StudentOS function tools.
    """

    if gemini_client is None:

        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini is not configured. "
                "Check GEMINI_API_KEY in the backend .env file."
            )
        )

    return await gemini_client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=build_gemini_tools()
        )
    )


@app.post("/ai/chat")
async def ai_chat(
    request: AIChatRequest,
    db: Session = Depends(get_db)
):

    if not request.message.strip():

        raise HTTPException(
            status_code=400,
            detail="AI message cannot be empty"
        )

    if gemini_client is None:

        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini is not configured. "
                "Check GEMINI_API_KEY in the backend .env file."
            )
        )

    try:

        # ====================================================
        # GET CURRENT STUDENT CONTEXT
        # ====================================================

        student_context = get_student_context(
            db=db,
            subject_id=request.subject_id
        )

        # ====================================================
        # BUILD SYSTEM PROMPT
        # ====================================================

        system_prompt = build_ai_system_prompt(
            student_context
        )

        # ====================================================
        # DETECT AI INTENT
        # ====================================================

        intent = detect_ai_intent(
            request.message
        )

        research_results = []

        research_context = ""

        research_query = None

        # ====================================================
        # RESEARCH SEARCH
        # ====================================================

        if intent in [
            "RESEARCH",
            "BOTH"
        ]:

            research_query = extract_research_query(
                request.message
            )

            print(
                "OpenAlex AI research query:",
                research_query
            )

            try:

                research_data = await search_openalex(
                    research_query,
                    limit=5
                )

                research_results = research_data.get(
                    "results",
                    []
                )

                print(
                    "OpenAlex AI research results:",
                    len(research_results)
                )

                # ------------------------------------------------
                # RESULTS FOUND
                # ------------------------------------------------

                if research_results:

                    research_context = f"""
VERIFIED RESEARCH RESULTS FROM STUDENTOS OPENALEX

IMPORTANT:

The OpenAlex search successfully returned
{len(research_results)} verified research papers.

The student's research query was:

"{research_query}"

DO NOT say that no papers were found.

DO NOT say that the research search failed.

DO NOT invent additional papers.

Use the papers below as the ONLY verified
research sources for this request.

The paper metadata comes directly from OpenAlex.

"""

                    for index, paper in enumerate(
                        research_results,
                        start=1
                    ):

                        authors = paper.get(
                            "authors",
                            []
                        )

                        author_text = (
                            ", ".join(
                                author
                                for author in authors
                                if author
                            )
                            if authors
                            else "Authors unavailable"
                        )

                        research_context += f"""
PAPER {index}

Title:
{paper.get("title") or "Title unavailable"}

Authors:
{author_text}

Publication year:
{paper.get("publication_year") or "Unknown"}

Publication date:
{paper.get("publication_date") or "Unknown"}

Type:
{paper.get("type") or "Unknown"}

Citation count:
{paper.get("cited_by_count", 0)}

DOI:
{paper.get("doi") or "No DOI available"}

OpenAlex ID:
{paper.get("id") or "Unavailable"}

Open access:
{"Yes" if paper.get("open_access") else "No"}

Abstract:
{paper.get("abstract") or "No abstract available"}

----------------------------------------
"""

                # ------------------------------------------------
                # NO RESULTS
                # ------------------------------------------------

                else:

                    research_context = f"""
VERIFIED RESEARCH SEARCH RESULT

OpenAlex was searched using:

"{research_query}"

The search returned zero papers.

Therefore, do not invent papers, citations,
authors, DOI links, publication years, or findings.

You may suggest a narrower search query
to the student.
"""

            except Exception as research_error:

                print(
                    "OpenAlex research retrieval failed:",
                    repr(research_error)
                )

                research_results = []

                research_context = """
VERIFIED RESEARCH SEARCH STATUS

The StudentOS research service could not
retrieve verified research results right now.

Do not invent papers, citations, authors,
DOIs, publication years, or research findings.

Tell the student that verified research
results could not be retrieved right now.
"""

        # ====================================================
        # ADD RESEARCH INFORMATION TO AI INSTRUCTIONS
        # ====================================================

        if research_context:

            system_prompt += "\n\n"

            system_prompt += research_context

            system_prompt += """

RESEARCH RESPONSE RULES

1. If verified papers are provided above,
   acknowledge that papers were retrieved
   from StudentOS Research/OpenAlex.

2. If papers are provided,
   NEVER say that no papers were found.

3. Use retrieved metadata exactly as supplied.

4. Never fabricate a paper.

5. Never fabricate an author.

6. Never fabricate a DOI.

7. Never fabricate citation counts.

8. Never claim to have read the complete
   paper unless the retrieved information
   actually contains the complete paper.

9. Summarize abstracts only from information
   supported by them.

10. If the student asks which paper may be
    useful, compare only the available
    metadata and abstracts.

11. If zero papers were returned, clearly
    say that zero verified results were
    returned.

12. Do not contradict the verified research
    result supplied above.
"""

        # ====================================================
        # BUILD GEMINI CONVERSATION
        # ====================================================

        contents = []

        if request.history:

            for message in request.history[-12:]:

                role = message.role.lower().strip()

                if role not in [
                    "user",
                    "assistant"
                ]:
                    continue

                content = message.content.strip()

                if not content:
                    continue

                gemini_role = (
                    "model"
                    if role == "assistant"
                    else "user"
                )

                contents.append(
                    types.Content(
                        role=gemini_role,
                        parts=[
                            types.Part.from_text(
                                text=content
                            )
                        ]
                    )
                )

        contents.append(
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(
                        text=request.message
                    )
                ]
            )
        )

        # ====================================================
        # GEMINI REQUEST + TOOL LOOP
        # ====================================================

        max_tool_rounds = 5

        tool_round = 0

        response = await generate_gemini_response(
            contents=contents,
            system_prompt=system_prompt
        )

        while tool_round < max_tool_rounds:

            function_calls = getattr(
                response,
                "function_calls",
                None
            )

            if not function_calls:
                break

            tool_round += 1

            # Preserve Gemini's tool-call message.

            if response.candidates:

                model_content = (
                    response.candidates[0].content
                )

                if model_content:

                    contents.append(
                        model_content
                    )

            tool_response_parts = []

            for function_call in function_calls:

                tool_name = function_call.name

                arguments = dict(
                    function_call.args or {}
                )

                print(
                    f"AI tool call: "
                    f"{tool_name} "
                    f"{arguments}"
                )

                try:

                    tool_result = execute_ai_tool(
                        tool_name=tool_name,
                        arguments=arguments,
                        db=db
                    )

                except Exception as tool_error:

                    print(
                        f"AI tool execution failed: "
                        f"{repr(tool_error)}"
                    )

                    tool_result = {
                        "success": False,
                        "error": str(
                            tool_error
                        )
                    }

                tool_response_parts.append(
                    types.Part.from_function_response(
                        name=tool_name,
                        response=tool_result
                    )
                )

            contents.append(
                types.Content(
                    role="user",
                    parts=tool_response_parts
                )
            )

            response = await generate_gemini_response(
                contents=contents,
                system_prompt=system_prompt
            )

        # ====================================================
        # FINAL ANSWER
        # ====================================================

        answer = getattr(
            response,
            "text",
            None
        )

        if not answer:

            answer = (
                "The AI completed the requested action, "
                "but did not return a text response."
            )

        # ====================================================
        # REFRESH STUDENT CONTEXT
        # ====================================================

        updated_context = get_student_context(
            db=db,
            subject_id=request.subject_id
        )

        # ====================================================
        # RETURN RESPONSE
        # ====================================================

        return {
            "message": request.message,
            "answer": answer,
            "model": GEMINI_MODEL,
            "intent": intent,
            "research_query": research_query,
            "research_results": research_results,
            "context": {
                "overall_progress": updated_context[
                    "overall_progress"
                ],
                "selected_subject": updated_context[
                    "selected_subject"
                ]
            }
        }

    except HTTPException:

        raise

    except Exception as error:

        print(
            f"Gemini request failed: "
            f"{repr(error)}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "AI request failed. "
                "Check the backend terminal for details."
            )
        )


# ================================
# START SERVER
# ================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )