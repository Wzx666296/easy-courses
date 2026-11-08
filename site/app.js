// UIUC easy-course finder — loads data/courses.json (built by scripts/build_data.py) and filters it in the browser.
// Text comes from i18n.js (t, onLangChange).

const GENED_OPTIONS = ["", "ANY", "ACP", "CS", "NW", "WCC", "US", "HUM", "HP", "LA", "NAT", "LS", "PS",
  "QR", "QR1", "QR2", "SBS", "BSC", "SS"];
const GENED_GROUPS = {
  CS: ["NW", "WCC", "US"],
  HUM: ["HP", "LA"],
  NAT: ["LS", "PS"],
  QR: ["QR1", "QR2"],
  SBS: ["BSC", "SS"],
};
const PAGE_SIZE = 100;

const $ = (id) => document.getElementById(id);
const els = {
  q: $("q"), gened: $("gened"), subject: $("subject"), level: $("level"),
  minStudents: $("min-students"), sort: $("sort"), recent: $("recent"),
  summary: $("summary"), tbody: document.querySelector("#results tbody"),
  more: $("more"), detail: $("detail"), layout: document.querySelector(".layout"),
};

let courses = [];
let byCode = new Map();
let reviews = {};
let recentYear = 0;
let shown = PAGE_SIZE;
let current = [];
let dataRange = null;

function renderGenedOptions() {
  const value = els.gened.value;
  els.gened.innerHTML = GENED_OPTIONS.map((v) => `<option value="${v}">${esc(t(v === "" ? "gened.all" : v === "ANY" ? "gened.any" : `gened.${v}`))}</option>`).join("");
  els.gened.value = value;
}

