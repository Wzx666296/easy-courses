// Spring 2027 shortlist — renders data/spring2027.json (built by scripts/build_spring2027.py).
// Text comes from i18n.js (t, onLangChange).

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
const state = { q: "", cat: "", sub: "", mode: "", half: "", sort: "aRate", showTA: false };
let data;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const fmtInt = (n) => n.toLocaleString(LANG === "zh" ? "zh-CN" : "en-US");
const tone = (a) => (a == null ? "" : a >= 0.85 ? "good" : a >= 0.7 ? "mid" : "bad");
const gpaTone = (g) => (g == null ? "" : g >= 3.75 ? "good" : g >= 3.5 ? "mid" : "bad");
const catOf = (code) => CATEGORIES.find((c) => c.codes && c.codes.includes(code))?.key || "";
// Tags sorted by category order so the same categories line up across cards.
const sortedCodes = (codes) => [...codes].sort((a, b) =>
  CATEGORIES.findIndex((c) => c.key === catOf(a)) - CATEGORIES.findIndex((c) => c.key === catOf(b)));
const sortKey = () => (state.sort === "code" ? "aRate" : state.sort);

function noteLabel(n) {
  if (n.type === "smallSample") return t("note.smallSample", { n: n.students });
  if (n.type === "nameMatch") return t("note.nameMatch", { name: n.wafName });
  return t("note.noData");
}

// The teacher whose numbers represent the course: best lead instructor with enough students,
// else any lead instructor with data.
function bestTeacher(c) {
  const leads = c.teachers.filter((x) => x.role === "lead" && x.stats);
  const pool = leads.filter((x) => x.stats.students >= MIN_RELIABLE);
  const list = pool.length ? pool : leads;
  const key = sortKey();
  return list.reduce((best, x) => (!best || x.stats[key] > best.stats[key] ? x : best), null);
}
function sortValue(c) {
  const b = bestTeacher(c);
  const key = sortKey();
  if (b) return b.stats[key];
  return c.overall ? c.overall[key] - 1 : -9; // no teacher data: sink below courses that have it
}

