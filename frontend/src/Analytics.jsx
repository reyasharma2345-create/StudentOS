import { useState } from "react";

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


const weeklyData = [
  {
    day: "MON",
    hours: 3.5,
  },
  {
    day: "TUE",
    hours: 2.8,
  },
  {
    day: "WED",
    hours: 4.2,
  },
  {
    day: "THU",
    hours: 3.1,
  },
  {
    day: "FRI",
    hours: 2.4,
  },
  {
    day: "SAT",
    hours: 5.0,
  },
  {
    day: "SUN",
    hours: 3.7,
  },
];


const subjectData = [
  {
    name: "DBMS",
    progress: 72,
    hours: 8.5,
    topics: 12,
    color: "blue",
  },
  {
    name: "OOP",
    progress: 84,
    hours: 10.2,
    topics: 15,
    color: "burgundy",
  },
  {
    name: "DSA",
    progress: 61,
    hours: 7.4,
    topics: 18,
    color: "blue",
  },
  {
    name: "LDM",
    progress: 68,
    hours: 6.8,
    topics: 14,
    color: "burgundy",
  },
];


const activityData = [
  {
    icon: CheckCircle2,
    title: "Completed DBMS Normalization",
    time: "Today · 6:42 PM",
    type: "completed",
  },
  {
    icon: BookOpen,
    title: "Studied DSA — Linked Lists",
    time: "Today · 5:15 PM",
    type: "study",
  },
  {
    icon: Target,
    title: "Completed OOP assignment",
    time: "Yesterday · 8:20 PM",
    type: "assignment",
  },
  {
    icon: CalendarDays,
    title: "Added 3 study sessions",
    time: "Yesterday · 4:10 PM",
    type: "planner",
  },
];


