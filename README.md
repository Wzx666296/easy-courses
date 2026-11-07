# UIUC 水课查询 (easy-courses)

帮朋友找 UIUC 给分高的课：按 Gen Ed / 院系 / 课程级别筛选，按平均 GPA 或拿 A 比例排序，点开一门课能看到每个老师的给分情况和朋友评价。

纯静态网站：一个 Python 脚本把公开数据处理成 JSON，前端是 HTML + 原生 JS，不需要安装任何依赖。

## 运行

只需要 Python 3（macOS 自带）。

```bash
python3 -m http.server 8124 --directory site
```

然后打开 <http://localhost:8124>。（不能直接双击 `index.html`，浏览器会拦掉读取 JSON 数据。）

## 更新数据

```bash
python3 scripts/build_data.py --refresh
```

会重新下载源 CSV 到 `data/raw/`（不进 git），并生成 `site/data/courses.json`。默认只统计 2021 年以后的成绩，用 `--since 2018` 之类改起始年份。

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
scripts/build_data.py   下载 + 汇总数据
site/index.html         页面
site/app.js             筛选、排序、详情
site/style.css          样式（自动适配深色模式和手机）
site/data/courses.json  生成的数据（提交到 git，方便直接部署）
site/data/reviews.json  朋友评价
```

## 之后可以做

- 朋友在网页上直接提交评价（例如 Google Form → 表格，或接 Supabase 这类免费后端）
- 部署到 GitHub Pages，发链接给朋友
- 加"同时满足两个 Gen Ed"的筛选
