from datetime import datetime, date

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text

from database import engine


# ============================================================
# APP SETUP
# ============================================================

app = FastAPI(
    title="StudentOS API",
    description="Backend API for StudentOS",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

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


# ============================================================
# PYDANTIC MODELS
# ============================================================

# -------------------------
# SUBJECT
# -------------------------

class SubjectCreate(BaseModel):
    name: str
    short_name: str
    progress: int = 0
    topics: int = 0
    assignments: int = 0
    color: str = "blue"


# -------------------------
# TASK
# -------------------------

class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    subject_id: int
    due_date: str | None = None
    priority: str = "Medium"
    status: str = "Pending"


# -------------------------
# STUDY SESSION
# -------------------------

class StudySessionCreate(BaseModel):
    subject_id: int
    start_time: str
    end_time: str | None = None
    duration_minutes: int = 0
    topic: str | None = None
    notes: str | None = None


# -------------------------
# SYLLABUS UNIT
# -------------------------

class SyllabusUnitCreate(BaseModel):
    subject_id: int
    unit_number: int
    unit_name: str


# -------------------------
# SYLLABUS TOPIC
# -------------------------

class SyllabusTopicCreate(BaseModel):
    unit_id: int
    topic_name: str
    status: str = "Not Started"
    mastery: int = 0


# -------------------------
# UPDATE SYLLABUS TOPIC
# -------------------------

class SyllabusTopicUpdate(BaseModel):
    topic_name: str | None = None
    status: str | None = None
    mastery: int | None = None


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "StudentOS API is running 🚀",
        "status": "success",
    }


# ============================================================
# SUBJECT APIs
# ============================================================

@app.get("/subjects")
def get_subjects():

    with engine.connect() as connection:

        result = connection.execute(
            text("""
                SELECT
                    id,
                    name,
                    short_name,
                    progress,
                    topics,
                    assignments,
                    color
                FROM subjects
                ORDER BY id
            """)
        )

        subjects = []

        for row in result:
            subjects.append(dict(row._mapping))

        return subjects


