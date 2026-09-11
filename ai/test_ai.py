from .analyzer import analyze_incident_with_score


TEST_REPORT = """
There is a huge fire in a three-floor apartment building.
Several people are trapped inside and the road outside
the building is completely blocked.
"""


def main():

    print("\n" + "=" * 55)
    print("             CRISISIQ AI TEST")
    print("=" * 55)

    print("\nIncident:")
    print(TEST_REPORT)

    print("\nSending report to Gemini...\n")

    result = analyze_incident_with_score(TEST_REPORT)

    print("=" * 55)
    print("AI ANALYSIS")
    print("=" * 55)

    for key, value in result.items():
        print(f"\n{key}: {value}")

    print("\n" + "=" * 55)


if __name__ == "__main__":
    main()