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


const initialMessages = [
  {
    id: 1,
    type: "ai",
    text: "Hi Rey! I'm your StudentOS AI assistant. I can help you understand topics, plan your studies, create quizzes, or organize your academic workload.",
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

  const [messages, setMessages] =
    useState(initialMessages);

  const [input, setInput] =
    useState("");

  const [isTyping, setIsTyping] =
    useState(false);


  /*
   * StudentOS academic information.
   *
   * Progress comes directly from the backend
   * /progress endpoint so it matches the Dashboard.
   */
  const [academicStats, setAcademicStats] =
    useState({
      subjects: 0,
      progress: 0,
      pendingTasks: 0,
    });


  const messagesEndRef =
    useRef(null);


  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages, isTyping]);


  /*
   * Load live StudentOS academic information.
   *
   * The Dashboard and AI Assistant now use
   * the same /progress source of truth.
   */
  useEffect(() => {

    let isMounted = true;


    async function loadAcademicStats() {

      try {

        const [
          progressResponse,
          subjectsResponse,
          tasksResponse,
        ] = await Promise.all([

          fetch(
            "http://127.0.0.1:8000/progress"
          ),

          fetch(
            "http://127.0.0.1:8000/subjects"
          ),

          fetch(
            "http://127.0.0.1:8000/tasks"
          ),

        ]);


        if (!progressResponse.ok) {

          throw new Error(
            `Progress request failed: ${progressResponse.status}`
          );

        }


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


        const progressData =
          await progressResponse.json();


        const subjectsData =
          await subjectsResponse.json();


        const tasksData =
          await tasksResponse.json();


        const subjects =
          normalizeArray(
            subjectsData,
            [
              "subjects",
              "items",
              "data",
            ]
          );


        const tasks =
          normalizeArray(
            tasksData,
            [
              "tasks",
              "items",
              "data",
            ]
          );


        /*
         * IMPORTANT:
         *
         * Do NOT calculate progress by averaging
         * subject percentages.
         *
         * The backend /progress endpoint already
         * calculates the real overall academic
         * progress from syllabus completion.
         */
        const progress = Number(
          progressData?.progress
        );


        const safeProgress =
          Number.isFinite(progress)
            ? Math.min(
                100,
                Math.max(
                  0,
                  Math.round(progress)
                )
              )
            : 0;


        const pendingTasks =
          tasks.filter((task) => {

            const status =
              String(
                task?.status ?? ""
              )
                .trim()
                .toLowerCase();


            return status !== "completed";

          }).length;


        if (isMounted) {

          setAcademicStats({

            subjects:
              subjects.length,

            progress:
              safeProgress,

            pendingTasks,

          });

        }


      } catch (error) {

        console.error(
          "StudentOS academic stats error:",
          error
        );


        if (isMounted) {

          setAcademicStats({

            subjects: 0,

            progress: 0,

            pendingTasks: 0,

          });

        }

      }

    }


    /*
     * Load immediately.
     */
    loadAcademicStats();


    /*
     * Refresh automatically every 10 seconds.
     *
     * This means changes made elsewhere in StudentOS
     * can appear in the AI Assistant without manually
     * refreshing the browser.
     */
    const refreshInterval =
      setInterval(
        loadAcademicStats,
        10000
      );


    return () => {

      isMounted = false;

      clearInterval(
        refreshInterval
      );

    };

  }, []);


  async function detectIntent(
    userMessage
  ) {

    const response =
      await fetch(
        "http://127.0.0.1:8000/ai/intent",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message: userMessage,
          }),

        }
      );


    if (!response.ok) {

      throw new Error(
        `AI intent request failed: ${response.status}`
      );

    }


    return await response.json();

  }


  function extractResearchQuery(
    userMessage
  ) {

    let query =
      userMessage
        .toLowerCase()
        .trim();


    query = query.replace(
      /^\s*\d+\s*[\.\)]\s*/,
      ""
    );


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


    for (
      const phrase
      of phrasesToRemove
    ) {

      if (
        query.startsWith(
          phrase
        )
      ) {

        query =
          query
            .slice(
              phrase.length
            )
            .trim();

        break;

      }

    }


    query = query

      .replace(
        /^explain\s+/,
        ""
      )

      .replace(
        /^teach me\s+/,
        ""
      )

      .replace(
        /^define\s+/,
        ""
      );


    query = query

      .replace(
        /\s+and\s+give me research papers.*$/i,
        ""
      )

      .replace(
        /\s+and\s+give me research paper.*$/i,
        ""
      )

      .replace(
        /\s+and\s+find research papers.*$/i,
        ""
      )

      .replace(
        /\s+and\s+find research paper.*$/i,
        ""
      )

      .replace(
        /\s+and\s+show me research papers.*$/i,
        ""
      )

      .replace(
        /\s+and\s+show research papers.*$/i,
        ""
      );


    query = query

      .replace(
        /\s+in simple terms.*$/i,
        ""
      )

      .replace(
        /\s+in simple words.*$/i,
        ""
      )

      .replace(
        /\s+simply.*$/i,
        ""
      );


    query = query.replace(
      /^\s*\d+\s*[\.\)]\s*/,
      ""
    );


    query =
      query
        .replace(
          /\s+/g,
          " "
        )
        .trim();


    return (
      query ||
      userMessage.trim()
    );

  }


  async function fetchResearch(
    userMessage
  ) {

    const query =
      extractResearchQuery(
        userMessage
      );


    console.log(
      "StudentOS extracted research query:",
      query
    );


    const response =
      await fetch(
        `http://127.0.0.1:8000/research?query=${encodeURIComponent(
          query
        )}&limit=5`
      );


    if (!response.ok) {

      let detail =
        `Research request failed: ${response.status}`;


      try {

        const errorData =
          await response.json();


        if (
          errorData?.detail
        ) {

          detail =
            errorData.detail;

        }

      } catch {

        // Keep default error message.

      }


      throw new Error(
        detail
      );

    }


    const data =
      await response.json();


    return {

      ...data,

      searchQuery:
        query,

    };

  }


  function generateLearningResponse(
    userMessage
  ) {

    const message =
      userMessage.toLowerCase();


    if (
      message.includes(
        "linked list"
      ) ||
      message.includes(
        "linked lists"
      )
    ) {

      return `A linked list is a linear data structure made up of nodes.

Each node usually contains:

• Data — the value stored in the node.
• Next pointer — a reference to the next node.

For example:

Node 1 → Node 2 → Node 3 → NULL

Unlike an array, linked-list nodes do not need to be stored in contiguous memory.

The main operations are:

1. Traversal
2. Insertion
3. Deletion
4. Searching

A good next step is to understand how insertion and deletion work in a singly linked list.`;

    }


    if (
      message.includes(
        "normalization"
      ) ||
      message.includes(
        "normalise"
      )
    ) {

      return `Database normalization is a technique used to organize data in a database and reduce unnecessary duplication.

The main normal forms you will commonly study are:

1. 1NF — Atomic values
2. 2NF — 1NF + no partial dependency
3. 3NF — 2NF + no transitive dependency
4. BCNF — stronger version of 3NF

The main idea is to divide poorly structured tables into smaller related tables while maintaining relationships between them.

If you're studying DBMS for your exam, I can next explain 1NF, 2NF and 3NF with a simple example.`;

    }


    if (
      message.includes(
        "stack"
      ) ||
      message.includes(
        "queue"
      )
    ) {

      return `A stack is a linear data structure that follows LIFO:

Last In → First Out

Example:

Push 10
Push 20
Push 30

Top → 30
       20
       10

The main stack operations are:

• Push — insert an element
• Pop — remove the top element
• Peek — view the top element

A queue follows FIFO:

First In → First Out

The main queue operations are enqueue and dequeue.`;

    }


    return `I understood this as a learning request.

StudentOS will explain "${userMessage}" using a learning-focused response with simple explanations, examples, and step-by-step reasoning.

The next AI milestone will replace these rule-based explanations with the actual LLM learning layer.`;

  }


  function generateResearchResponse(
    userMessage,
    researchData
  ) {

    const results =
      researchData?.results ||
      [];


    if (
      results.length === 0
    ) {

      return {

        text:
          `I searched OpenAlex for "${researchData?.searchQuery || userMessage}", but no research papers were returned.

Try a broader academic topic or a different search phrase.`,

        researchResults: [],

      };

    }


    return {

      text:
        `I searched academic research for "${researchData.searchQuery}" and found ${results.length} relevant papers.

Here are the results:`,

      researchResults:
        results,

    };

  }


  function generateBothResponse(
    userMessage,
    researchData
  ) {

    const learningResponse =
      generateLearningResponse(
        userMessage
      );


    const results =
      researchData?.results ||
      [];


    return {

      text:
        `${learningResponse}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📚 RESEARCH PAPERS\n\n` +
        `I also searched academic research for "${researchData?.searchQuery || userMessage}". ` +
        `I found ${results.length} relevant papers:`,

      researchResults:
        results,

    };

  }


  function generateResponse(
    userMessage,
    intentResult,
    researchData
  ) {

    const intent =
      intentResult?.intent;


    if (
      intent === "LEARN"
    ) {

      return {

        text:
          generateLearningResponse(
            userMessage
          ),

        researchResults: [],

      };

    }


    if (
      intent === "RESEARCH"
    ) {

      return generateResearchResponse(
        userMessage,
        researchData
      );

    }


    if (
      intent === "BOTH"
    ) {

      return generateBothResponse(
        userMessage,
        researchData
      );

    }


    return {

      text:
        "I understood your question, but I couldn't determine the requested mode.",

      researchResults: [],

    };

  }


  async function sendMessage(
    message = input
  ) {

    const trimmed =
      message.trim();


    if (
      !trimmed ||
      isTyping
    ) {

      return;

    }


    const userMessage = {

      id:
        Date.now(),

      type:
        "user",

      text:
        trimmed,

    };


    setMessages(
      (current) => [
        ...current,
        userMessage,
      ]
    );


    setInput("");

    setIsTyping(true);


    try {

      const intentResult =
        await detectIntent(
          trimmed
        );


      console.log(
        "StudentOS AI intent:",
        intentResult
      );


      let researchData =
        null;


      if (
        intentResult?.intent ===
          "RESEARCH" ||
        intentResult?.intent ===
          "BOTH"
      ) {

        researchData =
          await fetchResearch(
            trimmed
          );


        console.log(
          "StudentOS research results:",
          researchData
        );

      }


      const generated =
        generateResponse(
          trimmed,
          intentResult,
          researchData
        );


      const response = {

        id:
          Date.now() + 1,

        type:
          "ai",

        text:
          generated.text,

        researchResults:
          generated.researchResults ||
          [],

      };


      setMessages(
        (current) => [
          ...current,
          response,
        ]
      );


    } catch (error) {

      console.error(
        "StudentOS AI error:",
        error
      );


      const response = {

        id:
          Date.now() + 1,

        type:
          "ai",

        text:
          error?.message ||
          "I couldn't connect to the StudentOS AI backend. Please make sure the FastAPI server is running and try again.",

        researchResults: [],

      };


      setMessages(
        (current) => [
          ...current,
          response,
        ]
      );


    } finally {

      setIsTyping(false);

    }

  }


  function handleKeyDown(
    event
  ) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }


  function clearChat() {

    setMessages([
      ...initialMessages,
    ]);

  }


  return (

    <section className="dashboard-content ai-page">

      <div className="ai-page-header">

        <div>

          <span className="eyebrow">
            INTELLIGENT STUDY COMPANION
          </span>

          <h1>
            AI Assistant
          </h1>

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

              <strong>
                StudentOS AI
              </strong>

              <span>
                Academic assistant
              </span>

            </div>


            <div className="ai-status">

              <span></span>

              Online

            </div>

          </div>


          <div className="ai-messages">

            {messages.map(
              (message) => (

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

                    <p>
                      {message.text}
                    </p>


                    {message.researchResults &&
                      message.researchResults.length >
                        0 && (

                      <div className="ai-research-results">

                        {message.researchResults.map(
                          (
                            paper,
                            index
                          ) => {

                            const paperLink =
                              paper.doi ||
                              paper.id;


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
                                    paper.authors.length >
                                      0 && (

                                    <span className="research-paper-authors">

                                      {paper.authors
                                        .slice(
                                          0,
                                          4
                                        )
                                        .join(
                                          ", "
                                        )}

                                      {paper.authors
                                        .length >
                                        4 &&
                                        " et al."}

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

                                      <span>
                                        ·
                                      </span>

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
                                      href={
                                        paperLink
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="research-paper-link"
                                    >

                                      View paper

                                      <ExternalLink
                                        size={13}
                                      />

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

              )
            )}


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


            <div
              ref={messagesEndRef}
            />

          </div>


          <div className="ai-input-area">

            <textarea
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Ask StudentOS AI anything..."
              rows={1}
            />


            <button
              className="ai-send-button"
              onClick={() =>
                sendMessage()
              }
              disabled={
                !input.trim() ||
                isTyping
              }
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


          {/* QUICK ACTIONS */}

          <div className="ai-side-card">

            <span className="card-label">
              QUICK ACTIONS
            </span>


            <h3>
              What can I help with?
            </h3>


            <div className="ai-suggestions">

              {suggestions.map(
                (suggestion) => {

                  const Icon =
                    suggestion.icon;


                  return (

                    <button
                      key={
                        suggestion.title
                      }
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
                          {
                            suggestion.title
                          }
                        </strong>


                        <span>
                          {
                            suggestion.prompt
                          }
                        </span>

                      </div>

                    </button>

                  );

                }
              )}

            </div>

          </div>


          {/* ACADEMIC OVERVIEW */}

          <div className="ai-context-card">

            <span className="card-label">
              ACADEMIC OVERVIEW
            </span>


            <h3>
              Your Progress
            </h3>


            <div className="context-item">

              <span>
                Subjects
              </span>


              <strong>
                {
                  academicStats.subjects
                }
              </strong>

            </div>


            <div className="context-item">

              <span>
                Academic progress
              </span>


              <strong>
                {
                  academicStats.progress
                }%
              </strong>

            </div>


            {/* REAL DATABASE PROGRESS BAR */}

            <div
              style={{
                width: "100%",
                height: "7px",
                marginTop: "12px",
                overflow: "hidden",
                borderRadius: "999px",
                background: "#e7edf6",
              }}
            >

              <div
                style={{
                  width: `${academicStats.progress}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: "#315f9f",
                  transition:
                    "width 0.5s ease",
                }}
              />

            </div>


            <div className="context-item">

              <span>
                Pending tasks
              </span>


              <strong>
                {
                  academicStats.pendingTasks
                }
              </strong>

            </div>

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