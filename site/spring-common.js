// Shared by the Spring 2027 list (spring2027.js) and course pages (course.js).
// Text comes from i18n.js (t, LANG).

const CATEGORIES = [
  { key: "" },
  { key: "SBS", codes: ["SS", "BSC"] },
  { key: "HUM", codes: ["HP", "LA"] },
  { key: "NAT", codes: ["LS", "PS"] },
  { key: "CS", codes: ["NW", "WCC", "US"] },
  { key: "ACP", codes: ["CLL"] },
  { key: "QR", codes: ["QR1", "QR2"] },
];
const MIN_RELIABLE = 100; // students; below this a teacher's numbers are marked as small-sample

const $ = (id) => document.getElementById(id);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const fmtInt = (n) => n.toLocaleString(LANG === "zh" ? "zh-CN" : "en-US");
const catOf = (code) => CATEGORIES.find((c) => c.codes && c.codes.includes(code))?.key || "";
// Tags sorted by category order so the same categories line up across cards.
const sortedCodes = (codes) => [...codes].sort((a, b) =>
  CATEGORIES.findIndex((c) => c.key === catOf(a)) - CATEGORIES.findIndex((c) => c.key === catOf(b)));

function noteLabel(n) {
  if (n.type === "smallSample") return t("note.smallSample", { n: n.students });
  if (n.type === "nameMatch") return t("note.nameMatch", { name: n.wafName });
  return t("note.noData");
}

// The teacher whose numbers represent the course: best lead instructor with enough students,
// else any lead instructor with data.
function bestTeacher(c, key = "aRate") {
  const leads = c.teachers.filter((x) => x.role === "lead" && x.stats);
  const pool = leads.filter((x) => x.stats.students >= MIN_RELIABLE);
  const list = pool.length ? pool : leads;
  return list.reduce((best, x) => (!best || x.stats[key] > best.stats[key] ? x : best), null);
}

// ---- schedule formatting -------------------------------------------------
const DAY_ZH = { M: "一", T: "二", W: "三", R: "四", F: "五", S: "六", U: "日" };
const DAY_EN = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri", S: "Sat", U: "Sun" };
const DISCUSSION_TYPES = ["Discussion/Recitation", "Online Discussion"];
const DAY_ORDER = "MTWRFSU";
const PART_ORDER = { full: 0, A: 1, B: 2 };
// Week order: first meeting day, then start time.
const bySlotTime = (a, b) => (DAY_ORDER.indexOf(a.days[0]) - DAY_ORDER.indexOf(b.days[0])) || ((a.start ?? 0) - (b.start ?? 0));

function fmtDays(days) {
  const list = days.split("").filter((d) => DAY_ZH[d]);
  return LANG === "zh" ? `周${list.map((d) => DAY_ZH[d]).join("")}` : list.map((d) => DAY_EN[d]).join("/");
}
function fmtClock(min, withSuffix) {
  const h = Math.floor(min / 60), m = String(min % 60).padStart(2, "0");
  if (LANG === "zh") return `${h}:${m}`;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m}${withSuffix ? (h < 12 ? " AM" : " PM") : ""}`;
}
function fmtTime(slot) {
  if (slot.start == null) return t("sched.async");
  const sameHalf = slot.start < 720 === slot.end < 720;
  return `${fmtDays(slot.days)} ${fmtClock(slot.start, !sameHalf)}–${fmtClock(slot.end, true)}`;
}
const partLabel = (part, dates) => (part === "full" ? t("part.full") : `${t(`half.${part}`)} ${dates}`);
const pill = (cls, text) => `<span class="pill ${cls}">${esc(text)}</span>`;

// One line per lecture/online/lab slot; discussion slots of one teacher are condensed into a single line.
function scheduleLines(schedule) {
  const main = schedule.filter((x) => !DISCUSSION_TYPES.includes(x.type));
  const disc = schedule.filter((x) => DISCUSSION_TYPES.includes(x.type)).sort(bySlotTime);
  const lines = main.map((x) => `<div class="slot">${pill(x.mode, t(`mode.${x.mode}`))}${pill(`part-${x.part}`, partLabel(x.part, x.dates))}
      <span class="when">${esc(fmtTime(x))}</span>${x.type === "Online" ? "" : `<span class="kind">${esc(t(`type.${x.type}`))}</span>`}</div>`);
  if (disc.length) {
    const first = disc[0];
    const times = disc.map(fmtTime);
    const shown = times.slice(0, 4).join(LANG === "zh" ? "、" : ", ");
    const more = times.length > 4 ? t("sched.more", { n: times.length }) : "";
    lines.push(`<div class="slot">${pill(first.mode, t(`mode.${first.mode}`))}${pill(`part-${first.part}`, partLabel(first.part, first.dates))}
      <span class="kind">${esc(t(disc.length > 1 ? "sched.discPick" : "sched.disc"))}</span>
      <span class="when">${esc(shown + more)}</span></div>`);
  }
  return lines.join("");
}

// Card-level summary: which formats and which parts of the term this course has.
function courseBadges(c) {
  const slots = c.teachers.flatMap((x) => x.schedule || []);
  const modes = [...new Set(slots.map((x) => x.mode))].sort();
  const parts = [...new Map(slots.map((x) => [x.part, x])).values()].sort((a, b) => PART_ORDER[a.part] - PART_ORDER[b.part]);
  const async = slots.some((x) => x.mode === "online" && x.start == null);
  return modes.map((m) => pill(m, t(`mode.${m}`))).join("")
    + parts.map((x) => pill(`part-${x.part}`, partLabel(x.part, x.dates))).join("")
    + (async ? pill("async", t("sched.asyncShort")) : "");
}

// RateMyProfessors search limited to UIUC (school id 1112). When the schedule only gives
// an initial ("K Vittore"), search by last name so the right person still shows up.
const RMP_SCHOOL = 1112;
function rmpUrl(name) {
  const parts = name.trim().split(/\s+/);
  const query = parts.length > 1 && parts[0].length <= 1 ? parts.slice(1).join(" ") : name;
  return `https://www.ratemyprofessors.com/search/professors/${RMP_SCHOOL}?q=${encodeURIComponent(query)}`;
}

