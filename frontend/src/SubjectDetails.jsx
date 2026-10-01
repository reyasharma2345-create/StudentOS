import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Save,
  Trash2,
  X,
} from "lucide-react";

import "./SubjectDetails.css";


function SubjectDetails() {

  const { subjectId } = useParams();

  const navigate = useNavigate();


  const [subject, setSubject] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [formError, setFormError] = useState("");


  const [formData, setFormData] = useState({
    name: "",
    short_name: "",
    progress: 0,
    topics: 0,
    assignments: 0,
    color: "blue",
  });


  // ========================================
  // Fetch Subject
  // ========================================

  async function fetchSubject() {

    try {

      setLoading(true);

      setError("");


      const response = await fetch(
        `http://127.0.0.1:8000/subjects/${subjectId}`
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail || "Failed to load subject."
        );

      }


      setSubject(data.subject);


      setFormData({
        name: data.subject.name,
        short_name: data.subject.short_name,
        progress: data.subject.progress,
        topics: data.subject.topics,
        assignments: data.subject.assignments,
        color: data.subject.color,
      });

    } catch (error) {

      console.error(
        "Error fetching subject:",
        error
      );

      setError(
        error.message ||
        "Unable to load subject."
      );

    } finally {

      setLoading(false);

    }

  }


  useEffect(() => {

    fetchSubject();

  }, [subjectId]);


  // ========================================
  // Input Change
  // ========================================

  function handleInputChange(event) {

    const {
      name,
      value,
    } = event.target;


    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

  }


  // ========================================
  // Start Editing
  // ========================================

  function startEditing() {

    setFormError("");

    setEditing(true);

  }


  // ========================================
  // Cancel Editing
  // ========================================

  function cancelEditing() {

    if (!subject) {
      return;
    }


    setFormData({
      name: subject.name,
      short_name: subject.short_name,
      progress: subject.progress,
      topics: subject.topics,
      assignments: subject.assignments,
      color: subject.color,
    });


    setFormError("");

    setEditing(false);

  }


  // ========================================
  // Update Subject
  // ========================================

  async function handleUpdateSubject(event) {

    event.preventDefault();

    setFormError("");


    if (!formData.name.trim()) {

      setFormError(
        "Please enter the subject name."
      );

      return;

    }


    if (!formData.short_name.trim()) {

      setFormError(
        "Please enter a short name."
      );

      return;

    }


    try {

      setSaving(true);


      const response = await fetch(
        `http://127.0.0.1:8000/subjects/${subjectId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: formData.name.trim(),

            short_name:
              formData.short_name
                .trim()
                .toUpperCase(),

            progress:
              Number(formData.progress),

            topics:
              Number(formData.topics),

            assignments:
              Number(formData.assignments),

            color: formData.color,
          }),
        }
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to update subject."
        );

      }


      setSubject(data.subject);


      setFormData({
        name: data.subject.name,
        short_name: data.subject.short_name,
        progress: data.subject.progress,
        topics: data.subject.topics,
        assignments: data.subject.assignments,
        color: data.subject.color,
      });


      setEditing(false);

    } catch (error) {

      console.error(
        "Error updating subject:",
        error
      );

      setFormError(
        error.message ||
        "Unable to update subject."
      );

    } finally {

      setSaving(false);

    }

  }


  // ========================================
  // Delete Subject
  // ========================================

  async function handleDeleteSubject() {

    if (!subject) {
      return;
    }


    const confirmed = window.confirm(
      `Are you sure you want to delete "${subject.name}"?`
    );


    if (!confirmed) {
      return;
    }


    try {

      setDeleting(true);

      setError("");


      const response = await fetch(
        `http://127.0.0.1:8000/subjects/${subjectId}`,
        {
          method: "DELETE",
        }
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to delete subject."
        );

      }


      navigate("/subjects");

    } catch (error) {

      console.error(
        "Error deleting subject:",
        error
      );

      setError(
        error.message ||
        "Unable to delete subject."
      );

      setDeleting(false);

    }

  }


  // ========================================
  // Loading
  // ========================================

  if (loading) {

    return (

      <section className="dashboard-content">

        <div className="subject-details-state">

          <BookOpen size={26} />

          <h2>
            Loading subject...
          </h2>

          <p>
            Getting the latest subject information.
          </p>

        </div>

      </section>

    );

  }


  // ========================================
  // Error
  // ========================================

  if (error && !subject) {

    return (

      <section className="dashboard-content">

        <button
          className="back-button"
          onClick={() => navigate("/subjects")}
        >

          <ArrowLeft size={16} />

          Back to Subjects

        </button>


        <div className="subject-details-state error">

          <BookOpen size={26} />

          <h2>
            Subject not found
          </h2>

          <p>
            {error}
          </p>

        </div>

      </section>

    );

  }


  if (!subject) {
    return null;
  }


  // ========================================
  // Main Page
  // ========================================

  return (

    <section className="dashboard-content">

      <button
        className="back-button"
        onClick={() => navigate("/subjects")}
      >

        <ArrowLeft size={16} />

        Back to Subjects

      </button>


      <div className="subject-details-header">

        <div className="subject-details-title">

          <div
            className={`subject-details-icon ${subject.color}`}
          >

            <BookOpen size={25} />

          </div>


          <div>

            <span className="eyebrow">
              SUBJECT DETAILS
            </span>

            <h1>
              {subject.name}
            </h1>

            <p>
              {subject.short_name} • Academic workspace
            </p>

          </div>

        </div>


        <div className="subject-details-actions">

          {!editing && (

            <button
              className="secondary-button"
              onClick={startEditing}
            >

              <Edit3 size={16} />

              Edit Subject

            </button>

          )}


          <button
            className="danger-button"
            onClick={handleDeleteSubject}
            disabled={deleting}
          >

            <Trash2 size={16} />

            {deleting
              ? "Deleting..."
              : "Delete"}

          </button>

        </div>

      </div>


      {error && (

        <div className="details-error">
          {error}
        </div>

      )}


      {!editing && (

        <>

          <div className="subject-progress-card">

            <div className="progress-card-header">

              <div>

                <span className="card-label">
                  OVERALL PROGRESS
                </span>

                <h2>
                  {subject.progress}%
                </h2>

              </div>


              <CheckCircle2 size={28} />

            </div>


            <div className="large-progress-track">

              <div
                className={`large-progress-fill ${subject.color}`}
                style={{
                  width: `${subject.progress}%`,
                }}
              />

            </div>

          </div>


          <div className="subject-stat-grid">

            <div className="subject-stat-card">

              <div className="subject-stat-icon blue">

                <BookOpen size={20} />

              </div>


              <div>

                <span>
                  Topics
                </span>

                <strong>
                  {subject.topics}
                </strong>

              </div>

            </div>


            <div className="subject-stat-card">

              <div className="subject-stat-icon burgundy">

                <ClipboardList size={20} />

              </div>


              <div>

                <span>
                  Assignments
                </span>

                <strong>
                  {subject.assignments}
                </strong>

              </div>

            </div>


            <div className="subject-stat-card">

              <div className="subject-stat-icon blue">

                <CheckCircle2 size={20} />

              </div>


              <div>

                <span>
                  Completion
                </span>

                <strong>
                  {subject.progress}%
                </strong>

              </div>

            </div>

          </div>


          <div className="subject-info-card">

            <span className="card-label">
              SUBJECT INFORMATION
            </span>


            <div className="subject-info-row">

              <span>
                Subject name
              </span>

              <strong>
                {subject.name}
              </strong>

            </div>


            <div className="subject-info-row">

              <span>
                Short name
              </span>

              <strong>
                {subject.short_name}
              </strong>

            </div>


            <div className="subject-info-row">

              <span>
                Theme color
              </span>

              <strong className="color-value">

                <span
                  className={`color-dot ${subject.color}`}
                />

                {subject.color === "blue"
                  ? "Blue"
                  : "Burgundy"}

              </strong>

            </div>

          </div>

        </>

      )}


      {editing && (

        <form
          className="subject-edit-card"
          onSubmit={handleUpdateSubject}
        >

          <div className="edit-card-header">

            <div>

              <span className="card-label">
                EDIT SUBJECT
              </span>

              <h2>
                Update subject information
              </h2>

            </div>


            <button
              type="button"
              className="icon-button"
              onClick={cancelEditing}
              disabled={saving}
              aria-label="Cancel editing"
            >

              <X size={18} />

            </button>

          </div>


          <div className="details-form">

            <div className="details-form-group">

              <label htmlFor="details-name">
                Subject Name
              </label>

              <input
                id="details-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                disabled={saving}
              />

            </div>


            <div className="details-form-row">

              <div className="details-form-group">

                <label htmlFor="details-short-name">
                  Short Name
                </label>

                <input
                  id="details-short-name"
                  name="short_name"
                  type="text"
                  value={formData.short_name}
                  onChange={handleInputChange}
                  disabled={saving}
                />

              </div>


              <div className="details-form-group">

                <label htmlFor="details-color">
                  Color
                </label>

                <select
                  id="details-color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  disabled={saving}
                >

                  <option value="blue">
                    Blue
                  </option>

                  <option value="burgundy">
                    Burgundy
                  </option>

                </select>

              </div>

            </div>


            <div className="details-form-row three">

              <div className="details-form-group">

                <label htmlFor="details-progress">
                  Progress (%)
                </label>

                <input
                  id="details-progress"
                  name="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={handleInputChange}
                  disabled={saving}
                />

              </div>


              <div className="details-form-group">

                <label htmlFor="details-topics">
                  Topics
                </label>

                <input
                  id="details-topics"
                  name="topics"
                  type="number"
                  min="0"
                  value={formData.topics}
                  onChange={handleInputChange}
                  disabled={saving}
                />

              </div>


              <div className="details-form-group">

                <label htmlFor="details-assignments">
                  Assignments
                </label>

                <input
                  id="details-assignments"
                  name="assignments"
                  type="number"
                  min="0"
                  value={formData.assignments}
                  onChange={handleInputChange}
                  disabled={saving}
                />

              </div>

            </div>


            {formError && (

              <div className="details-form-error">
                {formError}
              </div>

            )}


            <div className="details-form-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={cancelEditing}
                disabled={saving}
              >

                <X size={16} />

                Cancel

              </button>


              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >

                <Save size={16} />

                {saving
                  ? "Saving..."
                  : "Save Changes"}

              </button>

            </div>

          </div>

        </form>

      )}

    </section>

  );

}


export default SubjectDetails;