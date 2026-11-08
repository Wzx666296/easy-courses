// Course page: course.html?code=ANTH-103 — one course from data/spring2027.json.
// Uses i18n.js (t, LANG, onLangChange) and spring-common.js helpers.

let data;

function courseFromUrl() {
  const slug = (new URLSearchParams(location.search).get("code") || "").toUpperCase();
  return data.courses.find((c) => slugOf(c.code) === slug) || null;
}

// External search links, shown whether or not we have curated items.
const redditSearch = (code) => `https://www.reddit.com/r/UIUC/search/?q=${encodeURIComponent(`"${code}"`)}`;
const syllabusSearch = (code) => `https://www.google.com/search?q=${encodeURIComponent(`"${code}" UIUC syllabus`)}`;
const explorerUrl = (code) => {
  const [subj, num] = code.split(" ");
  return `https://courses.illinois.edu/schedule/2027/spring/${subj}/${num}`;
};

const extLink = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>`;

function section(title, body, cls = "") {
  return `<section class="panel ${cls}"><h2>${esc(title)}</h2>${body}</section>`;
}

function gradingSection(c) {
  const g = c.extras && c.extras.grading;
  if (!g || !g.items || !g.items.length) {
    return section(t("course.grading"), `<p class="nodata">${esc(t("course.noGrading"))}</p>`);
  }
  const total = g.items.reduce((sum, [, p]) => sum + Number(p || 0), 0);
  const rows = g.items.map(([name, p]) => `<li>
      <div class="row"><span>${esc(name)}</span><b>${esc(p)}%</b></div>
      <div class="bar"><span style="width:${Math.max(0, Math.min(100, Number(p) || 0))}%"></span></div>
    </li>`).join("");
  return section(t("course.grading"), `<ul class="grading">${rows}</ul>
    <p class="source">${esc(t("course.gradingSource", { term: g.term || "" }))}${g.url ? ` · ${extLink(g.url, g.source || t("course.source"))}` : ""}</p>
    ${Math.round(total) !== 100 ? `<p class="source warn">${esc(t("course.gradingTotal", { n: total }))}</p>` : ""}
    <p class="source">${esc(t("course.gradingCaveat"))}</p>`);
}

function syllabusSection(c) {
  const list = (c.extras && c.extras.syllabi) || [];
  const items = list.map((s) => `<li>${extLink(s.url, s.label)}${s.source ? ` <span class="source">${esc(s.source)}</span>` : ""}</li>`).join("");
  return section(t("course.syllabus"), `${items ? `<ul class="links">${items}</ul>` : `<p class="nodata">${esc(t("course.noSyllabus"))}</p>`}
    <p class="search-link">${extLink(syllabusSearch(c.code), t("course.searchSyllabus"))}</p>`);
}

function redditSection(c) {
  const list = (c.extras && c.extras.reddit) || [];
  const items = list.map((r) => `<li>${extLink(r.url, r.title)}</li>`).join("");
  return section("Reddit", `${items ? `<ul class="links">${items}</ul>` : `<p class="nodata">${esc(t("course.noReddit"))}</p>`}
    <p class="search-link">${extLink(redditSearch(c.code), t("course.searchReddit", { code: c.code }))}</p>`);
}

function render() {
  const c = courseFromUrl();
  if (!c) {
    $("course").innerHTML = `<p class="nodata">${esc(t("course.notFound"))}</p>`;
    document.title = t("course.docTitle");
    return;
  }
  document.title = `${c.code}${LANG === "zh" ? ` ${c.zh}` : c.title ? ` · ${c.title}` : ""}`;
  const b = c.offered ? bestTeacher(c) : null;
  const tags = genedTags(c);

  const head = `<div class="course-head">
      <h1>${esc(c.code)}${LANG === "zh" ? `<span class="zh">${esc(c.zh)}</span>` : ""}</h1>
      <p class="en">${esc(c.title)}${c.credits ? ` · ${esc(t("credits", { n: c.credits }))}` : ""}</p>
      ${tags ? `<div class="tags">${tags}</div>` : ""}
      ${c.offered && c.teachers.length ? `<div class="badges">${courseBadges(c)}</div>` : ""}
      ${!c.offered ? `<p class="status">${esc(t("spring.notOfferedTitle"))}</p>` : ""}
    </div>`;

  const description = section(t("course.description"), c.description
    ? `<p class="description" lang="en">${esc(c.description)}</p>
       <p class="source">${esc(t("course.descriptionSource"))} · ${extLink(explorerUrl(c.code), "Course Explorer")}</p>`
    : `<p class="nodata">—</p>`);

  const teachers = c.offered ? section(t("course.teachers"),
    c.teachers.length ? teachersTable(c.teachers) : `<p class="nodata">${esc(t("status.noTeacher"))}</p>`, "wide") : "";

  const history = section(t("course.history"), `${bigNumbers(b)}
      ${c.overall ? `<p class="source">${esc(overallLine(c.overall))}</p>` : ""}
      ${c.gradesFrom ? `<p class="source">${esc(t("crossList", { code: c.gradesFrom }))}</p>` : ""}
      <p class="source">${extLink(data.sources.grades, "WAF · Grade Disparities")}</p>`);

  $("course").innerHTML = `${head}
    <div class="course-grid">
      <div class="col-main">${description}${teachers}</div>
      <aside class="col-side">${history}${gradingSection(c)}${syllabusSection(c)}${redditSection(c)}</aside>
    </div>`;
}

function renderFooter() {
  $("footer").innerHTML = t("course.footer", { grades: esc(data.sources.grades), schedule: esc(data.sources.schedule), date: esc(data.builtAt) });
}

async function init() {
  try {
    data = await (await fetch("data/spring2027.json?v=7")).json();
  } catch (err) {
    $("course").innerHTML = `<p class="nodata">${esc(t("loadFailed"))}</p>`;
    console.error(err);
    return;
  }
  const rerender = () => { render(); renderFooter(); };
  onLangChange(rerender);
  rerender();
}

init();
