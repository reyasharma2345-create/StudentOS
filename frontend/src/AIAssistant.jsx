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


function AIAssistant() {

  const [messages, setMessages] =
    useState(initialMessages);

  const [input, setInput] =
    useState("");

  const [isTyping, setIsTyping] =
    useState(false);

  const messagesEndRef =
    useRef(null);


  /* ========================================
     AUTO SCROLL
     ======================================== */

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages, isTyping]);


  /* ========================================
     AI RESPONSE
     ======================================== */

  function generateResponse(userMessage) {

    const message =
      userMessage.toLowerCase();


    if (
      message.includes("normalization") ||
      message.includes("dbms")
    ) {

      return "Think of DBMS normalization as organizing database tables so that the same information is not unnecessarily repeated. The main goals are to reduce redundancy and avoid update, insertion, and deletion anomalies. For example, instead of storing a student's department name repeatedly in every record, we can separate department information into its own table and connect the tables using keys.";

    }


    if (
      message.includes("linked list") ||
      message.includes("dsa")
    ) {

      return "A linked list is a linear data structure made of nodes. Each node usually contains two things: data and a pointer/reference to the next node. Unlike an array, linked-list elements do not need to be stored in contiguous memory. A good next step would be to understand insertion and deletion before moving to more advanced linked-list problems.";

    }


    if (
      message.includes("quiz") ||
      message.includes("question")
    ) {

      return "Let's start with Question 1: What is the main difference between an array and a linked list? Take your time and answer in your own words. I'll evaluate your answer and give you the next question.";

    }


    if (
      message.includes("plan") ||
      message.includes("study")
    ) {

      return "Here's a simple study structure for today: 45 minutes of DSA, a 10-minute break, 45 minutes of DBMS, another short break, and 30 minutes of revision. Focus on one topic at a time and finish each session with a few practice questions.";

    }


    if (
      message.includes("tip") ||
      message.includes("advice")
    ) {

      return "Try ending every study session with a 5-minute active recall. Close your notes and write down everything you remember. This helps you identify what you actually understand instead of only recognizing information while reading.";

    }


    return "That's a good question. I'm currently running in StudentOS demo mode, so my knowledge is limited to a few academic assistance flows. Once we connect the AI backend, I'll be able to answer a much wider range of questions and use your StudentOS data to personalize the response.";

  }


  /* ========================================
     SEND MESSAGE
     ======================================== */

  function sendMessage(message = input) {

    const trimmed =
      message.trim();


    if (!trimmed || isTyping) {
      return;
    }


    const userMessage = {
      id: Date.now(),
      type: "user",
      text: trimmed,
    };


    setMessages((current) => [
      ...current,
      userMessage,
    ]);


    setInput("");

    setIsTyping(true);


    setTimeout(() => {

      const response = {
        id: Date.now() + 1,
        type: "ai",
        text: generateResponse(trimmed),
      };


      setMessages((current) => [
        ...current,
        response,
      ]);


      setIsTyping(false);

    }, 900);

  }


  /* ========================================
     ENTER KEY
     ======================================== */

  function handleKeyDown(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }


  /* ========================================
     CLEAR CHAT
     ======================================== */

  function clearChat() {

    setMessages(initialMessages);

  }


  return (

    <section className="dashboard-content ai-page">


      {/* ========================================
          HEADER
          ======================================== */}

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
        >

          <Trash2 size={15} />

          Clear chat

        </button>

      </div>


      {/* ========================================
          AI LAYOUT
          ======================================== */}

      <div className="ai-layout">


        {/* ========================================
            CHAT
            ======================================== */}

        <div className="ai-chat-card">


          {/* Chat Header */}

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


          {/* Messages */}

          <div className="ai-messages">

            {messages.map((message) => (

              <div
                key={message.id}
                className={
                  `ai-message-row ${
                    message.type
                  }`
                }
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

                </div>


                {message.type === "user" && (

                  <div className="message-avatar user">

                    <User size={14} />

                  </div>

                )}

              </div>

            ))}


            {/* Typing */}

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


          {/* Input */}

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
              disabled={
                !input.trim() ||
                isTyping
              }
            >

              <Send size={17} />

            </button>

          </div>


          <div className="ai-input-hint">

            Press Enter to send · Shift + Enter for a new line

          </div>

        </div>


        {/* ========================================
            SIDE PANEL
            ======================================== */}

        <aside className="ai-side-panel">


          {/* Suggestions */}

          <div className="ai-side-card">

            <span className="card-label">
              QUICK ACTIONS
            </span>

            <h3>
              What can I help with?
            </h3>


            <div className="ai-suggestions">

              {suggestions.map((suggestion) => {

                const Icon =
                  suggestion.icon;

                return (

                  <button
                    key={suggestion.title}
                    className="ai-suggestion"
                    onClick={() =>
                      sendMessage(
                        suggestion.prompt
                      )
                    }
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


          {/* Context */}

          <div className="ai-context-card">

            <span className="card-label">
              CURRENT CONTEXT
            </span>

            <h3>
              Your Semester
            </h3>

            <div className="context-item">

              <span>
                Subjects
              </span>

              <strong>
                4
              </strong>

            </div>

            <div className="context-item">

              <span>
                Academic progress
              </span>

              <strong>
                72%
              </strong>

            </div>

            <div className="context-item">

              <span>
                Pending tasks
              </span>

              <strong>
                4
              </strong>

            </div>

          </div>


          {/* Disclaimer */}

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