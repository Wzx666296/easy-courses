#!/usr/bin/env python3
"""Fetch live section status (Open / Closed / Open (Restricted)) and registration restrictions
for the Spring 2027 shortlist from the public Course Explorer schedule pages.

Course Explorer refreshes section status every 10 minutes and does not publish seat counts,
so this only knows whether a section is open, closed or restricted. The deploy workflow runs
this every hour and publishes the result with the site (it is not committed to git).

Output: site/data/status.json
  {"fetchedAt": "...Z", "source": "...", "courses": {"HK 111": {"sections": {"AL1": {"crn": "76558",
    "status": "restricted", "raw": "Open (Restricted)", "restrictions": [...]}}, "info": [...]}}}

Usage:
  python3 scripts/fetch_status.py                  # all offered courses in site/data/spring2027.json
  python3 scripts/fetch_status.py --fallback URL   # if most pages fail, copy the last published file
"""
import argparse
import datetime
import html
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "site", "data", "spring2027.json")
OUT = os.path.join(ROOT, "site", "data", "status.json")
PAGE = "https://courses.illinois.edu/schedule/2027/spring/{subj}/{num}"
UA = "easy-courses status (+https://github.com/Wzx666296/easy-courses)"


def get(url, attempts=3):
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001 - network errors of any kind are retried
            if i == attempts - 1:
                raise
            time.sleep(2 * (i + 1))


def text(fragment):
    s = re.sub(r"<br\s*/?>", "\n", fragment)
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    return [" ".join(line.split()) for line in s.split("\n") if line.strip()]


def normalize(raw):
    r = raw.lower()
    if "restricted" in r:
        return "restricted"
    if "open" in r:  # "Open", "CrossListOpen"
        return "open"
    if "closed" in r:
        return "closed"
    return "unknown"  # "Pending", "Unknown"


def parse(page):
    """Section rows of a Course Explorer schedule page -> {section: {...}}."""
    body = page.split("<tbody>", 1)[1].split("</tbody>", 1)[0] if "<tbody>" in page else ""
    sections = {}
    for row in body.split("<tr>")[1:]:
        crn = re.search(r"<div>(\d{5})</div>", row)
        sec = re.search(r'type-col[^"]*">\s*<div class="app-meeting">([^<]+)</div>', row)
        dl = re.search(r"<dl>(.*?)</dl>", row, re.S)
        if not (crn and sec and dl):
            continue
        details = {}
        for dt, dd in re.findall(r"<dt>(.*?)</dt>\s*<dd>(.*?)</dd>", dl.group(1), re.S):
            details[" ".join(text(dt)).rstrip(":")] = text(dd)
        raw = " ".join(details.get("Availability", [])) or "Unknown"
        sections[sec.group(1).strip()] = {
            "crn": crn.group(1),
            "status": normalize(raw),
            "raw": raw,
            "restrictions": details.get("Restriction(s)", []),
            "info": " ".join(details.get("Section Info", [])),
        }
    return sections


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fallback", help="URL of the last published status.json, used if fetching mostly fails")
    args = ap.parse_args()

    with open(DATA, encoding="utf-8") as f:
        codes = [c["code"] for c in json.load(f)["courses"] if c.get("offered")]

    courses, failed = {}, []
    for code in codes:
        subj, num = code.split()
        try:
            secs = parse(get(PAGE.format(subj=subj, num=num)))
        except Exception as e:  # noqa: BLE001
            failed.append(f"{code}: {e}")
            continue
        if not secs:
            failed.append(f"{code}: no sections parsed")
            continue
        # "Section Info" texts repeat across sections; keep each distinct one once per course.
        info = []
        for s in secs.values():
            note = s.pop("info")
            if note and note not in info:
                info.append(note)
        courses[code] = {"sections": secs, "info": info}
        time.sleep(0.5)

    print(f"fetched {len(courses)}/{len(codes)} courses", file=sys.stderr)
    for line in failed:
        print("  failed:", line, file=sys.stderr)

    if len(courses) < 0.8 * len(codes):
        if args.fallback:
            try:
                old = get(args.fallback)
                json.loads(old)
                with open(OUT, "w", encoding="utf-8") as f:
                    f.write(old)
                print("too many failures; kept the last published status.json", file=sys.stderr)
                return 0
            except Exception as e:  # noqa: BLE001
                print(f"fallback failed: {e}", file=sys.stderr)
        print("too many failures; not writing status.json", file=sys.stderr)
        return 0  # the site works without it; don't block the deploy

    payload = {
        "fetchedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "https://courses.illinois.edu/schedule/2027/spring",
        "courses": courses,
    }
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