function teacherRow(x, opts = {}) {
  const s = x.stats;
  const notes = x.notes.filter((n) => n.type !== "noData").map(noteLabel);
  const cls = x.role === "discussion" ? "ta" : "";
  return `<tr class="${cls} head">
    <td><div class="who">${esc(x.name)}${x.role === "discussion" ? `<span class="role">${esc(t("role.discussion"))}</span>` : ""}</div>

      ${notes.length ? `<div class="note">${esc(notes.join(LANG === "zh" ? "；" : "; "))}</div>` : ""}</td>
    ${s ? `<td class="num">${pct(s.aRate)}</td><td class="num">${pct(s.aRateInclMinus)}</td>
      <td class="num">${s.gpa.toFixed(2)}</td><td class="num hide-xs">${fmtInt(s.students)}</td>`
      : `<td class="nodata" colspan="4">${esc(t("note.noData"))}</td>`}
  </tr>
  <tr class="${cls} sched"><td colspan="5">${scheduleLines(x.schedule || [])}${opts.rmp ? `<div class="ext-links">
      <a class="ext rmp" href="${esc(rmpUrl(x.name))}" target="_blank" rel="noopener" title="${esc(t("rmp.title", { name: x.name }))}">RateMyProfessors<span aria-hidden="true"> ↗</span></a>
      ${x.homepage ? `<a class="ext uiuc" href="${esc(x.homepage)}" target="_blank" rel="noopener" title="${esc(t("uiuc.title", { name: x.name }))}">${esc(t("uiuc.label"))}<span aria-hidden="true"> ↗</span></a>` : ""}
    </div>` : ""}</td></tr>`;
}


// Gen Ed tags (plus a "not a Gen Ed" marker for offered courses without one).
function genedTags(c) {
  const tags = sortedCodes(c.genedCodes || []).map((g) => `<span class="tag">${esc(t(`code.${g}`))}</span>`);
  if (c.offered && !(c.genedCodes || []).length) tags.push(`<span class="tag warn">${esc(t("notGened"))}</span>`);
  return tags.join("");
}

// The three headline numbers for a course, from its best lead instructor.
function bigNumbers(b) {
  if (!b) return "";
  const h = b.stats;
  return `<div class="big">
      <div><b>${pct(h.aRate)}</b><span>${esc(t("big.aRate"))}</span></div>
      <div><b>${pct(h.aRateInclMinus)}</b><span>${esc(t("big.aRateInclMinus"))}</span></div>
      <div><b>${h.gpa.toFixed(2)}</b><span>${esc(t("big.gpa"))}</span></div>
    </div>
    <div class="meta">${esc(t("big.who", { name: b.name }))}</div>`;
}

function teachersTable(rows, opts = {}) {
  return `<table class="teachers">
    <thead><tr><th>${esc(t("th.teacher"))}</th><th class="num">${esc(t("th.a"))}</th><th class="num">${esc(t("th.am"))}</th><th class="num">${esc(t("th.gpa"))}</th><th class="num hide-xs">${esc(t("th.n"))}</th></tr></thead>
    <tbody>${rows.map((x) => teacherRow(x, opts)).join("")}</tbody>
  </table>`;
}

const slugOf = (code) => code.replace(" ", "-");
const courseUrl = (code) => `course.html?code=${encodeURIComponent(slugOf(code))}&lang=${LANG}`;
const overallLine = (o) => (o ? t("overall", { a: pct(o.aRate), am: pct(o.aRateInclMinus), gpa: o.gpa.toFixed(2), n: fmtInt(o.students) }) : "");
