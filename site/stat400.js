// STAT 400 (Spring 2027) seat watch: lecture and discussion status from data/status.json.
// Uses i18n.js (t, LANG, onLangChange) and spring-common.js helpers.
const CODE = "STAT 400";
const PAGE = "https://courses.illinois.edu/schedule/2027/spring/STAT/400";
const REGISTER = "https://go.illinois.edu/RegisterForClasses";

const ext = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>`;
const isLecture = (s) => /Lecture/.test(s.type || "");

function rows(list) {
  return list.map(([sec, s]) => `<tr class="head">
      <td><b>${esc(sec)}</b></td>
      <td>${availDot(s.status)}</td>
      <td class="num">${esc(s.crn)}</td>
      <td>${esc([s.days, s.time].filter(Boolean).join(" "))}</td>
      <td class="hide-xs">${esc(s.instructor || "—")}</td>
    </tr>`).join("");
}
function table(list) {
  return `<table class="teachers stat-table">
    <thead><tr><th>${esc(t("stat.sec"))}</th><th>${esc(t("stat.status"))}</th><th class="num">CRN</th><th>${esc(t("stat.time"))}</th><th class="hide-xs">${esc(t("th.teacher"))}</th></tr></thead>
    <tbody>${rows(list)}</tbody></table>`;
}

function render() {
  const st = statusOf(CODE);
  if (!st) {
    $("course").innerHTML = `<p class="nodata">${esc(t("stat.none"))} ${ext(PAGE, "Course Explorer")}</p>`;
    return;
  }
  const secs = Object.entries(st.sections).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));
  const lec = secs.filter(([, s]) => isLecture(s));
  const disc = secs.filter(([, s]) => !isLecture(s));
  const openLec = lec.filter(([, s]) => s.status === "open").map(([k]) => k);
  const headline = openLec.length
    ? `<p class="stat-big av-open"><i></i>${esc(t("stat.open", { list: openLec.join(", ") }))}</p>`
    : `<p class="stat-big av-closed"><i></i>${esc(t("stat.closed"))}</p>`;

  $("course").innerHTML = `<div class="course-head">
      <h1>STAT 400${LANG === "zh" ? `<span class="zh">统计与概率 I</span>` : ""}</h1>
      <p class="en">Statistics and Probability I · Spring 2027</p>
    </div>
    ${headline}
    <p class="source">${esc(t("avail.caveat", { age: statusAge() }))} · ${ext(PAGE, t("avail.live"))} · ${ext(REGISTER, t("stat.register"))}</p>
    <section class="panel wide"><h2>${esc(t("stat.lectures"))}</h2>${table(lec)}</section>
    <section class="panel wide"><h2>${esc(t("stat.discussions"))}</h2>${table(disc)}
      ${st.info.length ? `<p class="source" lang="en">${esc(st.info[0])}</p>` : ""}</section>
    <section class="panel wide"><h2>${esc(t("stat.alertTitle"))}</h2><p>${esc(t("stat.alert"))}</p></section>`;
}

async function init() {
  await loadStatus();
  onLangChange(render);
  render();
}
init();
