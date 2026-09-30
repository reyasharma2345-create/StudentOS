import { useState } from "react";

import {
  User,
  GraduationCap,
  Bell,
  Sparkles,
  Palette,
  Save,
  Check,
  Mail,
  BookOpen,
  CalendarDays,
} from "lucide-react";


function Settings() {

  const [profile, setProfile] = useState({
    name: "Rey",
    email: "rey@studentos.app",
    college: "VIT Pune",
    course: "B.Tech Information Technology",
    semester: "Semester 1",
  });


  const [notifications, setNotifications] = useState({
    deadlines: true,
    studyReminders: true,
    weeklySummary: true,
    announcements: false,
  });


  const [aiSettings, setAiSettings] = useState({
    personalizedResponses: true,
    studyInsights: true,
    learningSuggestions: true,
  });


  const [appearance, setAppearance] =
    useState("light");


  const [saved, setSaved] =
    useState(false);


  function updateProfile(field, value) {

    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);

  }


  function toggleNotification(field) {

    setNotifications((current) => ({
      ...current,
      [field]: !current[field],
    }));

    setSaved(false);

  }


  function toggleAI(field) {

    setAiSettings((current) => ({
      ...current,
      [field]: !current[field],
    }));

    setSaved(false);

  }


  function saveSettings() {

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);

  }


  return (

    <section className="dashboard-content settings-page">


      {/* ========================================
          HEADER
          ======================================== */}

      <div className="settings-header">

        <div>

          <span className="eyebrow">
            STUDENTOS PREFERENCES
          </span>

          <h1>
            Settings
          </h1>

          <p>
            Manage your profile, academic preferences and StudentOS experience.
          </p>

        </div>


        <button
          className={
            `primary-button ${
              saved ? "save-success" : ""
            }`
          }
          onClick={saveSettings}
        >

          {saved ? (
            <Check size={16} />
          ) : (
            <Save size={16} />
          )}

          {saved
            ? "Changes Saved"
            : "Save Changes"}

        </button>

      </div>


      {/* ========================================
          SETTINGS LAYOUT
          ======================================== */}

      <div className="settings-layout">


        {/* ========================================
            PROFILE
            ======================================== */}

        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-section-icon blue">

              <User size={18} />

            </div>

            <div>

              <h2>
                Profile
              </h2>

              <p>
                Your personal StudentOS information.
              </p>

            </div>

          </div>


          <div className="settings-profile-preview">

            <div className="settings-avatar">
              R
            </div>

            <div>

              <strong>
                {profile.name}
              </strong>

              <span>
                Student
              </span>

            </div>

          </div>


          <div className="settings-form-grid">

            <div className="settings-field">

              <label>
                Full Name
              </label>

              <div className="settings-input-wrapper">

                <User size={14} />

                <input
                  value={profile.name}
                  onChange={(event) =>
                    updateProfile(
                      "name",
                      event.target.value
                    )
                  }
                />

              </div>

            </div>


            <div className="settings-field">

              <label>
                Email
              </label>

              <div className="settings-input-wrapper">

                <Mail size={14} />

                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) =>
                    updateProfile(
                      "email",
                      event.target.value
                    )
                  }
                />

              </div>

            </div>

          </div>

        </div>


        {/* ========================================
            ACADEMIC INFORMATION
            ======================================== */}

        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-section-icon burgundy">

              <GraduationCap size={18} />

            </div>

            <div>

              <h2>
                Academic Information
              </h2>

              <p>
                Used to personalize your StudentOS experience.
              </p>

            </div>

          </div>


          <div className="settings-form-grid">


            <div className="settings-field">

              <label>
                College
              </label>

              <div className="settings-input-wrapper">

                <GraduationCap size={14} />

                <input
                  value={profile.college}
                  onChange={(event) =>
                    updateProfile(
                      "college",
                      event.target.value
                    )
                  }
                />

              </div>

            </div>


            <div className="settings-field">

              <label>
                Course
              </label>

              <div className="settings-input-wrapper">

                <BookOpen size={14} />

                <input
                  value={profile.course}
                  onChange={(event) =>
                    updateProfile(
                      "course",
                      event.target.value
                    )
                  }
                />

              </div>

            </div>


            <div className="settings-field">

              <label>
                Current Semester
              </label>

              <div className="settings-input-wrapper">

                <CalendarDays size={14} />

                <select
                  value={profile.semester}
                  onChange={(event) =>
                    updateProfile(
                      "semester",
                      event.target.value
                    )
                  }
                >

                  <option>
                    Semester 1
                  </option>

                  <option>
                    Semester 2
                  </option>

                  <option>
                    Semester 3
                  </option>

                  <option>
                    Semester 4
                  </option>

                  <option>
                    Semester 5
                  </option>

                  <option>
                    Semester 6
                  </option>

                  <option>
                    Semester 7
                  </option>

                  <option>
                    Semester 8
                  </option>

                </select>

              </div>

            </div>

          </div>

        </div>


        {/* ========================================
            NOTIFICATIONS
            ======================================== */}

        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-section-icon gold">

              <Bell size={18} />

            </div>

            <div>

              <h2>
                Notifications
              </h2>

              <p>
                Choose which academic reminders you receive.
              </p>

            </div>

          </div>


          <div className="settings-options">

            <SettingToggle
              title="Assignment deadlines"
              description="Get reminders when an assignment deadline is approaching."
              enabled={notifications.deadlines}
              onClick={() =>
                toggleNotification(
                  "deadlines"
                )
              }
            />


            <SettingToggle
              title="Study reminders"
              description="Receive reminders for your scheduled study sessions."
              enabled={notifications.studyReminders}
              onClick={() =>
                toggleNotification(
                  "studyReminders"
                )
              }
            />


            <SettingToggle
              title="Weekly summary"
              description="Receive a summary of your study activity every week."
              enabled={notifications.weeklySummary}
              onClick={() =>
                toggleNotification(
                  "weeklySummary"
                )
              }
            />


            <SettingToggle
              title="College announcements"
              description="Receive important academic announcements."
              enabled={notifications.announcements}
              onClick={() =>
                toggleNotification(
                  "announcements"
                )
              }
            />

          </div>

        </div>


        {/* ========================================
            AI PREFERENCES
            ======================================== */}

        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-section-icon purple">

              <Sparkles size={18} />

            </div>

            <div>

              <h2>
                AI Preferences
              </h2>

              <p>
                Control how StudentOS AI assists you.
              </p>

            </div>

          </div>


          <div className="settings-options">

            <SettingToggle
              title="Personalized responses"
              description="Allow AI responses to use your academic context."
              enabled={
                aiSettings.personalizedResponses
              }
              onClick={() =>
                toggleAI(
                  "personalizedResponses"
                )
              }
            />


            <SettingToggle
              title="Study insights"
              description="Allow StudentOS AI to analyze your study activity."
              enabled={
                aiSettings.studyInsights
              }
              onClick={() =>
                toggleAI(
                  "studyInsights"
                )
              }
            />


            <SettingToggle
              title="Learning suggestions"
              description="Receive topic and revision suggestions based on your progress."
              enabled={
                aiSettings.learningSuggestions
              }
              onClick={() =>
                toggleAI(
                  "learningSuggestions"
                )
              }
            />

          </div>

        </div>


        {/* ========================================
            APPEARANCE
            ======================================== */}

        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-section-icon navy">

              <Palette size={18} />

            </div>

            <div>

              <h2>
                Appearance
              </h2>

              <p>
                Choose how StudentOS looks.
              </p>

            </div>

          </div>


          <div className="appearance-options">

            <button
              className={
                `appearance-option ${
                  appearance === "light"
                    ? "active"
                    : ""
                }`
              }
              onClick={() =>
                setAppearance("light")
              }
            >

              <div className="appearance-preview light-preview">

                <div></div>

              </div>

              <strong>
                Light
              </strong>

              <span>
                Ivory workspace
              </span>

            </button>


            <button
              className={
                `appearance-option ${
                  appearance === "dark"
                    ? "active"
                    : ""
                }`
              }
              onClick={() =>
                setAppearance("dark")
              }
            >

              <div className="appearance-preview dark-preview">

                <div></div>

              </div>

              <strong>
                Dark
              </strong>

              <span>
                Coming soon
              </span>

            </button>

          </div>

        </div>


        {/* ========================================
            ACCOUNT INFO
            ======================================== */}

        <div className="settings-account-card">

          <div>

            <span className="card-label">
              ACCOUNT
            </span>

            <h3>
              StudentOS Account
            </h3>

            <p>
              Your account system will be connected to the backend during the authentication phase.
            </p>

          </div>

          <span className="account-status">
            Local profile
          </span>

        </div>


      </div>

    </section>

  );

}


/* ========================================
   SETTING TOGGLE
   ======================================== */

function SettingToggle({
  title,
  description,
  enabled,
  onClick,
}) {

  return (

    <div className="setting-option">

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>


      <button
        className={
          `settings-toggle ${
            enabled ? "enabled" : ""
          }`
        }
        onClick={onClick}
        aria-label={`Toggle ${title}`}
      >

        <span></span>

      </button>

    </div>

  );

}


export default Settings;