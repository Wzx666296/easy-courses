// 2027 春水课清单 — renders data/spring2027.json (built by scripts/build_spring2027.py).

const CATEGORIES = [
  { key: "", label: "全部" },
  { key: "SBS", label: "社会与行为科学", codes: ["SS", "BSC"] },
  { key: "HUM", label: "人文与艺术", codes: ["HP", "LA"] },
  { key: "NAT", label: "自然科学", codes: ["LS", "PS"] },
  { key: "CS", label: "文化研究", codes: ["NW", "WCC", "US"] },
  { key: "ACP", label: "高级写作 ACP", codes: ["CLL"] },
  { key: "QR", label: "定量推理 QR", codes: ["QR1", "QR2"] },
];
const CODE_LABEL = {
  SS: "SBS·社会科学", BSC: "SBS·行为科学", HP: "HUM·历史哲学", LA: "HUM·文学艺术",
  LS: "NAT·生命科学", PS: "NAT·物理科学", NW: "CS·非西方", WCC: "CS·西方", US: "CS·美国少数族裔",
  CLL: "ACP", QR1: "QR1", QR2: "QR2",
};
const MIN_RELIABLE = 100; // students; below this a teacher's numbers are marked as small-sample

const $ = (id) => document.getElementById(id);
const state = { cat: "", mode: "", half: "", sort: "aRate", showTA: false };
let data;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const tone = (a) => (a == null ? "" : a >= 0.85 ? "good" : a >= 0.7 ? "mid" : "bad");
const gpaTone = (g) => (g == null ? "" : g >= 3.75 ? "good" : g >= 3.5 ? "mid" : "bad");

// The teacher whose numbers represent the course: best lead instructor with enough students,
// else any lead instructor with data.
function bestTeacher(c) {
  const leads = c.teachers.filter((t) => t.role === "主讲" && t.stats);
  const pool = leads.filter((t) => t.stats.students >= MIN_RELIABLE);
  const list = pool.length ? pool : leads;
  const key = sortKey();
  return list.reduce((best, t) => (!best || t.stats[key] > best.stats[key] ? t : best), null);
}
const sortKey = () => (state.sort === "code" ? "aRate" : state.sort);
function sortValue(c) {
  const b = bestTeacher(c);
  const key = sortKey();
  if (b) return b.stats[key];
  return c.overall ? c.overall[key] - 1 : -9; // no teacher data: sink below courses that have it
}

function matches(c) {
  if (state.cat) {
    const cat = CATEGORIES.find((x) => x.key === state.cat);
    if (!c.genedCodes.some((g) => cat.codes.includes(g))) return false;
  }
  const modes = c.teachers.flatMap((t) => t.modes);
  if (state.mode && !modes.some((m) => m.startsWith(state.mode))) return false;
  if (state.half && !modes.some((m) => m.includes(state.half))) return false;
  return true;
}

function teacherRow(t) {
  const s = t.stats;
  const notes = t.notes.filter((n) => !n.startsWith("WAF 无"));
  return `<tr class="${t.role === "讨论课" ? "ta" : ""}">
    <td><div class="who">${esc(t.name)}${t.role === "讨论课" ? '<span class="role">讨论课</span>' : ""}</div>
      <div class="meta">${esc(t.modes.join(" / "))}${t.sections > 1 ? ` · ${t.sections} 个 section` : ""}</div>
      ${notes.length ? `<div class="note">${esc(notes.join("；"))}</div>` : ""}</td>
    ${s ? `<td class="num">${pct(s.aRate)}</td><td class="num">${pct(s.aRateInclMinus)}</td>
      <td class="num">${s.gpa.toFixed(2)}</td><td class="num hide-xs">${s.students.toLocaleString()}</td>`
      : `<td class="nodata" colspan="4">没有这位老师教这门课的记录</td>`}
  </tr>`;
}

