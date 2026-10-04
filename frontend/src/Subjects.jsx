import { useEffect, useState } from "react";
import "./SubjectModal.css";

import {
  BookOpen,
  Plus,
  ChevronRight,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";


function SubjectCard({ subject, index }) {

  const navigate = useNavigate();

  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(subject?.progress) || 0
    )
  );

  // StudentOS automatically chooses the accent color.
  // Users do not need to choose one manually.
  const subjectColor =
    index % 2 === 0
      ? "blue"
      : "burgundy";


  return (

    <article className="subject-card">

      <div
        className={`subject-icon ${subjectColor}`}
      >

        <BookOpen size={19} />

      </div>


      <div className="subject-card-header">

        <div>

          {subject.short_name && (

            <span className="subject-code">
              {subject.short_name}
            </span>

          )}

          <h3>
            {subject.name}
          </h3>

        </div>


        <span className="subject-percentage">
          {progress}%
        </span>

      </div>


      <div className="subject-progress">

        <div className="subject-progress-track">

          <div
            className={`subject-progress-fill ${subjectColor}`}
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      </div>


      <div className="subject-meta">

        <span>

          {subject.syllabus_topics ??
            subject.topics ??
            0}{" "}

          topics

        </span>


        <span>

          {subject.assignments ?? 0}{" "}

          assignments

        </span>

      </div>


      <button
        className="subject-view-button"
        onClick={() =>
          navigate(`/subjects/${subject.id}`)
        }
      >

        View subject

        <ChevronRight size={15} />

      </button>

    </article>

  );

}


