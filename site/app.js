// UIUC 水课查询 — loads data/courses.json (built by scripts/build_data.py) and filters it in the browser.

const GENED_OPTIONS = [
  ["", "全部（含非 Gen Ed）"],
  ["ANY", "任意 Gen Ed"],
  ["ACP", "ACP 高级写作"],
  ["CS", "Cultural Studies（任意）"],
  ["NW", "  └ NW 非西方文化"],
  ["WCC", "  └ WCC 西方/比较文化"],
  ["US", "  └ US 美国少数族裔文化"],
  ["HUM", "Humanities（任意）"],
  ["HP", "  └ HP 历史与哲学"],
  ["LA", "  └ LA 文学与艺术"],
  ["NAT", "Natural Sciences（任意）"],
  ["LS", "  └ LS 生命科学"],
  ["PS", "  └ PS 物理科学"],
  ["QR", "Quantitative Reasoning（任意）"],
  ["QR1", "  └ QR1"],
  ["QR2", "  └ QR2"],
  ["SBS", "Social & Behavioral（任意）"],
  ["BSC", "  └ BSC 行为科学"],
  ["SS", "  └ SS 社会科学"],
];
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

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const pct = (x) => `${Math.round(x * 100)}%`;
function gpaBadge(g) {
  const cls = g >= 3.5 ? "good" : g >= 3.0 ? "mid" : "bad";
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
  els.summary.textContent = current.length
    ? `找到 ${current.length} 门课`
    : "没有符合条件的课，试试放宽筛选（比如把「最少学生数」改成不限）。";
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
    <button class="close" type="button" aria-label="关闭">×</button>
    <h2>${esc(c.code)}</h2>
    <div class="title">${esc(c.title)}</div>
    <div>${c.geneds.map((g) => `<span class="tag">${esc(g)}</span>`).join("")}</div>
    <div class="stats">
      <div class="stat"><b>${c.gpa.toFixed(2)}</b><span>平均 GPA</span></div>
      <div class="stat"><b>${pct(c.aRate)}</b><span>拿 A 比例</span></div>
      <div class="stat"><b>${pct(c.wRate)}</b><span>退课 (W) 比例</span></div>
    </div>
    <p class="empty">${c.students.toLocaleString()} 名学生 · ${c.terms} 个学期 · 最近开课 ${esc(c.lastTerm)}</p>

    <h3>按老师（GPA 从高到低）</h3>
    <table>
      <thead><tr><th>老师</th><th class="num">GPA</th><th class="num">A</th><th class="num">学生</th><th>最近</th></tr></thead>
      <tbody>${c.instructors.map((i) => `
        <tr><td>${esc(i.name)}</td><td class="num">${gpaBadge(i.gpa)}</td><td class="num">${pct(i.aRate)}</td>
        <td class="num">${i.students.toLocaleString()}</td><td>${esc(i.lastTerm)}</td></tr>`).join("")}
      </tbody>
    </table>

    <h3>朋友评价</h3>
    ${friendReviews.length
      ? friendReviews.map((r) => `<div class="review">${esc(r.text)}<br><small>${esc(r.author || "匿名")}${r.term ? " · " + esc(r.term) : ""}${r.rating ? " · 水度 " + esc(r.rating) + "/5" : ""}</small></div>`).join("")
      : `<p class="empty">还没有评价。（在 site/data/reviews.json 里添加）</p>`}
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
  els.gened.innerHTML = GENED_OPTIONS.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("");

  let data;
  try {
    const [cRes, rRes] = await Promise.all([fetch("data/courses.json"), fetch("data/reviews.json")]);
    data = await cRes.json();
    reviews = rRes.ok ? (await rRes.json()).reviews || {} : {};
  } catch (err) {
    els.summary.textContent = "数据加载失败。请用 README 里的命令启动本地服务器（直接双击 HTML 文件打不开数据）。";
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
  $("data-range").textContent = `统计 ${data.since}–${maxYear} 年，共 ${courses.length} 门课。`;

  const subjects = [...new Set(courses.map((c) => c.subject))].sort();
  els.subject.insertAdjacentHTML("beforeend", subjects.map((s) => `<option>${esc(s)}</option>`).join(""));

  for (const el of [els.gened, els.subject, els.level, els.minStudents, els.sort]) el.dataset.default = el.value;
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

  applyFilters();
  if (location.hash) showDetail(decodeURIComponent(location.hash.slice(1)));
}

init();