// Re-render everything that contains translated text.
function renderTexts() {
  renderGenedOptions();
  for (const opt of els.level.options) if (/^[1-4]$/.test(opt.value)) opt.textContent = t("level.n", { n: opt.value });
  if (dataRange) $("data-range").textContent = t("search.range", dataRange);
  applyFilters();
  const code = decodeURIComponent(location.hash.slice(1));
  if (code) showDetail(code);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const pct = (x) => `${Math.round(x * 100)}%`;
function gpaBadge(g) {
  const cls = g >= 3.7 ? "good" : "";
  return `<span class="gpa ${cls}">${g.toFixed(2)}</span>`;
}
const termYear = (label) => Number(label.split(" ").pop());
const normalize = (s) => s.toLowerCase().replace(/\s+/g, "");

function matchesGened(course, want) {
  if (!want) return true;
  if (want === "ANY") return course.geneds.length > 0;
  const accepted = GENED_GROUPS[want] || [want];
  return course.geneds.some((g) => accepted.includes(g));
}

function applyFilters() {
  const q = normalize(els.q.value.trim());
  const gened = els.gened.value;
  const subject = els.subject.value;
  const level = els.level.value;
  const minStudents = Number(els.minStudents.value);
  const recentOnly = els.recent.checked;
  const sortKey = els.sort.value;

  current = courses.filter((c) => {
    if (q && !(c._codeKey.includes(q) || c._titleKey.includes(q))) return false;
    if (subject && c.subject !== subject) return false;
    if (level) {
      const lv = Number(c.number[0]);
      if (level === "5" ? lv < 5 : String(lv) !== level) return false;
    }
    if (c.students < minStudents) return false;
    if (recentOnly && termYear(c.lastTerm) < recentYear) return false;
    return matchesGened(c, gened);
  });

  // An exact course-code search puts that course first.
  current.sort((a, b) => {
    if (q) {
      const ea = a._codeKey === q, eb = b._codeKey === q;
      if (ea !== eb) return ea ? -1 : 1;
    }
    if (sortKey === "code") return a.code.localeCompare(b.code, "en", { numeric: true });
    return b[sortKey] - a[sortKey] || b.students - a.students;
  });

  shown = PAGE_SIZE;
  render();
  saveStateToUrl();
}

function render() {
  els.summary.textContent = current.length ? t("found", { n: current.length }) : t("noneFound");
  const selected = decodeURIComponent(location.hash.slice(1));
  els.tbody.innerHTML = current.slice(0, shown).map((c) => `
    <tr data-code="${esc(c.code)}" class="${c.code === selected ? "selected" : ""}">
      <td><div class="code">${esc(c.code)}</div><div class="title">${esc(c.title)}</div></td>
      <td class="hide-sm">${c.geneds.map((g) => `<span class="tag">${esc(g)}</span>`).join("")}</td>
      <td class="num">${gpaBadge(c.gpa)}</td>
      <td class="num">${pct(c.aRate)}</td>
      <td class="num hide-sm">${c.students.toLocaleString()}</td>
    </tr>`).join("");
  els.more.hidden = current.length <= shown;
}

function showDetail(code) {
  const c = byCode.get(code);
  if (!c) {
    els.detail.hidden = true;
    els.layout.classList.remove("with-detail");
    return;
  }
  const friendReviews = reviews[code] || [];
  els.detail.innerHTML = `
    <button class="close" type="button" aria-label="${esc(t("close"))}">×</button>
    <h2>${esc(c.code)}</h2>
    <div class="title">${esc(c.title)}</div>
    <div>${c.geneds.map((g) => `<span class="tag">${esc(g)}</span>`).join("")}</div>
    <div class="stats">
      <div class="stat"><b>${c.gpa.toFixed(2)}</b><span>${esc(t("detail.gpa"))}</span></div>
      <div class="stat"><b>${pct(c.aRate)}</b><span>${esc(t("detail.aRate"))}</span></div>
    </div>
    <p class="empty">${esc(t("detail.meta", { students: c.students.toLocaleString(), terms: c.terms, last: c.lastTerm }))}</p>

    <h3>${esc(t("detail.byTeacher"))}</h3>
    <table>
      <thead><tr><th>${esc(t("detail.teacher"))}</th><th class="num">GPA</th><th class="num">${esc(t("detail.a"))}</th><th class="num">${esc(t("detail.students"))}</th><th>${esc(t("detail.last"))}</th></tr></thead>
      <tbody>${c.instructors.map((i) => `
        <tr><td>${esc(i.name)}</td><td class="num">${gpaBadge(i.gpa)}</td><td class="num">${pct(i.aRate)}</td>
        <td class="num">${i.students.toLocaleString()}</td><td>${esc(i.lastTerm)}</td></tr>`).join("")}
      </tbody>
    </table>

    <h3>${esc(t("detail.reviews"))}</h3>
    ${friendReviews.length
      ? friendReviews.map((r) => `<div class="review">${esc(r.text)}<br><small>${esc(r.author || t("detail.anon"))}${r.term ? " · " + esc(r.term) : ""}${r.rating ? " · " + esc(t("detail.easiness", { r: r.rating })) : ""}</small></div>`).join("")
      : `<p class="empty">${esc(t("detail.noReviews"))}</p>`}
  `;
  els.detail.hidden = false;
  els.layout.classList.add("with-detail");
  els.detail.querySelector(".close").onclick = () => { history.replaceState(null, "", location.pathname + location.search); showDetail(null); render(); };
}

function saveStateToUrl() {
  const p = new URLSearchParams();
  if (els.q.value.trim()) p.set("q", els.q.value.trim());
  for (const [key, el] of [["gened", els.gened], ["subject", els.subject], ["level", els.level], ["min", els.minStudents], ["sort", els.sort]]) {
    if (el.value !== el.dataset.default) p.set(key, el.value);
  }
  if (!els.recent.checked) p.set("all", "1");
  p.set("lang", LANG);
  const qs = p.toString();
  history.replaceState(null, "", (qs ? "?" + qs : location.pathname) + location.hash);
}

function loadStateFromUrl() {
  const p = new URLSearchParams(location.search);
  if (p.has("q")) els.q.value = p.get("q");
  for (const [key, el] of [["gened", els.gened], ["subject", els.subject], ["level", els.level], ["min", els.minStudents], ["sort", els.sort]]) {
    if (p.has(key)) el.value = p.get(key);
  }
  if (p.has("all")) els.recent.checked = false;
}

async function init() {
  renderGenedOptions();
  let data;
  try {
    const [cRes, rRes] = await Promise.all([fetch("data/courses.json"), fetch("data/reviews.json")]);
    data = await cRes.json();
    reviews = rRes.ok ? (await rRes.json()).reviews || {} : {};
  } catch (err) {
    els.summary.textContent = t("loadFailed");
    console.error(err);
    return;
  }

  courses = data.courses;
  for (const c of courses) {
    c._codeKey = normalize(c.code);
    c._titleKey = normalize(c.title);
    byCode.set(c.code, c);
  }
  const maxYear = Math.max(...courses.map((c) => termYear(c.lastTerm)));
  recentYear = maxYear - 1;
  dataRange = { since: data.since, max: maxYear, count: courses.length };

  const subjects = [...new Set(courses.map((c) => c.subject))].sort();
  els.subject.insertAdjacentHTML("beforeend", subjects.map((s) => `<option>${esc(s)}</option>`).join(""));

  for (const el of [els.gened, els.subject, els.level, els.minStudents, els.sort]) el.dataset.default = el.value;
  onLangChange(renderTexts);
  loadStateFromUrl();

  for (const el of [els.gened, els.subject, els.level, els.minStudents, els.sort, els.recent]) el.addEventListener("change", applyFilters);
  els.q.addEventListener("input", applyFilters);
  els.more.addEventListener("click", () => { shown += PAGE_SIZE; render(); });
  els.tbody.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-code]");
    if (!row) return;
    location.hash = encodeURIComponent(row.dataset.code);
  });
  window.addEventListener("hashchange", () => { showDetail(decodeURIComponent(location.hash.slice(1))); render(); });

  renderTexts();
}

init();
