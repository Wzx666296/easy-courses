# UIUC 水课查询 (easy-courses)

帮朋友找 UIUC 给分高的课：按 Gen Ed / 院系 / 课程级别筛选，按平均 GPA 或拿 A 比例排序，点开一门课能看到每个老师的给分情况和朋友评价。

页面支持中文 / English 切换（右上角），也可以用网址参数 `?lang=en` 直接打开英文版。

纯静态网站：一个 Python 脚本把公开数据处理成 JSON，前端是 HTML + 原生 JS，不需要安装任何依赖。

## 运行

只需要 Python 3（macOS 自带）。

```bash
python3 -m http.server 8124 --directory site
```

然后打开 <http://localhost:8124>（首页）。（不能直接双击 `index.html`，浏览器会拦掉读取 JSON 数据。）

## 更新数据

```bash
python3 scripts/build_data.py --refresh
```

会重新下载源 CSV 到 `data/raw/`（不进 git），并生成 `site/data/courses.json`。默认只统计 2021 年以后的成绩，用 `--since 2018` 之类改起始年份。

## 2027 春清单（spring2027.html）

我们自己挑的一批 Gen Ed 课，按 2027 春**实际授课老师**的历史成绩排序。

- 课程清单：`data/spring2027/courses.csv`（课号 + 中文名，增删课改这里）
- 成绩：WAF [Grade Disparities and Accolades by Instructor](https://waf.cs.illinois.edu/visualizations/Grade-Disparities-and-Accolades-by-Instructor/) 的 `final.csv`，每位老师教该课的全部历史学期
- 老师名单、线上/线下、前/后八周：Course Explorer 2027 春课表 API
- 两种 A 率：A+/A，以及含 A-

```bash
python3 scripts/build_spring2027.py --refresh
```

生成 `site/data/spring2027.json`（网页用）和 `data/spring2027/courses-checked.csv`（人工核对用，Excel 可打开）。不加 `--refresh` 会用 `data/raw/` 里的缓存。

## 线上地址与部署

网站：<https://wzx666296.github.io/easy-courses/>

`.github/workflows/deploy.yml` 把 `site/` 发布到 GitHub Pages：每次推送到 `main`、每次数据自动更新成功后都会重新部署，也可以在 Actions 页面手动运行。

## 自动更新数据

`.github/workflows/update-data.yml` 每周一 14:00 UTC（香槟时间早上 8–9 点）自动运行：重新下载 Course Explorer 2027 春课表、WAF 成绩和 GPA 数据集，重新生成 `site/data/` 和 `data/spring2027/courses-checked.csv`，有变化就自动提交。也可以在 GitHub 仓库的 Actions 页面点 "Run workflow" 手动触发。

- 需要先把仓库推到 GitHub 才会运行。
- 如果新下载的数据明显不对（比如课表接口挂了、开课数骤减、成绩文件解析失败），脚本会报错退出、保留旧数据，不会把网站弄坏。需要强制覆盖时本地加 `--force`。
- 首页显示的"数据更新于"是数据**最后一次真正变化**的日期，没有变化时不会每周刷新。

## 图标和分享卡片

Logo 是"拭目以待"徽章（原图 `assets/mascot.jpg`）。网站图标、主屏幕图标和分享卡片都在 `site/img/`，换图后用 macOS 自带的 Swift 重新生成：

```bash
swift scripts/brand/make_icons.swift assets/mascot.jpg site/img
```

```bash
swift scripts/brand/make_share_card.swift site/img/logo-512.png site/img/og.png
```

`og:image` 用的是线上完整网址（`https://wzx666296.github.io/easy-courses/img/og.png`），换域名时记得一起改。

## 课程详情页（course.html）

清单里每门课点进去是 `course.html?code=ANTH-103`：官方课程描述、2027 春老师与上课时间、历史成绩、成绩构成、往年 syllabus 和 Reddit。

- 描述来自 Course Explorer（不开课的课用课程目录补）。
- 成绩构成、syllabus、Reddit 帖子是**手动收录**的，写在 `data/spring2027/extras.json`，改完重新跑 `python3 scripts/build_spring2027.py`。只收录自己打开核实过的来源，格式见文件里的 `_example`。
- 没收录的课会显示"在网上搜索 syllabus"和"在 r/UIUC 搜索"两个链接。
- 老师的"UIUC 主页"按钮来自 `data/spring2027/teacher-links.json`（老师名 → illinois.edu 个人页），只收录搜到或打开确认过的个人页；没有的老师不显示这个按钮。

## 朋友评价

目前手动维护在 `site/data/reviews.json`：

```json
{
  "reviews": {
    "ANTH 103": [
      { "text": "每周一个小作业，考试开卷", "author": "小王", "term": "Fall 2025", "rating": 5 }
    ]
  }
}
```

`author` / `term` / `rating`（水度 1–5）都是可选的。

## 数据来源

- 成绩分布：[wadefagen/datasets › gpa](https://github.com/wadefagen/datasets/tree/main/gpa)（Wade Fagen-Ulmschneider 整理的 UIUC 公开成绩数据）
- Gen Ed 列表：[wadefagen/datasets › geneds](https://github.com/wadefagen/datasets/tree/main/geneds)

GPA 计算不含 W；A 比例 = A+/A/A- 占全部有成绩学生的比例。

## 目录

```
scripts/build_data.py   下载 + 汇总数据（全部课程）
scripts/build_spring2027.py  2027 春清单数据
site/spring2027.html    2027 春清单页面
site/course.html        课程详情页
site/spring-common.js   清单页和详情页共用的渲染函数
site/index.html         首页（搜索、本学期 A 率前几名、入口）
site/search.html        全部课程查询
site/app.js             筛选、排序、详情
site/i18n.js            中英文文案 + 语言切换（两个页面共用）
site/style.css          样式（自动适配深色模式和手机）
site/data/courses.json  生成的数据（提交到 git，方便直接部署）
site/data/reviews.json  朋友评价
```

## 之后可以做

- 朋友在网页上直接提交评价（例如 Google Form → 表格，或接 Supabase 这类免费后端）
- 部署到 GitHub Pages，发链接给朋友
- 加"同时满足两个 Gen Ed"的筛选
