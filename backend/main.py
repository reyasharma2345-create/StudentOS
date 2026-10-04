from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from database import get_db
import os
import httpx
from pypdf import PdfReader


app = FastAPI(title="StudentOS API")


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

    total_topics = int(
        row["total_topics"] or 0
    ) if row else 0

    completed_topics = int(
        row["completed_topics"] or 0
    ) if row else 0

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
            ss.session_date,
            ss.notes,
            ss.created_at
        FROM study_sessions ss
        LEFT JOIN subjects s
            ON ss.subject_id = s.id
        ORDER BY
            ss.session_date DESC,
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
            ss.session_date,
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
    query = text("""
        INSERT INTO study_sessions (
            subject_id,
            topic,
            duration_minutes,
            session_date,
            notes
        )
        VALUES (
            :subject_id,
            :topic,
            :duration_minutes,
            :session_date,
            :notes
        )
        RETURNING
            id,
            subject_id,
            topic,
            duration_minutes,
            session_date,
            notes,
            created_at
    """)

    row = db.execute(
        query,
        {
            "subject_id": session.subject_id,
            "topic": session.topic,
            "duration_minutes": session.duration_minutes,
            "session_date": session.session_date or datetime.now(),
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
    query = text("""
        UPDATE study_sessions
        SET
            subject_id = :subject_id,
            topic = :topic,
            duration_minutes = :duration_minutes,
            session_date = :session_date,
            notes = :notes
        WHERE id = :session_id
        RETURNING
            id,
            subject_id,
            topic,
            duration_minutes,
            session_date,
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
            "session_date": session.session_date,
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


# ------------------------------------------------------------
# MAIN SYLLABUS ROUTE
# ------------------------------------------------------------

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


# ------------------------------------------------------------
# OLD SYLLABUS ROUTE - KEPT FOR COMPATIBILITY
# ------------------------------------------------------------

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
# START SERVER
# ============================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )