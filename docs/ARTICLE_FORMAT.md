# 文章格式协议（ARTICLE_FORMAT）

> 本文档定义「超智全球视野」网站所有 Markdown 文章的格式规范。
> 适用于 [`articles`](src/content.config.ts:187)（公开）与 [`demo`](src/content.config.ts:199)（本地内部）两个 Collection。

---

## 1. 目录结构

每篇文章使用独立文件夹，正文文件固定为 `index.md`。

```
src/content/articles/<slug>/index.md          ← 公开文章
src/content/articles/<slug>/images/cover.webp ← 文章专属图片（可选）
src/content/_demo/<slug>/index.md              ← 本地 Demo（内部报告/测试，不发布）
src/content/_demo/<slug>/images/cover.svg      ← Demo 图片（可选）
```

### 1.1 slug 规则

- `<slug>` 即文章 ID，由文件夹名决定（[`generateId`](src/content.config.ts:174) 取父文件夹名）。
- 使用英文小写 + 连字符，如 `hpc-ai-for-science-observation-plan-launched`。
- 内部报告可带日期后缀，如 `us-genesis-mission-progress-20261113`。
- **不要直接命名为 `index`**，否则所有 `index.md` 会冲突。

### 1.2 为什么用文件夹而非单文件？

- 图片等资源与正文同目录，相对路径引用清晰。
- 未来可扩展每篇文章的附件、数据文件。
- `generateId` 取父文件夹名，避免多个 `index.md` ID 冲突。

---

## 2. Frontmatter（YAML 元数据）

文件首部用 `---` 包裹的 YAML 块。完整字段定义见 [`articleSchema`](src/content.config.ts:42)。

### 2.1 字段速查

| 字段 | 类型 | 必填条件 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 必填 | 文章标题，非空 |
| `summary` | string | 必填 | 摘要，非空，建议 80–200 字 |
| `tags` | string[] | 必填（≥1） | 自由标签数组，无预设枚举 |
| `articleSource` | `'agent' \| 'curated'` | 必填 | 默认 `agent`。来源类型 |
| `status` | `'draft' \| 'approved'` | 必填 | 默认 `draft`。审核状态 |
| `agent` | string | agent 时必填 | Agent 名称/版本。curated 时**禁止**填写 |
| `generatedAt` | ISO datetime | agent 时必填 | Agent 生成时刻。curated 时**禁止**填写 |
| `curatedAt` | ISO datetime | curated 时必填 | 人工整理时刻 |
| `publishedAt` | ISO datetime | approved 时建议 | 发布时间。无此字段的文章不会被公开读取 |
| `eventDate` | ISO date | 可选 | 原始事件发生日期（仅日期） |
| `coverImage` | string | 可选 | 相对文章文件夹的路径，如 `images/cover.webp` |
| `sourceType` | enum | 可选 | `report`/`press-release`/`docx`/`web`/`research`/`other` |
| `internal` | boolean | 可选 | 默认 `false`。仅 Demo 内部资料设为 `true` |

### 2.2 ISO 8601 日期格式

YAML 会将 ISO 8601 字符串自动解析为 Date 对象，Schema 使用 [`z.coerce.date()`](src/content.config.ts:35) 接受。

- **datetime 字段**（generatedAt / curatedAt / publishedAt）：带时区
  ```yaml
  curatedAt: 2026-11-13T00:00:00+08:00
  publishedAt: 2026-11-15T10:00:00+08:00
  ```
- **date 字段**（eventDate）：仅日期
  ```yaml
  eventDate: 2026-10-18
  ```

### 2.3 跨字段校验规则

[`superRefine`](src/content.config.ts:110) 实现以下约束：

| articleSource | 必填 | 禁填 |
| --- | --- | --- |
| `agent` | `agent`, `generatedAt` | `curatedAt` |
| `curated` | `curatedAt` | `agent`, `generatedAt` |

此外：`status='approved'` 且无 `publishedAt` 会触发警告（不阻断校验，但该文章不会被公开读取接口返回）。

---

## 3. 正文 Markdown 规范

### 3.1 支持的语法

使用标准 Markdown + GitHub Flavored Markdown（GFM）：

