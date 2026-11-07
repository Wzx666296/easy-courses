#!/usr/bin/env python3
"""Download public UIUC data and build site/data/courses.json.

Data sources (by Wade Fagen-Ulmschneider, https://github.com/wadefagen/datasets):
  - gpa/uiuc-gpa-dataset.csv     grade distribution per course section per term
  - geneds/gened-courses.csv     Gen Ed categories of current courses

Usage:
  python3 scripts/build_data.py              # use cached CSVs in data/raw/ if present
  python3 scripts/build_data.py --refresh    # re-download the CSVs first
  python3 scripts/build_data.py --since 2018 # change the first year counted (default 2021)
"""
import argparse
import csv
import json
import os
import urllib.request
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(ROOT, "data", "raw")
OUT_PATH = os.path.join(ROOT, "site", "data", "courses.json")

SOURCES = {
    "uiuc-gpa-dataset.csv": "https://raw.githubusercontent.com/wadefagen/datasets/main/gpa/uiuc-gpa-dataset.csv",
    "gened-courses.csv": "https://raw.githubusercontent.com/wadefagen/datasets/main/geneds/gened-courses.csv",
}

# Letter grade -> grade points (UIUC scale). W is excluded from GPA.
GRADE_POINTS = {
    "A+": 4.0, "A": 4.0, "A-": 3.67,
    "B+": 3.33, "B": 3.0, "B-": 2.67,
    "C+": 2.33, "C": 2.0, "C-": 1.67,
    "D+": 1.33, "D": 1.0, "D-": 0.67,
    "F": 0.0,
}
A_GRADES = ("A+", "A", "A-")
TERM_ORDER = {"Winter": 0, "Spring": 1, "Summer": 2, "Fall": 3}
GENED_COLS = ("ACP", "CS", "HUM", "NAT", "QR", "SBS")


def download(refresh):
    os.makedirs(RAW_DIR, exist_ok=True)
    for name, url in SOURCES.items():
        path = os.path.join(RAW_DIR, name)
        if refresh or not os.path.exists(path):
            print(f"Downloading {url}")
            urllib.request.urlretrieve(url, path)


def new_bucket():
    return {"grades": defaultdict(int), "w": 0, "terms": set(), "last": (0, 0, "")}


def add_row(bucket, row, term_key, term_label):
    for g in GRADE_POINTS:
        bucket["grades"][g] += int(row[g] or 0)
    bucket["w"] += int(row["W"] or 0)
    bucket["terms"].add(term_label)
    if term_key > bucket["last"][:2]:
        bucket["last"] = (*term_key, term_label)


def summarize(bucket):
    graded = sum(bucket["grades"].values())
    if graded == 0:
        return None
    points = sum(GRADE_POINTS[g] * n for g, n in bucket["grades"].items())
    a_count = sum(bucket["grades"][g] for g in A_GRADES)
    return {
        "gpa": round(points / graded, 2),
        "aRate": round(a_count / graded, 3),
        "wRate": round(bucket["w"] / (graded + bucket["w"]), 3),
        "students": graded,
        "terms": len(bucket["terms"]),
        "lastTerm": bucket["last"][2],
    }


def read_lines(path):
    """The source CSV is UTF-8 except for a few Latin-1 lines; decode per line."""
    with open(path, "rb") as f:
        for raw in f:
            try:
                yield raw.decode("utf-8")
            except UnicodeDecodeError:
                yield raw.decode("latin-1")


def load_geneds():
    geneds = {}
    for row in csv.DictReader(read_lines(os.path.join(RAW_DIR, "gened-courses.csv"))):
        tags = [row[c] for c in GENED_COLS if row.get(c)]
        if tags:
            geneds[row["Course"].strip()] = tags
    return geneds


def build(since):
    courses = {}
    for row in csv.DictReader(read_lines(os.path.join(RAW_DIR, "uiuc-gpa-dataset.csv"))):
        year = int(row["Year"])
        if year < since:
            continue
        code = f'{row["Subject"]} {row["Number"]}'
        term_key = (year, TERM_ORDER.get(row["Term"], 0))
        term_label = f'{row["Term"]} {year}'
        c = courses.get(code)
        if c is None:
            c = courses[code] = {
                "subject": row["Subject"],
                "number": row["Number"],
                "title": row["Course Title"],
                "titleTerm": term_key,
                "all": new_bucket(),
                "instructors": defaultdict(new_bucket),
            }
        if term_key >= c["titleTerm"]:  # keep the most recent title
            c["title"], c["titleTerm"] = row["Course Title"], term_key
        add_row(c["all"], row, term_key, term_label)
        instructor = (row["Primary Instructor"] or "").strip() or "(unknown)"
        add_row(c["instructors"][instructor], row, term_key, term_label)

    geneds = load_geneds()
    out = []
    for code, c in courses.items():
        stats = summarize(c["all"])
        if stats is None:
            continue
        instructors = []
        for name, b in c["instructors"].items():
            s = summarize(b)
            if s:
                instructors.append({"name": name, **s})
        instructors.sort(key=lambda s: (-s["gpa"], -s["students"]))
        out.append({
            "code": code,
            "subject": c["subject"],
            "number": c["number"],
            "title": c["title"],
            "geneds": geneds.get(code, []),
            **stats,
            "instructors": instructors,
        })
    out.sort(key=lambda c: (c["subject"], c["number"]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="re-download source CSVs")
    ap.add_argument("--since", type=int, default=2021, help="first year to include (default 2021)")
    args = ap.parse_args()

    download(args.refresh)
    courses = build(args.since)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    payload = {"since": args.since, "count": len(courses), "courses": courses}
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = os.path.getsize(OUT_PATH) // 1024
    print(f"Wrote {len(courses)} courses to {os.path.relpath(OUT_PATH, ROOT)} ({size_kb} KB)")


if __name__ == "__main__":
    main()
