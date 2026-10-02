from pathlib import Path

from pypdf import PdfReader

from syllabus_parser import parse_syllabus


# ---------------------------------------------------------
# ACTUAL SYLLABUS PDF
# ---------------------------------------------------------

PDF_PATH = Path(
    r"C:\Users\reyas\OneDrive\Desktop\2. Syllabus_SY CS_AY2026-27_V3.pdf"
)


def extract_pdf_text(pdf_path: Path) -> str:
    """
    Extract all readable text from the PDF.
    """

    if not pdf_path.exists():
        raise FileNotFoundError(
            f"PDF not found:\n{pdf_path}\n\n"
            "Please check the PDF location."
        )

    print("\nReading PDF...")
    print(f"File: {pdf_path.name}")

    reader = PdfReader(str(pdf_path))

    print(f"Pages: {len(reader.pages)}")

    pages = []

    for page_number, page in enumerate(reader.pages, start=1):

        page_text = page.extract_text()

        if page_text:
            pages.append(page_text)

        if page_number % 10 == 0:
            print(f"Processed {page_number} pages...")

    text = "\n\n".join(pages)

    print(f"\nExtracted characters: {len(text):,}")

    return text


def print_parsed_result(result: dict):
    """
    Display the parsed syllabus in a readable format.
    """

    print("\n")
    print("=" * 70)
    print("STUDENTOS — REAL SYLLABUS PARSER TEST")
    print("=" * 70)

    print(f"\nCourses detected: {result['course_count']}")

    for course_index, course in enumerate(
        result["courses"],
        start=1
    ):

        print("\n" + "-" * 70)

        print(
            f"COURSE {course_index}: "
            f"{course['course_code']} — "
            f"{course['course_name']}"
        )

        print("-" * 70)

        print(f"Units detected: {len(course['units'])}")

        for unit in course["units"]:

            print(
                f"\n  Unit {unit['unit_number']}: "
                f"{unit['unit_name']} "
                f"({unit['hours']} Hours)"
            )

            print(
                f"  Topics detected: "
                f"{len(unit['topics'])}"
            )

            for topic_number, topic in enumerate(
                unit["topics"],
                start=1
            ):
                print(
                    f"      {topic_number}. {topic}"
                )


def main():

    try:

        # -------------------------------------------------
        # STEP 1 — Extract PDF text
        # -------------------------------------------------

        text = extract_pdf_text(PDF_PATH)

        if not text.strip():
            print("\n❌ No readable text was extracted.")
            return

        # -------------------------------------------------
        # STEP 2 — Parse syllabus
        # -------------------------------------------------

        print("\nParsing syllabus structure...")

        result = parse_syllabus(text)

        # -------------------------------------------------
        # STEP 3 — Display result
        # -------------------------------------------------

        print_parsed_result(result)

        # -------------------------------------------------
        # STEP 4 — Final summary
        # -------------------------------------------------

        total_units = sum(
            len(course["units"])
            for course in result["courses"]
        )

        total_topics = sum(
            len(unit["topics"])
            for course in result["courses"]
            for unit in course["units"]
        )

        print("\n")
        print("=" * 70)
        print("PARSER SUMMARY")
        print("=" * 70)

        print(f"Courses: {result['course_count']}")
        print(f"Units:   {total_units}")
        print(f"Topics:  {total_topics}")

        print("=" * 70)
        print("REAL PDF PARSER TEST COMPLETE")
        print("=" * 70)

    except FileNotFoundError as error:

        print("\n❌ FILE ERROR")
        print(error)

    except Exception as error:

        print("\n❌ PARSER TEST FAILED")
        print(type(error).__name__)
        print(error)


if __name__ == "__main__":
    main()