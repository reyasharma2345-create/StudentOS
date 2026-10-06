import "./App.css";

import {
  useEffect,
  useState,
} from "react";

import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  CalendarDays,
  Sparkles,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  Bell,
  Plus,
  FlaskConical,
} from "lucide-react";

import {
  NavLink,
  Routes,
  Route,
} from "react-router-dom";

import Subjects from "./Subjects.jsx";
import SubjectDetails from "./SubjectDetails.jsx";
import Syllabus from "./Syllabus.jsx";
import Tasks from "./Tasks.jsx";
import StudyPlanner from "./StudyPlanner.jsx";
import AIAssistant from "./AIAssistant.jsx";
import Analytics from "./Analytics.jsx";
import Settings from "./Settings.jsx";
import ResearchHub from "./ResearchHub.jsx";


function Sidebar() {

  const navItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
    },

    {
      path: "/subjects",
      label: "Subjects",
      icon: BookOpen,
    },

    {
      path: "/syllabus",
      label: "Syllabus",
      icon: BookOpen,
    },

    {
      path: "/tasks",
      label: "Tasks",
      icon: CheckSquare,
    },

    {
      path: "/planner",
      label: "Study Planner",
      icon: CalendarDays,
    },

    {
      path: "/ai",
      label: "AI Assistant",
      icon: Sparkles,
    },

    {
      path: "/research",
      label: "Research Hub",
      icon: FlaskConical,
    },

    {
      path: "/analytics",
      label: "Analytics",
      icon: BarChart3,
    },
  ];


  return (

    <aside className="sidebar">

      <div className="brand">

        <div className="brand-mark">
          S
        </div>

        <div>

          <h1>
            StudentOS
          </h1>

          <span>
            ACADEMIC OS
          </span>

        </div>

      </div>


      <nav className="sidebar-nav">

        {navItems.map((item) => {

          const Icon = item.icon;

          return (

            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `nav-item ${
                  isActive ? "active" : ""
                }`
              }
            >

              <Icon
                className="nav-icon"
                size={18}
              />

              <span>
                {item.label}
              </span>

            </NavLink>

          );

        })}

      </nav>


      <div className="sidebar-bottom">

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `nav-item ${
              isActive ? "active" : ""
            }`
          }
        >

          <SettingsIcon
            className="nav-icon"
            size={18}
          />

          <span>
            Settings
          </span>

        </NavLink>


        <div className="sidebar-profile">

          <div className="profile-avatar">
            R
          </div>

          <div className="profile-info">

            <strong>
              Rey
            </strong>

            <span>
              Student
            </span>

          </div>

        </div>

      </div>

    </aside>

  );

}


function Topbar() {

  return (

    <header className="topbar">

      <div className="page-heading">

        <span className="eyebrow">
          STUDENTOS
        </span>

        <h2>
          Student Workspace
        </h2>

      </div>


      <div className="topbar-actions">

        <button
          className="icon-button"
          aria-label="Search"
        >

          <Search size={18} />

        </button>


        <button
          className="notification-button"
          aria-label="Notifications"
        >

          <Bell size={18} />

          <span className="notification-dot"></span>

        </button>


        <div className="top-profile">

          <div className="profile-avatar">
            R
          </div>

          <div>

            <strong>
              Rey
            </strong>

            <span>
              Student
            </span>

          </div>

        </div>

      </div>

    </header>

  );

}


function Dashboard() {

  const [academicProgress, setAcademicProgress] = useState(0);

  const [progressLoading, setProgressLoading] =
    useState(true);


  useEffect(() => {

    let isMounted = true;


    async function loadProgress() {

      try {

        setProgressLoading(true);


        const response = await fetch(
          "http://127.0.0.1:8000/progress"
        );


        if (!response.ok) {

          throw new Error(
            "Failed to load academic progress."
          );

        }


        const data = await response.json();


        const progress = Number(
          data?.progress ?? 0
        );


        const safeProgress = Math.min(
          100,
          Math.max(
            0,
            Number.isFinite(progress)
              ? progress
              : 0
          )
        );


        if (isMounted) {

          setAcademicProgress(
            safeProgress
          );

        }

      } catch (error) {

        console.error(
          "Error loading dashboard progress:",
          error
        );


        if (isMounted) {

          setAcademicProgress(0);

        }

      } finally {

        if (isMounted) {

          setProgressLoading(false);

        }

      }

    }


    loadProgress();


    return () => {

      isMounted = false;

    };

  }, []);


  return (

    <section className="dashboard-content">

      <div className="welcome-section">

        <div>

          <span className="eyebrow">
            TODAY • SEPTEMBER 30
          </span>

          <h1>
            Good evening, Rey.
          </h1>

          <p>
            Let's make today's study session count.
          </p>

        </div>


        <button className="primary-button">

          <Plus size={16} />

          Add Task

        </button>

      </div>


      <div className="dashboard-grid">


        <div className="dashboard-card focus-card">

          <span className="card-label">
            TODAY'S FOCUS
          </span>

          <h3>
            DBMS — Normalization
          </h3>

          <p>
            Continue your current study session
            and complete the remaining topic.
          </p>

          <button className="secondary-button">
            Start 45 min session
          </button>

        </div>



        <div className="dashboard-card progress-card">

          <span className="card-label">
            ACADEMIC PROGRESS
          </span>


          <div className="progress-number">

            {progressLoading
              ? "—"
              : `${academicProgress}%`}

          </div>


          <p>
            Overall academic progress
          </p>


          <div className="progress-track">

            <div
              className="progress-fill"
              style={{
                width: `${academicProgress}%`,
              }}
            ></div>

          </div>

        </div>



        <div className="dashboard-card">

          <span className="card-label">
            UPCOMING
          </span>

          <h3>
            3 assignments
          </h3>

          <p>
            Your next deadline is approaching.
          </p>

          <span className="card-accent">
            View tasks →
          </span>

        </div>



        <div className="dashboard-card ai-card">

          <span className="card-label">
            ✦ AI INSIGHT
          </span>

          <h3>
            You're building consistency.
          </h3>

          <p>
            Keep your study sessions focused and
            maintain your current weekly rhythm.
          </p>

          <span className="card-accent">
            Ask StudentOS AI →
          </span>

        </div>


      </div>

    </section>

  );

}


function App() {

  return (

    <div className="app-shell">

      <Sidebar />

      <main className="main-content">

        <Topbar />

        <Routes>

          <Route
            path="/"
            element={<Dashboard />}
          />


          <Route
            path="/subjects"
            element={<Subjects />}
          />


          <Route
            path="/subjects/:subjectId"
            element={<SubjectDetails />}
          />


          <Route
            path="/syllabus"
            element={<Syllabus />}
          />


          <Route
            path="/tasks"
            element={<Tasks />}
          />


          <Route
            path="/planner"
            element={<StudyPlanner />}
          />


          <Route
            path="/ai"
            element={<AIAssistant />}
          />


          <Route
            path="/research"
            element={<ResearchHub />}
          />


          <Route
            path="/analytics"
            element={<Analytics />}
          />


          <Route
            path="/settings"
            element={<Settings />}
          />

        </Routes>

      </main>

    </div>

  );

}


export default App;