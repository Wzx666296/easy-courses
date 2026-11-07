#!/usr/bin/env python3
"""Build the Spring 2027 shortlist page data.

Inputs:
  data/spring2027/courses.csv   our course shortlist (code, Chinese name) — edit this to add/remove courses
  WAF "Grade Disparities and Accolades by Instructor" final.csv  (grade stats per instructor x course)
  Course Explorer API, Spring 2027 schedule                      (who teaches which section, online/in person)

Outputs:
  site/data/spring2027.json            used by site/spring2027.html
  data/spring2027/courses-checked.csv  same data as a spreadsheet, for checking by hand

Usage:
  python3 scripts/build_spring2027.py            # use cached downloads in data/raw/
  python3 scripts/build_spring2027.py --refresh  # re-download WAF data and Course Explorer schedules
"""
import argparse
import csv
import json
import os
import re
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
LIST_PATH = os.path.join(ROOT, "data", "spring2027", "courses.csv")
JSON_OUT = os.path.join(ROOT, "site", "data", "spring2027.json")
CSV_OUT = os.path.join(ROOT, "data", "spring2027", "courses-checked.csv")

TERM_LABEL = "Spring 2027"
WAF_PAGE = "https://waf.cs.illinois.edu/visualizations/Grade-Disparities-and-Accolades-by-Instructor/"
WAF_CSV_URL = WAF_PAGE + "final.csv"
CE_URL = "https://courses.illinois.edu/cisapp/explorer/schedule/2027/spring/{subj}/{num}.xml?mode=detail"
LECTURE_TYPES = {"Lecture", "Lecture-Discussion", "Online Lecture"}


def fetch(url, path, refresh):
    """Download url to path (cached). Returns False on HTTP 404."""
    missing = path + ".404"
    if not refresh and os.path.exists(path):
        return True
    if not refresh and os.path.exists(missing):
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        urllib.request.urlretrieve(url, path)
        if os.path.exists(missing):
            os.remove(missing)
        return True
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
        open(missing, "w").close()
        if os.path.exists(path):
            os.remove(path)
        return False


def load_waf(refresh):
    path = os.path.join(RAW, "waf-final.csv")
    fetch(WAF_CSV_URL, path, refresh)
    by_course = defaultdict(list)
    with open(path, encoding="utf-8", errors="replace", newline="") as f:
        for r in csv.DictReader(f):
            by_course[r["course"].split(":")[0].strip()].append(r)
    return by_course


def num(r, k):
    return float(r[k] or 0)


def grade_stats(rows):
    """Student-weighted stats over WAF rows (one row = one instructor x course name)."""
    n = sum(num(r, "num_students") for r in rows)
    if not n:
        return None
    avg = lambda fn: sum(fn(r) * num(r, "num_students") for r in rows) / n
    return {
        "aRate": round(avg(lambda r: num(r, "A+") + num(r, "A")), 4),
        "aRateInclMinus": round(avg(lambda r: num(r, "A+") + num(r, "A") + num(r, "A-")), 4),
        "gpa": round(avg(lambda r: num(r, "avg_gpa")), 2),
        "students": int(n),
        "semesters": sum(int(r["num_semesters"] or 0) for r in rows),
    }


def load_schedule(code, refresh):
    subj, number = code.split()
    path = os.path.join(RAW, "course-explorer-2027sp", f"{subj}_{number}.xml")
    if not fetch(CE_URL.format(subj=subj, num=number), path, refresh):
        return None
    if refresh:
        time.sleep(0.2)  # be polite to the API
    return ET.parse(path).getroot()


def teachers_from_schedule(root):
    """Map (last, first) -> sections/modes/meeting types from a Course Explorer course."""
    out = {}
    for s in root.iter("detailedSection"):
        sec, part = s.findtext("sectionNumber"), s.findtext("partOfTerm")
        half = {"A": "前八周", "B": "后八周"}.get(part, "")
        for m in s.iter("meeting"):
            t = m.find("type")
            mtype = (t.text or "") if t is not None else ""
            mode = "线上" if "Online" in mtype else "线下"
            for i in m.iter("instructor"):
                key = ((i.get("lastName") or "").strip(), (i.get("firstName") or "").strip())
                d = out.setdefault(key, {"sections": set(), "modes": set(), "types": set()})
                d["sections"].add(sec)
                d["modes"].add(mode + (f"·{half}" if half else ""))
                d["types"].add(mtype)
    return out


def build(refresh):
    waf = load_waf(refresh)
    with open(LIST_PATH, encoding="utf-8", newline="") as f:
        shortlist = list(csv.DictReader(f))

    courses = []
    for item in shortlist:
        code, zh = item["code"].strip(), item["zh"].strip()
        rows = waf.get(code, [])
        course = {"code": code, "zh": zh, "title": "", "geneds": [], "offered": False,
                  "overall": grade_stats(rows), "teachers": []}
        root = load_schedule(code, refresh)
        if root is None:
            course["status"] = f"{TERM_LABEL} 不开课"
            courses.append(course)
            continue
        course["offered"] = True
        course["title"] = root.findtext("label") or ""
        course["geneds"] = [a.text.replace("–", "-").strip() for a in root.iter("genEdAttribute")]
        course["genedCodes"] = [a.get("code").lstrip("1") for a in root.iter("genEdAttribute")]

        sched = teachers_from_schedule(root)
        course["status"] = "已开课" if sched else "已开课，老师未公布"
        for (last, first), d in sched.items():
            same_last = [r for r in rows if r["instructor"].lower() == last.lower()]
            matched = [r for r in same_last if first and r["instructor_first_initial"].upper() == first[0].upper()]
            notes = []
            # Course Explorer sometimes uses a nickname initial (e.g. "B" for Elizabeth).
            if not matched and len(same_last) == 1 and sum(1 for k in sched if k[0].lower() == last.lower()) == 1:
                matched = same_last
                notes.append(f"按姓氏匹配（WAF 名为 {same_last[0]['instructor_first_name']}）")
            stats = grade_stats(matched)
            if stats is None:
                notes.append("WAF 无此老师教这门课的记录")
            elif stats["students"] < 100:
                notes.append(f"样本小（{stats['students']} 人）")
            name = f"{matched[0]['instructor_first_name']} {matched[0]['instructor']}" if matched else f"{first} {last}".strip()
            # Discussion/TA sections: meeting type says so, or section numbers look like AD1 / BDA.
            looks_like_discussion = (d["types"] <= {"Discussion/Recitation"}
                                     or all(re.fullmatch(r"[A-Z]D[A-Z0-9]", s or "") for s in d["sections"]))
            role = "讨论课" if not (d["types"] & LECTURE_TYPES) and looks_like_discussion else "主讲"
            course["teachers"].append({
                "name": name, "role": role, "modes": sorted(d["modes"]),
                "sections": len(d["sections"]), "stats": stats, "notes": notes,
            })
        course["teachers"].sort(key=lambda t: (t["role"] != "主讲", t["stats"] is None,
                                               -(t["stats"] or {}).get("aRate", 0)))
        courses.append(course)
    return courses


def pct(x):
    return "" if x is None else f"{x * 100:.1f}%"


def write_csv(courses):
    hdr = ["课号", "中文名", "英文名", "Gen Ed", "状态", "老师", "角色", "形式", "section 数",
           "A率(A+/A)", "A率(含A-)", "GPA", "学生数", "学期数",
           "整门课A率", "整门课A率(含A-)", "整门课GPA", "整门课学生数", "备注"]
    with open(CSV_OUT, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(hdr)
        for c in courses:
            o = c["overall"] or {}
            base = [c["code"], c["zh"], c["title"], ", ".join(c.get("genedCodes", [])), c["status"]]
            tail = [pct(o.get("aRate")), pct(o.get("aRateInclMinus")), o.get("gpa", ""), o.get("students", "")]
            if not c["teachers"]:
                w.writerow(base + [""] * 9 + tail + [""])
            for t in c["teachers"]:
                s = t["stats"] or {}
                w.writerow(base + [t["name"], t["role"], " / ".join(t["modes"]), t["sections"],
                                   pct(s.get("aRate")), pct(s.get("aRateInclMinus")), s.get("gpa", ""),
                                   s.get("students", ""), s.get("semesters", "")] + tail + ["；".join(t["notes"])])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="re-download WAF data and Course Explorer schedules")
    args = ap.parse_args()
    courses = build(args.refresh)
    os.makedirs(os.path.dirname(JSON_OUT), exist_ok=True)
    payload = {
        "term": TERM_LABEL,
        "builtAt": time.strftime("%Y-%m-%d"),
        "sources": {"grades": WAF_PAGE, "schedule": "https://courses.illinois.edu/schedule/2027/spring"},
        "courses": courses,
    }
    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    write_csv(courses)
    offered = sum(c["offered"] for c in courses)
    print(f"{len(courses)} courses ({offered} offered in {TERM_LABEL}) -> "
          f"{os.path.relpath(JSON_OUT, ROOT)}, {os.path.relpath(CSV_OUT, ROOT)}")


if __name__ == "__main__":
    main()
