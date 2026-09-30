import { useState } from "react";

import {
  Check,
  Clock3,
  AlertCircle,
  Plus,
  CalendarDays,
} from "lucide-react";


const initialTasks = [
  {
    id: 1,
    title: "Complete DBMS Normalization",
    subject: "DBMS",
    date: "Today",
    time: "6:00 PM",
    priority: "High",
    completed: false,
  },

  {
    id: 2,
    title: "OOP Inheritance Assignment",
    subject: "OOP",
    date: "Tomorrow",
    time: "11:59 PM",
    priority: "Medium",
    completed: false,
  },

  {
    id: 3,
    title: "Practice Linked List Problems",
    subject: "DSA",
    date: "Oct 2",
    time: "5:00 PM",
    priority: "High",
    completed: false,
  },

  {
    id: 4,
    title: "LDM Flip-Flop Revision",
    subject: "LDM",
    date: "Oct 3",
    time: "7:00 PM",
    priority: "Low",
    completed: true,
  },

  {
    id: 5,
    title: "Prepare DBMS ER Diagram",
    subject: "DBMS",
    date: "Oct 5",
    time: "4:00 PM",
    priority: "Medium",
    completed: false,
  },
];


function Tasks() {

  const [tasks, setTasks] = useState(initialTasks);

  const [filter, setFilter] = useState("All");


  function toggleTask(id) {

    setTasks((currentTasks) => {

      return currentTasks.map((task) => {

        if (task.id === id) {

          return {
            ...task,
            completed: !task.completed,
          };

        }

        return task;

      });

    });

  }


  const filteredTasks = tasks.filter((task) => {

    if (filter === "All") {
      return true;
    }

    if (filter === "Pending") {
      return !task.completed;
    }

    if (filter === "Completed") {
      return task.completed;
    }

    if (filter === "High Priority") {
      return task.priority === "High";
    }

    return true;

  });


  const completedCount =
    tasks.filter((task) => task.completed).length;


  const pendingCount =
    tasks.filter((task) => !task.completed).length;


  return (

    <section className="dashboard-content">


      {/* ========================================
          HEADER
          ======================================== */}

      <div className="tasks-header">

        <div>

          <span className="eyebrow">
            ACADEMIC WORKFLOW
          </span>

          <h1>
            Your Tasks
          </h1>

          <p>
            Stay on top of assignments, deadlines and study work.
          </p>

        </div>


        <button className="primary-button">

          <Plus size={16} />

          Add Task

        </button>

      </div>


      {/* ========================================
          SUMMARY
          ======================================== */}

      <div className="task-summary">

        <div className="task-summary-main">

          <span className="card-label">
            THIS WEEK
          </span>

          <h2>
            {pendingCount} tasks remaining
          </h2>

          <p>
            {completedCount} tasks completed
          </p>

        </div>


        <div className="task-summary-stat">

          <strong>
            {tasks.length}
          </strong>

          <span>
            Total tasks
          </span>

        </div>


        <div className="task-summary-stat">

          <strong>
            {completedCount}
          </strong>

          <span>
            Completed
          </span>

        </div>


        <div className="task-summary-stat">

          <strong>
            {pendingCount}
          </strong>

          <span>
            Pending
          </span>

        </div>

      </div>


      {/* ========================================
          FILTERS
          ======================================== */}

      <div className="tasks-toolbar">

        <div className="task-filters">

          {[
            "All",
            "Pending",
            "Completed",
            "High Priority",
          ].map((item) => (

            <button
              key={item}
              className={
                `task-filter ${
                  filter === item ? "active" : ""
                }`
              }
              onClick={() => setFilter(item)}
            >

              {item}

            </button>

          ))}

        </div>

      </div>


      {/* ========================================
          TASK LIST
          ======================================== */}

      <div className="task-list">

        {filteredTasks.map((task) => (

          <article
            key={task.id}
            className={
              `task-item ${
                task.completed ? "completed" : ""
              }`
            }
          >


            {/* Checkbox */}

            <button
              className={
                `task-checkbox ${
                  task.completed ? "checked" : ""
                }`
              }
              onClick={() => toggleTask(task.id)}
            >

              {task.completed && (
                <Check size={15} />
              )}

            </button>


            {/* Task */}

            <div className="task-main">

              <h3>
                {task.title}
              </h3>


              <div className="task-details">

                <span className="task-subject">
                  {task.subject}
                </span>

                <span>

                  <CalendarDays size={12} />

                  {task.date}

                </span>

                <span>

                  <Clock3 size={12} />

                  {task.time}

                </span>

              </div>

            </div>


            {/* Priority */}

            <div
              className={
                `task-priority ${
                  task.priority.toLowerCase()
                }`
              }
            >

              {task.priority === "High" && (
                <AlertCircle size={13} />
              )}

              {task.priority}

            </div>

          </article>

        ))}


        {filteredTasks.length === 0 && (

          <div className="empty-task-state">

            <Check size={24} />

            <h3>
              Nothing here
            </h3>

            <p>
              No tasks match the current filter.
            </p>

          </div>

        )}

      </div>

    </section>

  );

}


export default Tasks;