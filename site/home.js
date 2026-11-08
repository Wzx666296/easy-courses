// Landing page: a working preview of the Spring 2027 list, live stats, a real course
// page preview and the Gen Ed categories — all from data/spring2027.json.
// Uses i18n.js (t, LANG, onLangChange) and spring-common.js helpers.

let data;
const PREVIEW_ROWS = 7;
const FEATURE_COURSE = "ATMS 140"; // has a verified syllabus + grade breakdown
const pv = { cat: "", q: "" };

const offeredCourses = () => data.courses.filter((c) => c.offered);
const withLang = (url) => `${url}${url.includes("?") ? "&" : "?"}lang=${LANG}`;
const norm = (x) => (x || "").toLowerCase().replace(/\s+/g, "");
const inCat = (c, key) => {
  const cat = CATEGORIES.find((x) => x.key === key);
  return !cat || !cat.codes || c.genedCodes.some((g) => cat.codes.includes(g));
};

// ---- Preview window ------------------------------------------------------
function formatSummary(c) {
  const slots = c.teachers.flatMap((x) => x.schedule || []);
  const modes = [...new Set(slots.map((s) => s.mode))].sort();
  const eight = slots.some((s) => s.part !== "full");
  const mode = modes.map((m) => t(`mode.${m}`)).join(" / ");
  return eight ? `${mode} · <span class="eight">${esc(t("half.short"))}</span>` : esc(mode);
}

function previewRows() {
  const q = norm(pv.q);
  return offeredCourses()
    .filter((c) => inCat(c, pv.cat))
    .filter((c) => !q || [c.code, c.zh, c.title, ...c.teachers.map((x) => x.name)].map(norm).join("|").includes(q))
    .map((c) => ({ c, b: bestTeacher(c, "aRate") }))
    .sort((a, b) => (b.b?.stats.aRate ?? -1) - (a.b?.stats.aRate ?? -1));
}

function renderPreview() {
  const offered = offeredCourses();
  $("pv-cats").innerHTML = CATEGORIES.map((cat) => {
    const n = offered.filter((c) => inCat(c, cat.key)).length;
    const label = cat.key ? t(`cat.${cat.key}`) : t("all");
    return `<button type="button" class="pv-cat" data-key="${cat.key}" aria-pressed="${cat.key === pv.cat}"><span>${esc(label)}</span><span class="n">${n}</span></button>`;
  }).join("");

  const rows = previewRows();
  $("pv-list").innerHTML = rows.length
    ? rows.slice(0, PREVIEW_ROWS).map(({ c, b }) => `<li><a class="pv-row" href="${esc(courseUrl(c.code))}">
        <span class="r-title">
          <span class="r-code">${esc(c.code)}</span><span class="r-name">${esc(LANG === "zh" ? c.zh : c.title)}</span>
          <span class="r-meta">${esc([b?.name, c.credits ? t("credits", { n: c.credits }) : ""].filter(Boolean).join(" · "))}</span>
        </span>
        <span class="r-gened">${sortedCodes(c.genedCodes).slice(0, 2).map((g) => `<span class="tag">${esc(g === "CLL" ? "ACP" : g)}</span>`).join("")}</span>
        <span class="r-fmt">${formatSummary(c)}</span>
        <span class="num">${b ? pct(b.stats.aRate) : "—"}</span>
        <span class="num gpa">${b ? b.stats.gpa.toFixed(2) : "—"}</span>
      </a></li>`).join("")
    : `<li class="pv-empty">${esc(t("home.pv.empty"))}</li>`;

  $("pv-count").textContent = t("home.pv.count", { n: rows.length });
  const params = new URLSearchParams();
  if (pv.cat) params.set("cat", pv.cat);
  if (pv.q.trim()) params.set("q", pv.q.trim());
  $("pv-more").href = withLang(`spring2027.html${params.toString() ? `?${params}` : ""}`);
  $("pv-more").textContent = t("home.pv.more", { n: rows.length });
}