const norm = (x) => (x || "").toLowerCase().replace(/\s+/g, "");
function matches(c) {
  if (state.q) {
    const hay = [c.code, c.zh, c.title, ...c.teachers.map((x) => x.name)].map(norm).join("|");
    if (!hay.includes(state.q)) return false;
  }
  if (state.cat) {
    const cat = CATEGORIES.find((x) => x.key === state.cat);
    if (!c.genedCodes.some((g) => cat.codes.includes(g))) return false;
    if (state.sub && !c.genedCodes.includes(state.sub)) return false;
  }
  const modes = c.teachers.flatMap((x) => x.modes);
  if (state.mode && !modes.some((m) => m.split("-")[0] === state.mode)) return false;
  if (state.half && !modes.some((m) => (m.split("-")[1] || "full") === state.half)) return false;
  return true;
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

function teacherRow(x) {
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
  <tr class="${cls} sched"><td colspan="5">${scheduleLines(x.schedule || [])}</td></tr>`;
}

function card(c, rank) {
  const b = c.offered ? bestTeacher(c) : null;
  const leads = c.teachers.filter((x) => x.role === "lead");
  const tas = c.teachers.filter((x) => x.role === "discussion");
  const shown = state.showTA ? c.teachers : leads;
  const tags = sortedCodes(c.genedCodes || []).map((g) => `<span class="tag">${esc(t(`code.${g}`))}</span>`);
  if (c.offered && !c.genedCodes.length) tags.push(`<span class="tag warn">${esc(t("notGened"))}</span>`);
  const o = c.overall;
  const h = b ? b.stats : null;
  const sub = LANG === "zh" ? c.zh : "";

  return `<article class="card ${c.offered ? "" : "muted"}" id="${esc(c.code.replace(" ", "-"))}">
    <div class="card-head">
      <div><h3>${esc(c.code)}${sub ? `<small>${esc(sub)}</small>` : ""}</h3>${c.title ? `<div class="en">${esc(c.title)}${c.credits ? ` · ${esc(t("credits", { n: c.credits }))}` : ""}</div>` : ""}</div>
      ${rank ? `<span class="rank">#${rank}</span>` : ""}
    </div>
    ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
    ${c.offered && c.teachers.length ? `<div class="badges">${courseBadges(c)}</div>` : ""}
    ${h ? `<div class="big">
        <div class="${tone(h.aRate)}"><b>${pct(h.aRate)}</b><span>${esc(t("big.aRate"))}</span></div>
        <div class="${tone(h.aRateInclMinus)}"><b>${pct(h.aRateInclMinus)}</b><span>${esc(t("big.aRateInclMinus"))}</span></div>
        <div class="${gpaTone(h.gpa)}"><b>${h.gpa.toFixed(2)}</b><span>${esc(t("big.gpa"))}</span></div>
      </div>
      <div class="meta en">${esc(t("big.who", { name: b.name }))}</div>` : ""}
    ${c.offered && shown.length ? `<table class="teachers">
        <thead><tr><th>${esc(t("th.teacher"))}</th><th class="num">${esc(t("th.a"))}</th><th class="num">${esc(t("th.am"))}</th><th class="num">${esc(t("th.gpa"))}</th><th class="num hide-xs">${esc(t("th.n"))}</th></tr></thead>
        <tbody>${shown.map(teacherRow).join("")}</tbody>
      </table>` : ""}
    ${c.status === "noTeacher" ? `<p class="nodata">${esc(t("status.noTeacher"))}</p>` : ""}
    ${!state.showTA && tas.length ? `<div class="meta en">${esc(t("taHidden", { n: tas.length }))}</div>` : ""}
    ${c.gradesFrom ? `<div class="meta en">${esc(t("crossList", { code: c.gradesFrom }))}</div>` : ""}
    ${o ? `<div class="overall">${esc(t("overall", { a: pct(o.aRate), am: pct(o.aRateInclMinus), gpa: o.gpa.toFixed(2), n: fmtInt(o.students) }))}</div>` : ""}
  </article>`;
}

function renderChips() {
  const offered = data.courses.filter((c) => c.offered);
  $("gened-chips").innerHTML = CATEGORIES.map((cat) => {
    const n = cat.key ? offered.filter((c) => c.genedCodes.some((g) => cat.codes.includes(g))).length : offered.length;
    const label = cat.key ? t(`cat.${cat.key}`) : t("all");
    return `<button type="button" class="chip" data-key="${cat.key}" aria-pressed="${cat.key === state.cat}">${esc(label)}<span class="count">${n}</span></button>`;
  }).join("");
  renderSubChips();
}

// Second row: subcategories of the selected category, plus its graduation requirement.
function renderSubChips() {
  const cat = CATEGORIES.find((x) => x.key === state.cat);
  const box = $("sub-chips");
  const req = $("req");
  if (!cat || !cat.key) {
    box.hidden = true; req.hidden = true;
    return;
  }
  const offered = data.courses.filter((c) => c.offered);
  if (cat.codes.length > 1) {
    const inCat = offered.filter((c) => c.genedCodes.some((g) => cat.codes.includes(g))).length;
    box.innerHTML = [`<button type="button" class="chip" data-sub="" aria-pressed="${!state.sub}">${esc(t("all"))}<span class="count">${inCat}</span></button>`]
      .concat(cat.codes.map((code) => {
        const n = offered.filter((c) => c.genedCodes.includes(code)).length;
        return `<button type="button" class="chip" data-sub="${code}" aria-pressed="${state.sub === code}">${esc(t(`code.${code}`))}<span class="count">${n}</span></button>`;
      })).join("");
    box.hidden = false;
  } else {
    box.hidden = true;
  }
  req.innerHTML = `${esc(t(`req.${cat.key}`))}<small>${esc(t("req.note"))}</small>`;
  req.hidden = false;
}

function render() {
  const offered = data.courses.filter((c) => c.offered);
  const list = offered.filter(matches);
  if (state.sort === "code") list.sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
  else list.sort((a, b) => sortValue(b) - sortValue(a));

  $("cards").innerHTML = list.map((c, i) => card(c, state.sort === "code" ? 0 : i + 1)).join("");
  $("summary").textContent = list.length ? t("spring.count", { n: list.length }) : t("spring.none");

  const missing = data.courses.filter((c) => !c.offered);
  $("not-offered").hidden = !missing.length || !!(state.cat || state.mode || state.half);
  $("not-offered-cards").innerHTML = missing.map((c) => card(c, 0)).join("");

  for (const btn of document.querySelectorAll(".chip")) btn.setAttribute("aria-pressed", String(btn.dataset.key === state.cat));
}

function renderTexts() {
  const offered = data.courses.filter((c) => c.offered).length;
  $("intro").textContent = t("spring.intro", { total: data.courses.length, offered });
  $("footer").innerHTML = t("spring.footer", {
    grades: esc(data.sources.grades), schedule: esc(data.sources.schedule), date: esc(data.builtAt), min: MIN_RELIABLE,
  });
  renderChips();
  render();
}

async function init() {
  try {
    data = await (await fetch("data/spring2027.json")).json();
  } catch (err) {
    $("intro").textContent = t("loadFailed");
    console.error(err);
    return;
  }

  $("gened-chips").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    state.cat = btn.dataset.key;
    state.sub = "";
    renderSubChips();
    render();
  });
  $("sub-chips").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    state.sub = btn.dataset.sub;
    renderSubChips();
    render();
  });
  for (const id of ["mode", "half", "sort"]) {
    $(id).addEventListener("change", (e) => { state[id] = e.target.value; render(); });
  }
  $("q").addEventListener("input", (e) => { state.q = norm(e.target.value); render(); });
  $("show-ta").addEventListener("change", (e) => { state.showTA = e.target.checked; render(); });
  onLangChange(renderTexts);
  renderTexts();
}

init();
