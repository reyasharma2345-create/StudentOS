import { useState } from "react";
import {
  Search,
  BookOpen,
  ExternalLink,
  Users,
  CalendarDays,
  Quote,
  Loader2,
  AlertCircle,
  FileText,
  Sparkles,
} from "lucide-react";
import "./ResearchHub.css";

function ResearchHub() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchResearch = async (event) => {
    event?.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError("Please enter a research topic or keyword.");
      setResults([]);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/research?query=${encodeURIComponent(
          trimmedQuery
        )}&limit=10`
      );

      if (!response.ok) {
        let message = "Unable to fetch research papers.";

        try {
          const errorData = await response.json();

          if (errorData?.detail) {
            message = errorData.detail;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      const data = await response.json();

      setResults(data.results || []);
      setSearchedQuery(data.query || trimmedQuery);

      if (!data.results || data.results.length === 0) {
        setError(
          `No research papers found for "${trimmedQuery}". Try different keywords.`
        );
      }
    } catch (searchError) {
      console.error("Research search failed:", searchError);

      setError(
        searchError.message ||
          "Something went wrong while searching for research papers."
      );

      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion) => {
    setQuery(suggestion);
  };

  const formatAuthors = (authors) => {
    if (!authors || authors.length === 0) {
      return "Authors unavailable";
    }

    if (authors.length <= 3) {
      return authors.join(", ");
    }

    return `${authors.slice(0, 3).join(", ")} + ${
      authors.length - 3
    } more`;
  };

  const getPaperLink = (paper) => {
    if (paper.doi) {
      return paper.doi.startsWith("http")
        ? paper.doi
        : `https://doi.org/${paper.doi.replace(
            "https://doi.org/",
            ""
          )}`;
    }

    return paper.id || null;
  };

  const formatAbstract = (abstract) => {
    if (!abstract || !abstract.trim()) {
      return "No abstract is available for this paper.";
    }

    return abstract.trim();
  };

  return (
    <div className="research-page">
      {/* HEADER */}
      <header className="research-header">
        <div>
          <div className="eyebrow">RESEARCH HUB</div>

          <h1>Explore Research</h1>

          <p>
            Discover academic papers and research studies using OpenAlex.
          </p>
        </div>
      </header>

      {/* SEARCH CARD */}
      <section className="research-search-card">
        <div className="research-search-heading">
          <div className="research-search-icon">
            <Sparkles size={19} />
          </div>

          <div>
            <h2>Search academic literature</h2>

            <p>
              Search by topic, technology, research problem, or keyword.
            </p>
          </div>
        </div>

        <form
          className="research-search-form"
          onSubmit={searchResearch}
        >
          <div className="research-input-wrapper">
            <Search size={18} />

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. AI in healthcare, phishing detection, machine learning..."
              aria-label="Research topic"
            />
          </div>

          <button
            type="submit"
            className="research-search-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="research-spinner" />
                Searching...
              </>
            ) : (
              <>
                <Search size={16} />
                Search
              </>
            )}
          </button>
        </form>

        {/* SUGGESTIONS */}
        <div className="research-suggestions">
          <span>Try:</span>

          <button
            type="button"
            onClick={() =>
              handleSuggestion("artificial intelligence education")
            }
          >
            AI in education
          </button>

          <button
            type="button"
            onClick={() =>
              handleSuggestion("cybersecurity phishing detection")
            }
          >
            Phishing detection
          </button>

          <button
            type="button"
            onClick={() =>
              handleSuggestion("large language models")
            }
          >
            Large language models
          </button>

          <button
            type="button"
            onClick={() =>
              handleSuggestion("student learning analytics")
            }
          >
            Learning analytics
          </button>
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div className="research-error">
          <AlertCircle size={17} />

          <span>{error}</span>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="research-loading">
          <Loader2 size={24} className="research-spinner" />

          <h3>Searching research literature...</h3>

          <p>
            Finding relevant academic works through OpenAlex.
          </p>
        </div>
      )}

      {/* RESULTS */}
      {!loading && results.length > 0 && (
        <section className="research-results-section">
          <div className="research-results-header">
            <div>
              <div className="eyebrow">SEARCH RESULTS</div>

              <h2>
                Research for{" "}
                <span>“{searchedQuery}”</span>
              </h2>
            </div>

            <div className="research-result-count">
              {results.length} papers
            </div>
          </div>

          <div className="research-results-list">
            {results.map((paper, index) => {
              const paperLink = getPaperLink(paper);

              return (
                <article
                  className="research-paper-card"
                  key={paper.id || `${paper.title}-${index}`}
                >
                  {/* PAPER NUMBER */}
                  <div className="research-paper-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="research-paper-content">
                    {/* TITLE */}
                    <div className="research-paper-title-row">
                      <div className="research-paper-type">
                        <FileText size={13} />

                        {paper.type || "Research work"}
                      </div>

                      {paper.open_access && (
                        <span className="research-open-access">
                          Open Access
                        </span>
                      )}
                    </div>

                    <h3>{paper.title || "Untitled research paper"}</h3>

                    {/* AUTHORS */}
                    <div className="research-paper-authors">
                      <Users size={14} />

                      <span>
                        {formatAuthors(paper.authors)}
                      </span>
                    </div>

                    {/* META */}
                    <div className="research-paper-meta">
                      <span>
                        <CalendarDays size={13} />

                        {paper.publication_year ||
                          "Year unavailable"}
                      </span>

                      <span>
                        <Quote size={13} />

                        {paper.cited_by_count || 0} citations
                      </span>
                    </div>

                    {/* ABSTRACT */}
                    <div className="research-abstract">
                      <div className="research-abstract-label">
                        <BookOpen size={13} />

                        <span>Abstract</span>
                      </div>

                      <p>
                        {formatAbstract(paper.abstract)}
                      </p>
                    </div>

                    {/* ACTION */}
                    {paperLink && (
                      <div className="research-paper-actions">
                        <a
                          href={paperLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="research-paper-link"
                        >
                          Read paper
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* INITIAL STATE */}
      {!loading &&
        !error &&
        results.length === 0 &&
        !searchedQuery && (
          <section className="research-empty-state">
            <div className="research-empty-icon">
              <BookOpen size={28} />
            </div>

            <div className="eyebrow">ACADEMIC DISCOVERY</div>

            <h2>Start exploring research</h2>

            <p>
              Search for a topic to discover academic papers,
              authors, publication years, citations, abstracts,
              and open-access research.
            </p>
          </section>
        )}
    </div>
  );
}

export default ResearchHub;