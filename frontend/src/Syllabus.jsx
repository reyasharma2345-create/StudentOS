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

function normalizeSubjects(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  if (Array.isArray(data.subjects)) {
    return data.subjects;
  }

  if (Array.isArray(data.value)) {
    return data.value;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}

function normalizeSyllabus(data, selectedSubject) {
  if (!data || typeof data !== "object") {
    return {
      subject_id: selectedSubject?.id ?? null,
      subject_name:
        selectedSubject?.name || "",
      subject_short_name:
        selectedSubject?.short_name || "",
      units: [],
    };
  }

  /*
   * The backend may return the syllabus directly:
   *
   * {
   *   subject_id,
   *   subject_name,
   *   subject_short_name,
   *   units: [...]
   * }
   *
   * or inside a wrapper:
   *
   * {
   *   syllabus: {
   *      ...
   *   }
   * }
   */

  const rawSyllabus =
    data.syllabus &&
    typeof data.syllabus === "object"
      ? data.syllabus
      : data;

  let rawUnits = [];

  if (Array.isArray(rawSyllabus.units)) {
    rawUnits = rawSyllabus.units;
  } else if (Array.isArray(rawSyllabus.data)) {
    rawUnits = rawSyllabus.data;
  } else if (Array.isArray(data.units)) {
    rawUnits = data.units;
  } else if (Array.isArray(data.value)) {
    rawUnits = data.value;
  }

  const units = rawUnits.map(
    (unit, unitIndex) => {
      const topics = Array.isArray(unit.topics)
        ? unit.topics
        : Array.isArray(unit.data)
        ? unit.data
        : [];

      return {
        ...unit,

        unit_id:
          unit.unit_id ??
          unit.id ??
          `unit-${unitIndex + 1}`,

        unit_number:
          unit.unit_number ??
          unit.number ??
          unitIndex + 1,

        unit_name:
          unit.unit_name ??
          unit.name ??
          `Unit ${unitIndex + 1}`,

        topics: topics.map(
          (topic, topicIndex) => ({
            ...topic,

            topic_id:
              topic.topic_id ??
              topic.id ??
              `topic-${unitIndex + 1}-${topicIndex + 1}`,

            topic_name:
              topic.topic_name ??
              topic.name ??
              `Topic ${topicIndex + 1}`,

            status:
              topic.status ||
              "Not Started",

            mastery:
              Number.isFinite(
                Number(topic.mastery)
              )
                ? Number(topic.mastery)
                : 0,
          })
        ),
      };
    }
  );

  return {
    ...rawSyllabus,

    subject_id:
      rawSyllabus.subject_id ??
      rawSyllabus.id ??
      selectedSubject?.id ??
      null,

    subject_name:
      rawSyllabus.subject_name ??
      rawSyllabus.name ??
      selectedSubject?.name ??
      "",

    subject_short_name:
      rawSyllabus.subject_short_name ??
      rawSyllabus.short_name ??
      selectedSubject?.short_name ??
      "",

    units,
  };
}

function Syllabus() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] =
    useState(null);
  const [syllabus, setSyllabus] =
    useState(null);

  const [expandedUnits, setExpandedUnits] =
    useState({});
  const [loadingSubjects, setLoadingSubjects] =
    useState(true);
  const [loadingSyllabus, setLoadingSyllabus] =
    useState(false);
  const [updatingTopic, setUpdatingTopic] =
    useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject?.id != null) {
      loadSyllabus(selectedSubject.id);
    }
  }, [selectedSubject]);

  async function loadSubjects() {
    try {
      setLoadingSubjects(true);
      setError("");

      const response = await fetch(
        `${API_URL}/subjects`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load subjects: ${response.status}`
        );
      }

      const data = await response.json();

      const loadedSubjects =
        normalizeSubjects(data);

      setSubjects(loadedSubjects);

      if (loadedSubjects.length > 0) {
        setSelectedSubject(
          loadedSubjects[0]
        );
      } else {
        setSelectedSubject(null);
        setSyllabus(null);
      }
    } catch (err) {
      console.error(
        "StudentOS subjects error:",
        err
      );

      setSubjects([]);
      setSelectedSubject(null);
      setSyllabus(null);

      setError(
        "Could not connect to the StudentOS backend. Make sure FastAPI is running."
      );
    } finally {
      setLoadingSubjects(false);
    }
  }

  async function loadSyllabus(subjectId) {
    if (subjectId == null) {
      return;
    }

    try {
      setLoadingSyllabus(true);
      setError("");

      const response = await fetch(
        `${API_URL}/syllabus/${subjectId}`
      );

      if (!response.ok) {
        let detail =
          `Failed to load syllabus: ${response.status}`;

        try {
          const errorData =
            await response.json();

          if (errorData?.detail) {
            detail = errorData.detail;
          }
        } catch {
          // Keep the default error.
        }

        throw new Error(detail);
      }

      const data =
        await response.json();

      console.log(
        "StudentOS syllabus response:",
        data
      );

      const normalizedSyllabus =
        normalizeSyllabus(
          data,
          selectedSubject
        );

      setSyllabus(
        normalizedSyllabus
      );

      const initialExpandedState =
        {};

      normalizedSyllabus.units.forEach(
        (unit, index) => {
          initialExpandedState[
            unit.unit_id
          ] = index === 0;
        }
      );

      setExpandedUnits(
        initialExpandedState
      );
    } catch (err) {
      console.error(
        "StudentOS syllabus error:",
        err
      );

      setSyllabus(null);

      setError(
        err?.message ||
          "Could not load the syllabus for this subject."
      );
    } finally {
      setLoadingSyllabus(false);
    }
  }

  function toggleUnit(unitId) {
    setExpandedUnits(
      (previous) => ({
        ...previous,
        [unitId]:
          !previous[unitId],
      })
    );
  }

  function getNextStatus(
    currentStatus
  ) {
    if (
      currentStatus ===
      "Not Started"
    ) {
      return "In Progress";
    }

    if (
      currentStatus ===
      "In Progress"
    ) {
      return "Completed";
    }

    return "Not Started";
  }

  function getMasteryForStatus(
    status
  ) {
    switch (status) {
      case "Completed":
        return 100;

      case "In Progress":
        return 50;

      case "Not Started":
      default:
        return 0;
    }
  }

  async function updateTopicStatus(
    topicId,
    currentStatus
  ) {
    const nextStatus =
      getNextStatus(
        currentStatus
      );

    const nextMastery =
      getMasteryForStatus(
        nextStatus
      );

    try {
      setUpdatingTopic(topicId);
      setError("");

      const response =
        await fetch(
          `${API_URL}/syllabus/topics/${topicId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status: nextStatus,
              mastery: nextMastery,
            }),
          }
        );

      if (!response.ok) {
        let detail =
          `Failed to update topic: ${response.status}`;

        try {
          const errorData =
            await response.json();

          if (errorData?.detail) {
            detail =
              errorData.detail;
          }
        } catch {
          // Keep default error.
        }

        throw new Error(detail);
      }

      const updatedTopic =
        await response.json();

      setSyllabus(
        (previous) => {
          if (!previous) {
            return previous;
          }

          const updatedId =
            updatedTopic?.id ??
            updatedTopic?.topic_id ??
            topicId;

          return {
            ...previous,

            units:
              previous.units.map(
                (unit) => ({
                  ...unit,

                  topics:
                    unit.topics.map(
                      (topic) =>
                        String(
                          topic.topic_id
                        ) ===
                        String(
                          updatedId
                        )
                          ? {
                              ...topic,
                              status:
                                updatedTopic.status ??
                                nextStatus,
                              mastery:
                                Number.isFinite(
                                  Number(
                                    updatedTopic.mastery
                                  )
                                )
                                  ? Number(
                                      updatedTopic.mastery
                                    )
                                  : nextMastery,
                            }
                          : topic
                    ),
                })
              ),
          };
        }
      );
    } catch (err) {
      console.error(
        "StudentOS topic update error:",
        err
      );

      setError(
        err?.message ||
          "Could not update the topic. Make sure FastAPI is running."
      );
    } finally {
      setUpdatingTopic(null);
    }
  }

  function getStatusIcon(status) {
    if (
      status ===
      "Completed"
    ) {
      return (
        <CheckCircle2
          size={17}
        />
      );
    }

    if (
      status ===
      "In Progress"
    ) {
      return (
        <Clock3
          size={17}
        />
      );
    }

    return (
      <Circle size={17} />
    );
  }

  function getStatusClass(status) {
    if (
      status ===
      "Completed"
    ) {
      return "status-completed";
    }

    if (
      status ===
      "In Progress"
    ) {
      return "status-progress";
    }

    return "status-not-started";
  }

  const totalUnits =
    syllabus?.units?.length || 0;

  const totalTopics =
    syllabus?.units?.reduce(
      (total, unit) =>
        total +
        (Array.isArray(
          unit.topics
        )
          ? unit.topics.length
          : 0),
      0
    ) || 0;

  const completedTopics =
    syllabus?.units?.reduce(
      (total, unit) =>
        total +
        (Array.isArray(
          unit.topics
        )
          ? unit.topics.filter(
              (topic) =>
                topic.status ===
                "Completed"
            ).length
          : 0),
      0
    ) || 0;

  const inProgressTopics =
    syllabus?.units?.reduce(
      (total, unit) =>
        total +
        (Array.isArray(
          unit.topics
        )
          ? unit.topics.filter(
              (topic) =>
                topic.status ===
                "In Progress"
            ).length
          : 0),
      0
    ) || 0;

  const notStartedTopics =
    Math.max(
      0,
      totalTopics -
        completedTopics -
        inProgressTopics
    );

  const syllabusCoverage =
    totalTopics > 0
      ? Math.round(
          (completedTopics /
            totalTopics) *
            100
        )
      : 0;

  return (
    <div className="syllabus-page">
      {/* HEADER */}

      <div className="syllabus-header">
        <div className="syllabus-title-row">
          <div className="syllabus-title-icon">
            <BookOpen size={25} />
          </div>

          <div>
            <h1>Syllabus</h1>

            <p>
              Explore your subjects,
              units and topics in one
              place.
            </p>
          </div>
        </div>

        <button
          className="syllabus-refresh-button"
          onClick={() => {
            if (
              selectedSubject?.id !=
              null
            ) {
              loadSyllabus(
                selectedSubject.id
              );
            } else {
              loadSubjects();
            }
          }}
          disabled={
            loadingSyllabus ||
            loadingSubjects
          }
          type="button"
        >
          <RefreshCw
            size={17}
            className={
              loadingSyllabus
                ? "spin-icon"
                : ""
            }
          />

          <span>
            Refresh
          </span>
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="syllabus-error">
          <AlertCircle
            size={18}
          />

          <span>{error}</span>
        </div>
      )}

      {/* SUBJECT SELECTOR */}

      <section className="syllabus-subject-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">
              YOUR SUBJECTS
            </span>

            <h2>
              Select a subject
            </h2>
          </div>
        </div>

        {loadingSubjects ? (
          <div className="syllabus-loading">
            Loading subjects...
          </div>
        ) : subjects.length ===
          0 ? (
          <div className="syllabus-empty">
            <BookOpen size={30} />

            <h3>
              No subjects found
            </h3>

            <p>
              Add a subject first
              from the Subjects
              section.
            </p>
          </div>
        ) : (
          <div className="subject-selector">
            {subjects.map(
              (subject) => (
                <button
                  key={subject.id}
                  className={`subject-chip ${
                    selectedSubject?.id ===
                    subject.id
                      ? "subject-chip-active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedSubject(
                      subject
                    )
                  }
                  type="button"
                >
                  <span className="subject-chip-short">
                    {subject.short_name}
                  </span>

                  <span className="subject-chip-name">
                    {subject.name}
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </section>

      {/* CONTENT */}

      {selectedSubject && (
        <section className="syllabus-content-section">
          {/* OVERVIEW */}

          <div className="syllabus-overview">
            <div className="syllabus-overview-main">
              <span className="overview-label">
                CURRENT SUBJECT
              </span>

              <h2>
                {syllabus?.subject_name ||
                  selectedSubject.name}
              </h2>

              <p>
                {syllabus?.subject_short_name ||
                  selectedSubject.short_name}
              </p>
            </div>

            <div className="syllabus-stat">
              <span>
                Units
              </span>

              <strong>
                {totalUnits}
              </strong>
            </div>

            <div className="syllabus-stat">
              <span>
                Topics
              </span>

              <strong>
                {totalTopics}
              </strong>
            </div>

            <div className="syllabus-stat">
              <span>
                Completed
              </span>

              <strong>
                {completedTopics}
              </strong>
            </div>

            <div className="syllabus-stat">
              <span>
                Coverage
              </span>

              <strong>
                {syllabusCoverage}%
              </strong>
            </div>
          </div>

          {/* PROGRESS */}

          <div className="syllabus-progress-card">
            <div className="progress-card-top">
              <div>
                <span className="progress-card-label">
                  SYLLABUS COVERAGE
                </span>

                <h3>
                  {completedTopics} of{" "}
                  {totalTopics}{" "}
                  topics completed
                </h3>
              </div>

              <strong>
                {syllabusCoverage}%
              </strong>
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
                <CheckCircle2
                  size={14}
                />

                {completedTopics}{" "}
                completed
              </span>

              <span>
                <Clock3 size={14} />

                {inProgressTopics}{" "}
                in progress
              </span>

              <span>
                <Circle size={14} />

                {notStartedTopics}{" "}
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

                <h2>
                  Units & Topics
                </h2>
              </div>
            </div>

            {loadingSyllabus ? (
              <div className="syllabus-loading">
                Loading syllabus...
              </div>
            ) : !syllabus ? (
              <div className="syllabus-empty">
                <BookOpen size={30} />

                <h3>
                  Could not load syllabus
                </h3>

                <p>
                  Try refreshing the
                  syllabus.
                </p>
              </div>
            ) : syllabus.units.length ===
              0 ? (
              <div className="syllabus-empty">
                <BookOpen size={30} />

                <h3>
                  No syllabus added yet
                </h3>

                <p>
                  This subject does
                  not have any
                  syllabus units yet.
                </p>
              </div>
            ) : (
              <div className="units-list">
                {syllabus.units.map(
                  (unit) => {
                    const isExpanded =
                      Boolean(
                        expandedUnits[
                          unit.unit_id
                        ]
                      );

                    return (
                      <div
                        className="unit-card"
                        key={
                          unit.unit_id
                        }
                      >
                        {/* UNIT HEADER */}

                        <button
                          className="unit-header"
                          onClick={() =>
                            toggleUnit(
                              unit.unit_id
                            )
                          }
                          type="button"
                        >
                          <div className="unit-header-left">
                            <div className="unit-number">
                              {
                                unit.unit_number
                              }
                            </div>

                            <div>
                              <span className="unit-label">
                                UNIT{" "}
                                {
                                  unit.unit_number
                                }
                              </span>

                              <h3>
                                {
                                  unit.unit_name
                                }
                              </h3>

                              <span className="unit-topic-count">
                                {
                                  unit
                                    .topics
                                    .length
                                }{" "}
                                {unit.topics
                                  .length ===
                                1
                                  ? "topic"
                                  : "topics"}
                              </span>
                            </div>
                          </div>

                          <div className="unit-chevron">
                            {isExpanded ? (
                              <ChevronDown
                                size={
                                  21
                                }
                              />
                            ) : (
                              <ChevronRight
                                size={
                                  21
                                }
                              />
                            )}
                          </div>
                        </button>

                        {/* TOPICS */}

                        {isExpanded && (
                          <div className="topics-container">
                            {unit.topics
                              .length ===
                            0 ? (
                              <div className="no-topics">
                                No topics
                                have been
                                added to
                                this unit
                                yet.
                              </div>
                            ) : (
                              unit.topics.map(
                                (
                                  topic
                                ) => (
                                  <div
                                    className="topic-row"
                                    key={
                                      topic.topic_id
                                    }
                                  >
                                    <div className="topic-main">
                                      {/* STATUS ICON */}

                                      <button
                                        className={`topic-status-button ${getStatusClass(
                                          topic.status
                                        )}`}
                                        onClick={() =>
                                          updateTopicStatus(
                                            topic.topic_id,
                                            topic.status
                                          )
                                        }
                                        disabled={
                                          updatingTopic ===
                                          topic.topic_id
                                        }
                                        title="Click to change status"
                                        type="button"
                                      >
                                        {getStatusIcon(
                                          topic.status
                                        )}
                                      </button>

                                      {/* TOPIC INFO */}

                                      <div className="topic-info">
                                        <h4>
                                          {
                                            topic.topic_name
                                          }
                                        </h4>

                                        <button
                                          className={`topic-status-button-text ${getStatusClass(
                                            topic.status
                                          )}`}
                                          onClick={() =>
                                            updateTopicStatus(
                                              topic.topic_id,
                                              topic.status
                                            )
                                          }
                                          disabled={
                                            updatingTopic ===
                                            topic.topic_id
                                          }
                                          type="button"
                                        >
                                          {updatingTopic ===
                                          topic.topic_id
                                            ? "Updating..."
                                            : topic.status}
                                        </button>
                                      </div>
                                    </div>

                                    {/* MASTERY */}

                                    <div className="topic-mastery">
                                      <div className="mastery-top">
                                        <span>
                                          Mastery
                                        </span>

                                        <strong>
                                          {
                                            topic.mastery
                                          }
                                          %
                                        </strong>
                                      </div>

                                      <div className="mastery-track">
                                        <div
                                          className="mastery-fill"
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              Math.max(
                                                0,
                                                Number(
                                                  topic.mastery
                                                ) ||
                                                  0
                                              )
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Syllabus;