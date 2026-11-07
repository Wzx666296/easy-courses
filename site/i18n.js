// Shared Chinese / English strings and the language switch used by every page.
//
// Usage: static text gets data-i18n="key" (or data-i18n-placeholder / data-i18n-aria-label);
// JS calls t("key", {vars}). Language comes from ?lang=, then the saved choice, then the browser.

const STRINGS = {
  zh: {
    // shared
    "nav.search": "全部课程查询",
    "nav.spring": "2027 春清单",
    "lang.label": "语言",
    "loadFailed": "数据加载失败。请用 README 里的命令启动本地服务器（直接双击 HTML 文件打不开数据）。",
    "students": "{n} 人",

    // main search page
    "search.title": "UIUC 水课查询",
    "search.docTitle": "UIUC 水课查询",
    "search.sub": "按 Gen Ed、课号、老师找给分高的课。数据来自 UIUC 公开成绩分布，",
    "search.range": "统计 {since}–{max} 年，共 {count} 门课。",
    "search.filters": "筛选条件",
    "search.q": "搜索",
    "search.qPlaceholder": "课号或课名，如 CS 124、ECON、psychology",
    "search.gened": "Gen Ed",
    "search.subject": "院系",
    "search.level": "课程级别",
    "search.minStudents": "最少学生数",
    "search.sort": "排序",
    "search.recent": "只看最近两年开过的",
    "all": "全部",
    "noLimit": "不限",
    "level.n": "{n}00 级",
    "level.5": "500 级及以上",
    "sort.gpa": "平均 GPA",
    "sort.aRate": "拿 A 比例",
    "sort.students": "学生数",
    "sort.code": "课号",
    "col.course": "课程",
    "col.gpa": "平均 GPA",
    "col.aRate": "A 比例",
    "col.students": "学生数",
    "more": "显示更多",
    "loading": "加载数据中…",
    "found": "找到 {n} 门课",
    "noneFound": "没有符合条件的课，试试放宽筛选（比如把「最少学生数」改成不限）。",
    "close": "关闭",
    "detail.gpa": "平均 GPA",
    "detail.aRate": "拿 A 比例",
    "detail.wRate": "退课 (W) 比例",
    "detail.meta": "{students} 名学生 · {terms} 个学期 · 最近开课 {last}",
    "detail.byTeacher": "按老师（GPA 从高到低）",
    "detail.teacher": "老师",
    "detail.a": "A",
    "detail.students": "学生",
    "detail.last": "最近",
    "detail.reviews": "朋友评价",
    "detail.noReviews": "还没有评价。（在 site/data/reviews.json 里添加）",
    "detail.anon": "匿名",
    "detail.easiness": "水度 {r}/5",
    "search.footer": "数据：<a href=\"https://github.com/wadefagen/datasets\">wadefagen/datasets</a>（GPA 数据集与 Gen Ed 列表）。GPA 不含 W；A 比例 = A+/A/A- 占比。仅供参考，选课前请看最新 Course Explorer。",
    "gened.all": "全部（含非 Gen Ed）",
    "gened.any": "任意 Gen Ed",
    "gened.ACP": "ACP 高级写作",
    "gened.CS": "Cultural Studies（任意）",
    "gened.NW": "  └ NW 非西方文化",
    "gened.WCC": "  └ WCC 西方/比较文化",
    "gened.US": "  └ US 美国少数族裔文化",
    "gened.HUM": "Humanities（任意）",
    "gened.HP": "  └ HP 历史与哲学",
    "gened.LA": "  └ LA 文学与艺术",
    "gened.NAT": "Natural Sciences（任意）",
    "gened.LS": "  └ LS 生命科学",
    "gened.PS": "  └ PS 物理科学",
    "gened.QR": "Quantitative Reasoning（任意）",
    "gened.QR1": "  └ QR1",
    "gened.QR2": "  └ QR2",
    "gened.SBS": "Social & Behavioral（任意）",
    "gened.BSC": "  └ BSC 行为科学",
    "gened.SS": "  └ SS 社会科学",

    // spring 2027 page
    "spring.docTitle": "2027 春水课清单",
    "spring.title": "2027 春水课清单",
    "spring.intro": "我们挑出的 {total} 门课里，{offered} 门 2027 春开课。每门课按 2027 春实际授课老师的历史成绩排序。",
    "spring.filters": "筛选",
    "spring.genedGroup": "Gen Ed 类别",
    "spring.mode": "形式",
    "spring.mode.online": "有线上班",
    "spring.mode.inperson": "有线下班",
    "spring.half": "时间",
    "spring.half.A": "有前八周班",
    "spring.half.B": "有后八周班",
    "spring.sort": "排序",
    "spring.sort.aRate": "最佳老师 A 率（A+/A）",
    "spring.sort.aRateInclMinus": "最佳老师 A 率（含 A-）",
    "spring.sort.gpa": "最佳老师 GPA",
    "spring.sort.code": "课号",
    "spring.showTA": "显示讨论课老师",
    "spring.count": "{n} 门课",
    "spring.none": "没有符合条件的课。",
    "spring.notOfferedTitle": "2027 春不开的课",
    "cat.SBS": "社会与行为科学",
    "cat.HUM": "人文与艺术",
    "cat.NAT": "自然科学",
    "cat.CS": "文化研究",
    "cat.ACP": "高级写作 ACP",
    "cat.QR": "定量推理 QR",
    "code.SS": "SBS·社会科学", "code.BSC": "SBS·行为科学", "code.HP": "HUM·历史哲学", "code.LA": "HUM·文学艺术",
    "code.LS": "NAT·生命科学", "code.PS": "NAT·物理科学", "code.NW": "CS·非西方", "code.WCC": "CS·西方",
    "code.US": "CS·美国少数族裔", "code.CLL": "ACP", "code.QR1": "QR1", "code.QR2": "QR2",
    "notGened": "不是 Gen Ed",
    "big.aRate": "A 率（A+/A）",
    "big.aRateInclMinus": "A 率（含 A-）",
    "big.gpa": "平均 GPA",
    "big.who": "↑ {name} 教这门课的历史成绩",
    "th.teacher": "2027 春老师",
    "th.a": "A",
    "th.am": "含A-",
    "th.gpa": "GPA",
    "th.n": "人数",
    "role.discussion": "讨论课",
    "mode.online": "线上",
    "mode.inperson": "线下",
    "half.A": "前八周",
    "half.B": "后八周",
    "sections": "{n} 个 section",
    "note.smallSample": "样本小（{n} 人）",
    "note.nameMatch": "按姓氏匹配（WAF 名为 {name}）",
    "note.noData": "没有这位老师教这门课的记录",
    "status.noTeacher": "已开课，老师未公布，下面是整门课的历史数据。",
    "taHidden": "另有 {n} 位讨论课老师（勾选上方「显示讨论课老师」查看）",
    "crossList": "与 {code} 是同一门课，成绩按 {code} 统计",
    "overall": "整门课历史：A 率 {a} · 含 A- {am} · GPA {gpa} · {n} 人",
    "spring.footer": "成绩数据：<a href=\"{grades}\">WAF · Grade Disparities and Accolades by Instructor</a>（每位老师教该课的全部历史学期）。老师名单：<a href=\"{schedule}\">Course Explorer 2027 春课表</a>，{date} 抓取。A 率（A+/A）不含 A-；排序用学生数 ≥ {min} 的主讲老师。历史数据不代表未来，选课前请再看一眼官方课表。",
  },

  en: {
    "nav.search": "All courses",
    "nav.spring": "Spring 2027 list",
    "lang.label": "Language",
    "loadFailed": "Couldn't load the data. Start the local server with the command in the README (opening the HTML file directly won't work).",
    "students": "{n} students",

    "search.title": "UIUC Easy Course Finder",
    "search.docTitle": "UIUC Easy Courses",
    "search.sub": "Find generously graded courses by Gen Ed, course number or instructor. Based on UIUC's public grade distributions, ",
    "search.range": "{since}–{max}, {count} courses.",
    "search.filters": "Filters",
    "search.q": "Search",
    "search.qPlaceholder": "Course number or title, e.g. CS 124, ECON, psychology",
    "search.gened": "Gen Ed",
    "search.subject": "Subject",
    "search.level": "Level",
    "search.minStudents": "Min. students",
    "search.sort": "Sort by",
    "search.recent": "Offered in the last two years",
    "all": "All",
    "noLimit": "Any",
    "level.n": "{n}00 level",
    "level.5": "500 level and up",
    "sort.gpa": "Average GPA",
    "sort.aRate": "Share of A's",
    "sort.students": "Students",
    "sort.code": "Course number",
    "col.course": "Course",
    "col.gpa": "Avg GPA",
    "col.aRate": "A's",
    "col.students": "Students",
    "more": "Show more",
    "loading": "Loading data…",
    "found": "{n} courses found",
    "noneFound": "No courses match. Try loosening the filters (e.g. set Min. students to Any).",
    "close": "Close",
    "detail.gpa": "Average GPA",
    "detail.aRate": "Share of A's",
    "detail.wRate": "Withdrawals (W)",
    "detail.meta": "{students} students · {terms} terms · last offered {last}",
    "detail.byTeacher": "By instructor (highest GPA first)",
    "detail.teacher": "Instructor",
    "detail.a": "A",
    "detail.students": "Students",
    "detail.last": "Last",
    "detail.reviews": "Friends' reviews",
    "detail.noReviews": "No reviews yet. (Add them in site/data/reviews.json)",
    "detail.anon": "Anonymous",
    "detail.easiness": "easiness {r}/5",
    "search.footer": "Data: <a href=\"https://github.com/wadefagen/datasets\">wadefagen/datasets</a> (GPA dataset and Gen Ed list). GPA excludes W; share of A's = A+/A/A-. For reference only — check the latest Course Explorer before registering.",
    "gened.all": "All (incl. non-Gen Ed)",
    "gened.any": "Any Gen Ed",
    "gened.ACP": "ACP Advanced Composition",
    "gened.CS": "Cultural Studies (any)",
    "gened.NW": "  └ NW Non-Western",
    "gened.WCC": "  └ WCC Western/Comparative",
    "gened.US": "  └ US Minority Cultures",
    "gened.HUM": "Humanities (any)",
    "gened.HP": "  └ HP Historical & Philosophical",
    "gened.LA": "  └ LA Literature & Arts",
    "gened.NAT": "Natural Sciences (any)",
    "gened.LS": "  └ LS Life Sciences",
    "gened.PS": "  └ PS Physical Sciences",
    "gened.QR": "Quantitative Reasoning (any)",
    "gened.QR1": "  └ QR1",
    "gened.QR2": "  └ QR2",
    "gened.SBS": "Social & Behavioral (any)",
    "gened.BSC": "  └ BSC Behavioral Sciences",
    "gened.SS": "  └ SS Social Sciences",

    "spring.docTitle": "Spring 2027 Easy Courses",
    "spring.title": "Spring 2027 easy course list",
    "spring.intro": "{offered} of the {total} courses we picked are offered in Spring 2027, ranked by the past grades of the instructors actually teaching them.",
    "spring.filters": "Filters",
    "spring.genedGroup": "Gen Ed category",
    "spring.mode": "Format",
    "spring.mode.online": "Has online sections",
    "spring.mode.inperson": "Has in-person sections",
    "spring.half": "Timing",
    "spring.half.A": "Has first 8-week sections",
    "spring.half.B": "Has second 8-week sections",
    "spring.sort": "Sort by",
    "spring.sort.aRate": "Best instructor A rate (A+/A)",
    "spring.sort.aRateInclMinus": "Best instructor A rate (incl. A-)",
    "spring.sort.gpa": "Best instructor GPA",
    "spring.sort.code": "Course number",
    "spring.showTA": "Show discussion instructors",
    "spring.count": "{n} courses",
    "spring.none": "No courses match.",
    "spring.notOfferedTitle": "Not offered in Spring 2027",
    "cat.SBS": "Social & Behavioral",
    "cat.HUM": "Humanities & Arts",
    "cat.NAT": "Natural Sciences",
    "cat.CS": "Cultural Studies",
    "cat.ACP": "Adv. Composition",
    "cat.QR": "Quantitative Reasoning",
    "code.SS": "SBS·Social Sci", "code.BSC": "SBS·Behavioral Sci", "code.HP": "HUM·Hist & Phil", "code.LA": "HUM·Lit & Arts",
    "code.LS": "NAT·Life Sci", "code.PS": "NAT·Physical Sci", "code.NW": "CS·Non-Western", "code.WCC": "CS·Western",
    "code.US": "CS·US Minority", "code.CLL": "ACP", "code.QR1": "QR1", "code.QR2": "QR2",
    "notGened": "Not a Gen Ed",
    "big.aRate": "A rate (A+/A)",
    "big.aRateInclMinus": "A rate (incl. A-)",
    "big.gpa": "Average GPA",
    "big.who": "↑ {name}'s past grades in this course",
    "th.teacher": "Spring 2027 instructor",
    "th.a": "A",
    "th.am": "incl. A-",
    "th.gpa": "GPA",
    "th.n": "Students",
    "role.discussion": "discussion",
    "mode.online": "Online",
    "mode.inperson": "In person",
    "half.A": "first 8 weeks",
    "half.B": "second 8 weeks",
    "sections": "{n} sections",
    "note.smallSample": "Small sample ({n} students)",
    "note.nameMatch": "Matched by last name (WAF lists {name})",
    "note.noData": "No record of this instructor teaching this course",
    "status.noTeacher": "Offered, instructor not announced yet. Course-wide history below.",
    "taHidden": "{n} more discussion instructors (tick “Show discussion instructors” above)",
    "crossList": "Same course as {code}; grades counted under {code}",
    "overall": "Whole course history: A rate {a} · incl. A- {am} · GPA {gpa} · {n} students",
    "spring.footer": "Grades: <a href=\"{grades}\">WAF · Grade Disparities and Accolades by Instructor</a> (all past terms of each instructor in the course). Instructors: <a href=\"{schedule}\">Course Explorer Spring 2027 schedule</a>, fetched {date}. A rate (A+/A) excludes A-; ranking uses lead instructors with ≥ {min} students. Past grades don't guarantee future ones — check the official schedule before registering.",
  },
};

