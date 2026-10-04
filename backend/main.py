from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from database import get_db
import os
import re
import httpx
from pypdf import PdfReader


app = FastAPI(title="StudentOS API")


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
        "message": "StudentOS Backend is running 🚀"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


# ============================================================
# SUBJECT MODELS
# ============================================================

class SubjectCreate(BaseModel):
    name: str
    short_name: str
    color: Optional[str] = "#3B82F6"
    topics: Optional[int] = 0
    assignments: Optional[int] = 0
    progress: Optional[int] = 0


# ============================================================
# AUTOMATIC SUBJECT PROGRESS
# ============================================================

def calculate_subject_progress(connection, subject_id):

    result = connection.execute(
        text("""
            SELECT
                COUNT(st.id) AS total_topics,
                COUNT(
                    CASE
                        WHEN LOWER(st.status) = 'completed'
                        THEN 1
                    END
                ) AS completed_topics
            FROM syllabus_units su
            LEFT JOIN syllabus_topics st
                ON st.unit_id = su.id
            WHERE su.subject_id = :subject_id
        """),
        {
            "subject_id": subject_id
        }
    ).fetchone()

    total_topics = int(result.total_topics or 0)
    completed_topics = int(result.completed_topics or 0)

    if total_topics == 0:
        return 0

    return round(
        completed_topics / total_topics * 100
    )


# ============================================================
# SUBJECTS
# ============================================================

@app.get("/subjects")
def get_subjects(db: Session = Depends(get_db)):

    query = text("""
        SELECT
            s.id,
            s.name,
            s.short_name,
            s.color,
            s.topics AS stored_topics,
            s.assignments,
            s.progress AS stored_progress,

            COUNT(DISTINCT st.id) AS syllabus_topics,

            COUNT(
                DISTINCT CASE
                    WHEN LOWER(st.status) = 'completed'
                    THEN st.id
                END
            ) AS completed_topics

        FROM subjects s

        LEFT JOIN syllabus_units su
            ON su.subject_id = s.id

        LEFT JOIN syllabus_topics st
            ON st.unit_id = su.id

        GROUP BY
            s.id,
            s.name,
            s.short_name,
            s.color,
            s.topics,
            s.assignments,
            s.progress

        ORDER BY s.id
    """)

    rows = db.execute(query).mappings().all()

    subjects = []

    for row in rows:

        syllabus_topics = int(row["syllabus_topics"] or 0)
        completed_topics = int(row["completed_topics"] or 0)

        if syllabus_topics > 0:

            progress = round(
                completed_topics / syllabus_topics * 100
            )

            topics = syllabus_topics

        else:

            progress = row["stored_progress"] or 0
            topics = row["stored_topics"] or 0

        subjects.append({
            "id": row["id"],
            "name": row["name"],
            "short_name": row["short_name"],
            "color": row["color"],
            "topics": topics,
            "assignments": row["assignments"] or 0,
            "progress": progress,
            "completed_topics": completed_topics,
            "syllabus_topics": syllabus_topics
        })

    return subjects