// ---- Stats ---------------------------------------------------------------
function renderStats() {
  const offered = offeredCourses();
  const slots = (c) => c.teachers.flatMap((x) => x.schedule || []);
  const items = [
    [offered.length, t("home.stat.offered")],
    [offered.filter((c) => (bestTeacher(c)?.stats.aRate ?? 0) >= 0.85).length, t("home.stat.high")],
    [offered.filter((c) => slots(c).some((s) => s.mode === "online")).length, t("home.stat.online")],
    [offered.filter((c) => slots(c).some((s) => s.part !== "full")).length, t("home.stat.eight")],
  ];
  $("stats").innerHTML = items.map(([n, label]) => `<div><b>${n}</b><span>${esc(label)}</span></div>`).join("");
}

// ---- Feature: a real course page, condensed --------------------------------
function renderFeature() {
  const c = data.courses.find((x) => x.code === FEATURE_COURSE && x.offered)
    || offeredCourses().find((x) => bestTeacher(x));
  if (!c) return;
  const b = bestTeacher(c);
  const g = c.extras && c.extras.grading;
  const lead = c.teachers.find((x) => x.role === "lead");
  $("f1-link").href = courseUrl(c.code);
  $("f1-link").textContent = t("home.f1.link", { code: c.code });
  $("f1-preview").href = courseUrl(c.code);
  $("f1-preview").setAttribute("aria-label", t("home.f1.link", { code: c.code }));
  $("f1-preview").innerHTML = `
    <div class="cp-head">
      <h3>${esc(c.code)}${LANG === "zh" ? `<small>${esc(c.zh)}</small>` : ""}</h3>
      <p>${esc(c.title)}${c.credits ? ` · ${esc(t("credits", { n: c.credits }))}` : ""}</p>
    </div>
    <div class="tags">${genedTags(c)}</div>
    <div class="badges">${courseBadges(c)}</div>
    ${bigNumbers(b)}
    ${lead ? `<div class="cp-teacher"><div class="who">${esc(lead.name)}</div>${scheduleLines(lead.schedule || [])}</div>` : ""}
    ${g && g.items ? `<div class="cp-grading">
        <p class="cp-grading-title">${esc(t("home.f1.grading", { term: g.term }))}</p>
        <div class="cp-bars">${g.items.map(([, p]) => `<span style="flex:${Number(p)}"></span>`).join("")}</div>
        <div class="cp-legend">${g.items.map(([name, p]) => `<span>${esc(name)}<b>${esc(p)}%</b></span>`).join("")}</div>
      </div>` : ""}`;
}

// ---- Gen Ed categories -----------------------------------------------------
function renderGeneds() {
  const offered = offeredCourses();
  $("ge-list").innerHTML = CATEGORIES.filter((c) => c.key).map((cat) => {
    const n = offered.filter((c) => inCat(c, cat.key)).length;
    const codes = cat.codes.map((x) => (x === "CLL" ? "ACP" : x)).join(" · ");
    const req = t(`req.${cat.key}`).replace(/^(毕业要求：|Requirement: )/, "");
    return `<li><a href="${esc(withLang(`spring2027.html?cat=${cat.key}`))}">
      <span class="ge-name">${esc(t(`cat.${cat.key}`))}<span class="ge-codes">${esc(codes)}</span></span>
      <span class="ge-req">${esc(req)}</span>
      <span class="ge-count">${esc(t("home.ge.link", { n }))}</span>
    </a></li>`;
  }).join("");
}

function renderAll() {
  $("updated").textContent = t("home.updated", { date: data.builtAt });
  renderPreview();
  renderStats();
  renderFeature();
  renderGeneds();
}

async function init() {
  $("pv-cats").addEventListener("click", (e) => {
    const btn = e.target.closest(".pv-cat");
    if (!btn) return;
    pv.cat = btn.dataset.key;
    renderPreview();
  });
  $("pv-q").addEventListener("input", (e) => { pv.q = e.target.value; renderPreview(); });
  $("pv-q").addEventListener("keydown", (e) => {
    if (e.key === "Enter") location.href = $("pv-more").href;
  });
  try {
    data = await (await fetch("data/spring2027.json", { cache: "no-cache" })).json();
  } catch (err) {
    $("pv-list").innerHTML = `<li class="pv-empty">${esc(t("loadFailed"))}</li>`;
    console.error(err);
    return;
  }
  onLangChange(renderAll);
  renderAll();
}

init();