function card(c, rank) {
  const b = c.offered ? bestTeacher(c) : null;
  const leads = c.teachers.filter((t) => t.role === "主讲");
  const tas = c.teachers.filter((t) => t.role === "讨论课");
  const shown = state.showTA ? c.teachers : leads;
  const tags = (c.genedCodes || []).map((g) => `<span class="tag">${esc(CODE_LABEL[g] || g)}</span>`);
  if (c.offered && !c.genedCodes.length) tags.push('<span class="tag warn">不是 Gen Ed</span>');
  const o = c.overall;
  const headline = b ? b.stats : null;

  return `<article class="card ${c.offered ? "" : "muted"}" id="${esc(c.code.replace(" ", "-"))}">
    <div class="card-head">
      <div><h3>${esc(c.code)}<small>${esc(c.zh)}</small></h3><div class="en">${esc(c.title)}</div></div>
      ${rank ? `<span class="rank">#${rank}</span>` : ""}
    </div>
    ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
    ${headline ? `<div class="big">
        <div class="${tone(headline.aRate)}"><b>${pct(headline.aRate)}</b><span>A 率（A+/A）</span></div>
        <div class="${tone(headline.aRateInclMinus)}"><b>${pct(headline.aRateInclMinus)}</b><span>A 率（含 A-）</span></div>
        <div class="${gpaTone(headline.gpa)}"><b>${headline.gpa.toFixed(2)}</b><span>平均 GPA</span></div>
      </div>
      <div class="meta en">↑ ${esc(b.name)} 教这门课的历史成绩</div>` : ""}
    ${c.offered && shown.length ? `<table class="teachers">
        <thead><tr><th>2027 春老师</th><th class="num">A</th><th class="num">含A-</th><th class="num">GPA</th><th class="num hide-xs">人数</th></tr></thead>
        <tbody>${shown.map(teacherRow).join("")}</tbody>
      </table>` : ""}
    ${c.offered && !c.teachers.length ? `<p class="nodata">${esc(c.status)}，下面是整门课的历史数据。</p>` : ""}
    ${!state.showTA && tas.length ? `<div class="meta en">另有 ${tas.length} 位讨论课老师（勾选上方「显示讨论课老师」查看）</div>` : ""}
    ${o ? `<div class="overall">整门课历史：A 率 ${pct(o.aRate)} · 含 A- ${pct(o.aRateInclMinus)} · GPA ${o.gpa.toFixed(2)} · ${o.students.toLocaleString()} 人</div>` : ""}
  </article>`;
}

function render() {
  const offered = data.courses.filter((c) => c.offered);
  const list = offered.filter(matches);
  if (state.sort === "code") list.sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
  else list.sort((a, b) => sortValue(b) - sortValue(a));

  $("cards").innerHTML = list.map((c, i) => card(c, state.sort === "code" ? 0 : i + 1)).join("");
  $("summary").textContent = list.length ? `${list.length} 门课` : "没有符合条件的课。";

  const missing = data.courses.filter((c) => !c.offered);
  $("not-offered").hidden = !missing.length || !!(state.cat || state.mode || state.half);
  $("not-offered-cards").innerHTML = missing.map((c) => card(c, 0)).join("");

  for (const btn of document.querySelectorAll(".chip")) btn.setAttribute("aria-pressed", String(btn.dataset.key === state.cat));
}

function renderChips() {
  const offered = data.courses.filter((c) => c.offered);
  $("gened-chips").innerHTML = CATEGORIES.map((cat) => {
    const n = cat.key ? offered.filter((c) => c.genedCodes.some((g) => cat.codes.includes(g))).length : offered.length;
    return `<button type="button" class="chip" data-key="${cat.key}">${esc(cat.label)}<span class="count">${n}</span></button>`;
  }).join("");
  $("gened-chips").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    state.cat = btn.dataset.key;
    render();
  });
}

async function init() {
  try {
    data = await (await fetch("data/spring2027.json")).json();
  } catch (err) {
    $("intro").textContent = "数据加载失败。请用 README 里的命令启动本地服务器。";
    console.error(err);
    return;
  }
  const offered = data.courses.filter((c) => c.offered).length;
  $("intro").textContent = `我们挑出的 ${data.courses.length} 门课里，${offered} 门 2027 春开课。每门课按 2027 春实际授课老师的历史成绩排序。`;
  $("footer").innerHTML = `成绩数据：<a href="${esc(data.sources.grades)}">WAF · Grade Disparities and Accolades by Instructor</a>（每位老师教该课的全部历史学期）。
    老师名单：<a href="${esc(data.sources.schedule)}">Course Explorer 2027 春课表</a>，${esc(data.builtAt)} 抓取。
    A 率（A+/A）不含 A-；排序用学生数 ≥ ${MIN_RELIABLE} 的主讲老师。历史数据不代表未来，选课前请再看一眼官方课表。`;

  renderChips();
  for (const [id, key] of [["mode", "mode"], ["half", "half"], ["sort", "sort"]]) {
    $(id).addEventListener("change", (e) => { state[key] = e.target.value; render(); });
  }
  $("show-ta").addEventListener("change", (e) => { state.showTA = e.target.checked; render(); });
  render();
}

init();