function Analytics() {

  const [weekOffset, setWeekOffset] =
    useState(0);


  const totalHours =
    weeklyData.reduce(
      (total, day) =>
        total + day.hours,
      0
    );


  const averageHours =
    totalHours / weeklyData.length;


  const maxHours =
    Math.max(
      ...weeklyData.map(
        (day) => day.hours
      )
    );


  return (

    <section className="dashboard-content analytics-page">


      {/* ========================================
          HEADER
          ======================================== */}

      <div className="analytics-header">

        <div>

          <span className="eyebrow">
            ACADEMIC PERFORMANCE
          </span>

          <h1>
            Analytics
          </h1>

          <p>
            Understand your study habits, consistency and academic progress.
          </p>

        </div>


        <div className="analytics-week-selector">

          <button
            className="week-arrow"
            onClick={() =>
              setWeekOffset(
                weekOffset - 1
              )
            }
            aria-label="Previous week"
          >

            <ChevronLeft size={17} />

          </button>


          <div>

            <CalendarDays size={14} />

            <span>
              {weekOffset === 0
                ? "This Week"
                : weekOffset > 0
                ? `Week +${weekOffset}`
                : `Week ${weekOffset}`}
            </span>

          </div>


          <button
            className="week-arrow"
            onClick={() =>
              setWeekOffset(
                weekOffset + 1
              )
            }
            aria-label="Next week"
          >

            <ChevronRight size={17} />

          </button>

        </div>

      </div>


      {/* ========================================
          OVERVIEW STATS
          ======================================== */}

      <div className="analytics-stat-grid">


        <div className="analytics-stat-card">

          <div className="analytics-stat-icon blue">

            <Clock3 size={18} />

          </div>

          <div>

            <span>
              STUDY TIME
            </span>

            <strong>
              {totalHours.toFixed(1)}h
            </strong>

            <small>
              +12% from last week
            </small>

          </div>

        </div>


        <div className="analytics-stat-card">

          <div className="analytics-stat-icon burgundy">

            <CheckCircle2 size={18} />

          </div>

          <div>

            <span>
              TASKS COMPLETED
            </span>

            <strong>
              18
            </strong>

            <small>
              82% completion rate
            </small>

          </div>

        </div>


        <div className="analytics-stat-card">

          <div className="analytics-stat-icon gold">

            <Flame size={18} />

          </div>

          <div>

            <span>
              STUDY STREAK
            </span>

            <strong>
              7 days
            </strong>

            <small>
              Current streak
            </small>

          </div>

        </div>


        <div className="analytics-stat-card">

          <div className="analytics-stat-icon navy">

            <TrendingUp size={18} />

          </div>

          <div>

            <span>
              OVERALL PROGRESS
            </span>

            <strong>
              72%
            </strong>

            <small>
              Semester progress
            </small>

          </div>

        </div>

      </div>


      {/* ========================================
          MAIN ANALYTICS GRID
          ======================================== */}

      <div className="analytics-main-grid">


        {/* WEEKLY STUDY CHART */}

        <div className="analytics-card weekly-chart-card">

          <div className="analytics-card-header">

            <div>

              <span className="card-label">
                STUDY ACTIVITY
              </span>

              <h2>
                Weekly Study Hours
              </h2>

            </div>


            <div className="chart-total">

              <strong>
                {totalHours.toFixed(1)}h
              </strong>

              <span>
                total
              </span>

            </div>

          </div>


          <div className="bar-chart">

            {weeklyData.map((day) => {

              const height =
                (day.hours /
                  maxHours) *
                100;


              return (

                <div
                  className="bar-column"
                  key={day.day}
                >

                  <div className="bar-value">

                    {day.hours}h

                  </div>


                  <div className="bar-track">

                    <div
                      className="bar-fill"
                      style={{
                        height:
                          `${height}%`,
                      }}
                    />

                  </div>


                  <span className="bar-label">
                    {day.day}
                  </span>

                </div>

              );

            })}

          </div>


          <div className="chart-footer">

            <span>
              Average: {averageHours.toFixed(1)}h/day
            </span>

            <span>
              Goal: 4h/day
            </span>

          </div>

        </div>


        {/* CONSISTENCY */}

        <div className="analytics-card consistency-card">

          <div className="analytics-card-header">

            <div>

              <span className="card-label">
                CONSISTENCY
              </span>

              <h2>
                Study Rhythm
              </h2>

            </div>

            <Target size={18} />

          </div>


          <div className="consistency-score">

            <div className="consistency-ring">

              <div>

                <strong>
                  86%
                </strong>

                <span>
                  consistency
                </span>

              </div>

            </div>

          </div>


          <div className="consistency-details">

            <div>

              <span>
                Study days
              </span>

              <strong>
                6 / 7
              </strong>

            </div>

            <div>

              <span>
                Goal reached
              </span>

              <strong>
                5 days
              </strong>

            </div>

          </div>


          <div className="consistency-message">

            <Flame size={15} />

            <span>
              You're maintaining a strong weekly rhythm.
            </span>

          </div>

        </div>

      </div>


      {/* ========================================
          SUBJECT PERFORMANCE
          ======================================== */}

      <div className="analytics-card subject-performance-card">

        <div className="analytics-card-header">

          <div>

            <span className="card-label">
              SUBJECT PERFORMANCE
            </span>

            <h2>
              Progress by Subject
            </h2>

          </div>

          <BarChart3 size={18} />

        </div>


        <div className="subject-performance-list">

          {subjectData.map((subject) => (

            <div
              className="performance-row"
              key={subject.name}
            >


              <div className="performance-subject">

                <div
                  className={`performance-icon ${subject.color}`}
                >

                  <BookOpen size={15} />

                </div>

                <div>

                  <strong>
                    {subject.name}
                  </strong>

                  <span>
                    {subject.topics} topics · {subject.hours}h studied
                  </span>

                </div>

              </div>


              <div className="performance-progress">

                <div className="performance-track">

                  <div
                    className={`performance-fill ${subject.color}`}
                    style={{
                      width:
                        `${subject.progress}%`,
                    }}
                  />

                </div>

              </div>


              <strong className="performance-percentage">
                {subject.progress}%
              </strong>


            </div>

          ))}

        </div>

      </div>


      {/* ========================================
          BOTTOM GRID
          ======================================== */}

      <div className="analytics-bottom-grid">


        {/* TASK BREAKDOWN */}

        <div className="analytics-card task-breakdown-card">

          <div className="analytics-card-header">

            <div>

              <span className="card-label">
                TASKS
              </span>

              <h2>
                Task Breakdown
              </h2>

            </div>

            <CheckCircle2 size={18} />

          </div>


          <div className="task-donut-area">

            <div className="task-donut">

              <div>

                <strong>
                  82%
                </strong>

                <span>
                  completed
                </span>

              </div>

            </div>


            <div className="task-legend">

              <div>

                <span className="legend-dot completed"></span>

                <span>
                  Completed
                </span>

                <strong>
                  18
                </strong>

              </div>


              <div>

                <span className="legend-dot pending"></span>

                <span>
                  Pending
                </span>

                <strong>
                  4
                </strong>

              </div>

            </div>

          </div>

        </div>


        {/* RECENT ACTIVITY */}

        <div className="analytics-card activity-card">

          <div className="analytics-card-header">

            <div>

              <span className="card-label">
                ACTIVITY
              </span>

              <h2>
                Recent Activity
              </h2>

            </div>

          </div>


          <div className="activity-list">

            {activityData.map(
              (activity, index) => {

                const Icon =
                  activity.icon;

                return (

                  <div
                    className="activity-item"
                    key={index}
                  >

                    <div
                      className={`activity-icon ${activity.type}`}
                    >

                      <Icon size={14} />

                    </div>


                    <div>

                      <strong>
                        {activity.title}
                      </strong>

                      <span>
                        {activity.time}
                      </span>

                    </div>

                  </div>

                );

              }
            )}

          </div>

        </div>

      </div>


    </section>

  );

}


export default Analytics;