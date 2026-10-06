import { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  User,
  BookOpen,
  Brain,
  ClipboardList,
  Lightbulb,
  Trash2,
  ExternalLink,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

const initialMessages = [
  {
    id: 1,
    type: "ai",
    text: "Hi Rey! I'm your StudentOS AI assistant. I can help you understand topics, plan your studies, create quizzes, or organize your academic workload.",
    researchResults: [],
  },
];

const suggestions = [
  {
    icon: BookOpen,
    title: "Explain a topic",
    prompt: "Explain DBMS normalization in simple terms.",
  },
  {
    icon: Brain,
    title: "Quiz me",
    prompt: "Quiz me on linked lists with 5 questions.",
  },
  {
    icon: ClipboardList,
    title: "Make a study plan",
    prompt: "Create a study plan for my upcoming exams.",
  },
  {
    icon: Lightbulb,
    title: "Give me a tip",
    prompt: "Give me a useful study tip for today.",
  },
];

function normalizeArray(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data.value)) {
    return data.value;
  }

  return [];
}

function AIAssistant() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [semesterStats, setSemesterStats] = useState({
    subjects: 0,
    progress: 0,
    pendingTasks: 0,
  });

  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [aiContext, setAiContext] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  useEffect(() => {
    let isMounted = true;

    async function loadSemesterStats() {
      try {
        const [subjectsResponse, tasksResponse] =
          await Promise.all([
            fetch(`${API_BASE_URL}/subjects`),
            fetch(`${API_BASE_URL}/tasks`),
          ]);

        if (!subjectsResponse.ok) {
          throw new Error(
            `Subjects request failed: ${subjectsResponse.status}`
          );
        }

        if (!tasksResponse.ok) {
          throw new Error(
            `Tasks request failed: ${tasksResponse.status}`
          );
        }

        const subjectsData = await subjectsResponse.json();
        const tasksData = await tasksResponse.json();

        const subjects = normalizeArray(subjectsData, [
          "subjects",
          "items",
          "data",
        ]);

        const tasks = normalizeArray(tasksData, [
          "tasks",
          "items",
          "data",
        ]);

        const progressValues = subjects.map((subject) => {
          const progress = Number(subject?.progress);

          return Number.isFinite(progress)
            ? Math.min(100, Math.max(0, progress))
            : 0;
        });

        const overallProgress =
          progressValues.length > 0
            ? Math.round(
                progressValues.reduce(
                  (total, progress) => total + progress,
                  0
                ) / progressValues.length
              )
            : 0;

        const pendingTasks = tasks.filter((task) => {
          const status = String(task?.status ?? "")
            .trim()
            .toLowerCase();

          return status !== "completed";
        }).length;

        /*
         * Prefer the subject with the highest number
         * of completed syllabus topics as the default
         * academic context for the AI.
         */
        let defaultSubject = null;

        if (subjects.length > 0) {
          defaultSubject = [...subjects].sort(
            (a, b) =>
              Number(b?.completed_topics ?? 0) -
              Number(a?.completed_topics ?? 0)
          )[0];
        }

        if (isMounted) {
          setSemesterStats({
            subjects: subjects.length,
            progress: overallProgress,
            pendingTasks,
          });

          if (defaultSubject?.id) {
            setSelectedSubjectId(defaultSubject.id);
          }
        }
      } catch (error) {
        console.error(
          "StudentOS semester stats error:",
          error
        );

        if (isMounted) {
          setSemesterStats({
            subjects: 0,
            progress: 0,
            pendingTasks: 0,
          });
        }
      }
    }

    loadSemesterStats();

    return () => {
      isMounted = false;
    };
  }, []);

  function buildHistoryForBackend() {
    return messages
      .filter(
        (message) =>
          message.type === "user" ||
          message.type === "ai"
      )
      .slice(-12)
      .map((message) => ({
        role:
          message.type === "user"
            ? "user"
            : "assistant",
        content: message.text,
      }));
  }

  async function fetchAIResponse(userMessage) {
    const history = buildHistoryForBackend();

    const response = await fetch(
      `${API_BASE_URL}/ai/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          history,
          subject_id: selectedSubjectId,
        }),
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `AI request failed: ${response.status}`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          `AI request failed: ${response.status}`
      );
    }

    return data;
  }

  async function fetchResearch(query) {
    const response = await fetch(
      `${API_BASE_URL}/research?query=${encodeURIComponent(
        query
      )}&limit=5`
    );

    if (!response.ok) {
      let detail = `Research request failed: ${response.status}`;

      try {
        const errorData = await response.json();

        if (errorData?.detail) {
          detail = errorData.detail;
        }
      } catch {
        // Keep the default error message.
      }

      throw new Error(detail);
    }

    return response.json();
  }

  function looksLikeResearchRequest(userMessage) {
    const message = userMessage.toLowerCase();

    const researchKeywords = [
      "research paper",
      "research papers",
      "academic paper",
      "academic papers",
      "journal",
      "journals",
      "literature",
      "literature review",
      "recent research",
      "latest research",
      "research on",
      "research about",
      "papers on",
      "papers about",
    ];

    return researchKeywords.some((keyword) =>
      message.includes(keyword)
    );
  }

  function extractResearchQuery(userMessage) {
    let query = userMessage.trim();

    const phrasesToRemove = [
      "give me research papers on",
      "give me research paper on",
      "give me research papers about",
      "give me research paper about",
      "find research papers on",
      "find research paper on",
      "find research papers about",
      "find research paper about",
      "show me research papers on",
      "show me research papers about",
      "show research papers on",
      "show research papers about",
      "find papers on",
      "find papers about",
      "find paper on",
      "find paper about",
      "latest research on",
      "latest research about",
      "recent research on",
      "recent research about",
      "research papers on",
      "research paper on",
      "research papers about",
      "research paper about",
      "papers on",
      "papers about",
      "paper on",
      "paper about",
      "research on",
      "research about",
    ];

    const lowerQuery = query.toLowerCase();

    for (const phrase of phrasesToRemove) {
      if (lowerQuery.startsWith(phrase)) {
        query = query
          .slice(phrase.length)
          .trim();

        break;
      }
    }

    query = query
      .replace(/^explain\s+/i, "")
      .replace(/^teach me\s+/i, "")
      .replace(/^define\s+/i, "");

    query = query
      .replace(
        /\s+and\s+give me research papers\.?$/i,
        ""
      )
      .replace(
        /\s+and\s+give me research paper\.?$/i,
        ""
      )
      .replace(
        /\s+and\s+find research papers\.?$/i,
        ""
      )
      .replace(
        /\s+and\s+find research paper\.?$/i,
        ""
      )
      .replace(
        /\s+and\s+show me research papers\.?$/i,
        ""
      )
      .replace(
        /\s+and\s+show research papers\.?$/i,
        ""
      );

    query = query
      .replace(/\s+in simple terms\.?$/i, "")
      .replace(/\s+in simple words\.?$/i, "")
      .replace(/\s+simply\.?$/i, "");

    return (
      query.replace(/\s+/g, " ").trim() ||
      userMessage.trim()
    );
  }

  async function sendMessage(message = input) {
    const trimmed = message.trim();

    if (!trimmed || isTyping) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: trimmed,
      researchResults: [],
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput("");
    setIsTyping(true);

    try {
      const aiData = await fetchAIResponse(trimmed);

      let researchResults = [];

      /*
       * If the user explicitly asks for research,
       * also retrieve papers from OpenAlex.
       */
      if (looksLikeResearchRequest(trimmed)) {
        try {
          const researchQuery =
            extractResearchQuery(trimmed);

          const researchData =
            await fetchResearch(researchQuery);

          researchResults =
            researchData?.results || [];
        } catch (researchError) {
          console.error(
            "StudentOS research error:",
            researchError
          );
        }
      }

      /*
       * The backend returns the student's topic-level
       * academic context along with the AI response.
       */
      setAiContext(aiData?.context || null);

      const response = {
        id: Date.now() + 1,
        type: "ai",
        text:
          aiData?.answer ||
          "I received your request, but I couldn't generate an answer.",
        researchResults,
      };

      setMessages((current) => [
        ...current,
        response,
      ]);
    } catch (error) {
      console.error(
        "StudentOS AI error:",
        error
      );

      const errorMessage =
        error?.message ||
        "I couldn't connect to the StudentOS AI backend. Please make sure FastAPI is running and try again.";

      const response = {
        id: Date.now() + 1,
        type: "ai",
        text: `I couldn't complete that request.\n\n${errorMessage}`,
        researchResults: [],
      };

      setMessages((current) => [
        ...current,
        response,
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([...initialMessages]);
    setAiContext(null);
  }

  function getPaperLink(paper) {
    if (paper?.doi) {
      return paper.doi;
    }

    if (
      paper?.id &&
      typeof paper.id === "string"
    ) {
      return paper.id;
    }

    return null;
  }

  const selectedSubject =
    aiContext?.selected_subject || null;

  const topicList = Array.isArray(
    selectedSubject?.topics
  )
    ? selectedSubject.topics
    : [];

  const completedTopicCount =
    topicList.filter(
      (topic) =>
        String(topic?.status || "")
          .toLowerCase() === "completed"
    ).length;

  const inProgressTopics =
    topicList.filter(
      (topic) =>
        String(topic?.status || "")
          .toLowerCase() === "in_progress"
    );

  const remainingTopicCount =
    topicList.filter(
      (topic) =>
        String(topic?.status || "")
          .toLowerCase() !== "completed"
    ).length;

  return (
    <section className="dashboard-content ai-page">
      <div className="ai-page-header">
        <div>
          <span className="eyebrow">
            INTELLIGENT STUDY COMPANION
          </span>

          <h1>AI Assistant</h1>

          <p>
            Learn, plan and understand your academics with StudentOS AI.
          </p>
        </div>

        <button
          className="ai-clear-button"
          onClick={clearChat}
          type="button"
        >
          <Trash2 size={15} />
          Clear chat
        </button>
      </div>

      <div className="ai-layout">
        <div className="ai-chat-card">
          <div className="ai-chat-header">
            <div className="ai-avatar">
              <Sparkles size={18} />
            </div>

            <div>
              <strong>StudentOS AI</strong>
              <span>Academic assistant</span>
            </div>

            <div className="ai-status">
              <span></span>
              Online
            </div>
          </div>

          <div className="ai-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`ai-message-row ${message.type}`}
              >
                {message.type === "ai" && (
                  <div className="message-avatar ai">
                    <Sparkles size={14} />
                  </div>
                )}

                <div className="ai-message">
                  <p>{message.text}</p>

                  {message.researchResults &&
                    message.researchResults.length > 0 && (
                      <div className="ai-research-results">
                        {message.researchResults.map(
                          (paper, index) => {
                            const paperLink =
                              getPaperLink(paper);

                            return (
                              <div
                                className="ai-research-paper"
                                key={
                                  paper.id ||
                                  `${paper.title}-${index}`
                                }
                              >
                                <div className="research-paper-number">
                                  {index + 1}
                                </div>

                                <div className="research-paper-content">
                                  <h4>
                                    {paper.title ||
                                      "Untitled paper"}
                                  </h4>

                                  {paper.authors &&
                                    paper.authors.length > 0 && (
                                      <span className="research-paper-authors">
                                        {paper.authors
                                          .slice(0, 4)
                                          .join(", ")}

                                        {paper.authors.length >
                                          4 && " et al."}
                                      </span>
                                    )}

                                  <div className="research-paper-meta">
                                    {paper.publication_year && (
                                      <span>
                                        {
                                          paper.publication_year
                                        }
                                      </span>
                                    )}

                                    {paper.publication_year &&
                                      typeof paper.cited_by_count ===
                                        "number" && (
                                        <span>·</span>
                                      )}

                                    {typeof paper.cited_by_count ===
                                      "number" && (
                                      <span>
                                        {
                                          paper.cited_by_count
                                        }{" "}
                                        citations
                                      </span>
                                    )}
                                  </div>

                                  {paperLink && (
                                    <a
                                      href={paperLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="research-paper-link"
                                    >
                                      View paper
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                </div>

                {message.type === "user" && (
                  <div className="message-avatar user">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="ai-message-row ai">
                <div className="message-avatar ai">
                  <Sparkles size={14} />
                </div>

                <div className="ai-message typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="ai-input-area">
            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask StudentOS AI anything..."
              rows={1}
            />

            <button
              className="ai-send-button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              type="button"
            >
              <Send size={17} />
            </button>
          </div>

          <div className="ai-input-hint">
            Press Enter to send · Shift + Enter for a new line
          </div>
        </div>

        <aside className="ai-side-panel">
          <div className="ai-side-card">
            <span className="card-label">
              QUICK ACTIONS
            </span>

            <h3>What can I help with?</h3>

            <div className="ai-suggestions">
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon;

                return (
                  <button
                    key={suggestion.title}
                    className="ai-suggestion"
                    onClick={() =>
                      sendMessage(
                        suggestion.prompt
                      )
                    }
                    type="button"
                  >
                    <div className="suggestion-icon">
                      <Icon size={16} />
                    </div>

                    <div>
                      <strong>
                        {suggestion.title}
                      </strong>

                      <span>
                        {suggestion.prompt}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ai-context-card">
            <span className="card-label">
              CURRENT CONTEXT
            </span>

            <h3>Your Semester</h3>

            <div className="context-item">
              <span>Subjects</span>

              <strong>
                {semesterStats.subjects}
              </strong>
            </div>

            <div className="context-item">
              <span>Academic progress</span>

              <strong>
                {semesterStats.progress}%
              </strong>
            </div>

            <div className="context-item">
              <span>Pending tasks</span>

              <strong>
                {semesterStats.pendingTasks}
              </strong>
            </div>

            {selectedSubject && (
              <>
                <div className="context-divider" />

                <div className="context-subject">
                  <span className="card-label">
                    AI STUDY CONTEXT
                  </span>

                  <strong>
                    {selectedSubject.name}
                  </strong>

                  <div className="context-item">
                    <span>Completed topics</span>

                    <strong>
                      {completedTopicCount}
                      {topicList.length > 0
                        ? ` / ${topicList.length}`
                        : ""}
                    </strong>
                  </div>

                  <div className="context-item">
                    <span>Remaining topics</span>

                    <strong>
                      {remainingTopicCount}
                    </strong>
                  </div>

                  {inProgressTopics.length > 0 && (
                    <div className="context-progress-topic">
                      <span>Currently learning</span>

                      <strong>
                        {
                          inProgressTopics[0]
                            ?.topic_name
                        }

                        {inProgressTopics[0]
                          ?.mastery != null
                          ? ` · ${inProgressTopics[0].mastery}%`
                          : ""}
                      </strong>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="ai-note">
            <Sparkles size={15} />

            <p>
              StudentOS AI is designed to assist your learning.
              Always verify important academic information.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default AIAssistant;