function Subjects() {

  const [subjects, setSubjects] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [formError, setFormError] =
    useState("");


  const [formData, setFormData] =
    useState({
      name: "",
      short_name: "",
      progress: 0,
      topics: 0,
      assignments: 0,
    });


  async function fetchSubjects() {

    try {

      setLoading(true);

      setError("");


      const response = await fetch(
        "http://127.0.0.1:8000/subjects"
      );


      if (!response.ok) {

        throw new Error(
          "Failed to fetch subjects"
        );

      }


      const data =
        await response.json();


      const subjectsData =
        Array.isArray(data)
          ? data
          : data?.subjects;


      if (!Array.isArray(subjectsData)) {

        throw new Error(
          "Invalid subjects response from backend."
        );

      }


      setSubjects(subjectsData);

    } catch (error) {

      console.error(
        "Error fetching subjects:",
        error
      );


      setSubjects([]);


      setError(
        "Unable to load subjects. Make sure the StudentOS backend is running."
      );

    } finally {

      setLoading(false);

    }

  }


  useEffect(() => {

    fetchSubjects();

  }, []);


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


  function openAddSubjectModal() {

    setFormData({

      name: "",

      short_name: "",

      progress: 0,

      topics: 0,

      assignments: 0,

    });


    setFormError("");

    setShowModal(true);

  }


  function closeAddSubjectModal() {

    if (saving) {

      return;

    }


    setShowModal(false);

    setFormError("");

  }


  async function handleCreateSubject(event) {

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
        "http://127.0.0.1:8000/subjects",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({

            name:
              formData.name.trim(),

            short_name:
              formData.short_name
                .trim()
                .toUpperCase(),

            progress:
              Number(
                formData.progress
              ),

            topics:
              Number(
                formData.topics
              ),

            assignments:
              Number(
                formData.assignments
              ),

          }),

        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to create subject."
        );

      }


      setShowModal(false);

      setFormError("");


      setFormData({

        name: "",

        short_name: "",

        progress: 0,

        topics: 0,

        assignments: 0,

      });


      await fetchSubjects();

    } catch (error) {

      console.error(
        "Error creating subject:",
        error
      );


      setFormError(
        error.message ||
        "Unable to create subject."
      );

    } finally {

      setSaving(false);

    }

  }


  const totalTopics =
    subjects.reduce(

      (total, subject) =>

        total +
        Number(
          subject.syllabus_topics ??
          subject.topics ??
          0
        ),

      0

    );


  const totalAssignments =
    subjects.reduce(

      (total, subject) =>

        total +
        Number(
          subject.assignments || 0
        ),

      0

    );


  return (

    <section className="dashboard-content">


      {/* PAGE HEADER */}

      <div className="subjects-header">

        <div>

          <span className="eyebrow">
            ACADEMIC ORGANIZATION
          </span>

          <h1>
            Your Subjects
          </h1>

          <p>
            Keep track of your courses, topics and academic progress.
          </p>

        </div>


        <button
          className="primary-button"
          onClick={
            openAddSubjectModal
          }
        >

          <Plus size={16} />

          Add Subject

        </button>

      </div>


      {/* LOADING STATE */}

      {loading && (

        <div className="empty-task-state">

          <BookOpen size={24} />

          <h3>
            Loading subjects...
          </h3>

          <p>
            Getting your subjects from StudentOS.
          </p>

        </div>

      )}


      {/* ERROR STATE */}

      {!loading && error && (

        <div className="empty-task-state">

          <BookOpen size={24} />

          <h3>
            Unable to load subjects
          </h3>

          <p>
            {error}
          </p>

        </div>

      )}


      {/* SUBJECT CONTENT */}

      {!loading && !error && (

        <>

          {/* ACADEMIC OVERVIEW */}

          <div className="academic-overview">

            <div>

              <span className="card-label">
                ACADEMIC OVERVIEW
              </span>

              <h2>
                Your Academic Summary
              </h2>

            </div>


            <div className="academic-stat">

              <strong>
                {subjects.length}
              </strong>

              <span>
                Subjects
              </span>

            </div>


            <div className="academic-stat">

              <strong>
                {totalTopics}
              </strong>

              <span>
                Total topics
              </span>

            </div>


            <div className="academic-stat">

              <strong>
                {totalAssignments}
              </strong>

              <span>
                Assignments
              </span>

            </div>

          </div>


          {/* SUBJECT CARDS */}

          <div className="subjects-grid">

            {subjects.map(
              (subject, index) => (

                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  index={index}
                />

              )
            )}

          </div>

        </>

      )}


      {/* ADD SUBJECT MODAL */}

      {showModal && (

        <div
          className="modal-overlay"
          onClick={
            closeAddSubjectModal
          }
        >

          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>

                <span className="eyebrow">
                  ACADEMIC ORGANIZATION
                </span>

                <h2>
                  Add Subject
                </h2>

                <p>
                  Add a new subject to your academic workspace.
                </p>

              </div>


              <button
                className="icon-button"
                onClick={
                  closeAddSubjectModal
                }
                disabled={saving}
                aria-label="Close"
              >

                <X size={18} />

              </button>

            </div>


            {/* MODAL FORM */}

            <form
              className="modal-form"
              onSubmit={
                handleCreateSubject
              }
            >

              {/* SUBJECT NAME */}

              <div className="form-group">

                <label htmlFor="subject-name">
                  Subject Name
                </label>

                <input
                  id="subject-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Computer Networks"
                  value={formData.name}
                  onChange={
                    handleInputChange
                  }
                  disabled={saving}
                />

              </div>


              {/* SHORT NAME */}

              <div className="form-group">

                <label htmlFor="subject-short-name">
                  Short Name
                </label>

                <input
                  id="subject-short-name"
                  name="short_name"
                  type="text"
                  placeholder="e.g. CN"
                  value={
                    formData.short_name
                  }
                  onChange={
                    handleInputChange
                  }
                  disabled={saving}
                />

              </div>


              {/* TOPICS + ASSIGNMENTS */}

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="subject-topics">
                    Topics
                  </label>

                  <input
                    id="subject-topics"
                    name="topics"
                    type="number"
                    min="0"
                    value={
                      formData.topics
                    }
                    onChange={
                      handleInputChange
                    }
                    disabled={saving}
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="subject-assignments">
                    Assignments
                  </label>

                  <input
                    id="subject-assignments"
                    name="assignments"
                    type="number"
                    min="0"
                    value={
                      formData.assignments
                    }
                    onChange={
                      handleInputChange
                    }
                    disabled={saving}
                  />

                </div>

              </div>


              {/* ERROR */}

              {formError && (

                <div className="form-error">

                  {formError}

                </div>

              )}


              {/* ACTIONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeAddSubjectModal
                  }
                  disabled={saving}
                >

                  Cancel

                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >

                  <Plus size={16} />

                  {saving
                    ? "Creating..."
                    : "Create Subject"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </section>

  );

}


export default Subjects;