- **标题**：`#`–`######`，正文从 `##`（H2）开始，`#`（H1）预留给文章标题渲染。
- **段落**：空行分隔。
- **强调**：`**加粗**`、`*斜体*`。
- **列表**：有序 `1.` / 无序 `-`，可嵌套。
- **引用**：`> 引用内容`。
- **链接**：`[文本](URL)`。
- **图片**：`![alt](相对路径)`，路径相对文章文件夹。
- **表格**：GFM 管道表格（`| 列 | 列 |` + `| --- | --- |`），**不得无说明地删除**。
- **行内代码**：`` `code` ``。
- **代码块**：```` ```lang ```` 围栏。
- **删除线**：`~~文本~~`。

### 3.2 禁止事项

| 禁止 | 原因 |
| --- | --- |
| ❌ HTML 标签（`<div>`、`<span>` 等） | Agent 不应注入 HTML/CSS，保持内容与样式分离 |
| ❌ `<style>` 块或内联样式 | 样式统一由网站 CSS 系统管理 |
| ❌ `<script>` | 静态站点不执行脚本 |
| ❌ 外部 CSS 引用 | 同上 |
| ✅ 允许 Markdown 中的简单 HTML 实体（如 `&`） | 属于文本转义，非结构注入 |

### 3.3 结构建议

```markdown
---
title: ...
summary: ...
...（frontmatter）
---

（可选）引导语或重要提示引用块。

## 一 主要章节

正文段落。

### 子章节

更多内容。

## 二 ...

## 参考资料

- [1] 来源说明
- [2] ...
```

### 3.4 参考资料标注

- 正文引用用方括号编号：`[1]`、`[2–5]`、`[1][4]`。
- 文末「主要参考资料」/「参考资料」章节逐条列出，每条含来源机构、日期、标题。
- 内部报告的参考资料编号应与原文一致，便于追溯。

---

## 4. 内容隔离规范（内部报告）

### 4.1 哪些内容放入 `_demo/`

- 未公开发布的内部研究报告（docx 转换件）。
- 开发测试文章（带图片测试、Schema 错误测试等）。
- 任何不应出现在公开仓库或线上站点的材料。

### 4.2 隔离机制（双重保障）

1. **`.gitignore` 排除**：`src/content/_demo/` 整个目录不提交到 Git。
2. **环境门控**：[`demoPattern`](src/content.config.ts:27) 在 `import.meta.env.PROD`（生产构建）时为空数组 `[]`，demo Collection 不加载任何文件；开发环境正常加载。

### 4.3 内部报告 frontmatter 要求

```yaml
articleSource: curated
status: draft
sourceType: report
internal: true
```

并在正文开头添加醒目声明：

```markdown
> **本文件为内部研究报告的本地转换 Demo，仅供开发测试，不属于公开内容，不应提交到公开仓库或发布到线上。** 原始文件：`素材/xxx.docx`。
```

---

## 5. 文章状态与公开读取

### 5.1 状态流转

```
draft ──(审核通过 + 补充 publishedAt)──→ approved
```

### 5.2 公开读取条件

[`getPublishedArticles()`](src/utils/articles.ts:1) 仅返回同时满足以下条件的文章：

1. `status === 'approved'`
2. `publishedAt` 字段存在

草稿（`draft`）和已审核但缺 `publishedAt` 的文章都不会出现在公开列表。

---

## 6. 示例

### 6.1 人工整理的公开文章（curated + approved）

```yaml
---
title: HPC+AI for Science 前沿观察计划正式启动
summary: ...
tags: [超智融合, AI for Science]
articleSource: curated
status: approved
curatedAt: 2026-11-15T09:00:00+08:00
eventDate: 2026-10-18
publishedAt: 2026-11-15T10:00:00+08:00
sourceType: press-release
---
```

### 6.2 Agent 生成的文章（agent）

```yaml
---
title: ...
summary: ...
tags: [AI for Science]
articleSource: agent
status: draft
agent: gpt-4-research-v1
generatedAt: 2026-11-16T14:30:00+08:00
---
```

### 6.3 内部报告 Demo（curated + draft + internal）

```yaml
---
title: 美国创世纪计划进展及对我国的启示与建议
summary: ...
tags: [创世纪计划, AI for Science]
articleSource: curated
status: draft
curatedAt: 2026-11-13T00:00:00+08:00
eventDate: 2026-11-13
sourceType: report
internal: true
---
```

---

## 7. 校验错误排查

| 错误信息 | 原因 | 解决 |
| --- | --- | --- |
| `title: Required` | 写入过程中瞬时错误，或确实缺失 | 等待 "Reloaded data"；若持续，检查 frontmatter |
| `title 不能为空` | title 为空字符串 | 填写非空标题 |
| `summary 不能为空` | summary 为空字符串 | 填写非空摘要 |
| `至少需要一个标签` | tags 为空数组或缺失 | 添加至少一个标签 |
| `Agent 生成文章必须填写 agent 标识` | articleSource=agent 但无 agent | 填写 agent 字段 |
| `人工整理文章必须填写 curatedAt` | articleSource=curated 但无 curatedAt | 填写 curatedAt |
| `人工整理文章不得填写 agent` | curated 文章误填了 agent | 删除 agent 字段 |

> **注意**：文件写入过程中可能出现瞬时 "Required" 错误，随后 "Reloaded data" 成功重载。这是 Astro glob-loader 文件监视器在文件未完整写入时触发的，非真实校验失败。持续报错才是真实问题。
