import { useEffect, useState } from "react";

import {
  Check,
  Clock3,
  AlertCircle,
  Plus,
  CalendarDays,
  X,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

function formatDate(dateString) {
  if (!dateString) {
    return "No due date";
  }

  const date = new Date(`${dateString}T00:00:00`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return "Today";
  }

  if (date.getTime() === tomorrow.getTime()) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function convertTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    subject: task.subject_short_name || task.subject_name || "Unknown",
    subjectName: task.subject_name || "",
    subjectId: task.subject_id,
    dueDate: task.due_date || "",
    date: formatDate(task.due_date),
    priority: task.priority || "Medium",
    status: task.status || "Pending",
    completed: task.status === "Completed",
  };
}

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject_id: "",
    due_date: "",
    priority: "Medium",
    status: "Pending",
  });

  async function fetchTasks() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/tasks`);

      if (!response.ok) {
        throw new Error("Failed to fetch tasks.");
      }

      const data = await response.json();

      setTasks(data.tasks.map(convertTask));
      setError("");
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load tasks. Make sure the StudentOS backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubjects() {
    try {
      setSubjectsLoading(true);

      const response = await fetch(`${API_URL}/subjects`);

      if (!response.ok) {
        throw new Error("Failed to fetch subjects.");
      }

      const data = await response.json();

      setSubjects(data.subjects);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load subjects. Make sure the StudentOS backend is running."
      );
    } finally {
      setSubjectsLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
    fetchSubjects();
  }, []);

  function openAddTaskModal() {
    console.log("Add Task button clicked");

    setFormData({
      title: "",
      description: "",
      subject_id: "",
      due_date: "",
      priority: "Medium",
      status: "Pending",
    });

    setError("");
    setShowModal(true);
  }

  function closeAddTaskModal() {
    if (!saving) {
      setShowModal(false);
    }
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleAddTask(event) {
    event.preventDefault();

    if (!formData.title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    if (!formData.subject_id) {
      setError("Please select a subject.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          subject_id: Number(formData.subject_id),
          due_date: formData.due_date || null,
          priority: formData.priority,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create task.");
      }

      const newTask = convertTask(data.task);

      setTasks((current) => [...current, newTask]);

      setShowModal(false);

      setFormData({
        title: "",
        description: "",
        subject_id: "",
        due_date: "",
        priority: "Medium",
        status: "Pending",
      });
    } catch (error) {
      console.error(error);

      setError(error.message || "Unable to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);

    if (!task) {
      return;
    }

    const newStatus = task.completed ? "Pending" : "Completed";

    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          subject_id: task.subjectId,
          due_date: task.dueDate || null,
          priority: task.priority,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update task.");
      }

      const updatedTask = convertTask(data.task);

      setTasks((current) =>
        current.map((item) =>
          item.id === id ? updatedTask : item
        )
      );
    } catch (error) {
      console.error(error);

      setError(error.message || "Unable to update task.");
    }
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

  const completedCount = tasks.filter(
    (task) => task.completed
  ).length;

  const pendingCount = tasks.filter(
    (task) => !task.completed
  ).length;

  return (
    <section className="dashboard-content">

      {/* HEADER */}

      <div className="tasks-header">

        <div>
          <span className="eyebrow">
            ACADEMIC WORKFLOW
          </span>

          <h1>Your Tasks</h1>

          <p>
            Stay on top of assignments, deadlines and study work.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddTaskModal}
        >
          <Plus size={16} />
          Add Task
        </button>

      </div>


      {/* ERROR */}

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "12px",
            background: "rgba(155, 44, 44, 0.08)",
            border: "1px solid rgba(155, 44, 44, 0.2)",
            color: "#7f1d1d",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}


      {/* SUMMARY */}

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
          <strong>{tasks.length}</strong>
          <span>Total tasks</span>
        </div>

        <div className="task-summary-stat">
          <strong>{completedCount}</strong>
          <span>Completed</span>
        </div>

        <div className="task-summary-stat">
          <strong>{pendingCount}</strong>
          <span>Pending</span>
        </div>

      </div>


      {/* FILTERS */}

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
              type="button"
              className={`task-filter ${
                filter === item ? "active" : ""
              }`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}

        </div>

      </div>


      {/* TASK LIST */}

      <div className="task-list">

        {loading && (
          <div className="empty-task-state">
            <Clock3 size={24} />

            <h3>
              Loading tasks...
            </h3>

            <p>
              Getting your tasks from StudentOS.
            </p>
          </div>
        )}


        {!loading &&
          filteredTasks.map((task) => (
            <article
              key={task.id}
              className={`task-item ${
                task.completed ? "completed" : ""
              }`}
            >

              <button
                type="button"
                className={`task-checkbox ${
                  task.completed ? "checked" : ""
                }`}
                onClick={() => toggleTask(task.id)}
              >
                {task.completed && (
                  <Check size={15} />
                )}
              </button>


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

                </div>

              </div>


              <div
                className={`task-priority ${
                  task.priority.toLowerCase()
                }`}
              >
                {task.priority === "High" && (
                  <AlertCircle size={13} />
                )}

                {task.priority}
              </div>

            </article>
          ))}


        {!loading &&
          filteredTasks.length === 0 && (
            <div className="empty-task-state">

              <Check size={24} />

              <h3>
                {tasks.length === 0
                  ? "No tasks yet"
                  : "Nothing here"}
              </h3>

              <p>
                {tasks.length === 0
                  ? "Your tasks will appear here once you add them."
                  : "No tasks match the current filter."}
              </p>

            </div>
          )}

      </div>


      {/* ADD TASK MODAL */}

      {showModal && (
        <div
          className="task-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddTaskModal();
            }
          }}
        >

          <div className="task-modal">

            <div className="task-modal-header">

              <div>
                <span className="eyebrow">
                  ACADEMIC WORKFLOW
                </span>

                <h2>
                  Add New Task
                </h2>

                <p>
                  Create a task and connect it to a subject.
                </p>
              </div>

              <button
                type="button"
                className="task-modal-close"
                onClick={closeAddTaskModal}
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="task-form"
              onSubmit={handleAddTask}
            >

              <div className="task-form-group">

                <label htmlFor="task-title">
                  Task title
                </label>

                <input
                  id="task-title"
                  name="title"
                  type="text"
                  placeholder="e.g. Complete OOP assignment"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                />

              </div>


              <div className="task-form-group">

                <label htmlFor="task-description">
                  Description
                </label>

                <textarea
                  id="task-description"
                  name="description"
                  placeholder="Add some details..."
                  value={formData.description}
                  onChange={handleFormChange}
                  rows="3"
                />

              </div>


              <div className="task-form-row">

                <div className="task-form-group">

                  <label htmlFor="task-subject">
                    Subject
                  </label>

                  <select
                    id="task-subject"
                    name="subject_id"
                    value={formData.subject_id}
                    onChange={handleFormChange}
                    required
                  >

                    <option value="">
                      {subjectsLoading
                        ? "Loading subjects..."
                        : "Select subject"}
                    </option>

                    {subjects.map((subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.short_name} — {subject.name}
                      </option>
                    ))}

                  </select>

                </div>


                <div className="task-form-group">

                  <label htmlFor="task-due-date">
                    Due date
                  </label>

                  <input
                    id="task-due-date"
                    name="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={handleFormChange}
                  />

                </div>

              </div>


              <div className="task-form-group">

                <label htmlFor="task-priority">
                  Priority
                </label>

                <select
                  id="task-priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleFormChange}
                >

                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>

                </select>

              </div>


              <div className="task-form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeAddTaskModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving || subjectsLoading}
                >
                  <Plus size={16} />

                  {saving
                    ? "Creating..."
                    : "Create Task"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </section>
  );
}

export default Tasks;