import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Circle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import "./Syllabus.css";

const API_URL = "http://127.0.0.1:8000";

function Syllabus() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [syllabus, setSyllabus] = useState(null);

  const [expandedUnits, setExpandedUnits] = useState({});
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadSyllabus(selectedSubject.id);
    }
  }, [selectedSubject]);

  async function loadSubjects() {
    try {
      setLoadingSubjects(true);
      setError("");

      const response = await fetch(`${API_URL}/subjects`);

      if (!response.ok) {
        throw new Error("Failed to load subjects");
      }

      const data = await response.json();

      setSubjects(data);

      if (data.length > 0) {
        setSelectedSubject(data[0]);
      }
    } catch (err) {
      console.error(err);
      setError(
        "Could not connect to the StudentOS backend. Make sure FastAPI is running."
      );
    } finally {
      setLoadingSubjects(false);
    }
  }

  async function loadSyllabus(subjectId) {
    try {
      setLoadingSyllabus(true);
      setError("");

      const response = await fetch(`${API_URL}/syllabus/${subjectId}`);

      if (!response.ok) {
        throw new Error("Failed to load syllabus");
      }

      const data = await response.json();

      setSyllabus(data);

      const initialExpandedState = {};

      data.units.forEach((unit, index) => {
        initialExpandedState[unit.unit_id] = index === 0;
      });

      setExpandedUnits(initialExpandedState);
    } catch (err) {
      console.error(err);

      setSyllabus(null);

      setError("Could not load the syllabus for this subject.");
    } finally {
      setLoadingSyllabus(false);
    }
  }

  function toggleUnit(unitId) {
    setExpandedUnits((previous) => ({
      ...previous,
      [unitId]: !previous[unitId],
    }));
  }

  function getStatusIcon(status) {
    if (status === "Completed") {
      return <CheckCircle2 size={17} />;
    }

    if (status === "In Progress") {
      return <Clock3 size={17} />;
    }

    return <Circle size={17} />;
  }

  function getStatusClass(status) {
    if (status === "Completed") {
      return "status-completed";
    }

    if (status === "In Progress") {
      return "status-progress";
    }

    return "status-not-started";
  }

  const totalUnits = syllabus?.units?.length || 0;

  const totalTopics =
    syllabus?.units?.reduce(
      (total, unit) => total + unit.topics.length,
      0
    ) || 0;

  const completedTopics =
    syllabus?.units?.reduce(
      (total, unit) =>
        total +
        unit.topics.filter((topic) => topic.status === "Completed").length,
      0
    ) || 0;

  const inProgressTopics =
    syllabus?.units?.reduce(
      (total, unit) =>
        total +
        unit.topics.filter((topic) => topic.status === "In Progress").length,
      0
    ) || 0;

  const syllabusCoverage =
    totalTopics > 0
      ? Math.round((completedTopics / totalTopics) * 100)
      : 0;

  return (
    <div className="syllabus-page">
      {/* PAGE HEADER */}

      <div className="syllabus-header">
        <div>
          <div className="syllabus-title-row">
            <div className="syllabus-title-icon">
              <BookOpen size={25} />
            </div>

            <div>
              <h1>Syllabus</h1>
              <p>
                Explore your subjects, units and topics in one place.
              </p>
            </div>
          </div>
        </div>

        <button
          className="syllabus-refresh-button"
          onClick={() => {
            if (selectedSubject) {
              loadSyllabus(selectedSubject.id);
            } else {
              loadSubjects();
            }
          }}
        >
          <RefreshCw
            size={17}
            className={loadingSyllabus ? "spin-icon" : ""}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="syllabus-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUBJECT SELECTOR */}

      <section className="syllabus-subject-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">YOUR SUBJECTS</span>
            <h2>Select a subject</h2>
          </div>
        </div>

        {loadingSubjects ? (
          <div className="syllabus-loading">
            Loading subjects...
          </div>
        ) : subjects.length === 0 ? (
          <div className="syllabus-empty">
            <BookOpen size={30} />
            <h3>No subjects found</h3>
            <p>
              Add a subject first from the Subjects section.
            </p>
          </div>
        ) : (
          <div className="subject-selector">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                className={`subject-chip ${
                  selectedSubject?.id === subject.id
                    ? "subject-chip-active"
                    : ""
                }`}
                onClick={() => setSelectedSubject(subject)}
              >
                <span className="subject-chip-short">
                  {subject.short_name}
                </span>

                <span className="subject-chip-name">
                  {subject.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* SYLLABUS CONTENT */}

      {selectedSubject && (
        <section className="syllabus-content-section">
          <div className="syllabus-overview">
            <div className="syllabus-overview-main">
              <span className="overview-label">
                CURRENT SUBJECT
              </span>

              <h2>
                {syllabus?.subject_name || selectedSubject.name}
              </h2>

              <p>
                {syllabus?.subject_short_name ||
                  selectedSubject.short_name}
              </p>
            </div>

            <div className="syllabus-stat">
              <span>Units</span>
              <strong>{totalUnits}</strong>
            </div>

            <div className="syllabus-stat">
              <span>Topics</span>
              <strong>{totalTopics}</strong>
            </div>

            <div className="syllabus-stat">
              <span>Completed</span>
              <strong>{completedTopics}</strong>
            </div>

            <div className="syllabus-stat">
              <span>Coverage</span>
              <strong>{syllabusCoverage}%</strong>
            </div>
          </div>

          {/* PROGRESS BAR */}

          <div className="syllabus-progress-card">
            <div className="progress-card-top">
              <div>
                <span className="progress-card-label">
                  SYLLABUS COVERAGE
                </span>

                <h3>
                  {completedTopics} of {totalTopics} topics completed
                </h3>
              </div>

              <strong>{syllabusCoverage}%</strong>
            </div>

            <div className="syllabus-progress-track">
              <div
                className="syllabus-progress-fill"
                style={{
                  width: `${syllabusCoverage}%`,
                }}
              />
            </div>

            <div className="progress-breakdown">
              <span>
                <CheckCircle2 size={14} />
                {completedTopics} completed
              </span>

              <span>
                <Clock3 size={14} />
                {inProgressTopics} in progress
              </span>

              <span>
                <Circle size={14} />
                {totalTopics -
                  completedTopics -
                  inProgressTopics}{" "}
                not started
              </span>
            </div>
          </div>

          {/* UNITS */}

          <div className="units-container">
            <div className="units-heading">
              <div>
                <span className="section-eyebrow">
                  COURSE STRUCTURE
                </span>

                <h2>Units & Topics</h2>
              </div>
            </div>

            {loadingSyllabus ? (
              <div className="syllabus-loading">
                Loading syllabus...
              </div>
            ) : !syllabus || syllabus.units.length === 0 ? (
              <div className="syllabus-empty">
                <BookOpen size={30} />

                <h3>No syllabus added yet</h3>

                <p>
                  This subject does not have any syllabus units
                  yet.
                </p>
              </div>
            ) : (
              <div className="units-list">
                {syllabus.units.map((unit) => {
                  const isExpanded =
                    expandedUnits[unit.unit_id];

                  return (
                    <div
                      className="unit-card"
                      key={unit.unit_id}
                    >
                      <button
                        className="unit-header"
                        onClick={() =>
                          toggleUnit(unit.unit_id)
                        }
                      >
                        <div className="unit-header-left">
                          <div className="unit-number">
                            {unit.unit_number}
                          </div>

                          <div>
                            <span className="unit-label">
                              UNIT {unit.unit_number}
                            </span>

                            <h3>{unit.unit_name}</h3>

                            <span className="unit-topic-count">
                              {unit.topics.length}{" "}
                              {unit.topics.length === 1
                                ? "topic"
                                : "topics"}
                            </span>
                          </div>
                        </div>

                        <div className="unit-chevron">
                          {isExpanded ? (
                            <ChevronDown size={21} />
                          ) : (
                            <ChevronRight size={21} />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="topics-container">
                          {unit.topics.length === 0 ? (
                            <div className="no-topics">
                              No topics have been added to
                              this unit yet.
                            </div>
                          ) : (
                            unit.topics.map((topic) => (
                              <div
                                className="topic-row"
                                key={topic.topic_id}
                              >
                                <div className="topic-main">
                                  <div
                                    className={`topic-status-icon ${getStatusClass(
                                      topic.status
                                    )}`}
                                  >
                                    {getStatusIcon(
                                      topic.status
                                    )}
                                  </div>

                                  <div className="topic-info">
                                    <h4>
                                      {topic.topic_name}
                                    </h4>

                                    <span
                                      className={`topic-status ${getStatusClass(
                                        topic.status
                                      )}`}
                                    >
                                      {topic.status}
                                    </span>
                                  </div>
                                </div>

                                <div className="topic-mastery">
                                  <div className="mastery-top">
                                    <span>Mastery</span>
                                    <strong>
                                      {topic.mastery}%
                                    </strong>
                                  </div>

                                  <div className="mastery-track">
                                    <div
                                      className="mastery-fill"
                                      style={{
                                        width: `${topic.mastery}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Syllabus;