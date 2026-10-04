import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Clock3,
  CheckCircle2,
  Target,
  TrendingUp,
  BookOpen,
  CalendarDays,
  Flame,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

const WEEK_DAYS = [
  { key: 0, short: "Mon", full: "Monday" },
  { key: 1, short: "Tue", full: "Tuesday" },
  { key: 2, short: "Wed", full: "Wednesday" },
  { key: 3, short: "Thu", full: "Thursday" },
  { key: 4, short: "Fri", full: "Friday" },
  { key: 5, short: "Sat", full: "Saturday" },
  { key: 6, short: "Sun", full: "Sunday" },
];

function startOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );
    }
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getMonday(date) {
  const day = date.getDay();

  const difference = day === 0 ? -6 : 1 - day;

  const monday = new Date(date);

  monday.setDate(date.getDate() + difference);

  return startOfDay(monday);
}

function addDays(date, days) {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

function formatWeekRange(monday) {
  const sunday = addDays(monday, 6);

  const sameMonth =
    monday.getMonth() === sunday.getMonth() &&
    monday.getFullYear() === sunday.getFullYear();

  if (sameMonth) {
    return `${monday.toLocaleDateString("en-IN", {
      month: "short",
    })} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
  }

  return `${monday.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} – ${sunday.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function formatDate(date) {
  if (!date) return "Unknown date";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date) {
  if (!date) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(minutes) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function normalizeResponse(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.value)) {
    return data.value;
  }

  return [];
}

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "completed") {
    return "completed";
  }

  if (normalized === "in progress") {
    return "in-progress";
  }

  return "pending";
}

export default function Analytics() {
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [studySessions, setStudySessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalyticsData() {
      try {
        setLoading(true);
        setError("");

        const [subjectsResponse, tasksResponse, sessionsResponse] =
          await Promise.all([
            fetch(`${API_BASE}/subjects`),
            fetch(`${API_BASE}/tasks`),
            fetch(`${API_BASE}/study-sessions`),
          ]);

        if (!subjectsResponse.ok) {
          throw new Error("Unable to load subjects.");
        }

        if (!tasksResponse.ok) {
          throw new Error("Unable to load tasks.");
        }

        if (!sessionsResponse.ok) {
          throw new Error("Unable to load study sessions.");
        }

        const [subjectsData, tasksData, sessionsData] =
          await Promise.all([
            subjectsResponse.json(),
            tasksResponse.json(),
            sessionsResponse.json(),
          ]);

        if (cancelled) return;

        setSubjects(
          normalizeResponse(subjectsData, ["subjects"])
        );

        setTasks(
          normalizeResponse(tasksData, ["tasks"])
        );

        setStudySessions(
          normalizeResponse(sessionsData, [
            "study_sessions",
            "sessions",
          ])
        );
      } catch (err) {
        if (cancelled) return;

        console.error("Analytics loading error:", err);

        setError(
          err?.message ||
            "Something went wrong while loading analytics."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAnalyticsData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMonday = useMemo(() => {
    const today = startOfDay(new Date());

    const currentMonday = getMonday(today);

    return addDays(currentMonday, weekOffset * 7);
  }, [weekOffset]);

  const selectedSunday = useMemo(() => {
    return addDays(selectedMonday, 6);
  }, [selectedMonday]);

  const weeklySessions = useMemo(() => {
    const start = startOfDay(selectedMonday);
    const end = addDays(startOfDay(selectedSunday), 1);

    return studySessions.filter((session) => {
      const sessionDate = parseLocalDate(session.start_time);

      if (!sessionDate) return false;

      return sessionDate >= start && sessionDate < end;
    });
  }, [studySessions, selectedMonday, selectedSunday]);

  const weeklyData = useMemo(() => {
    return WEEK_DAYS.map((day) => {
      const dayDate = addDays(selectedMonday, day.key);
      const targetDate = dateKey(dayDate);

      const minutes = weeklySessions.reduce(
        (total, session) => {
          const sessionDate = parseLocalDate(
            session.start_time
          );

          if (!sessionDate) {
            return total;
          }

          if (dateKey(sessionDate) !== targetDate) {
            return total;
          }

          return (
            total +
            (Number(session.duration_minutes) || 0)
          );
        },
        0
      );

      return {
        ...day,
        minutes,
        hours: minutes / 60,
        date: dayDate,
      };
    });
  }, [weeklySessions, selectedMonday]);

  const totalWeeklyMinutes = useMemo(() => {
    return weeklyData.reduce(
      (total, day) => total + day.minutes,
      0
    );
  }, [weeklyData]);

  const totalHours = totalWeeklyMinutes / 60;

  const studyDays = useMemo(() => {
    return weeklyData.filter((day) => day.minutes > 0).length;
  }, [weeklyData]);

  const averageHours = studyDays
    ? totalHours / studyDays
    : 0;

  const maxHours = useMemo(() => {
    return Math.max(
      ...weeklyData.map((day) => day.hours),
      0
    );
  }, [weeklyData]);

  const completedTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        String(task.status || "").toLowerCase() ===
        "completed"
    ).length;
  }, [tasks]);

  const pendingTasks = Math.max(
    0,
    tasks.length - completedTasks
  );

  const taskCompletionRate = tasks.length
    ? Math.round(
        (completedTasks / tasks.length) * 100
      )
    : 0;

  const overallProgress = useMemo(() => {
    if (!subjects.length) return 0;

    const totalTopics = subjects.reduce(
      (total, subject) =>
        total +
        Number(
          subject.syllabus_topics ??
            subject.topics ??
            0
        ),
      0
    );

    const completedTopics = subjects.reduce(
      (total, subject) =>
        total +
        Number(subject.completed_topics || 0),
      0
    );

    if (totalTopics > 0) {
      return Math.round(
        (completedTopics / totalTopics) * 100
      );
    }

    const progressTotal = subjects.reduce(
      (total, subject) =>
        total + Number(subject.progress || 0),
      0
    );

    return Math.round(
      progressTotal / subjects.length
    );
  }, [subjects]);

  const studyDates = useMemo(() => {
    const dates = new Set();

    studySessions.forEach((session) => {
      const sessionDate = parseLocalDate(
        session.start_time
      );

      if (sessionDate) {
        dates.add(dateKey(sessionDate));
      }
    });

    return dates;
  }, [studySessions]);

  const currentStudyStreak = useMemo(() => {
    let streak = 0;

    let currentDate = startOfDay(new Date());

    while (studyDates.has(dateKey(currentDate))) {
      streak += 1;

      currentDate = addDays(currentDate, -1);
    }

    return streak;
  }, [studyDates]);

  const subjectPerformance = useMemo(() => {
    return subjects.map((subject) => {
      const subjectSessions = studySessions.filter(
        (session) =>
          Number(session.subject_id) ===
          Number(subject.id)
      );

      const studyMinutes = subjectSessions.reduce(
        (total, session) =>
          total +
          (Number(session.duration_minutes) || 0),
        0
      );

      const syllabusTopics = Number(
        subject.syllabus_topics ??
          subject.topics ??
          0
      );

      const completedTopics = Number(
        subject.completed_topics || 0
      );

      let calculatedProgress = Number(
        subject.progress || 0
      );

      if (syllabusTopics > 0) {
        calculatedProgress = Math.round(
          (completedTopics / syllabusTopics) * 100
        );
      }

      return {
        id: subject.id,
        name: subject.name || "Unknown Subject",
        shortName:
          subject.short_name ||
          subject.name ||
          "Subject",
        progress: Math.max(
          0,
          Math.min(100, calculatedProgress)
        ),
        topics: syllabusTopics,
        completedTopics,
        studyMinutes,
        color: subject.color || "blue",
      };
    });
  }, [subjects, studySessions]);

  const consistencyPercentage = Math.round(
    (studyDays / 7) * 100
  );

  const recentActivity = useMemo(() => {
    const activity = [];

    studySessions.forEach((session) => {
      const sessionDate = parseLocalDate(
        session.start_time
      );

      activity.push({
        id: `study-${session.id}`,
        type: "study",
        title:
          session.topic ||
          "Study session",
        subtitle:
          session.subject_short_name ||
          session.subject_name ||
          "Study",
        date: sessionDate,
        duration: Number(
          session.duration_minutes || 0
        ),
      });
    });

    tasks
      .filter(
        (task) =>
          String(task.status || "").toLowerCase() ===
          "completed"
      )
      .forEach((task) => {
        const taskDate = parseLocalDate(
          task.created_at
        );

        activity.push({
          id: `task-${task.id}`,
          type: "task",
          title: task.title,
          subtitle:
            task.subject_short_name ||
            task.subject_name ||
            "Task",
          date: taskDate,
          duration: null,
        });
      });

    return activity
      .filter((item) => item.date)
      .sort(
        (a, b) =>
          b.date.getTime() - a.date.getTime()
      )
      .slice(0, 5);
  }, [studySessions, tasks]);

  const taskBreakdown = useMemo(() => {
    const total = tasks.length;

    if (!total) {
      return {
        completed: 0,
        pending: 0,
        completedPercentage: 0,
        pendingPercentage: 0,
      };
    }

    return {
      completed: completedTasks,
      pending: pendingTasks,
      completedPercentage: Math.round(
        (completedTasks / total) * 100
      ),
      pendingPercentage: Math.round(
        (pendingTasks / total) * 100
      ),
    };
  }, [tasks, completedTasks, pendingTasks]);

  const maxBarHeight = 180;

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          <div className="analytics-loading-icon">
            <BarChart3 size={28} />
          </div>

          <h2>Loading analytics...</h2>

          <p>
            Fetching your subjects, tasks and study
            sessions.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-error">
          <div className="analytics-error-icon">
            <BarChart3 size={28} />
          </div>

          <h2>Unable to load analytics</h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* HEADER */}
      <div className="analytics-header">
        <div>
          <div className="analytics-eyebrow">
            <BarChart3 size={16} />
            PERFORMANCE OVERVIEW
          </div>

          <h1>Analytics</h1>

          <p>
            Understand your study habits and academic
            progress.
          </p>
        </div>

        <div className="analytics-week-selector">
          <button
            type="button"
            onClick={() =>
              setWeekOffset((value) => value - 1)
            }
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="analytics-week-label">
            <CalendarDays size={16} />

            <span>
              {formatWeekRange(selectedMonday)}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setWeekOffset((value) => value + 1)
            }
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="analytics-stats-grid">
        <div className="analytics-stat-card">
          <div className="analytics-stat-icon blue">
            <Clock3 size={21} />
          </div>

          <div className="analytics-stat-content">
            <span className="analytics-stat-label">
              Study Time
            </span>

            <strong>
              {formatDuration(totalWeeklyMinutes)}
            </strong>

            <small>
              {weekOffset === 0
                ? "This week"
                : "Selected week"}
            </small>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon burgundy">
            <CheckCircle2 size={21} />
          </div>

          <div className="analytics-stat-content">
            <span className="analytics-stat-label">
              Tasks Completed
            </span>

            <strong>
              {completedTasks}
            </strong>

            <small>
              {tasks.length} total tasks
            </small>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon gold">
            <Flame size={21} />
          </div>

          <div className="analytics-stat-content">
            <span className="analytics-stat-label">
              Study Streak
            </span>

            <strong>
              {currentStudyStreak}{" "}
              {currentStudyStreak === 1
                ? "day"
                : "days"}
            </strong>

            <small>
              Consecutive study days
            </small>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon blue">
            <Target size={21} />
          </div>

          <div className="analytics-stat-content">
            <span className="analytics-stat-label">
              Overall Progress
            </span>

            <strong>
              {overallProgress}%
            </strong>

            <small>
              Syllabus coverage
            </small>
          </div>
        </div>
      </div>

      {/* WEEKLY STUDY HOURS */}
      <section className="analytics-section">
        <div className="analytics-section-header">
          <div>
            <h2>Weekly Study Hours</h2>

            <p>
              Your study activity across the selected
              week.
            </p>
          </div>

          <div className="analytics-section-summary">
            <strong>
              {totalHours.toFixed(1)}h
            </strong>

            <span>
              {studyDays}{" "}
              {studyDays === 1
                ? "study day"
                : "study days"}
            </span>
          </div>
        </div>

        <div className="analytics-chart-card">
          <div className="analytics-bar-chart">
            {weeklyData.map((day) => {
              const height =
                maxHours > 0
                  ? Math.max(
                      (day.hours / maxHours) *
                        maxBarHeight,
                      day.hours > 0 ? 8 : 0
                    )
                  : 0;

              return (
                <div
                  className="analytics-bar-column"
                  key={day.key}
                  title={`${day.full}: ${formatDuration(
                    day.minutes
                  )}`}
                >
                  <div className="analytics-bar-value">
                    {day.hours > 0
                      ? `${day.hours.toFixed(1)}h`
                      : ""}
                  </div>

                  <div className="analytics-bar-wrapper">
                    <div
                      className="analytics-bar"
                      style={{
                        height: `${height}px`,
                      }}
                    />
                  </div>

                  <span className="analytics-bar-label">
                    {day.short}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="analytics-chart-footer">
            <span>
              Average per study day:{" "}
              <strong>
                {averageHours.toFixed(1)}h
              </strong>
            </span>

            <span>
              Total:{" "}
              <strong>
                {formatDuration(totalWeeklyMinutes)}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* CONSISTENCY + TASK BREAKDOWN */}
      <div className="analytics-two-column">
        <section className="analytics-section analytics-consistency-section">
          <div className="analytics-section-header">
            <div>
              <h2>Study Consistency</h2>

              <p>
                How regularly you studied this week.
              </p>
            </div>
          </div>

          <div className="analytics-consistency-card">
            <div
              className="analytics-consistency-ring"
              style={{
                "--progress": `${consistencyPercentage}%`,
              }}
            >
              <div className="analytics-consistency-ring-inner">
                <strong>
                  {consistencyPercentage}%
                </strong>

                <span>Consistency</span>
              </div>
            </div>

            <div className="analytics-consistency-details">
              <div>
                <span className="analytics-dot blue" />
                <div>
                  <strong>
                    {studyDays}/7 days
                  </strong>

                  <small>
                    Days with study activity
                  </small>
                </div>
              </div>

              <div>
                <span className="analytics-dot burgundy" />
                <div>
                  <strong>
                    {averageHours.toFixed(1)}h
                  </strong>

                  <small>
                    Average study time
                  </small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="analytics-section">
          <div className="analytics-section-header">
            <div>
              <h2>Task Breakdown</h2>

              <p>
                Current assignment completion.
              </p>
            </div>
          </div>

          <div className="analytics-task-card">
            <div className="analytics-task-donut">
              <div
                className="analytics-task-donut-ring"
                style={{
                  "--task-progress": `${taskBreakdown.completedPercentage}%`,
                }}
              >
                <div className="analytics-task-donut-inner">
                  <strong>
                    {taskCompletionRate}%
                  </strong>

                  <span>Complete</span>
                </div>
              </div>
            </div>

            <div className="analytics-task-legend">
              <div>
                <span className="analytics-dot blue" />

                <div>
                  <strong>
                    {completedTasks}
                  </strong>

                  <small>Completed</small>
                </div>
              </div>

              <div>
                <span className="analytics-dot burgundy" />

                <div>
                  <strong>
                    {pendingTasks}
                  </strong>

                  <small>Pending</small>
                </div>
              </div>

              <div>
                <span className="analytics-dot gold" />

                <div>
                  <strong>
                    {tasks.length}
                  </strong>

                  <small>Total tasks</small>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* SUBJECT PERFORMANCE */}
      <section className="analytics-section">
        <div className="analytics-section-header">
          <div>
            <h2>Subject Performance</h2>

            <p>
              Syllabus coverage and time invested in
              each subject.
            </p>
          </div>
        </div>

        <div className="analytics-subject-list">
          {subjectPerformance.length === 0 ? (
            <div className="analytics-empty-state">
              <BookOpen size={28} />

              <p>
                No subjects available yet.
              </p>
            </div>
          ) : (
            subjectPerformance.map((subject) => (
              <div
                className="analytics-subject-row"
                key={subject.id}
              >
                <div className="analytics-subject-main">
                  <div
                    className={`analytics-subject-icon ${subject.color}`}
                  >
                    <BookOpen size={18} />
                  </div>

                  <div>
                    <strong>
                      {subject.name}
                    </strong>

                    <span>
                      {subject.completedTopics}/
                      {subject.topics} topics completed
                    </span>
                  </div>
                </div>

                <div className="analytics-subject-progress">
                  <div className="analytics-progress-info">
                    <span>
                      {formatDuration(
                        subject.studyMinutes
                      )}
                    </span>

                    <strong>
                      {subject.progress}%
                    </strong>
                  </div>

                  <div className="analytics-progress-track">
                    <div
                      className={`analytics-progress-fill ${subject.color}`}
                      style={{
                        width: `${subject.progress}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="analytics-section">
        <div className="analytics-section-header">
          <div>
            <h2>Recent Activity</h2>

            <p>
              Your latest study sessions and completed
              tasks.
            </p>
          </div>

          <TrendingUp size={22} />
        </div>

        <div className="analytics-activity-list">
          {recentActivity.length === 0 ? (
            <div className="analytics-empty-state">
              <CalendarDays size={28} />

              <p>
                No recent activity yet.
              </p>
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div
                className="analytics-activity-row"
                key={activity.id}
              >
                <div
                  className={`analytics-activity-icon ${
                    activity.type === "study"
                      ? "blue"
                      : "burgundy"
                  }`}
                >
                  {activity.type === "study" ? (
                    <Clock3 size={17} />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                </div>

                <div className="analytics-activity-content">
                  <strong>
                    {activity.title}
                  </strong>

                  <span>
                    {activity.subtitle}
                  </span>
                </div>

                <div className="analytics-activity-meta">
                  <strong>
                    {activity.type === "study"
                      ? formatDuration(
                          activity.duration
                        )
                      : "Completed"}
                  </strong>

                  <span>
                    {formatDate(activity.date)}
                    {activity.type === "study" &&
                      ` • ${formatTime(
                        activity.date
                      )}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FOOTER SUMMARY */}
      <div className="analytics-footer-summary">
        <div>
          <span>Subjects tracked</span>
          <strong>{subjects.length}</strong>
        </div>

        <div>
          <span>Total tasks</span>
          <strong>{tasks.length}</strong>
        </div>

        <div>
          <span>Total study sessions</span>
          <strong>
            {studySessions.length}
          </strong>
        </div>

        <div>
          <span>Total study time</span>
          <strong>
            {formatDuration(
              studySessions.reduce(
                (total, session) =>
                  total +
                  (Number(
                    session.duration_minutes
                  ) || 0),
                0
              )
            )}
          </strong>
        </div>
      </div>
    </div>
  );
}