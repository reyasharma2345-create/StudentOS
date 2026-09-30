import { useState } from "react";

import {
  Plus,
  Clock3,
  Check,
  Trash2,
  BookOpen,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";


const initialSessions = [
  {
    id: 1,
    day: "MON",
    time: "4:00 PM",
    subject: "DBMS",
    topic: "Normalization",
    duration: 60,
    completed: true,
  },

  {
    id: 2,
    day: "MON",
    time: "6:00 PM",
    subject: "DSA",
    topic: "Linked Lists",
    duration: 45,
    completed: false,
  },

  {
    id: 3,
    day: "TUE",
    time: "5:00 PM",
    subject: "OOP",
    topic: "Inheritance",
    duration: 60,
    completed: false,
  },

  {
    id: 4,
    day: "WED",
    time: "4:30 PM",
    subject: "LDM",
    topic: "Flip-Flops",
    duration: 45,
    completed: false,
  },

  {
    id: 5,
    day: "THU",
    time: "6:00 PM",
    subject: "DBMS",
    topic: "ER Diagrams",
    duration: 60,
    completed: false,
  },

  {
    id: 6,
    day: "FRI",
    time: "5:00 PM",
    subject: "DSA",
    topic: "Stack Problems",
    duration: 45,
    completed: false,
  },

  {
    id: 7,
    day: "SAT",
    time: "11:00 AM",
    subject: "OOP",
    topic: "Constructors",
    duration: 60,
    completed: false,
  },

  {
    id: 8,
    day: "SUN",
    time: "10:00 AM",
    subject: "Revision",
    topic: "Weekly Revision",
    duration: 90,
    completed: false,
  },
];


const days = [
  {
    short: "MON",
    name: "Monday",
  },
  {
    short: "TUE",
    name: "Tuesday",
  },
  {
    short: "WED",
    name: "Wednesday",
  },
  {
    short: "THU",
    name: "Thursday",
  },
  {
    short: "FRI",
    name: "Friday",
  },
  {
    short: "SAT",
    name: "Saturday",
  },
  {
    short: "SUN",
    name: "Sunday",
  },
];


function StudyPlanner() {

  const [selectedDay, setSelectedDay] = useState("MON");

  const [sessions, setSessions] =
    useState(initialSessions);


  function toggleSession(id) {

    setSessions((currentSessions) => {

      return currentSessions.map((session) => {

        if (session.id === id) {

          return {
            ...session,
            completed: !session.completed,
          };

        }

        return session;

      });

    });

  }


  function deleteSession(id) {

    setSessions((currentSessions) =>
      currentSessions.filter(
        (session) => session.id !== id
      )
    );

  }


  const daySessions = sessions.filter(
    (session) => session.day === selectedDay
  );


  const completedSessions =
    daySessions.filter(
      (session) => session.completed
    );


  const totalMinutes =
    daySessions.reduce(
      (total, session) =>
        total + session.duration,
      0
    );


  const completedMinutes =
    completedSessions.reduce(
      (total, session) =>
        total + session.duration,
      0
    );


  const progress =
    totalMinutes === 0
      ? 0
      : Math.round(
          (completedMinutes / totalMinutes) * 100
        );


  function addDemoSession() {

    const newSession = {
      id: Date.now(),
      day: selectedDay,
      time: "8:00 PM",
      subject: "Study Session",
      topic: "Focused Study",
      duration: 45,
      completed: false,
    };


    setSessions((currentSessions) => [
      ...currentSessions,
      newSession,
    ]);

  }


  return (

    <section className="dashboard-content">


      {/* ========================================
          HEADER
          ======================================== */}

      <div className="planner-header">

        <div>

          <span className="eyebrow">
            WEEKLY ACADEMIC PLANNING
          </span>

          <h1>
            Study Planner
          </h1>

          <p>
            Organize your study sessions and stay consistent throughout the week.
          </p>

        </div>


        <button
          className="primary-button"
          onClick={addDemoSession}
        >

          <Plus size={16} />

          Add Session

        </button>

      </div>


      {/* ========================================
          WEEK SELECTOR
          ======================================== */}

      <div className="planner-week">

        <button
          className="week-arrow"
          aria-label="Previous week"
        >
          <ChevronLeft size={18} />
        </button>


        <div className="week-days">

          {days.map((day) => (

            <button
              key={day.short}
              className={
                `week-day ${
                  selectedDay === day.short
                    ? "active"
                    : ""
                }`
              }
              onClick={() =>
                setSelectedDay(day.short)
              }
            >

              <span>
                {day.short}
              </span>

              <strong>
                {day.short === "MON"
                  ? "30"
                  : day.short === "TUE"
                  ? "1"
                  : day.short === "WED"
                  ? "2"
                  : day.short === "THU"
                  ? "3"
                  : day.short === "FRI"
                  ? "4"
                  : day.short === "SAT"
                  ? "5"
                  : "6"}
              </strong>

            </button>

          ))}

        </div>


        <button
          className="week-arrow"
          aria-label="Next week"
        >
          <ChevronRight size={18} />
        </button>

      </div>


      {/* ========================================
          DAY OVERVIEW
          ======================================== */}

      <div className="planner-overview">


        <div className="planner-overview-main">

          <span className="card-label">
            SELECTED DAY
          </span>

          <h2>
            {
              days.find(
                (day) =>
                  day.short === selectedDay
              )?.name
            }
          </h2>

          <p>
            {daySessions.length} study sessions planned
          </p>

        </div>


        <div className="planner-stat">

          <Clock3 size={18} />

          <strong>
            {Math.floor(totalMinutes / 60)}h{" "}
            {totalMinutes % 60}m
          </strong>

          <span>
            Planned
          </span>

        </div>


        <div className="planner-stat">

          <Check size={18} />

          <strong>
            {completedSessions.length}
          </strong>

          <span>
            Completed
          </span>

        </div>


        <div className="planner-stat">

          <Target size={18} />

          <strong>
            {progress}%
          </strong>

          <span>
            Daily progress
          </span>

        </div>

      </div>


      {/* ========================================
          PROGRESS
          ======================================== */}

      <div className="planner-progress-card">

        <div className="planner-progress-header">

          <div>

            <span className="card-label">
              DAILY GOAL
            </span>

            <h3>
              Keep your study streak going
            </h3>

          </div>

          <strong>
            {progress}%
          </strong>

        </div>


        <div className="planner-progress-track">

          <div
            className="planner-progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      </div>


      {/* ========================================
          SESSIONS
          ======================================== */}

      <div className="planner-section-header">

        <div>

          <span className="card-label">
            STUDY SESSIONS
          </span>

          <h2>
            Today's plan
          </h2>

        </div>

      </div>


      <div className="planner-sessions">

        {daySessions.length > 0 ? (

          daySessions.map((session) => (

            <article
              key={session.id}
              className={
                `planner-session ${
                  session.completed
                    ? "completed"
                    : ""
                }`
              }
            >


              {/* Time */}

              <div className="session-time">

                <strong>
                  {session.time}
                </strong>

                <span>
                  {session.duration} min
                </span>

              </div>


              {/* Icon */}

              <div className="session-icon">

                <BookOpen size={18} />

              </div>


              {/* Content */}

              <div className="session-content">

                <h3>
                  {session.topic}
                </h3>

                <span>
                  {session.subject}
                </span>

              </div>


              {/* Actions */}

              <div className="session-actions">

                <button
                  className={
                    `session-complete ${
                      session.completed
                        ? "done"
                        : ""
                    }`
                  }
                  onClick={() =>
                    toggleSession(session.id)
                  }
                  aria-label="Complete session"
                >

                  <Check size={15} />

                </button>


                <button
                  className="session-delete"
                  onClick={() =>
                    deleteSession(session.id)
                  }
                  aria-label="Delete session"
                >

                  <Trash2 size={15} />

                </button>

              </div>

            </article>

          ))

        ) : (

          <div className="planner-empty">

            <BookOpen size={25} />

            <h3>
              No study sessions
            </h3>

            <p>
              Add a session to start planning this day.
            </p>

            <button
              className="secondary-button"
              onClick={addDemoSession}
            >

              <Plus size={14} />

              Add study session

            </button>

          </div>

        )}

      </div>


    </section>

  );

}


export default StudyPlanner;