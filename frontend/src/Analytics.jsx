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
  Activity,
  ListChecks,
  Timer,
} from "lucide-react";

import "./Analytics.css";

function Analytics() {
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const [subjectsRes, tasksRes, sessionsRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/subjects"),
          fetch("http://127.0.0.1:8000/tasks"),
          fetch("http://127.0.0.1:8000/study-sessions"),
        ]);

        if (!subjectsRes.ok) {
          throw new Error("Failed to fetch subjects");
        }

        if (!tasksRes.ok) {
          throw new Error("Failed to fetch tasks");
        }

        if (!sessionsRes.ok) {
          throw new Error("Failed to fetch study sessions");
        }

        const subjectsData = await subjectsRes.json();
        const tasksData = await tasksRes.json();
        const sessionsData = await sessionsRes.json();

        setSubjects(
          Array.isArray(subjectsData)
            ? subjectsData
            : subjectsData.subjects || []
        );

        setTasks(
          Array.isArray(tasksData) ? tasksData : tasksData.tasks || []
        );

        setStudySessions(
          Array.isArray(sessionsData)
            ? sessionsData
            : sessionsData.study_sessions || []
        );
      } catch (err) {
        console.error("Analytics error:", err);
        setError(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const getWeekStart = (offset = 0) => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + mondayOffset + offset * 7);

    return date;
  };

  const selectedWeekStart = useMemo(
    () => getWeekStart(weekOffset),
    [weekOffset]
  );

  const selectedWeekEnd = useMemo(() => {
    const date = new Date(selectedWeekStart);
    date.setDate(date.getDate() + 6);
    return date;
  }, [selectedWeekStart]);

  const isDateInSelectedWeek = (dateValue) => {
    if (!dateValue) return false;

    const date = new Date(dateValue);

    return date >= selectedWeekStart && date < new Date(
      selectedWeekEnd.getTime() + 24 * 60 * 60 * 1000
    );
  };

  const weeklySessions = useMemo(() => {
    return studySessions.filter((session) =>
      isDateInSelectedWeek(session.start_time)
    );
  }, [studySessions, selectedWeekStart, selectedWeekEnd]);

  const weeklyMinutes = useMemo(() => {
    return weeklySessions.reduce(
      (total, session) => total + Number(session.duration_minutes || 0),
      0
    );
  }, [weeklySessions]);

  const weeklyHours = weeklyMinutes / 60;

  const completedTasks = useMemo(() => {
    return tasks.filter(
      (task) => String(task.status || "").toLowerCase() === "completed"
    );
  }, [tasks]);

  const pendingTasks = Math.max(tasks.length - completedTasks.length, 0);

  const taskCompletionRate =
    tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;

  const overallProgress = useMemo(() => {
    if (!subjects.length) return 0;

    const totalTopics = subjects.reduce(
      (sum, subject) =>
        sum + Number(subject.syllabus_topics ?? subject.topics ?? 0),
      0
    );

    const completedTopics = subjects.reduce(
      (sum, subject) =>
        sum + Number(subject.completed_topics ?? 0),
      0
    );

    if (totalTopics > 0) {
      return Math.round((completedTopics / totalTopics) * 100);
    }

    return Math.round(
      subjects.reduce(
        (sum, subject) => sum + Number(subject.progress || 0),
        0
      ) / subjects.length
    );
  }, [subjects]);

  const formatTime = (minutes) => {
    const value = Number(minutes || 0);

    if (value < 60) {
      return `${value}m`;
    }

    const hours = Math.floor(value / 60);
    const mins = value % 60;

    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  };

  const formatActivityDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatWeekLabel = () => {
    const start = selectedWeekStart;
    const end = selectedWeekEnd;

    const sameMonth = start.getMonth() === end.getMonth();

    if (sameMonth) {
      return `${start.toLocaleDateString("en-IN", {
        month: "short",
      })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }

    return `${start.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })} – ${end.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  };

  const weeklyChart = useMemo(() => {
    const days = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(selectedWeekStart);
      date.setDate(date.getDate() + i);

      const dateKey = date.toDateString();

      const minutes = weeklySessions
        .filter((session) => {
          const sessionDate = new Date(session.start_time);
          return sessionDate.toDateString() === dateKey;
        })
        .reduce(
          (total, session) =>
            total + Number(session.duration_minutes || 0),
          0
        );

      days.push({
        date,
        minutes,
        label: date.toLocaleDateString("en-IN", {
          weekday: "short",
        }),
      });
    }

    return days;
  }, [weeklySessions, selectedWeekStart]);

  const maxChartMinutes = Math.max(
    ...weeklyChart.map((day) => day.minutes),
    60
  );

  const studyDays = weeklyChart.filter((day) => day.minutes > 0).length;

  const consistency = Math.round((studyDays / 7) * 100);

  const streak = useMemo(() => {
    if (!studySessions.length) return 0;

    const studyDates = new Set(
      studySessions
        .filter((session) => session.start_time)
        .map((session) => {
          const date = new Date(session.start_time);
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        })
    );

    let streakCount = 0;
    const current = new Date();

    current.setHours(0, 0, 0, 0);

    while (true) {
      const key = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;

      if (!studyDates.has(key)) {
        break;
      }

      streakCount++;
      current.setDate(current.getDate() - 1);
    }

    return streakCount;
  }, [studySessions]);

  const subjectPerformance = useMemo(() => {
    return subjects.map((subject) => {
      const subjectSessions = studySessions.filter(
        (session) => Number(session.subject_id) === Number(subject.id)
      );

      const minutes = subjectSessions.reduce(
        (total, session) =>
          total + Number(session.duration_minutes || 0),
        0
      );

      const progress = Number(subject.progress || 0);

      return {
        ...subject,
        minutes,
        progress,
        topics: Number(
          subject.syllabus_topics ?? subject.topics ?? 0
        ),
        completedTopics: Number(subject.completed_topics ?? 0),
      };
    });
  }, [subjects, studySessions]);

  const recentActivity = useMemo(() => {
    const activities = [];

    studySessions.forEach((session) => {
      const subject = subjects.find(
        (item) => Number(item.id) === Number(session.subject_id)
      );

      activities.push({
        id: `study-${session.id}`,
        type: "study",
        title: session.topic
          ? `Studied ${session.topic}`
          : "Study session completed",
        subtitle: subject?.name || "Study session",
        date: session.start_time,
        duration: session.duration_minutes,
      });
    });

    completedTasks.forEach((task) => {
      activities.push({
        id: `task-${task.id}`,
        type: "completed",
        title: `Completed ${task.title}`,
        subtitle: task.subject_name || "Task",
        date: task.created_at || task.due_date,
      });
    });

    return activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [studySessions, completedTasks, subjects]);

  if (loading) {
    return (
      <section className="dashboard-content analytics-page">
        <div className="analytics-loading">
          <div className="analytics-loading-spinner" />
          <h3>Loading analytics</h3>
          <p>Preparing your study insights...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-content analytics-page">
        <div className="analytics-error">
          <div className="analytics-error-icon">
            <BarChart3 size={28} />
          </div>
          <h3>Unable to load analytics</h3>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="analytics-retry-button"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-content analytics-page">
      {/* HEADER */}
      <div className="analytics-header">
        <div>
          <div className="analytics-eyebrow">
            <BarChart3 size={15} />
            PERFORMANCE OVERVIEW
          </div>

          <h1>Analytics</h1>

          <p>
            Understand your study habits, progress, and consistency.
          </p>
        </div>

        <div className="analytics-week-selector">
          <button
            type="button"
            className="week-arrow"
            onClick={() => setWeekOffset((value) => value - 1)}
            aria-label="Previous week"
          >
            <ChevronLeft size={19} />
          </button>

          <div className="analytics-week-label">
            <CalendarDays size={17} />
            <span>{formatWeekLabel()}</span>
          </div>

          <button
            type="button"
            className="week-arrow"
            onClick={() => setWeekOffset((value) => value + 1)}
            aria-label="Next week"
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="analytics-stat-grid">
        <div className="analytics-stat-card blue">
          <div className="analytics-stat-top">
            <div className="analytics-stat-icon">
              <Clock3 size={22} />
            </div>

            <span className="analytics-stat-tag">THIS WEEK</span>
          </div>

          <div className="analytics-stat-value">
            {formatTime(weeklyMinutes)}
          </div>

          <div className="analytics-stat-title">Study Time</div>

          <div className="analytics-stat-description">
            Total focused study time
          </div>
        </div>

        <div className="analytics-stat-card burgundy">
          <div className="analytics-stat-top">
            <div className="analytics-stat-icon">
              <CheckCircle2 size={22} />
            </div>

            <span className="analytics-stat-tag">TASKS</span>
          </div>

          <div className="analytics-stat-value">
            {completedTasks.length}
            <span> / {tasks.length}</span>
          </div>

          <div className="analytics-stat-title">Tasks Completed</div>

          <div className="analytics-stat-description">
            {taskCompletionRate}% completion rate
          </div>
        </div>

        <div className="analytics-stat-card gold">
          <div className="analytics-stat-top">
            <div className="analytics-stat-icon">
              <Flame size={22} />
            </div>

            <span className="analytics-stat-tag">STREAK</span>
          </div>

          <div className="analytics-stat-value">
            {streak}
            <span> {streak === 1 ? "day" : "days"}</span>
          </div>

          <div className="analytics-stat-title">Study Streak</div>

          <div className="analytics-stat-description">
            Consecutive study days
          </div>
        </div>

        <div className="analytics-stat-card navy">
          <div className="analytics-stat-top">
            <div className="analytics-stat-icon">
              <Target size={22} />
            </div>

            <span className="analytics-stat-tag">OVERALL</span>
          </div>

          <div className="analytics-stat-value">
            {overallProgress}%
          </div>

          <div className="analytics-stat-title">Overall Progress</div>

          <div className="analytics-stat-description">
            Across your tracked syllabus
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="analytics-main-grid">
        {/* WEEKLY CHART */}
        <div className="analytics-card weekly-chart-card">
          <div className="analytics-card-header">
            <div>
              <div className="card-label">
                <TrendingUp size={15} />
                WEEKLY ACTIVITY
              </div>

              <h2>Study Hours</h2>

              <p>Daily study time for the selected week</p>
            </div>

            <div className="chart-total">
              <strong>{weeklyHours.toFixed(1)}h</strong>
              <span>total</span>
            </div>
          </div>

          <div className="bar-chart">
            {weeklyChart.map((day) => {
              const height =
                day.minutes > 0
                  ? Math.max(
                      (day.minutes / maxChartMinutes) * 100,
                      8
                    )
                  : 4;

              return (
                <div className="bar-column" key={day.date.toISOString()}>
                  <div className="bar-value">
                    {day.minutes > 0 ? formatTime(day.minutes) : ""}
                  </div>

                  <div className="bar-track">
                    <div
                      className={`bar-fill ${
                        day.minutes > 0 ? "active" : ""
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>

                  <div className="bar-label">{day.label}</div>
                </div>
              );
            })}
          </div>

          <div className="chart-footer">
            <span>
              <Activity size={14} />
              {studyDays} of 7 days active
            </span>

            <span>{weeklyMinutes} minutes studied</span>
          </div>
        </div>

        {/* CONSISTENCY */}
        <div className="analytics-card consistency-card">
          <div className="analytics-card-header">
            <div>
              <div className="card-label">
                <Flame size={15} />
                CONSISTENCY
              </div>

              <h2>Study Consistency</h2>
            </div>
          </div>

          <div className="consistency-content">
            <div
              className="consistency-ring"
              style={{
                "--consistency": `${consistency * 3.6}deg`,
              }}
            >
              <div className="consistency-ring-inner">
                <strong>{consistency}%</strong>
                <span>consistent</span>
              </div>
            </div>

            <div className="consistency-details">
              <div>
                <span className="consistency-detail-number">
                  {studyDays}
                </span>
                <span>active days</span>
              </div>

              <div>
                <span className="consistency-detail-number">
                  {formatTime(weeklyMinutes)}
                </span>
                <span>study time</span>
              </div>
            </div>
          </div>

          <div className="consistency-message">
            {consistency === 0 ? (
              <>
                <strong>Start your week.</strong>
                <span>
                  Study even for 20–30 minutes today to build momentum.
                </span>
              </>
            ) : consistency < 50 ? (
              <>
                <strong>Good start!</strong>
                <span>
                  Try to add another study day to improve your consistency.
                </span>
              </>
            ) : (
              <>
                <strong>Great consistency!</strong>
                <span>
                  Keep showing up regularly and protect your streak.
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SUBJECT PERFORMANCE */}
      <div className="analytics-card subject-performance-card">
        <div className="analytics-card-header">
          <div>
            <div className="card-label">
              <BookOpen size={15} />
              SUBJECTS
            </div>

            <h2>Subject Performance</h2>

            <p>
              Progress and study time across your tracked subjects
            </p>
          </div>

          <div className="subject-count">
            {subjects.length} subjects
          </div>
        </div>

        {subjectPerformance.length === 0 ? (
          <div className="analytics-empty">
            <BookOpen size={28} />
            <p>No subjects available yet.</p>
          </div>
        ) : (
          <div className="subject-performance-list">
            {subjectPerformance.map((subject, index) => (
              <div className="performance-row" key={subject.id}>
                <div className="performance-subject">
                  <div
                    className={`performance-icon performance-color-${
                      subject.color || ["blue", "burgundy", "gold"][index % 3]
                    }`}
                  >
                    <BookOpen size={18} />
                  </div>

                  <div>
                    <strong>
                      {subject.short_name || subject.name}
                    </strong>

                    <span>
                      {subject.completedTopics} / {subject.topics} topics
                    </span>
                  </div>
                </div>

                <div className="performance-progress">
                  <div className="performance-progress-top">
                    <span>{formatTime(subject.minutes)}</span>
                    <strong>{subject.progress}%</strong>
                  </div>

                  <div className="performance-track">
                    <div
                      className="performance-fill"
                      style={{
                        width: `${Math.min(
                          Math.max(subject.progress, 0),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM GRID */}
      <div className="analytics-bottom-grid">
        {/* TASK BREAKDOWN */}
        <div className="analytics-card task-breakdown-card">
          <div className="analytics-card-header">
            <div>
              <div className="card-label">
                <ListChecks size={15} />
                TASKS
              </div>

              <h2>Task Breakdown</h2>
            </div>
          </div>

          <div className="task-breakdown-content">
            <div
              className="task-donut"
              style={{
                "--task-progress": `${taskCompletionRate * 3.6}deg`,
              }}
            >
              <div className="task-donut-inner">
                <strong>{taskCompletionRate}%</strong>
                <span>complete</span>
              </div>
            </div>

            <div className="task-legend">
              <div className="task-legend-item">
                <span className="legend-dot completed" />
                <div>
                  <strong>{completedTasks.length}</strong>
                  <span>Completed</span>
                </div>
              </div>

              <div className="task-legend-item">
                <span className="legend-dot pending" />
                <div>
                  <strong>{pendingTasks}</strong>
                  <span>Pending</span>
                </div>
              </div>

              <div className="task-total">
                {tasks.length} total tasks
              </div>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="analytics-card activity-card">
          <div className="analytics-card-header">
            <div>
              <div className="card-label">
                <Activity size={15} />
                RECENT
              </div>

              <h2>Recent Activity</h2>
            </div>

            <Timer size={19} className="activity-header-icon" />
          </div>

          {recentActivity.length === 0 ? (
            <div className="analytics-empty activity-empty">
              <Activity size={28} />
              <p>Your recent activity will appear here.</p>
            </div>
          ) : (
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <div className="activity-item" key={activity.id}>
                  <div
                    className={`activity-icon ${
                      activity.type === "completed"
                        ? "completed"
                        : "study"
                    }`}
                  >
                    {activity.type === "completed" ? (
                      <CheckCircle2 size={17} />
                    ) : (
                      <BookOpen size={17} />
                    )}
                  </div>

                  <div className="activity-info">
                    <strong>{activity.title}</strong>

                    <span>
                      {activity.subtitle} •{" "}
                      {formatActivityDate(activity.date)}
                    </span>
                  </div>

                  {activity.duration ? (
                    <span className="activity-duration">
                      {formatTime(activity.duration)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER SUMMARY */}
      <div className="analytics-summary-strip">
        <div>
          <BookOpen size={17} />
          <span>
            <strong>{subjects.length}</strong> subjects tracked
          </span>
        </div>

        <div>
          <ListChecks size={17} />
          <span>
            <strong>{tasks.length}</strong> total tasks
          </span>
        </div>

        <div>
          <Timer size={17} />
          <span>
            <strong>{studySessions.length}</strong> study sessions
          </span>
        </div>

        <div>
          <Clock3 size={17} />
          <span>
            <strong>
              {formatTime(
                studySessions.reduce(
                  (total, session) =>
                    total + Number(session.duration_minutes || 0),
                  0
                )
              )}
            </strong>{" "}
            total study time
          </span>
        </div>
      </div>
    </section>
  );
}

export default Analytics;