@app.get("/subjects/{subject_id}")
def get_subject(subject_id: int):

    with engine.connect() as connection:

        result = connection.execute(
            text("""
                SELECT
                    id,
                    name,
                    short_name,
                    progress,
                    topics,
                    assignments,
                    color
                FROM subjects
                WHERE id = :subject_id
            """),
            {
                "subject_id": subject_id
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        return dict(row._mapping)


@app.post("/subjects")
def create_subject(subject: SubjectCreate):

    with engine.begin() as connection:

        result = connection.execute(
            text("""
                INSERT INTO subjects (
                    name,
                    short_name,
                    progress,
                    topics,
                    assignments,
                    color
                )
                VALUES (
                    :name,
                    :short_name,
                    :progress,
                    :topics,
                    :assignments,
                    :color
                )
                RETURNING
                    id,
                    name,
                    short_name,
                    progress,
                    topics,
                    assignments,
                    color
            """),
            subject.model_dump(),
        )

        row = result.fetchone()

        return dict(row._mapping)


@app.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    subject: SubjectCreate
):

    with engine.begin() as connection:

        result = connection.execute(
            text("""
                UPDATE subjects
                SET
                    name = :name,
                    short_name = :short_name,
                    progress = :progress,
                    topics = :topics,
                    assignments = :assignments,
                    color = :color
                WHERE id = :subject_id
                RETURNING
                    id,
                    name,
                    short_name,
                    progress,
                    topics,
                    assignments,
                    color
            """),
            {
                **subject.model_dump(),
                "subject_id": subject_id,
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        return dict(row._mapping)


@app.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int):

    with engine.begin() as connection:

        result = connection.execute(
            text("""
                DELETE FROM subjects
                WHERE id = :subject_id
                RETURNING id
            """),
            {
                "subject_id": subject_id
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        return {
            "message": "Subject deleted successfully",
            "id": subject_id,
        }


# ============================================================
# TASK APIs
# ============================================================

@app.get("/tasks")
def get_tasks():

    with engine.connect() as connection:

        result = connection.execute(
            text("""
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
        )

        tasks = []

        for row in result:
            task = dict(row._mapping)

            if isinstance(task.get("due_date"), date):
                task["due_date"] = task["due_date"].isoformat()

            if isinstance(task.get("created_at"), datetime):
                task["created_at"] = task["created_at"].isoformat()

            tasks.append(task)

        return tasks


@app.get("/tasks/{task_id}")
def get_task(task_id: int):

    with engine.connect() as connection:

        result = connection.execute(
            text("""
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
            """),
            {
                "task_id": task_id
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        task = dict(row._mapping)

        if isinstance(task.get("due_date"), date):
            task["due_date"] = task["due_date"].isoformat()

        if isinstance(task.get("created_at"), datetime):
            task["created_at"] = task["created_at"].isoformat()

        return task


@app.post("/tasks")
def create_task(task: TaskCreate):

    with engine.begin() as connection:

        # Check subject exists
        subject_result = connection.execute(
            text("""
                SELECT id
                FROM subjects
                WHERE id = :subject_id
            """),
            {
                "subject_id": task.subject_id
            },
        )

        if not subject_result.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        result = connection.execute(
            text("""
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
            """),
            task.model_dump(),
        )

        row = result.fetchone()

        task_data = dict(row._mapping)

        if isinstance(task_data.get("due_date"), date):
            task_data["due_date"] = task_data["due_date"].isoformat()

        if isinstance(task_data.get("created_at"), datetime):
            task_data["created_at"] = task_data["created_at"].isoformat()

        return task_data


@app.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    task: TaskCreate
):

    with engine.begin() as connection:

        result = connection.execute(
            text("""
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
            """),
            {
                **task.model_dump(),
                "task_id": task_id,
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        task_data = dict(row._mapping)

        if isinstance(task_data.get("due_date"), date):
            task_data["due_date"] = task_data["due_date"].isoformat()

        if isinstance(task_data.get("created_at"), datetime):
            task_data["created_at"] = task_data["created_at"].isoformat()

        return task_data


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):

    with engine.begin() as connection:

        result = connection.execute(
            text("""
                DELETE FROM tasks
                WHERE id = :task_id
                RETURNING id
            """),
            {
                "task_id": task_id
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        return {
            "message": "Task deleted successfully",
            "id": task_id,
        }


# ============================================================
# STUDY SESSION APIs
# ============================================================

@app.get("/study-sessions")
def get_study_sessions():

    with engine.connect() as connection:

        result = connection.execute(
            text("""
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
                ORDER BY ss.start_time DESC
            """)
        )

        sessions = []

        for row in result:

            session = dict(row._mapping)

            if isinstance(session.get("start_time"), datetime):
                session["start_time"] = session["start_time"].isoformat()

            if isinstance(session.get("end_time"), datetime):
                session["end_time"] = session["end_time"].isoformat()

            if isinstance(session.get("created_at"), datetime):
                session["created_at"] = session["created_at"].isoformat()

            sessions.append(session)

        return sessions


@app.get("/study-sessions/{session_id}")
def get_study_session(session_id: int):

    with engine.connect() as connection:

        result = connection.execute(
            text("""
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
            """),
            {
                "session_id": session_id
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Study session not found"
            )

        session = dict(row._mapping)

        if isinstance(session.get("start_time"), datetime):
            session["start_time"] = session["start_time"].isoformat()

        if isinstance(session.get("end_time"), datetime):
            session["end_time"] = session["end_time"].isoformat()

        if isinstance(session.get("created_at"), datetime):
            session["created_at"] = session["created_at"].isoformat()

        return session


@app.post("/study-sessions")
def create_study_session(
    session: StudySessionCreate
):

    with engine.begin() as connection:

        # Verify subject exists
        subject_result = connection.execute(
            text("""
                SELECT id
                FROM subjects
                WHERE id = :subject_id
            """),
            {
                "subject_id": session.subject_id
            },
        )

        if not subject_result.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        result = connection.execute(
            text("""
                INSERT INTO study_sessions (
                    subject_id,
                    start_time,
                    end_time,
                    duration_minutes,
                    topic,
                    notes
                )
                VALUES (
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
            """),
            session.model_dump(),
        )

        row = result.fetchone()

        session_data = dict(row._mapping)

        if isinstance(session_data.get("start_time"), datetime):
            session_data["start_time"] = session_data["start_time"].isoformat()

        if isinstance(session_data.get("end_time"), datetime):
            session_data["end_time"] = session_data["end_time"].isoformat()

        if isinstance(session_data.get("created_at"), datetime):
            session_data["created_at"] = session_data["created_at"].isoformat()

        return session_data


@app.put("/study-sessions/{session_id}")
def update_study_session(
    session_id: int,
    session: StudySessionCreate
):

    with engine.begin() as connection:

        result = connection.execute(
            text("""
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
            """),
            {
                **session.model_dump(),
                "session_id": session_id,
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Study session not found"
            )

        session_data = dict(row._mapping)

        if isinstance(session_data.get("start_time"), datetime):
            session_data["start_time"] = session_data["start_time"].isoformat()

        if isinstance(session_data.get("end_time"), datetime):
            session_data["end_time"] = session_data["end_time"].isoformat()

        if isinstance(session_data.get("created_at"), datetime):
            session_data["created_at"] = session_data["created_at"].isoformat()

        return session_data


@app.delete("/study-sessions/{session_id}")
def delete_study_session(session_id: int):

    with engine.begin() as connection:

        result = connection.execute(
            text("""
                DELETE FROM study_sessions
                WHERE id = :session_id
                RETURNING id
            """),
            {
                "session_id": session_id
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Study session not found"
            )

        return {
            "message": "Study session deleted successfully",
            "id": session_id,
        }


# ============================================================
# SYLLABUS APIs
# ============================================================

# ------------------------------------------------------------
# GET ALL SYLLABUS DATA
# ------------------------------------------------------------

@app.get("/syllabus")
def get_all_syllabus():

    with engine.connect() as connection:

        result = connection.execute(
            text("""
                SELECT
                    su.id AS unit_id,
                    su.subject_id,
                    s.name AS subject_name,
                    s.short_name AS subject_short_name,
                    su.unit_number,
                    su.unit_name,

                    st.id AS topic_id,
                    st.topic_name,
                    st.status,
                    st.mastery

                FROM syllabus_units su

                JOIN subjects s
                    ON su.subject_id = s.id

                LEFT JOIN syllabus_topics st
                    ON su.id = st.unit_id

                ORDER BY
                    su.subject_id,
                    su.unit_number,
                    st.id
            """)
        )

        rows = result.fetchall()

        syllabus = {}

        for row in rows:

            data = dict(row._mapping)

            subject_id = data["subject_id"]

            if subject_id not in syllabus:

                syllabus[subject_id] = {
                    "subject_id": subject_id,
                    "subject_name": data["subject_name"],
                    "subject_short_name": data["subject_short_name"],
                    "units": [],
                }

            subject = syllabus[subject_id]

            unit = None

            for existing_unit in subject["units"]:

                if existing_unit["unit_id"] == data["unit_id"]:
                    unit = existing_unit
                    break

            if unit is None:

                unit = {
                    "unit_id": data["unit_id"],
                    "unit_number": data["unit_number"],
                    "unit_name": data["unit_name"],
                    "topics": [],
                }

                subject["units"].append(unit)

            if data["topic_id"] is not None:

                unit["topics"].append(
                    {
                        "topic_id": data["topic_id"],
                        "topic_name": data["topic_name"],
                        "status": data["status"],
                        "mastery": data["mastery"],
                    }
                )

        return list(syllabus.values())


# ------------------------------------------------------------
# GET SYLLABUS FOR ONE SUBJECT
# ------------------------------------------------------------

@app.get("/syllabus/{subject_id}")
def get_subject_syllabus(subject_id: int):

    with engine.connect() as connection:

        # Check subject
        subject_result = connection.execute(
            text("""
                SELECT
                    id,
                    name,
                    short_name
                FROM subjects
                WHERE id = :subject_id
            """),
            {
                "subject_id": subject_id
            },
        )

        subject_row = subject_result.fetchone()

        if not subject_row:
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        subject = dict(subject_row._mapping)

        # Get units and topics
        result = connection.execute(
            text("""
                SELECT
                    su.id AS unit_id,
                    su.unit_number,
                    su.unit_name,

                    st.id AS topic_id,
                    st.topic_name,
                    st.status,
                    st.mastery

                FROM syllabus_units su

                LEFT JOIN syllabus_topics st
                    ON su.id = st.unit_id

                WHERE su.subject_id = :subject_id

                ORDER BY
                    su.unit_number,
                    st.id
            """),
            {
                "subject_id": subject_id
            },
        )

        units = {}

        for row in result:

            data = dict(row._mapping)

            unit_id = data["unit_id"]

            if unit_id not in units:

                units[unit_id] = {
                    "unit_id": unit_id,
                    "unit_number": data["unit_number"],
                    "unit_name": data["unit_name"],
                    "topics": [],
                }

            if data["topic_id"] is not None:

                units[unit_id]["topics"].append(
                    {
                        "topic_id": data["topic_id"],
                        "topic_name": data["topic_name"],
                        "status": data["status"],
                        "mastery": data["mastery"],
                    }
                )

        return {
            "subject_id": subject["id"],
            "subject_name": subject["name"],
            "subject_short_name": subject["short_name"],
            "units": list(units.values()),
        }


# ------------------------------------------------------------
# CREATE SYLLABUS UNIT
# ------------------------------------------------------------

@app.post("/syllabus/units")
def create_syllabus_unit(
    unit: SyllabusUnitCreate
):

    with engine.begin() as connection:

        # Verify subject
        subject_result = connection.execute(
            text("""
                SELECT id
                FROM subjects
                WHERE id = :subject_id
            """),
            {
                "subject_id": unit.subject_id
            },
        )

        if not subject_result.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Subject not found"
            )

        result = connection.execute(
            text("""
                INSERT INTO syllabus_units (
                    subject_id,
                    unit_number,
                    unit_name
                )
                VALUES (
                    :subject_id,
                    :unit_number,
                    :unit_name
                )
                RETURNING
                    id,
                    subject_id,
                    unit_number,
                    unit_name,
                    created_at
            """),
            unit.model_dump(),
        )

        row = result.fetchone()

        data = dict(row._mapping)

        if isinstance(data.get("created_at"), datetime):
            data["created_at"] = data["created_at"].isoformat()

        return data


# ------------------------------------------------------------
# CREATE SYLLABUS TOPIC
# ------------------------------------------------------------

@app.post("/syllabus/topics")
def create_syllabus_topic(
    topic: SyllabusTopicCreate
):

    # Validate mastery
    if topic.mastery < 0 or topic.mastery > 100:
        raise HTTPException(
            status_code=400,
            detail="Mastery must be between 0 and 100"
        )

    with engine.begin() as connection:

        # Verify unit exists
        unit_result = connection.execute(
            text("""
                SELECT id
                FROM syllabus_units
                WHERE id = :unit_id
            """),
            {
                "unit_id": topic.unit_id
            },
        )

        if not unit_result.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Syllabus unit not found"
            )

        result = connection.execute(
            text("""
                INSERT INTO syllabus_topics (
                    unit_id,
                    topic_name,
                    status,
                    mastery
                )
                VALUES (
                    :unit_id,
                    :topic_name,
                    :status,
                    :mastery
                )
                RETURNING
                    id,
                    unit_id,
                    topic_name,
                    status,
                    mastery,
                    created_at
            """),
            topic.model_dump(),
        )

        row = result.fetchone()

        data = dict(row._mapping)

        if isinstance(data.get("created_at"), datetime):
            data["created_at"] = data["created_at"].isoformat()

        return data


# ------------------------------------------------------------
# UPDATE SYLLABUS TOPIC
# ------------------------------------------------------------

@app.put("/syllabus/topics/{topic_id}")
def update_syllabus_topic(
    topic_id: int,
    topic: SyllabusTopicUpdate
):

    update_data = topic.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    if "mastery" in update_data:

        if update_data["mastery"] is not None:

            if (
                update_data["mastery"] < 0
                or update_data["mastery"] > 100
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Mastery must be between 0 and 100"
                )

    allowed_fields = [
        "topic_name",
        "status",
        "mastery",
    ]

    fields_to_update = [
        field
        for field in update_data
        if field in allowed_fields
    ]

    if not fields_to_update:
        raise HTTPException(
            status_code=400,
            detail="Invalid update fields"
        )

    set_clause = ", ".join(
        f"{field} = :{field}"
        for field in fields_to_update
    )

    with engine.begin() as connection:

        result = connection.execute(
            text(f"""
                UPDATE syllabus_topics
                SET {set_clause}
                WHERE id = :topic_id
                RETURNING
                    id,
                    unit_id,
                    topic_name,
                    status,
                    mastery,
                    created_at
            """),
            {
                **update_data,
                "topic_id": topic_id,
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Syllabus topic not found"
            )

        data = dict(row._mapping)

        if isinstance(data.get("created_at"), datetime):
            data["created_at"] = data["created_at"].isoformat()

        return data


# ------------------------------------------------------------
# DELETE SYLLABUS TOPIC
# ------------------------------------------------------------

@app.delete("/syllabus/topics/{topic_id}")
def delete_syllabus_topic(topic_id: int):

    with engine.begin() as connection:

        result = connection.execute(
            text("""
                DELETE FROM syllabus_topics
                WHERE id = :topic_id
                RETURNING id
            """),
            {
                "topic_id": topic_id
            },
        )

        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Syllabus topic not found"
            )

        return {
            "message": "Syllabus topic deleted successfully",
            "id": topic_id,
        }


# ============================================================
# SERVER ENTRY POINT
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )