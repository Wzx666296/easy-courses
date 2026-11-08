#!/usr/bin/env python3
"""Build the Spring 2027 shortlist page data.

Inputs:
  data/spring2027/courses.csv   our course shortlist (code, Chinese name, optional grades_from for
                                cross-listed courses whose grades WAF files under another code)
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


def to_minutes(hhmm):
    """'02:00PM' -> 840; 'ARRANGED' / missing -> None."""
    try:
        t = time.strptime(hhmm.strip(), "%I:%M%p")
    except (AttributeError, ValueError):
        return None
    return t.tm_hour * 60 + t.tm_min


def to_md(date):
    """'03-15-27Z' -> '3/15'."""
    try:
        month, day = date.split("-")[:2]
        return f"{int(month)}/{int(day)}"
    except (AttributeError, ValueError):
        return ""


def teachers_from_schedule(root):
    """Map (last, first) -> sections, modes, meeting types and grouped meeting times."""
    out = {}
    for s in root.iter("detailedSection"):
        sec, part = s.findtext("sectionNumber"), s.findtext("partOfTerm")
        half = part if part in ("A", "B") else ""  # A = first 8 weeks, B = second 8 weeks
        dates = f"{to_md(s.findtext('startDate'))}–{to_md(s.findtext('endDate'))}"
        for m in s.iter("meeting"):
            t = m.find("type")
            mtype = (t.text or "") if t is not None else ""
            mode = "online" if "Online" in mtype else "inperson"
            days = (m.findtext("daysOfTheWeek") or "").strip()
            start, end = to_minutes(m.findtext("start")), to_minutes(m.findtext("end"))
            # One line per distinct (type, format, term part, days, time); sections with the same slot are merged.
            slot = (mtype, mode, half or "full", days if start is not None else "", start, end, dates)
            for i in m.iter("instructor"):
                key = ((i.get("lastName") or "").strip(), (i.get("firstName") or "").strip())
                d = out.setdefault(key, {"sections": set(), "modes": set(), "types": set(), "slots": {}})
                d["sections"].add(sec)
                d["modes"].add(mode + (f"-{half}" if half else ""))
                d["types"].add(mtype)
                d["slots"].setdefault(slot, set()).add(sec)
    return out


def schedule_list(slots):
    """Grouped meeting slots, lectures first, then by term part, days and start time."""
    order = {"Lecture": 0, "Online Lecture": 0, "Lecture-Discussion": 1, "Online": 2, "Laboratory": 3,
             "Laboratory-Discussion": 3, "Discussion/Recitation": 4, "Online Discussion": 4}
    items = []
    for (mtype, mode, part, days, start, end, dates), secs in slots.items():
        items.append({"type": mtype, "mode": mode, "part": part, "days": days,
                      "start": start, "end": end, "dates": dates, "sections": sorted(secs)})
    items.sort(key=lambda x: (order.get(x["type"], 5), x["part"], x["days"], x["start"] or 0))
    return items


def build(refresh):
    waf = load_waf(refresh)
    with open(LIST_PATH, encoding="utf-8", newline="") as f:
        shortlist = list(csv.DictReader(f))

    courses = []
    for item in shortlist:
        code, zh = item["code"].strip(), item["zh"].strip()
        # Cross-listed courses: WAF may file the grades under the other code (e.g. ANTH 210 -> HDFS 220).
        grades_code = (item.get("grades_from") or "").strip() or code
        rows = waf.get(grades_code, [])
        course = {"code": code, "zh": zh, "gradesFrom": grades_code if grades_code != code else None, "title": "", "geneds": [], "offered": False,
                  "overall": grade_stats(rows), "teachers": []}
        root = load_schedule(code, refresh)
        if root is None:
            course["status"] = "notOffered"
            courses.append(course)
            continue
        course["offered"] = True
        course["title"] = root.findtext("label") or ""
        # "3 hours." / "1 TO 3 hours." -> "3" / "1–3"
        course["credits"] = "–".join(re.findall(r"\d+", root.findtext("creditHours") or ""))
        course["geneds"] = [a.text.replace("–", "-").strip() for a in root.iter("genEdAttribute")]
        course["genedCodes"] = [a.get("code").lstrip("1") for a in root.iter("genEdAttribute")]

        sched = teachers_from_schedule(root)
        course["status"] = "offered" if sched else "noTeacher"
        for (last, first), d in sched.items():
            same_last = [r for r in rows if r["instructor"].lower() == last.lower()]
            matched = [r for r in same_last if first and r["instructor_first_initial"].upper() == first[0].upper()]
            notes = []
            # Course Explorer sometimes uses a nickname initial (e.g. "B" for Elizabeth).
            if not matched and len(same_last) == 1 and sum(1 for k in sched if k[0].lower() == last.lower()) == 1:
                matched = same_last
                notes.append({"type": "nameMatch", "wafName": same_last[0]["instructor_first_name"]})
            stats = grade_stats(matched)
            if stats is None:
                notes.append({"type": "noData"})
            elif stats["students"] < 100:
                notes.append({"type": "smallSample", "students": stats["students"]})
            name = f"{matched[0]['instructor_first_name']} {matched[0]['instructor']}" if matched else f"{first} {last}".strip()
            # Discussion/TA sections: meeting type says so, or section numbers look like AD1 / BDA.
            looks_like_discussion = (d["types"] <= {"Discussion/Recitation"}
                                     or all(re.fullmatch(r"[A-Z]D[A-Z0-9]", s or "") for s in d["sections"]))
            role = "discussion" if not (d["types"] & LECTURE_TYPES) and looks_like_discussion else "lead"
            course["teachers"].append({
                "name": name, "role": role, "modes": sorted(d["modes"]),
                "sections": len(d["sections"]), "schedule": schedule_list(d["slots"]),
                "stats": stats, "notes": notes,
            })
        course["teachers"].sort(key=lambda t: (t["role"] != "lead", t["stats"] is None,
                                               -(t["stats"] or {}).get("aRate", 0)))
        courses.append(course)
    return courses


def pct(x):
    return "" if x is None else f"{x * 100:.1f}%"


ZH = {
    "offered": "已开课", "noTeacher": "已开课，老师未公布", "notOffered": f"{TERM_LABEL} 不开课",
    "lead": "主讲", "discussion": "讨论课",
    "online": "线上", "inperson": "线下", "A": "前八周", "B": "后八周",
}


def zh_mode(m):
    mode, _, half = m.partition("-")
    return ZH[mode] + (f"·{ZH[half]}" if half else "")


def zh_note(n):
    if n["type"] == "nameMatch":
        return f"按姓氏匹配（WAF 名为 {n['wafName']}）"
    if n["type"] == "smallSample":
        return f"样本小（{n['students']} 人）"
    return "WAF 无此老师教这门课的记录"


def write_csv(courses):
    hdr = ["课号", "中文名", "英文名", "Gen Ed", "状态", "老师", "角色", "形式", "section 数",
           "A率(A+/A)", "A率(含A-)", "GPA", "学生数", "学期数",
           "整门课A率", "整门课A率(含A-)", "整门课GPA", "整门课学生数", "备注"]
    with open(CSV_OUT, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(hdr)
        for c in courses:
            o = c["overall"] or {}
            base = [c["code"], c["zh"], c["title"], ", ".join(c.get("genedCodes", [])), ZH[c["status"]]]
            tail = [pct(o.get("aRate")), pct(o.get("aRateInclMinus")), o.get("gpa", ""), o.get("students", "")]
            if not c["teachers"]:
                w.writerow(base + [""] * 9 + tail + [""])
            for t in c["teachers"]:
                s = t["stats"] or {}
                w.writerow(base + [t["name"], ZH[t["role"]], " / ".join(map(zh_mode, t["modes"])), t["sections"],
                                   pct(s.get("aRate")), pct(s.get("aRateInclMinus")), s.get("gpa", ""),
                                   s.get("students", ""), s.get("semesters", "")] + tail + ["；".join(map(zh_note, t["notes"]))])


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
