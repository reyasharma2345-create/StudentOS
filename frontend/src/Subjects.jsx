import { useEffect, useState } from "react";

import {
  BookOpen,
  Plus,
  ChevronRight,
} from "lucide-react";


function SubjectCard({ subject }) {
  return (
    <article className="subject-card">

      <div className={`subject-icon ${subject.color}`}>
        <BookOpen size={19} />
      </div>

      <div className="subject-card-header">

        <div>
          <span className="subject-code">
            {subject.short_name}
          </span>

          <h3>
            {subject.name}
          </h3>
        </div>

        <span className="subject-percentage">
          {subject.progress}%
        </span>

      </div>

      <div className="subject-progress">

        <div className="subject-progress-track">
          <div
            className={`subject-progress-fill ${subject.color}`}
            style={{
              width: `${subject.progress}%`,
            }}
          />
        </div>

      </div>

      <div className="subject-meta">

        <span>
          {subject.topics} topics
        </span>

        <span>
          {subject.assignments} assignments
        </span>

      </div>

      <button className="subject-view-button">
        View subject
        <ChevronRight size={15} />
      </button>

    </article>
  );
}


function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    async function fetchSubjects() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/subjects"
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch subjects"
          );
        }

        const data = await response.json();

        setSubjects(data.subjects);

      } catch (error) {
        console.error(
          "Error fetching subjects:",
          error
        );

        setError(
          "Unable to load subjects. Make sure the StudentOS backend is running."
        );

      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, []);


  const totalTopics = subjects.reduce(
    (total, subject) =>
      total + subject.topics,
    0
  );


  const totalAssignments = subjects.reduce(
    (total, subject) =>
      total + subject.assignments,
    0
  );


  return (
    <section className="dashboard-content">

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

        <button className="primary-button">
          <Plus size={16} />
          Add Subject
        </button>

      </div>


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


      {!loading && !error && (
        <>
          <div className="semester-overview">

            <div>
              <span className="card-label">
                CURRENT SEMESTER
              </span>

              <h2>
                Semester 1
              </h2>
            </div>

            <div className="semester-stat">
              <strong>
                {subjects.length}
              </strong>

              <span>
                Subjects
              </span>
            </div>

            <div className="semester-stat">
              <strong>
                {totalTopics}
              </strong>

              <span>
                Total topics
              </span>
            </div>

            <div className="semester-stat">
              <strong>
                {totalAssignments}
              </strong>

              <span>
                Assignments
              </span>
            </div>

          </div>


          <div className="subjects-grid">

            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
              />
            ))}

          </div>
        </>
      )}

    </section>
  );
}


export default Subjects;