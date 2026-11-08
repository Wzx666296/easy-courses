// Spring 2027 shortlist — renders data/spring2027.json (built by scripts/build_spring2027.py).
// Text comes from i18n.js (t, onLangChange); shared helpers from spring-common.js.

const state = { q: "", qRaw: "", cat: "", sub: "", mode: "", half: "", sort: "aRate", showTA: false };
let data;

const sortKey = () => (state.sort === "code" ? "aRate" : state.sort);

function sortValue(c) {
  const key = sortKey();
  const b = bestTeacher(c, key);
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

function card(c, rank) {
  const b = c.offered ? bestTeacher(c, sortKey()) : null;
  const leads = c.teachers.filter((x) => x.role === "lead");
  const tas = c.teachers.filter((x) => x.role === "discussion");
  const shown = state.showTA ? c.teachers : leads;
  const tags = genedTags(c);
  const sub = LANG === "zh" ? c.zh : "";
  const href = courseUrl(c.code);

  return `<article class="card ${c.offered ? "" : "muted"}" id="${esc(slugOf(c.code))}">
    <div class="card-head">
      <div><h3><a class="card-link" href="${esc(href)}">${esc(c.code)}${sub ? `<small>${esc(sub)}</small>` : ""}</a></h3>${c.title ? `<div class="en">${esc(c.title)}${c.credits ? ` · ${esc(t("credits", { n: c.credits }))}` : ""}</div>` : ""}</div>
      ${rank ? `<span class="rank">#${rank}</span>` : ""}
    </div>
    ${tags ? `<div class="tags">${tags}</div>` : ""}
    ${c.offered && c.teachers.length ? `<div class="badges">${courseBadges(c)}</div>` : ""}
    ${bigNumbers(b)}
    ${c.offered && shown.length ? teachersTable(shown) : ""}
    ${c.status === "noTeacher" ? `<p class="nodata">${esc(t("status.noTeacher"))}</p>` : ""}
    ${!state.showTA && tas.length ? `<div class="meta">${esc(t("taHidden", { n: tas.length }))}</div>` : ""}
    ${c.gradesFrom ? `<div class="meta">${esc(t("crossList", { code: c.gradesFrom }))}</div>` : ""}
    <div class="card-foot">
      <span>${esc(overallLine(c.overall))}</span>
      <a href="${esc(href)}">${esc(t("detailLink"))}</a>
    </div>
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

const STATE_KEY = "spring2027-state";
function saveState() {
  try { sessionStorage.setItem(STATE_KEY, JSON.stringify({ ...state, scroll: scrollY })); } catch (_) { /* ignore */ }
}
function restoreState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
    if (!saved) return null;
    for (const k of Object.keys(state)) if (k in saved) state[k] = saved[k];
    $("q").value = saved.qRaw || "";
    for (const id of ["mode", "half", "sort"]) $(id).value = state[id];
    $("show-ta").checked = state.showTA;
    return saved.scroll || 0;
  } catch (_) { return null; }
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
    data = await (await fetch("data/spring2027.json", { cache: "no-cache" })).json();
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
  $("q").addEventListener("input", (e) => { state.q = norm(e.target.value); state.qRaw = e.target.value; render(); });
  $("show-ta").addEventListener("change", (e) => { state.showTA = e.target.checked; render(); });
  onLangChange(renderTexts);
  let scroll = restoreState();
  const params = new URLSearchParams(location.search);
  if (params.has("cat") || params.has("q")) {
    const cat = params.get("cat") || "";
    state.cat = CATEGORIES.some((c) => c.key === cat) ? cat : "";
    state.sub = params.get("sub") || "";
    state.qRaw = params.get("q") || "";
    state.q = norm(state.qRaw);
    $("q").value = state.qRaw;
    scroll = 0;
    // Drop the one-off params so going back later shows the remembered state.
    params.delete("cat"); params.delete("sub"); params.delete("q");
    history.replaceState(null, "", `${location.pathname}${params.toString() ? `?${params}` : ""}`);
  }
  renderTexts();
  if (scroll) requestAnimationFrame(() => scrollTo(0, scroll));
  addEventListener("pagehide", saveState);
  $("cards").addEventListener("click", (e) => { if (e.target.closest("a")) saveState(); });
}

init();
