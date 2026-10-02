import re


# =========================================================
# TEXT CLEANING
# =========================================================

def clean_text(text: str) -> str:
    if not text:
        return ""

    # Remove invisible Unicode characters commonly introduced
    # by PDF extraction.
    text = re.sub(
        r"[\u200b-\u200d\u2060\ufeff]",
        "",
        text,
    )

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)

    return text.strip()


# =========================================================
# PDF ARTIFACT CLEANING
# =========================================================

def remove_pdf_artifacts(text: str) -> str:
    if not text:
        return ""

    text = re.sub(
        r"[\u200b-\u200d\u2060\ufeff]",
        "",
        text,
    )

    # University header/footer
    text = re.sub(
        r"Vishwakarma Institute of Technology.*?"
        r"Computer Engineering Syllabus- AY 2026-27",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Page numbers
    text = re.sub(
        r"\bPage\s+\d+\b",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Section 2 headings
    text = re.sub(
        r"\bSection\s*2\s*:\s*Topics\s*/?\s*Contents\b",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\bSection\s*2\s*:\s*Topics/Contents\b",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\bSection\s*2\s*:\s*Non\s*-\s*Linear\s*Data\s*Structures\b",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Laboratory/tutorial sections
    text = re.sub(
        r"\bSyllabus\s*Laboratory\b",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\bSyllabus\s*Tutorials?\b",
        "",
        text,
        flags=re.IGNORECASE,
    )

    return text


# =========================================================
# PDF WORD / SPACING CLEANUP
# =========================================================

def normalize_pdf_spacing(text: str) -> str:
    """
    Fix common PDF extraction artifacts.

    Important:
    This function may collapse whitespace because it is intended
    for individual pieces of text such as topics/course names.
    It should NOT be used on the complete document before
    course extraction.
    """

    if not text:
        return ""

    text = re.sub(
        r"[\u200b-\u200d\u2060\ufeff]",
        "",
        text,
    )

    # -----------------------------------------------------
    # Split-word artifacts
    # -----------------------------------------------------

    replacements = {
        "Rec ursion": "Recursion",
        "rec ursion": "recursion",

        "Abst raction": "Abstraction",
        "abst raction": "abstraction",

        "Funct ions": "Functions",
        "funct ions": "functions",

        "Execut ion": "Execution",
        "execut ion": "execution",

        "proper ties": "properties",
        "Proper ties": "Properties",

        "Prin ciples": "Principles",
        "prin ciples": "principles",

        "Mul tiple": "Multiple",
        "mul tiple": "multiple",

        "Chara cteristics": "Characteristics",
        "chara cteristics": "characteristics",

        "Partitionin g": "Partitioning",
        "partitionin g": "partitioning",

        "Ass urance": "Assurance",
        "ass urance": "assurance",

        "Provin g": "Proving",
        "provin g": "proving",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # -----------------------------------------------------
    # Known missing-space artifacts
    # -----------------------------------------------------

    spacing_replacements = {
        "ProgrammingandSOLID":
            "Programming and SOLID",

        "Programmingand":
            "Programming and",

        "programmingand":
            "programming and",

        "GenericProgrammingand":
            "Generic Programming and",

        "ofa Transaction":
            "of a Transaction",

        "ofa transaction":
            "of a transaction",

        "andRun Time":
            "and Run Time",

        "andRun-Time":
            "and Run-Time",

        "withAnalysis":
            "with Analysis",

        "withanalysis":
            "with analysis",

        "withUsing":
            "with Using",

        "usingUMLtools":
            "using UML tools",

        "usingUML":
            "using UML",

        "applicationsusing":
            "applications using",

        "Applicationsof":
            "Applications of",

        "applicationsof":
            "applications of",

        "Typesof":
            "Types of",

        "typesof":
            "types of",

        "Timeand":
            "Time and",

        "timeand":
            "time and",

        "Spaceand":
            "Space and",

        "spaceand":
            "space and",

        "practicalapplications":
            "practical applications",

        "I/OBuffering":
            "I/O Buffering",

        "ofIOT":
            "of IoT",

        "IOT":
            "IoT",
    }

    for old, new in spacing_replacements.items():
        text = text.replace(old, new)

    # -----------------------------------------------------
    # Technical terms
    # -----------------------------------------------------

    technical_replacements = {
        "De -multiplexers":
            "Demultiplexers",

        "De-multiplexers":
            "Demultiplexers",

        "EX -OR":
            "EX-OR",

        "EX -NOR":
            "EX-NOR",

        "Non -Linear":
            "Non-Linear",

        "Non -linear":
            "Non-linear",

        "Non -Regular":
            "Non-Regular",

        "Non -deterministic":
            "Non-deterministic",

        "C -SCAN":
            "C-SCAN",

        "2 -colorable":
            "2-colorable",

        "B -Tree":
            "B-Tree",

        "B + Tree":
            "B+ Tree",

        "Multi -valued":
            "Multi-valued",

        "High -level":
            "High-level",

        "Hands- on":
            "Hands-on",

        "Two -way":
            "Two-way",

        "One-wayinfinite":
            "One-way infinite",
    }

    for old, new in technical_replacements.items():
        text = text.replace(old, new)

    # -----------------------------------------------------
    # Known VIT artifact
    # -----------------------------------------------------

    text = re.sub(
        r"Heapsort\s*,\s*leftlist",
        "Heapsort",
        text,
        flags=re.IGNORECASE,
    )

    # =====================================================
    # CRITICAL PHRASE FIX
    # =====================================================
    #
    # Handle the COMPLETE phrase instead of separately
    # repairing "of" and "Single".
    #
    # Examples:
    #
    # application ofSingle and ...
    # application ofsingle and ...
    # application of Single and ...
    # application of    Single and ...
    #
    # ALL become:
    #
    # application of Single and ...
    # =====================================================

    text = re.sub(
        r"application\s+of[\s\u200b-\u200d\u2060\ufeff]*single\s*and\s*",
        "application of Single and ",
        text,
        flags=re.IGNORECASE,
    )

    # Safety case for the phrase without "application"
    text = re.sub(
        r"\bof[\s\u200b-\u200d\u2060\ufeff]*single\s*and\s*",
        "of Single and ",
        text,
        flags=re.IGNORECASE,
    )

    # Handle standalone "ofSingle"
    text = re.sub(
        r"\bof[\s\u200b-\u200d\u2060\ufeff]*single\b",
        "of Single",
        text,
        flags=re.IGNORECASE,
    )

    # -----------------------------------------------------
    # Punctuation spacing
    # -----------------------------------------------------

    text = re.sub(
        r"\s*,\s*",
        ", ",
        text,
    )

    text = re.sub(
        r"\s+\.\s*",
        ". ",
        text,
    )

    text = re.sub(
        r"\s*:\s*",
        ": ",
        text,
    )

    # Collapse whitespace only inside this text fragment.
    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


# =========================================================
# TOPIC NORMALIZATION
# =========================================================

def normalize_topic(topic: str) -> str:

    if not topic:
        return ""

    topic = remove_pdf_artifacts(
        topic
    )

    # Normalize PDF spacing.
    topic = normalize_pdf_spacing(
        topic
    )

    # Remove accidental section heading.
    topic = re.sub(
        r"Section\s*2\s*:\s*Non\s*-\s*Linear\s*Data\s*Structures",
        "",
        topic,
        flags=re.IGNORECASE,
    )

    # Remove Heapsort artifact.
    topic = re.sub(
        r"Heapsort\s*,\s*leftlist",
        "Heapsort",
        topic,
        flags=re.IGNORECASE,
    )

    # -----------------------------------------------------
    # FINAL COMPLETE-PHRASE FIX
    # -----------------------------------------------------

    topic = re.sub(
        r"application\s+of[\s\u200b-\u200d\u2060\ufeff]*single\s*and\s*",
        "application of Single and ",
        topic,
        flags=re.IGNORECASE,
    )

    topic = re.sub(
        r"\bof[\s\u200b-\u200d\u2060\ufeff]*single\s*and\s*",
        "of Single and ",
        topic,
        flags=re.IGNORECASE,
    )

    # Final cleanup of accidental "Singleand".
    topic = re.sub(
        r"\bSingleand\b",
        "Single and",
        topic,
        flags=re.IGNORECASE,
    )

    # Remove invisible characters.
    topic = re.sub(
        r"[\u200b-\u200d\u2060\ufeff]",
        "",
        topic,
    )

    # Normalize whitespace.
    topic = re.sub(
        r"\s+",
        " ",
        topic,
    )

    topic = topic.strip(
        " ,.;:-"
    )

    return topic


# =========================================================
# FRAGMENT MERGING
# =========================================================

def merge_topic_fragments(
    topics: list[str],
) -> list[str]:

    if not topics:
        return []

    merged = []

    continuation_starters = (
        "and ",
        "or ",
        "with ",
        "of ",
        "for ",
        "to ",
        "using ",
        "via ",
        "by ",
        "from ",
        "in ",
        "on ",
    )

    for topic in topics:

        topic = normalize_topic(
            topic
        )

        if not topic:
            continue

        lowered = topic.lower()

        if lowered.startswith(
            "section 2"
        ):
            continue

        if lowered in {
            "topics/contents",
            "syllabus",
            "syllabus laboratory",
            "syllabus tutorial",
            "syllabus tutorials",
            "non-linear data structures",
        }:
            continue

        # Merge continuation fragments.
        if (
            merged
            and lowered.startswith(
                continuation_starters
            )
        ):
            merged[-1] = normalize_topic(
                merged[-1]
                + " "
                + topic
            )
            continue

        merged.append(topic)

    # Final pass.
    cleaned = []

    for topic in merged:

        topic = normalize_topic(
            topic
        )

        if topic:
            cleaned.append(topic)

    return cleaned


# =========================================================
# COURSE EXTRACTION
# =========================================================

def extract_course_sections(
    text: str,
) -> list[dict]:

    # IMPORTANT:
    # Preserve line breaks here.
    text = clean_text(text)

    course_pattern = re.compile(
        r"\b([A-Z]{2,5}\d{4})\s*:\s*([^\n]+)",
        re.IGNORECASE,
    )

    matches = list(
        course_pattern.finditer(text)
    )

    courses = []

    for index, match in enumerate(matches):

        course_code = (
            match.group(1)
            .upper()
            .strip()
        )

        course_name = normalize_pdf_spacing(
            match.group(2).strip()
        )

        start = match.end()

        if index + 1 < len(matches):
            end = matches[
                index + 1
            ].start()
        else:
            end = len(text)

        section_text = text[
            start:end
        ].strip()

        if not re.search(
            r"\bUnit\s+\d+\s*:?\s*",
            section_text,
            re.IGNORECASE,
        ):
            continue

        courses.append(
            {
                "course_code": course_code,
                "course_name": course_name,
                "text": section_text,
            }
        )

    return courses


# =========================================================
# UNIT NAME CLEANING
# =========================================================

def clean_unit_name(
    unit_name: str,
) -> str:

    unit_name = normalize_pdf_spacing(
        unit_name
    )

    unit_name = re.sub(
        r"\s+",
        " ",
        unit_name,
    ).strip()

    return unit_name.strip(
        " :.-"
    )


# =========================================================
# UNIT EXTRACTION
# =========================================================

def extract_units(
    course_text: str,
) -> list[dict]:

    unit_pattern = re.compile(
        r"""
        \bUnit\s+
        (\d+)
        \s*:?\s*
        (.+?)
        \s*
        \(\s*
        (\d+)
        \s*Hours?
        \s*\)
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    matches = list(
        unit_pattern.finditer(
            course_text
        )
    )

    units = []

    for index, match in enumerate(matches):

        unit_number = int(
            match.group(1)
        )

        unit_name = clean_unit_name(
            match.group(2)
        )

        hours = int(
            match.group(3)
        )

        start = match.end()

        if index + 1 < len(matches):
            end = matches[
                index + 1
            ].start()
        else:
            end = len(course_text)

        content = course_text[
            start:end
        ].strip()

        # Stop at non-theory sections.
        stop_markers = [
            "Syllabus Laboratory",
            "Syllabus Lab",
            "Syllabus Tutorials",
            "Syllabus Tutorial",
            "List of Experiments",
            "List of Tutorials",
            "Course Project",
            "List of Course Projects",
            "CO-PO Mapping",
        ]

        for marker in stop_markers:

            position = content.lower().find(
                marker.lower()
            )

            if position != -1:
                content = content[
                    :position
                ].strip()

        topics = split_topics(
            content
        )

        units.append(
            {
                "unit_number": unit_number,
                "unit_name": unit_name,
                "hours": hours,
                "topics": topics,
            }
        )

    return units


# =========================================================
# TOPIC EXTRACTION
# =========================================================

def split_topics(
    content: str,
) -> list[str]:

    if not content:
        return []

    content = remove_pdf_artifacts(
        content
    )

    content = normalize_pdf_spacing(
        content
    )

    # Remove PDF line breaks while preserving words.
    content = re.sub(
        r"\s*\n\s*",
        " ",
        content,
    )

    content = re.sub(
        r"\s+",
        " ",
        content,
    ).strip()

    if not content:
        return []

    # -----------------------------------------------------
    # Protect parenthetical expressions
    # -----------------------------------------------------

    protected = []
    counter = 0

    def protect_parentheses(match):

        nonlocal counter

        token = (
            f"__PAREN_{counter}__"
        )

        protected.append(
            (
                token,
                match.group(0),
            )
        )

        counter += 1

        return token

    content = re.sub(
        r"\([^()]*\)",
        protect_parentheses,
        content,
    )

    # -----------------------------------------------------
    # Semicolon separator
    # -----------------------------------------------------

    content = re.sub(
        r"\s*;\s*",
        "|||",
        content,
    )

    # -----------------------------------------------------
    # Full stop before new topic
    # -----------------------------------------------------

    content = re.sub(
        r"\.\s+(?=[A-Z][A-Za-z])",
        "|||",
        content,
    )

    # -----------------------------------------------------
    # Comma-based topic boundaries
    # -----------------------------------------------------

    content = re.sub(
        r",\s+(?=[A-Z][A-Za-z0-9\-& ]{1,60})",
        "|||",
        content,
    )

    # Lowercase continuation phrases.
    content = re.sub(
        r",\s+(?=(?:and|or|of|for|to|using|with|via|by|from|in|on)\s+)",
        "|||",
        content,
        flags=re.IGNORECASE,
    )

    # Restore parentheses.
    for token, value in protected:
        content = content.replace(
            token,
            value,
        )

    raw_topics = content.split(
        "|||"
    )

    topics = []

    for raw_topic in raw_topics:

        topic = normalize_topic(
            raw_topic
        )

        if not topic:
            continue

        topics.append(topic)

    return merge_topic_fragments(
        topics
    )


# =========================================================
# MAIN PARSER
# =========================================================

def parse_syllabus(
    text: str,
) -> dict:

    if not text:
        return {
            "course_count": 0,
            "courses": [],
        }

    # IMPORTANT:
    #
    # Do NOT call normalize_pdf_spacing() on the complete
    # document here because that collapses newlines.
    #
    # Course extraction depends on those newlines.
    #
    text = clean_text(text)
    text = remove_pdf_artifacts(text)

    courses = extract_course_sections(
        text
    )

    parsed_courses = []

    for course in courses:

        units = extract_units(
            course["text"]
        )

        if not units:
            continue

        parsed_courses.append(
            {
                "course_code": course[
                    "course_code"
                ],
                "course_name": course[
                    "course_name"
                ],
                "units": units,
            }
        )

    return {
        "course_count": len(
            parsed_courses
        ),
        "courses": parsed_courses,
    }