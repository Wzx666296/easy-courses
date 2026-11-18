#!/usr/bin/env python3
"""Email when a lecture section of a watched course becomes open on Course Explorer.

Run by .github/workflows/watch-stat400.yml every 10 minutes. It remembers which lecture
sections were open at the last check (a small JSON file kept in the Actions cache) and only
emails when a lecture goes from not-open to open, so you get one email per opening, not one
every 10 minutes.

Settings come from environment variables (GitHub repository secrets), never from the repo:
  NOTIFY_TO   address to email                      (required)
  SMTP_PASS   SMTP password / authorization code    (required to send)
  SMTP_USER   SMTP login, default NOTIFY_TO
  SMTP_HOST   default smtp.163.com
  SMTP_PORT   default 465 (SSL)

Usage:
  python3 scripts/notify_open.py --code "STAT 400" --state .watch/stat400.json
  python3 scripts/notify_open.py --code "STAT 400" --test     # send a test email now
"""
import argparse
import json
import os
import smtplib
import ssl
import sys
from email.message import EmailMessage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_status import PAGE, get, parse  # noqa: E402

REGISTER_URL = "https://go.illinois.edu/RegisterForClasses"  # the "Register for Classes" link on Course Explorer


def lectures(secs):
    return {k: v for k, v in secs.items() if "Lecture" in v.get("type", "")}


def describe(code, sec, s):
    when = " ".join(x for x in (s.get("days"), s.get("time")) if x)
    who = s.get("instructor") or "TBA"
    return f"{code} {sec}  CRN {s['crn']}  {when}  {who}  [{s['raw']}]"


def send(subject, body):
    to = os.environ.get("NOTIFY_TO", "").strip()
    password = os.environ.get("SMTP_PASS", "")
    if not to or not password:
        print("NOTIFY_TO / SMTP_PASS not set; not sending email.", file=sys.stderr)
        return False
    user = os.environ.get("SMTP_USER", "").strip() or to
    host = os.environ.get("SMTP_HOST", "").strip() or "smtp.163.com"
    port = int(os.environ.get("SMTP_PORT", "").strip() or 465)
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = subject, user, to
    msg.set_content(body)
    with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=30) as s:
        s.login(user, password)
        s.send_message(msg)
    print(f"Email sent: {subject}", file=sys.stderr)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--code", default="STAT 400")
    ap.add_argument("--state", default=".watch/state.json", help="where the last check is remembered")
    ap.add_argument("--test", action="store_true", help="send a test email with the current status")
    args = ap.parse_args()

    subj, num = args.code.split()
    page = PAGE.format(subj=subj, num=num)
    lec = lectures(parse(get(page)))
    if not lec:
        print(f"No lecture sections found for {args.code}; page layout may have changed.", file=sys.stderr)
        return 1
    open_now = sorted(k for k, v in lec.items() if v["status"] == "open")
    status_lines = "\n".join(describe(args.code, k, v) for k, v in sorted(lec.items()))
    print(status_lines)

    if args.test:
        ok = send(f"[测试] {args.code} 空位提醒已设置好",
                  f"这是一封测试邮件。之后 {args.code} 有 lecture 从已满变成有空位时，会给你发邮件。\n\n"
                  f"当前 lecture 状态：\n{status_lines}\n\nCourse Explorer：{page}\n")
        return 0 if ok else 1

    try:
        with open(args.state, encoding="utf-8") as f:
            was_open = set(json.load(f).get("open", []))
    except (OSError, ValueError):
        was_open = set()
    newly = [k for k in open_now if k not in was_open]

    if newly:
        names = ", ".join(newly)
        body = (f"{args.code} 的 lecture 现在有空位：\n\n"
                + "\n".join(describe(args.code, k, lec[k]) for k in newly)
                + f"\n\n全部 lecture 状态：\n{status_lines}\n\n"
                f"Course Explorer（每 10 分钟更新）：{page}\n"
                f"去注册：{REGISTER_URL}\n\n"
                "注意：Course Explorer 不公开剩余座位数，空位可能很快被抢走。"
                "STAT 400 需要同时注册一个 lecture 和一个同字母开头的 discussion（例如 LL1 + LD1）。\n")
        send(f"{args.code} lecture 有空位：{names}", body)
    else:
        print("No lecture newly open; no email.", file=sys.stderr)

    os.makedirs(os.path.dirname(args.state) or ".", exist_ok=True)
    with open(args.state, "w", encoding="utf-8") as f:
        json.dump({"open": open_now}, f)
    return 0


if __name__ == "__main__":
    sys.exit(main())