const LANGS = [["zh", "中文"], ["en", "EN"]];

function detectLang() {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (STRINGS[fromUrl]) return fromUrl;
  try {
    const saved = localStorage.getItem("lang");
    if (STRINGS[saved]) return saved;
  } catch (_) { /* storage unavailable */ }
  return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
}

let LANG = detectLang();
const langListeners = [];

function t(key, vars = {}) {
  const s = STRINGS[LANG][key] ?? STRINGS.zh[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

function applyStatic() {
  document.documentElement.lang = LANG === "zh" ? "zh-CN" : "en";
  const titleKey = document.documentElement.dataset.titleKey;
  if (titleKey) document.title = t(titleKey);
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-html]")) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll("[data-i18n-aria-label]")) el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  for (const btn of document.querySelectorAll(".lang-switch button")) btn.setAttribute("aria-pressed", String(btn.dataset.lang === LANG));
  // Keep the language when moving between pages.
  for (const a of document.querySelectorAll("a[data-keep-lang]")) {
    const url = new URL(a.getAttribute("href"), location.href);
    url.searchParams.set("lang", LANG);
    a.href = url.pathname.split("/").pop() + url.search;
  }
}

function setLang(lang) {
  if (!STRINGS[lang] || lang === LANG) return;
  LANG = lang;
  try { localStorage.setItem("lang", lang); } catch (_) { /* ignore */ }
  const url = new URL(location.href);
  url.searchParams.set("lang", lang);
  history.replaceState(null, "", url);
  applyStatic();
  langListeners.forEach((fn) => fn());
}

function onLangChange(fn) { langListeners.push(fn); }

function mountLangSwitch() {
  for (const box of document.querySelectorAll(".lang-switch")) {
    box.innerHTML = LANGS.map(([code, label]) => `<button type="button" data-lang="${code}">${label}</button>`).join("");
    box.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lang]");
      if (btn) setLang(btn.dataset.lang);
    });
  }
  applyStatic();
}

mountLangSwitch();
