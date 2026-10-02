from syllabus_parser import (
    parse_syllabus,
    split_topics,
    normalize_topic,
    merge_topic_fragments,
)


sample_content = """
Asymptotic Notations, Time and Space Complexity Introduction,
Memory Representation and application ofSingle and Multidimensional arrays,
Sparse Matrix: Simple & Fast Transpose,
Recursion,
sorting techniques: Merge Sort, Quick Sort with Analysis and passes
"""


print("\n========================================")
print("STUDENTOS PARSER PIPELINE DEBUG")
print("========================================\n")


# =========================================================
# TEST 1 — NORMALIZE ORIGINAL PHRASE
# =========================================================

bad_topic = (
    "Memory Representation and "
    "application ofSingle and Multidimensional arrays"
)

print("TEST 1: normalize_topic()")
print("----------------------------------------")

normalized = normalize_topic(bad_topic)

print("Original:")
print(repr(bad_topic))

print("\nNormalized:")
print(repr(normalized))

print("\nVisible output:")
print(normalized)


# =========================================================
# TEST 2 — SPLIT TOPICS
# =========================================================

print("\n========================================")
print("TEST 2: split_topics()")
print("========================================\n")

print("Input:")
print(sample_content)

split_result = split_topics(sample_content)

print("\nTopics returned by split_topics():\n")

for index, topic in enumerate(split_result, start=1):
    print(f"{index}. {repr(topic)}")
    print(f"   Visible: {topic}")


# =========================================================
# TEST 3 — MERGE TOPIC FRAGMENTS
# =========================================================

print("\n========================================")
print("TEST 3: merge_topic_fragments()")
print("========================================\n")

merged_result = merge_topic_fragments(
    split_result
)

print("Topics after merge:\n")

for index, topic in enumerate(
    merged_result,
    start=1
):
    print(f"{index}. {repr(topic)}")
    print(f"   Visible: {topic}")


# =========================================================
# TEST 4 — FULL PARSER
# =========================================================

print("\n========================================")
print("TEST 4: FULL PARSER")
print("========================================\n")


sample_text = """
CS2305: Data Structures-I

Syllabus

Theory

Section 1: Linear Data Structures

Unit 1: Arrays (7 Hours)

Asymptotic Notations, Time and Space Complexity Introduction,
Memory Representation and application ofSingle and Multidimensional arrays,
Sparse Matrix: Simple & Fast Transpose,
Recursion,
sorting techniques: Merge Sort, Quick Sort with Analysis and passes

Unit 2: Linked Lists (7 Hours)

Pointers, fast and slow pointers, two pointer techniques,
Dynamic memory allocation, Singly Linked Lists,
Doubly linked Lists, Circular linked lists,
Applications of Linked list, Vectors & Applications,
Hashing techniques, Hash table, Hash functions.
"""


result = parse_syllabus(
    sample_text
)

print(
    "Courses detected:",
    result["course_count"]
)

for course in result["courses"]:

    print("\nCourse:")
    print(
        f"  Code: {course['course_code']}"
    )
    print(
        f"  Name: {course['course_name']}"
    )

    for unit in course["units"]:

        print("\n  Unit:")
        print(
            f"    Number: {unit['unit_number']}"
        )
        print(
            f"    Name: {unit['unit_name']}"
        )
        print(
            f"    Hours: {unit['hours']}"
        )

        print("    Topics:")

        for index, topic in enumerate(
            unit["topics"],
            start=1
        ):

            print(
                f"      {index}. {repr(topic)}"
            )


# =========================================================
# TEST 5 — EXACT ARTIFACT CHECK
# =========================================================

print("\n========================================")
print("TEST 5: EXACT ARTIFACT CHECK")
print("========================================\n")

found = False

for course in result["courses"]:

    for unit in course["units"]:

        for topic in unit["topics"]:

            if "ofSingle" in topic:
                found = True

                print(
                    "❌ FOUND EXACT 'ofSingle':"
                )

                print(
                    repr(topic)
                )

            if "Singleand" in topic:
                found = True

                print(
                    "❌ FOUND EXACT 'Singleand':"
                )

                print(
                    repr(topic)
                )


if not found:

    print(
        "✅ No exact 'ofSingle' or "
        "'Singleand' strings found."
    )


print("\n========================================")
print("DEBUG COMPLETE")
print("========================================")