@app.get("/subjects/{subject_id}")
def get_subject(
    subject_id: int,
    db: Session = Depends(get_db)
):

    query = text("""
        SELECT
            s.id,
            s.name,
            s.short_name,
            s.color,
            s.topics AS stored_topics,
            s.assignments,
            s.progress AS stored_progress,

            COUNT(DISTINCT st.id) AS syllabus_topics,

            COUNT(
                DISTINCT CASE
                    WHEN LOWER(st.status) = 'completed'
                    THEN st.id
                END
            ) AS completed_topics

        FROM subjects s

        LEFT JOIN syllabus_units su
            ON su.subject_id = s.id

        LEFT JOIN syllabus_topics st
            ON st.unit_id = su.id

        WHERE s.id = :subject_id

        GROUP BY
            s.id,
            s.name,
            s.short_name,
            s.color,
            s.topics,
            s.assignments,
            s.progress
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

    syllabus_topics = int(row["syllabus_topics"] or 0)
    completed_topics = int(row["completed_topics"] or 0)

    if syllabus_topics > 0:

        progress = round(
            completed_topics / syllabus_topics * 100
        )

        topics = syllabus_topics

    else:

        progress = row["stored_progress"] or 0
        topics = row["stored_topics"] or 0

    return {
        "id": row["id"],
        "name": row["name"],
        "short_name": row["short_name"],
        "color": row["color"],
        "topics": topics,
        "assignments": row["assignments"] or 0,
        "progress": progress,
        "completed_topics": completed_topics,
        "syllabus_topics": syllabus_topics
    }


@app.post("/subjects")
def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db)
):

    query = text("""
        INSERT INTO subjects
        (
            name,
            short_name,
            color,
            topics,
            assignments,
            progress
        )
        VALUES
        (
            :name,
            :short_name,
            :color,
            :topics,
            :assignments,
            :progress
        )
        RETURNING
            id,
            name,
            short_name,
            color,
            topics,
            assignments,
            progress
    """)

    row = db.execute(
        query,
        subject.model_dump()
    ).mappings().first()

    db.commit()

    return dict(row)


@app.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    subject: SubjectCreate,
    db: Session = Depends(get_db)
):

    query = text("""
        UPDATE subjects
        SET
            name = :name,
            short_name = :short_name,
            color = :color
        WHERE id = :subject_id
        RETURNING
            id,
            name,
            short_name,
            color,
            topics,
            assignments,
            progress
    """)

    row = db.execute(
        query,
        {
            "subject_id": subject_id,
            "name": subject.name,
            "short_name": subject.short_name,
            "color": subject.color
        }
    ).mappings().first()

    if not row:

        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    db.commit()

    return dict(row)


@app.delete("/subjects/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db)
):

    result = db.execute(
        text("""
            DELETE FROM subjects
            WHERE id = :subject_id
        """),
        {
            "subject_id": subject_id
        }
    )

    if result.rowcount == 0:

        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )

    db.commit()

    return {
        "message": "Subject deleted successfully"
    }


# ============================================================
# TASK MODELS
# ============================================================

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: int
    due_date: Optional[str] = None
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Pending"


# ============================================================
# TASKS
# ============================================================

@app.get("/tasks")
def get_tasks(db: Session = Depends(get_db)):

    query = text("""
        SELECT
            t.id,
            t.title,
            t.description,
            t.subject_id,
            s.name AS subject_name,
            s.short_name AS subject_short_name,
            t.due_date,
            t.priority,
            t.status,
            t.created_at
        FROM tasks t
        JOIN subjects s
            ON t.subject_id = s.id
        ORDER BY
            t.due_date NULLS LAST,
            t.id DESC
    """)

    rows = db.execute(query).mappings().all()

    return [dict(row) for row in rows]


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
            s.short_name AS subject_short_name,
            t.due_date,
            t.priority,
            t.status,
            t.created_at
        FROM tasks t
        JOIN subjects s
            ON t.subject_id = s.id
        WHERE t.id = :task_id
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

    return dict(row)


@app.post("/tasks")
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db)
):

    query = text("""
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
        task.model_dump()
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
            **task.model_dump()
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

    result = db.execute(
        text("""
            DELETE FROM tasks
            WHERE id = :task_id
        """),
        {
            "task_id": task_id
        }
    )

    if result.rowcount == 0:

        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    db.commit()

    return {
        "message": "Task deleted successfully"
    }


# ============================================================
# STUDY SESSION MODELS
# ============================================================

class StudySessionCreate(BaseModel):
    subject_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = 0
    topic: Optional[str] = None
    notes: Optional[str] = None


# ============================================================
# STUDY SESSIONS
# ============================================================

@app.get("/study-sessions")
def get_study_sessions(
    db: Session = Depends(get_db)
):

    query = text("""
        SELECT
            ss.id,
            ss.subject_id,
            s.name AS subject_name,
            s.short_name AS subject_short_name,
            ss.start_time,
            ss.end_time,
            ss.duration_minutes,
            ss.topic,
            ss.notes,
            ss.created_at
        FROM study_sessions ss
        JOIN subjects s
            ON ss.subject_id = s.id
        ORDER BY
            ss.start_time DESC
    """)

    rows = db.execute(query).mappings().all()

    return [dict(row) for row in rows]


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
            s.short_name AS subject_short_name,
            ss.start_time,
            ss.end_time,
            ss.duration_minutes,
            ss.topic,
            ss.notes,
            ss.created_at
        FROM study_sessions ss
        JOIN subjects s
            ON ss.subject_id = s.id
        WHERE ss.id = :session_id
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

    return dict(row)


@app.post("/study-sessions")
def create_study_session(
    session: StudySessionCreate,
    db: Session = Depends(get_db)
):

    query = text("""
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
        RETURNING
            id,
            subject_id,
            start_time,
            end_time,
            duration_minutes,
            topic,
            notes,
            created_at
    """)

    row = db.execute(
        query,
        session.model_dump()
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
            start_time = :start_time,
            end_time = :end_time,
            duration_minutes = :duration_minutes,
            topic = :topic,
            notes = :notes
        WHERE id = :session_id
        RETURNING
            id,
            subject_id,
            start_time,
            end_time,
            duration_minutes,
            topic,
            notes,
            created_at
    """)

    row = db.execute(
        query,
        {
            "session_id": session_id,
            **session.model_dump()
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

    result = db.execute(
        text("""
            DELETE FROM study_sessions
            WHERE id = :session_id
        """),
        {
            "session_id": session_id
        }
    )

    if result.rowcount == 0:

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

@app.get("/subjects/{subject_id}/syllabus")
def get_subject_syllabus(
    subject_id: int,
    db: Session = Depends(get_db)
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
# PDF SYLLABUS PARSING
# ============================================================

def clean_text(text_value):

    if not text_value:
        return ""

    return " ".join(
        text_value.replace("\n", " ").split()
    )


@app.post("/syllabus/upload")
async def upload_syllabus(
    file: UploadFile = File(...)
):

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    contents = await file.read()

    temp_path = f"temp_{file.filename}"

    try:

        with open(temp_path, "wb") as output_file:
            output_file.write(contents)

        reader = PdfReader(temp_path)

        pages = []

        for page in reader.pages:

            page_text = page.extract_text() or ""
            pages.append(page_text)

        full_text = "\n".join(pages)

        return {
            "filename": file.filename,
            "pages": len(reader.pages),
            "characters": len(full_text),
            "text": full_text
        }

    finally:

        if os.path.exists(temp_path):
            os.remove(temp_path)


# ============================================================
# OPENALEX HELPERS
# ============================================================

def normalize_search_text(value):

    if not value:
        return ""

    value = value.lower()

    value = re.sub(
        r"[^a-z0-9\s-]",
        " ",
        value
    )

    return " ".join(
        value.split()
    )


def get_query_words(query):

    normalized_query = normalize_search_text(
        query
    )

    return [
        word
        for word in normalized_query.split()
        if len(word) > 1
    ]


def reconstruct_abstract(inverted_index):

    if not inverted_index:
        return None

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


def calculate_research_score(
    query,
    title,
    abstract
):

    normalized_query = normalize_search_text(
        query
    )

    normalized_title = normalize_search_text(
        title
    )

    normalized_abstract = normalize_search_text(
        abstract
    )

    query_words = get_query_words(
        query
    )

    if not query_words:
        return 0

    score = 0

    # ========================================================
    # EXACT PHRASE IN TITLE
    # ========================================================

    if normalized_query in normalized_title:

        score += 1000

    # ========================================================
    # TITLE WORD COVERAGE
    # ========================================================

    title_matches = 0

    for word in query_words:

        if word in normalized_title:

            title_matches += 1

    title_ratio = (
        title_matches / len(query_words)
    )

    score += int(
        title_ratio * 700
    )

    # ========================================================
    # ABSTRACT WORD COVERAGE
    # ========================================================

    abstract_matches = 0

    for word in query_words:

        if word in normalized_abstract:

            abstract_matches += 1

    abstract_ratio = (
        abstract_matches / len(query_words)
    )

    score += int(
        abstract_ratio * 150
    )

    # ========================================================
    # TITLE MATCH BONUS
    # ========================================================

    if title_matches > 0:

        score += 100

    # ========================================================
    # NO TITLE MATCH PENALTY
    # ========================================================

    if title_matches == 0:

        score -= 400

    # ========================================================
    # MULTI-WORD PARTIAL MATCH PENALTY
    # ========================================================

    if len(query_words) >= 2:

        missing_words = (
            len(query_words)
            - title_matches
        )

        score -= missing_words * 75

    # ========================================================
    # TITLE WORD ORDER BONUS
    # ========================================================

    if len(query_words) >= 2:

        title_positions = []

        for word in query_words:

            position = normalized_title.find(
                word
            )

            if position >= 0:

                title_positions.append(
                    position
                )

        if len(title_positions) >= 2:

            if title_positions == sorted(
                title_positions
            ):

                score += 50

    return score


def normalize_openalex_work(
    work,
    query
):

    abstract = reconstruct_abstract(
        work.get(
            "abstract_inverted_index"
        )
    )

    authors = []

    for authorship in work.get(
        "authorships",
        []
    ):

        author = authorship.get(
            "author"
        )

        if author and author.get(
            "display_name"
        ):

            authors.append(
                author["display_name"]
            )

    title = (
        work.get("display_name")
        or work.get("title")
    )

    local_score = calculate_research_score(
        query=query,
        title=title or "",
        abstract=abstract
    )

    # OpenAlex itself provides a relevance score
    # when using its search functionality.
    openalex_score = work.get(
        "relevance_score"
    )

    if openalex_score is None:

        openalex_score = 0

    # Combine OpenAlex's relevance with our
    # lightweight title/abstract relevance.
    final_score = (
        float(openalex_score) * 100
        + local_score
    )

    return {
        "id": work.get("id"),
        "title": title,
        "publication_year": work.get(
            "publication_year"
        ),
        "publication_date": work.get(
            "publication_date"
        ),
        "type": work.get(
            "type"
        ),
        "doi": work.get(
            "doi"
        ),
        "cited_by_count": work.get(
            "cited_by_count",
            0
        ),
        "authors": authors,
        "abstract": abstract,
        "open_access": work.get(
            "open_access"
        ),
        "_relevance_score": final_score
    }


# ============================================================
# RESEARCH API
# ============================================================

@app.get("/research")
async def research(
    query: str,
    limit: int = 5
):

    query = query.strip()

    if not query:

        raise HTTPException(
            status_code=400,
            detail="Research query cannot be empty"
        )

    if limit < 1:
        limit = 1

    if limit > 20:
        limit = 20

    # Ask OpenAlex for a larger candidate set.
    # We will locally rank the candidates afterwards.
    candidate_limit = min(
        max(limit * 10, 30),
        100
    )

    # IMPORTANT:
    # Use OpenAlex's current `search` parameter
    # rather than the older `q` parameter.
    params = {
    "q": query,
    "per_page": candidate_limit
   }

    headers = {
        "User-Agent": "StudentOS/1.0"
    }

    try:

        async with httpx.AsyncClient(
            timeout=20.0
        ) as client:

            response = await client.get(
                "https://api.openalex.org/works",
                params=params,
                headers=headers
            )

    except httpx.TimeoutException:

        raise HTTPException(
            status_code=504,
            detail=(
                "OpenAlex took too long to respond. "
                "Please try again shortly."
            )
        )

    except httpx.RequestError:

        raise HTTPException(
            status_code=502,
            detail=(
                "Could not connect to OpenAlex. "
                "Please try again shortly."
            )
        )

    # ========================================================
    # RATE LIMIT
    # ========================================================

    if response.status_code == 429:

        retry_after = response.headers.get(
            "Retry-After"
        )

        if retry_after:

            detail = (
                "OpenAlex is temporarily rate-limiting "
                "research requests. Please try again "
                f"after {retry_after} seconds."
            )

        else:

            detail = (
                "OpenAlex is temporarily rate-limiting "
                "research requests. Please try again "
                "shortly."
            )

        raise HTTPException(
            status_code=429,
            detail=detail
        )

    # ========================================================
    # OTHER OPENALEX ERRORS
    # ========================================================

    if response.status_code != 200:

        raise HTTPException(
            status_code=502,
            detail=(
                "OpenAlex research service returned "
                f"HTTP {response.status_code}."
            )
        )

    try:

        data = response.json()

    except ValueError:

        raise HTTPException(
            status_code=502,
            detail="OpenAlex returned invalid JSON."
        )

    raw_results = data.get(
        "results",
        []
    )

    results = []

    seen_ids = set()

    for work in raw_results:

        work_id = work.get("id")

        if not work_id:
            continue

        if work_id in seen_ids:
            continue

        seen_ids.add(work_id)

        normalized = normalize_openalex_work(
            work,
            query
        )

        results.append(
            normalized
        )

    # ========================================================
    # LOCAL RANKING
    # ========================================================

    results.sort(
        key=lambda item: item[
            "_relevance_score"
        ],
        reverse=True
    )

    # ========================================================
    # LIGHT FILTERING
    # ========================================================

    # Do NOT use the previous extremely strict filter.
    # A relevant paper may mention the search terms mainly
    # in its abstract instead of its title.

    results = results[:limit]

    # ========================================================
    # REMOVE INTERNAL SCORE
    # ========================================================

    for result in results:

        result.pop(
            "_relevance_score",
            None
        )

    return {
        "query": query,
        "count": data.get(
            "meta",
            {}
        ).get(
            "count",
            0
        ),
        "results": results
    }


# ============================================================
# SERVER
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )