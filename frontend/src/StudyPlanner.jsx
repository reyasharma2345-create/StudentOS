import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Plus,
  BookOpen,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

function StudyPlanner() {
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    subject_id: "",
    start_time: "",
    end_time: "",
    topic: "",
    notes: "",
  });

  // =========================================================
  // LOAD SUBJECTS + STUDY SESSIONS
  // =========================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [sessionsResponse, subjectsResponse] =
        await Promise.all([
          fetch(`${API_URL}/study-sessions`),
          fetch(`${API_URL}/subjects`),
        ]);

      if (!sessionsResponse.ok) {
        throw new Error(
          `Failed to load study sessions. Server returned ${sessionsResponse.status}.`
        );
      }

      if (!subjectsResponse.ok) {
        throw new Error(
          `Failed to load subjects. Server returned ${subjectsResponse.status}.`
        );
      }

      const sessionsData = await sessionsResponse.json();
      const subjectsData = await subjectsResponse.json();

      console.log("Loaded study sessions:", sessionsData);
      console.log("Loaded subjects:", subjectsData);

      // ---------------------------------------------------------
      // SUPPORT BOTH:
      // 1. Direct arrays
      // 2. Objects containing value / study_sessions / subjects
      // ---------------------------------------------------------

      const loadedSessions = Array.isArray(sessionsData)
        ? sessionsData
        : sessionsData?.value ||
          sessionsData?.study_sessions ||
          [];

      const loadedSubjects = Array.isArray(subjectsData)
        ? subjectsData
        : subjectsData?.value ||
          subjectsData?.subjects ||
          [];

      console.log("Parsed sessions:", loadedSessions);
      console.log("Parsed subjects:", loadedSubjects);

      setSessions(loadedSessions);
      setSubjects(loadedSubjects);
    } catch (err) {
      console.error("Load error:", err);

      setError(
        err.message ||
          "Unable to connect to StudentOS backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // FORM HANDLING
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      subject_id: "",
      start_time: "",
      end_time: "",
      topic: "",
      notes: "",
    });
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    resetForm();
  };

  // =========================================================
  // CREATE STUDY SESSION
  // =========================================================

  const handleCreateSession = async (event) => {
    event.preventDefault();

    setError("");

    if (!formData.subject_id) {
      setError("Please select a subject.");
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      setError("Please select both start and end time.");
      return;
    }

    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setError("Please enter valid date and time values.");
      return;
    }

    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    const durationMinutes = Math.round(
      (end.getTime() - start.getTime()) / 60000
    );

    const localStartTime =
      formData.start_time.length === 16
        ? `${formData.start_time}:00`
        : formData.start_time;

    const localEndTime =
      formData.end_time.length === 16
        ? `${formData.end_time}:00`
        : formData.end_time;

    const payload = {
      subject_id: Number(formData.subject_id),
      start_time: localStartTime,
      end_time: localEndTime,
      duration_minutes: durationMinutes,
      topic: formData.topic.trim() || null,
      notes: formData.notes.trim() || null,
    };

    console.log("=================================");
    console.log("Creating study session...");
    console.log("Payload:", payload);
    console.log("=================================");

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/study-sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();

      console.log("Backend status:", response.status);
      console.log("Backend response:", responseText);

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Backend returned an invalid response. HTTP status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            `Failed to create study session. HTTP ${response.status}`
        );
      }

      console.log(
        "Study session created successfully:",
        data
      );

      await loadData();

      setShowModal(false);
      resetForm();

      console.log(
        "Study session saved and reloaded successfully."
      );
    } catch (err) {
      console.error("=================================");
      console.error("STUDY SESSION SAVE ERROR:", err);
      console.error("=================================");

      setError(
        err.message ||
          "Failed to save study session. Please check the backend."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE STUDY SESSION
  // =========================================================

  const handleDeleteSession = async (sessionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this study session?"
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/study-sessions/${sessionId}`,
        {
          method: "DELETE",
        }
      );

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Backend returned an invalid response. HTTP status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            `Failed to delete study session. HTTP ${response.status}`
        );
      }

      console.log("Deleted study session:", data);

      await loadData();
    } catch (err) {
      console.error("Delete error:", err);

      setError(
        err.message ||
          "Failed to delete study session."
      );
    }
  };

  // =========================================================
  // CALCULATE TOTAL STUDY TIME
  // =========================================================

  const totalMinutes = useMemo(() => {
    return sessions.reduce(
      (total, session) =>
        total +
        Number(session.duration_minutes || 0),
      0
    );
  }, [sessions]);

  const totalHours = Math.floor(totalMinutes / 60);

  const remainingMinutes = totalMinutes % 60;

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "No date";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <section className="planner-page">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="planner-header">

        <div>
          <span className="eyebrow">
            STUDY PLANNER
          </span>

          <h1>
            Plan your study sessions.
          </h1>

          <p>
            Track focused study time and build a consistent
            academic routine.
          </p>
        </div>

        <div className="planner-header-actions">

          <button
            className="secondary-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="primary-button"
            onClick={() => {
              setError("");
              setShowModal(true);
            }}
          >
            <Plus size={16} />
            Add Study Session
          </button>

        </div>

      </div>

      {/* =====================================================
          ERROR MESSAGE
          ===================================================== */}

      {error && (
        <div className="planner-error">
          {error}
        </div>
      )}

      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <div className="planner-summary-grid">

        <div className="planner-summary-card">

          <div className="planner-summary-icon">
            <Clock3 size={20} />
          </div>

          <div>
            <span>
              Total Study Time
            </span>

            <strong>
              {totalHours}h {remainingMinutes}m
            </strong>
          </div>

        </div>

        <div className="planner-summary-card">

          <div className="planner-summary-icon">
            <CalendarDays size={20} />
          </div>

          <div>
            <span>
              Study Sessions
            </span>

            <strong>
              {sessions.length}
            </strong>
          </div>

        </div>

        <div className="planner-summary-card">

          <div className="planner-summary-icon">
            <BookOpen size={20} />
          </div>

          <div>
            <span>
              Subjects Studied
            </span>

            <strong>
              {
                new Set(
                  sessions.map(
                    (session) =>
                      session.subject_id
                  )
                ).size
              }
            </strong>
          </div>

        </div>

      </div>

      {/* =====================================================
          STUDY SESSIONS
          ===================================================== */}

      <div className="planner-section">

        <div className="planner-section-header">

          <div>
            <span className="card-label">
              ACTIVITY
            </span>

            <h2>
              Study Sessions
            </h2>
          </div>

        </div>

        {loading ? (

          <div className="planner-empty-state">

            <RefreshCw
              className="planner-loading-icon"
              size={24}
            />

            <p>
              Loading study sessions...
            </p>

          </div>

        ) : sessions.length === 0 ? (

          <div className="planner-empty-state">

            <div className="planner-empty-icon">
              <CalendarDays size={28} />
            </div>

            <h3>
              No study sessions yet
            </h3>

            <p>
              Start tracking your study time by adding
              your first session.
            </p>

          </div>

        ) : (

          <div className="planner-session-list">

            {sessions.map((session) => (

              <div
                className="planner-session-card"
                key={session.id}
              >

                <div className="planner-session-main">

                  <div className="planner-session-icon">
                    <BookOpen size={19} />
                  </div>

                  <div className="planner-session-info">

                    <div className="planner-session-title-row">

                      <h3>
                        {session.topic ||
                          "Study Session"}
                      </h3>

                      <span className="planner-subject-badge">

                        {session.subject_short_name ||
                          session.subject_name}

                      </span>

                    </div>

                    <p>
                      {session.subject_name ||
                        "Unknown subject"}
                    </p>

                    <div className="planner-session-meta">

                      <span>

                        <CalendarDays size={14} />

                        {formatDate(
                          session.start_time
                        )}

                      </span>

                      <span>

                        <Clock3 size={14} />

                        {formatTime(
                          session.start_time
                        )}

                        {" – "}

                        {formatTime(
                          session.end_time
                        )}

                      </span>

                      <span>
                        {session.duration_minutes} min
                      </span>

                    </div>

                    {session.notes && (

                      <div className="planner-session-notes">
                        {session.notes}
                      </div>

                    )}

                  </div>

                </div>

                <button
                  className="planner-delete-button"
                  onClick={() =>
                    handleDeleteSession(
                      session.id
                    )
                  }
                  aria-label="Delete study session"
                  title="Delete study session"
                >
                  <Trash2 size={17} />
                </button>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* =====================================================
          ADD SESSION MODAL
          ===================================================== */}

      {showModal && (

        <div
          className="planner-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }

          }}
        >

          <div className="planner-modal">

            {/* MODAL HEADER */}

            <div className="planner-modal-header">

              <div>

                <span className="eyebrow">
                  NEW SESSION
                </span>

                <h2>
                  Add Study Session
                </h2>

              </div>

              <button
                className="planner-modal-close"
                onClick={closeModal}
                aria-label="Close"
                disabled={saving}
              >
                <X size={20} />
              </button>

            </div>

            {/* FORM */}

            <form
              className="planner-form"
              onSubmit={handleCreateSession}
            >

              {/* SUBJECT */}

              <div className="planner-form-group">

                <label htmlFor="subject_id">
                  Subject
                </label>

                <select
                  id="subject_id"
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={handleChange}
                  required
                >

                  <option value="">
                    Select a subject
                  </option>

                  {subjects.map((subject) => (

                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name}
                    </option>

                  ))}

                </select>

              </div>

              {/* START + END */}

              <div className="planner-form-row">

                <div className="planner-form-group">

                  <label htmlFor="start_time">
                    Start Time
                  </label>

                  <input
                    id="start_time"
                    name="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="planner-form-group">

                  <label htmlFor="end_time">
                    End Time
                  </label>

                  <input
                    id="end_time"
                    name="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={handleChange}
                    required
                  />

                </div>

              </div>

              {/* TOPIC */}

              <div className="planner-form-group">

                <label htmlFor="topic">
                  Topic
                </label>

                <input
                  id="topic"
                  name="topic"
                  type="text"
                  placeholder="e.g. C++ Inheritance"
                  value={formData.topic}
                  onChange={handleChange}
                />

              </div>

              {/* NOTES */}

              <div className="planner-form-group">

                <label htmlFor="notes">
                  Notes
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  rows="4"
                  placeholder="What did you study?"
                  value={formData.notes}
                  onChange={handleChange}
                />

              </div>

              {/* ACTIONS */}

              <div className="planner-form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >

                  {saving ? (

                    "Saving..."

                  ) : (

                    <>
                      <Plus size={16} />
                      Save Session
                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </section>
  );
}

export default StudyPlanner;