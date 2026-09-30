import {
  BookOpen,
  Plus,
  ChevronRight,
} from "lucide-react";


const subjects = [
  {
    name: "Database Management Systems",
    shortName: "DBMS",
    progress: 72,
    topics: 12,
    assignments: 3,
    color: "blue",
  },
  {
    name: "Object Oriented Programming",
    shortName: "OOP",
    progress: 84,
    topics: 15,
    assignments: 2,
    color: "burgundy",
  },
  {
    name: "Data Structures & Algorithms",
    shortName: "DSA",
    progress: 61,
    topics: 18,
    assignments: 4,
    color: "blue",
  },
  {
    name: "Logic Design & Microprocessors",
    shortName: "LDM",
    progress: 68,
    topics: 14,
    assignments: 2,
    color: "burgundy",
  },
];


function SubjectCard({ subject }) {
  return (
    <article className="subject-card">

      <div className={`subject-icon ${subject.color}`}>
        <BookOpen size={19} />
      </div>


      <div className="subject-card-header">

        <div>
          <span className="subject-code">
            {subject.shortName}
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
            style={{ width: `${subject.progress}%` }}
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
  return (
    <section className="dashboard-content">

      {/* Page Header */}
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


      {/* Semester Overview */}
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
          <strong>4</strong>
          <span>Subjects</span>
        </div>


        <div className="semester-stat">
          <strong>59</strong>
          <span>Total topics</span>
        </div>


        <div className="semester-stat">
          <strong>11</strong>
          <span>Assignments</span>
        </div>

      </div>


      {/* Subjects */}
      <div className="subjects-grid">

        {subjects.map((subject) => (
          <SubjectCard
            key={subject.shortName}
            subject={subject}
          />
        ))}

      </div>

    </section>
  );
}


export default Subjects;