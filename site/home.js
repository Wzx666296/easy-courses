// Landing page: live stats, top courses and a search box with suggestions,
// all from data/spring2027.json. Uses i18n.js and spring-common.js.

let data;
const TOP_N = 6;

const offeredCourses = () => data.courses.filter((c) => c.offered);
const withLang = (url) => `${url}${url.includes("?") ? "&" : "?"}lang=${LANG}`;
const nameOf = (c) => (LANG === "zh" ? c.zh : c.title);

function renderHero() {
  $("eyebrow").textContent = t("home.eyebrow", { date: data.builtAt });
  const offered = offeredCourses();
  $("home-chips").innerHTML = CATEGORIES.filter((c) => c.key).map((cat) => {
    const n = offered.filter((c) => c.genedCodes.some((g) => cat.codes.includes(g))).length;
    return `<a class="chip" href="${esc(withLang(`spring2027.html?cat=${cat.key}`))}">${esc(t(`cat.${cat.key}`))}<span class="count">${n}</span></a>`;
  }).join("");
}

function renderStats() {
  const offered = offeredCourses();
  const slots = (c) => c.teachers.flatMap((x) => x.schedule || []);
  const online = offered.filter((c) => slots(c).some((s) => s.mode === "online")).length;
  const eightWeek = offered.filter((c) => slots(c).some((s) => s.part !== "full")).length;
  const high = offered.filter((c) => (bestTeacher(c)?.stats.aRate ?? 0) >= 0.85).length;
  const items = [
    [offered.length, t("home.stat.offered")],
    [high, t("home.stat.high")],
    [online, t("home.stat.online")],
    [eightWeek, t("home.stat.eight")],
  ];
  $("stats").innerHTML = items.map(([n, label]) => `<div><b>${n}</b><span>${esc(label)}</span></div>`).join("");
  $("entry1-desc").textContent = t("home.entry1.desc", { n: offered.length });
}

function renderTop() {
  const ranked = offeredCourses()
    .map((c) => ({ c, b: bestTeacher(c, "aRate") }))
    .filter((x) => x.b)
    .sort((a, b) => b.b.stats.aRate - a.b.stats.aRate)
    .slice(0, TOP_N);
  $("top-list").innerHTML = ranked.map(({ c, b }, i) => `<li><a href="${esc(courseUrl(c.code))}">
      <span class="t-rank">${i + 1}</span>
      <span class="t-main">
        <span class="t-code">${esc(c.code)}</span>${LANG === "zh" ? `<span class="t-zh">${esc(c.zh)}</span>` : ""}
        <span class="t-meta">${esc(LANG === "zh" ? `${b.name} · ${c.title}` : `${c.title} · ${b.name}`)}</span>
      </span>
      <span class="t-num"><b>${pct(b.stats.aRate)}</b><small>${esc(t("big.aRate"))}</small></span>
      <span class="t-num t-gpa"><b>${b.stats.gpa.toFixed(2)}</b><small>GPA</small></span>
    </a></li>`).join("");
}

// ---- Search with suggestions ---------------------------------------------
const norm = (x) => (x || "").toLowerCase().replace(/\s+/g, "");
let active = -1;

function matchesQuery(c, q) {
  return [c.code, c.zh, c.title, ...c.teachers.map((x) => x.name)].map(norm).join("|").includes(q);
}

function renderSuggest() {
  const q = norm($("home-q").value);
  const box = $("suggest");
  active = -1;
  if (!q) { box.hidden = true; $("home-q").setAttribute("aria-expanded", "false"); return; }
  const hits = data.courses.filter((c) => matchesQuery(c, q))
    .sort((a, b) => (norm(b.code).startsWith(q) - norm(a.code).startsWith(q)) || a.code.localeCompare(b.code, "en", { numeric: true }))
    .slice(0, 6);
  box.innerHTML = hits.length
    ? hits.map((c) => {
        const b = c.offered ? bestTeacher(c) : null;
        return `<li role="option"><a href="${esc(courseUrl(c.code))}">
          <span class="s-code">${esc(c.code)}</span><span class="s-name">${esc(nameOf(c))}</span>
          <span class="s-num">${b ? `${pct(b.stats.aRate)} · ${b.stats.gpa.toFixed(2)}` : esc(t("home.notOffered"))}</span></a></li>`;
      }).join("")
    : `<li class="s-empty">${esc(t("home.noMatch"))}</li>`;
  box.hidden = false;
  $("home-q").setAttribute("aria-expanded", "true");
}

function moveActive(step) {
  const links = [...$("suggest").querySelectorAll("a")];
  if (!links.length) return;
  active = (active + step + links.length) % links.length;
  links.forEach((a, i) => a.setAttribute("aria-selected", String(i === active)));
}

function setupSearch() {
  const input = $("home-q");
  input.addEventListener("input", renderSuggest);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); moveActive(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
    else if (e.key === "Escape") { $("suggest").hidden = true; }
  });
  $("hero-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const links = [...$("suggest").querySelectorAll("a")];
    if (active >= 0 && links[active]) { location.href = links[active].href; return; }
    const q = input.value.trim();
    location.href = withLang(q ? `spring2027.html?q=${encodeURIComponent(q)}` : "spring2027.html");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#hero-search")) $("suggest").hidden = true;
  });
}

function renderAll() {
  renderHero();
  renderStats();
  renderTop();
  if (!$("suggest").hidden) renderSuggest();
}

async function init() {
  setupSearch();
  try {
    data = await (await fetch("data/spring2027.json", { cache: "no-cache" })).json();
  } catch (err) {
    $("eyebrow").textContent = t("loadFailed");
    console.error(err);
    return;
  }
  onLangChange(renderAll);
  renderAll();
}

init();
