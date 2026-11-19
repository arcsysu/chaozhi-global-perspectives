# 超智全球视野 — 响应式布局与多屏适配审计报告

> **审计性质：只读审计，未修改任何源文件**
> **审计日期：2026-11-19**
> **审计方法：Playwright 实际渲染 7 视口 × 5 页面 + CSS 静态分析**
> **测试脚本：[`tests/viewport-layout-audit.mjs`](tests/viewport-layout-audit.mjs) / [`tests/viewport-metrics-detail.mjs`](tests/viewport-metrics-detail.mjs)**

---

## 一、现状审计报告

### 1.1 断点体系现状

项目定义了 4 个断点变量（[`global.css`](src/styles/global.css):16-19），但**实际使用高度碎片化**，存在 9+ 种不同断点值：

| 断点值 | 使用文件 | 用途 |
|--------|---------|------|
| `768px` | [`global.css`](src/styles/global.css), [`Header.astro`](src/components/Header.astro), [`HomeLayout.astro`](src/layouts/HomeLayout.astro), [`Footer.astro`](src/components/Footer.astro), [`SearchPanel.astro`](src/components/SearchPanel.astro), [`ParticleBackground.astro`](src/components/ParticleBackground.astro), [`ArticleNav.astro`](src/components/ArticleNav.astro) | 移动端切换 |
| `1024px` | [`HomeLayout.astro`](src/layouts/HomeLayout.astro) | Hero 网格缩小 |
| `1023px` | [`ArticleLayout.astro`](src/layouts/ArticleLayout.astro), [`article-prose.css`](src/styles/article-prose.css) | 文章三栏→两栏 |
| `767px` | [`ArticleLayout.astro`](src/layouts/ArticleLayout.astro), [`article-prose.css`](src/styles/article-prose.css), [`ReadingProgressBar.astro`](src/components/ReadingProgressBar.astro) | 文章两栏→单栏 |
| `960px` | [`about/index.astro`](src/pages/about/index.astro), [`archive/index.astro`](src/pages/archive/index.astro), [`topics/index.astro`](src/pages/topics/index.astro) | 编辑型页面中栏→窄栏 |
| `640px` | [`ArticleCard.astro`](src/components/ArticleCard.astro) | 卡片缩略图缩小 |
| `620px` | [`about/index.astro`](src/pages/about/index.astro), [`archive/index.astro`](src/pages/archive/index.astro), [`topics/index.astro`](src/pages/topics/index.astro) | 编辑型页面窄栏→紧凑 |
| `480px` | [`Pagination.astro`](src/components/Pagination.astro) | 分页隐藏文字 |
| `380px` | [`about/index.astro`](src/pages/about/index.astro), [`archive/index.astro`](src/pages/archive/index.astro) | 超小屏单列 |

**关键问题：**
- **1024px–1920px 之间完全无断点**：容器宽度始终 1152px（72rem），在 1280/1366 小屏桌面上占据视口 84%–90%，留白严重不足
- **断点边界不统一**：`1024` vs `1023`、`768` vs `767` 相差 1px，虽不影响功能但增加维护成本
- **`global.css` 定义的 `--bp-sm/md/lg/xl` 变量几乎未被引用**：各文件直接写硬编码数值

### 1.2 容器宽度约束

核心约束定义在 [`global.css`](src/styles/global.css):

```css
--width-content: 72rem;     /* 1152px — 所有页面的最大宽度 */
--space-lg: 1.5rem;          /* 24px — 容器左右 padding */
--height-header: 4.5rem;     /* 72px — 桌面 Header 高度 */
--height-header-mobile: 4rem;/* 64px — 移动 Header 高度 */
```

**实测容器留白矩阵（Playwright 渲染数据）：**

| 视口宽度 | 容器宽度 | 左留白 | 右留白 | 留白率 | 视觉评估 |
|---------|---------|--------|--------|--------|---------|
| 1920px | 1150px | 378px | 393px | **0.40** | 空旷，内容居中但两侧大面积留白 |
| 1600px | 1150px | 218px | 233px | **0.28** | 合适 |
| 1366px | 1150px | 101px | 116px | **0.16** | ⚠️ 偏紧，留白不足 |
| 1280px | 1150px | 58px | 73px | **0.10** | 🔴 拥挤，留白严重不足 |
| 1024px | 1007px | 1px | 16px | **0.02** | 已触发收缩，几乎贴边 |
| 768px | 735px | 9px | 24px | 0.04 | 移动端 padding 主导 |
| 390px | 357px | 9px | 24px | 0.08 | 移动端正常 |

> **留白率** = (视口宽度 - 容器宽度) / 视口宽度。设计上通常期望 ≥0.20（两侧各 10%）。
> **1280px 留白率仅 0.10**——这是用户反馈"拥挤感"的量化根因。

### 1.3 各页面布局约束与实测

#### 首页 Hero（[`HomeLayout.astro`](src/layouts/HomeLayout.astro)）

```css
.home-hero__inner {
  display: grid;
  grid-template-columns: 52% 48%;   /* 固定比例 */
  gap: var(--space-2xl, 3rem);       /* 48px */
  padding-inline: var(--space-xl, 2rem); /* 32px */
}
.home-hero__right {
  width: 100%; height: 380px;
  max-width: 480px; max-height: 400px; /* 固定上限 */
}
.home-hero__title { font-size: clamp(2.75rem, 6vw, 4.25rem); }
```

**实测 Hero 网格数据：**

| 视口 | grid-template-columns | gap | left 宽 | right 宽 | 问题 |
|------|----------------------|-----|---------|----------|------|
| ≥1024px | `565.75px 522.23px` | 48px | 480px | 480px | right 被 max-width 480 限制，网格分配 522px 但实际占 480px，**42px 空间浪费** |
| 1024px | 两列 | 48px | 480px | 400px | 已触发 1024 断点，ScienceMap 缩至 400×320 |
| 768px | `721px`（单列） | 32px | 721px | 340px | 单列堆叠 |
| 390px | `343px`（单列） | 32px | 343px | 340px | 单列堆叠 |

> Hero 区域内容宽度 480+48+480=1008px，但容器内宽 1086px（1150-32×2 padding），**78px 未利用**。

#### 文章页三栏布局（[`ArticleLayout.astro`](src/layouts/ArticleLayout.astro)）

```css
.article-layout {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(0, 1fr) minmax(180px, 240px);
  gap: var(--space-xl, 32px);
  max-width: var(--width-content, 72rem);
  padding-inline: var(--space-lg, 24px);
}
.article-layout__main { min-width: 0; max-width: 720px; }
```

**实测三栏网格数据：**

| 视口 | grid-template-columns | gap | left | main | right | 问题 |
|------|----------------------|-----|------|------|-------|------|
| ≥1024px | `220px 580px 240px` | 32px | 220px(h=0) | 580px | 240px | main 被 grid 压缩至 580px，**max-width 720px 未生效**（grid track 优先） |
| 1024px | `220px 437px 240px` | 32px | 220px | 437px | 240px | 容器收缩至 1007px，main 被压缩至 437px |
| 768px | `461px 220px` | 24px | 隐藏 | 461px | 220px | 两栏（隐藏 left TOC） |
| 390px | `343px` | 0px | 隐藏 | 343px | 隐藏 | 单栏 |

> **main 区 580px 偏窄**：`max-width: 720px` 形同虚设，因为 `minmax(0, 1fr)` track 在总宽 1150px 下仅分配 580px（1150-220-240-64=626，再被 main 的内容收缩）。

#### Header（[`Header.astro`](src/components/Header.astro)）

固定像素尺寸汇总：

| 元素 | 尺寸 | 字号 | 备注 |
|------|------|------|------|
| Logo | 66×50px | — | 宽高比 1.376，固定高度 |
| 站名 `.header__site-name` | 175px | **25px** | "超智全球视野" |
| 简介 `.header__brief` | 175px | **13px** | `white-space: nowrap` |
| 导航项 `.header__nav-link` | 36-72px | **18px** | 4 项总文字宽 198px |
| nav-list | 294px | — | 含 3×32px gap |
| 搜索按钮 `.header__search` | **60×60px** | — | 固定方形 |
| Header 总固定宽 | brand 253 + nav 294 + search 60 = **607px** | — | |

**实测 Header 内部空间分配（@1280px，容器 1150px）：**
- brand 区: [82→335] = 253px
- brand→nav 间距: 335→582 = **247px**（flex justify-between 自动分配）
- nav 区: [582→876] = 294px
- nav→search 间距: 876→1124 = **248px**
- search: [1124→1184] = 60px

> **Header 内部空间充足**——1280px 下 brand 与 nav 之间有 247px 间距，不存在内部拥挤。Header 唯一断点在 768px，1024-1920px 之间无缩放，但因固定元素总宽仅 607px，Header 本身**不会溢出**。

#### 文章正文（[`article-prose.css`](src/styles/article-prose.css)）

```css
.article-prose { font-size: 17px; line-height: 1.85; }  /* 注释写 15px，实际 17px */
```

| 元素 | 桌面 | ≤1023px | ≤767px | 问题 |
|------|------|---------|--------|------|
| 正文 body | **17px 固定** | 17px | 17px | 无 fluid 缩放，小屏阅读字号偏大 |
| h1 | 2.25rem(36px) | 1.625rem(26px) | 1.375rem(22px) | 无 clamp() |
| h2 | 1.75rem(28px) | 1.1875rem(19px) | 1.0625rem(17px) | 无 clamp() |
| 表格 | min-width 480px | 水平滚动 | 水平滚动 | — |

#### 编辑型页面（about/archive/topics）

这三个页面**是响应式设计的正面范例**，大量使用 `clamp()` 流式字号和 `minmax()` 弹性网格：

- [`about/index.astro`](src/pages/about/index.astro): 断点 960/620/380，`clamp()` 用于章节标题
- [`archive/index.astro`](src/pages/archive/index.astro): 断点 960/620/380，月份网格 `repeat(3→2→1, minmax(0,1fr))`
- [`topics/index.astro`](src/pages/topics/index.astro): 断点 960/620，`gap: clamp(3.5rem, 6vw, 5rem)`

> 但这些页面的断点（960/620/380）与全局体系（768/1024）**完全不一致**。

### 1.4 交互兼容性现状

| 机制 | 实现方式 | 响应式影响 |
|------|---------|-----------|
| ClientRouter | [`BaseLayout.astro`](src/layouts/BaseLayout.astro) View Transitions | 页面 swap 时 Header `transition:persist` 保持 |
| Header 持久化 | `transition:persist` on `<header>` | 导航间 Header 不重建，尺寸保持一致 |
| 首页分页滚动 | [`HomeLayout.astro`](src/layouts/HomeLayout.astro) History API + `scrollToLatest()` | `scroll-behavior: smooth` + `'instant'` 双模式 |
| ScienceMap 动画 | [`ScienceMap.astro`](src/components/ScienceMap.astro) rAF 3D 旋转 | SVG `preserveAspectRatio="xMidYMid meet"` 自适应缩放 |
| 阅读进度条 | [`ReadingProgressBar.astro`](src/components/ReadingProgressBar.astro) IntersectionObserver | fixed 定位，`max-width: var(--width-content)` |
| 粒子背景 | [`ParticleBackground.astro`](src/components/ParticleBackground.astro) tsParticles | 768px 以下粒子数减半 |
| TOC 高亮 | [`ArticleTOC.astro`](src/components/ArticleTOC.astro) IntersectionObserver | `astro:page-load` 重建 observer |

---

## 二、问题清单

### 2.1 已复现问题（Playwright 实测确认）

#### P1-390px Header 菜单按钮溢出视口 11px 🔴

| 属性 | 值 |
|------|-----|
| 视口 | 390×844 (iPhone 12 Pro) |
| 页面 | 全部 5 个页面 |
| 现象 | `.header__actions` right=377px > headerRight=367px，溢出 11px |
| 根因 | brand(228px) + 间距(12px) + actions(116px) = 356px > 可用空间 345px。actions 内 search(60) + gap(12) + toggle(44) 总宽 116px，在 390px 容器(357px)内与 brand(228px) 冲突 |
| 严重度 | high — 虽未触发横向滚动（docScrollWidth=377 < clientWidth=390），但按钮视觉上超出 Header 容器右边界 |
| 涉及文件 | [`Header.astro`](src/components/Header.astro) `.header__actions` / `.header__search` / `.header__toggle` |

#### P2-1280px 容器留白率仅 0.10，视觉拥挤 🔴

| 属性 | 值 |
|------|-----|
| 视口 | 1280×720 |
| 页面 | 全部页面 |
| 现象 | 容器 1150px，两侧留白仅 58px/73px，留白率 0.10 |
| 根因 | `--width-content: 72rem`(1152px) 是固定值，1024-1920px 之间无断点缩放。1280px 视口下容器占据 90% 宽度 |
| 严重度 | high — 用户反馈"拥挤感"的量化根因 |
| 涉及文件 | [`global.css`](src/styles/global.css) `--width-content` |

#### P3-1366px 容器留白率 0.16，偏紧 🟡

| 属性 | 值 |
|------|-----|
| 视口 | 1366×768 |
| 页面 | 全部页面 |
| 现象 | 容器 1150px，两侧留白 101px/116px，留白率 0.16 |
| 根因 | 同 P2，1366px 是最常见的笔记本分辨率，留白不足 20% |
| 严重度 | medium — 视觉偏紧但未到拥挤程度 |
| 涉及文件 | [`global.css`](src/styles/global.css) `--width-content` |

#### P4-文章页 main 区被 grid 压缩至 580px，max-width 720px 失效 🟡

| 属性 | 值 |
|------|-----|
| 视口 | ≥1024px 全部 |
| 页面 | 文章页 |
| 现象 | `grid-template-columns: 220px 580px 240px`，main 仅 580px，但 CSS 声明 `max-width: 720px` |
| 根因 | `minmax(0, 1fr)` track 在总宽 1150px - 220 - 240 - 64(gap) = 626px 时分配 580px（受 main 内容收缩影响），`max-width` 无法突破 grid track 宽度 |
| 严重度 | medium — 正文阅读宽度偏窄（580px vs 推荐 680-720px） |
| 涉及文件 | [`ArticleLayout.astro`](src/layouts/ArticleLayout.astro) `.article-layout` grid 定义 |

#### P5-首页 Hero 内容未充分利用容器宽度 🟡

| 属性 | 值 |
|------|-----|
| 视口 | ≥1024px 全部 |
| 页面 | 首页 |
| 现象 | Hero 网格分配 565+522=1087px，但 right 被 `max-width: 480px` 限制实际占 480px，left 也仅 480px。内容总宽 1008px < 容器内宽 1086px，浪费 78px |
| 根因 | `.home-hero__right { max-width: 480px }` 与 52%/48% 网格比例冲突，right 列分配 522px 但被截断 |
| 严重度 | medium — Hero 视觉宽度小于容器，两侧出现不对称留白 |
| 涉及文件 | [`HomeLayout.astro`](src/layouts/HomeLayout.astro) `.home-hero__right` |

### 2.2 潜在风险（未触发但接近边界）

#### R1-Header 固定字号在中等密度屏幕放大时可能拥挤 🟡

| 属性 | 值 |
|------|-----|
| 触发条件 | 浏览器缩放 110%+ 或高 DPI 显示器 @1280px |
| 现状 | Header 固定元素总宽 607px，1280px 下剩余 543px flex 空间。放大 125% 后固定宽 ~758px，剩余空间压缩至 392px，仍不溢出但视觉紧凑 |
| 风险 | site-name 25px、nav-link 18px 均为固定 px，不支持 `clamp()` 缩放 |
| 涉及文件 | [`Header.astro`](src/components/Header.astro) |

#### R2-1920px 以上大屏内容过度居中，两侧空旷 🟡

| 属性 | 值 |
|------|-----|
| 触发条件 | 1920px+ 显示器或超宽屏 |
| 现状 | 容器固定 1152px，1920px 下留白率 0.40（两侧各 378/393px） |
| 风险 | 内容区仅占视口 60%，大屏利用率低。但这是"留白过多"而非"拥挤"，优先级低 |
| 涉及文件 | [`global.css`](src/styles/global.css) `--width-content` |

#### R3-正文 17px 固定字号无 fluid 缩放 🟡

| 属性 | 值 |
|------|-----|
| 触发条件 | 768-1023px 平板竖屏 |
| 现状 | `article-prose.css` body `font-size: 17px` 固定，仅 h1-h3 在 1023/767px 断点缩放 |
| 风险 | 17px 在 768px 平板上偏大，阅读行长短（~40 字符/行），但未到"不可用"程度 |
| 涉及文件 | [`article-prose.css`](src/styles/article-prose.css) `.article-prose` |

#### R4-断点边界 1024 vs 1023、768 vs 767 不统一 🔵

| 属性 | 值 |
|------|-----|
| 现状 | HomeLayout 用 `max-width: 1024px`，ArticleLayout 用 `max-width: 1023px`；Header 用 `768px`，ArticleLayout 用 `767px` |
| 风险 | 1024px 宽度下首页已切换窄布局但文章页仍是宽布局，视觉不一致。功能无影响但增加维护成本 |
| 涉及文件 | 多文件 |

---

## 三、适配方案

### 3.1 断点体系设计

**建议统一为 5 级断点**，复用 [`global.css`](src/styles/global.css) 已有变量但补充中间断点：

```css
/* 建议在 global.css 中统一 */
--bp-xs: 480px;    /* 超小屏（保留 Pagination 已用） */
--bp-sm: 640px;    /* 小屏（保留 ArticleCard 已用） */
--bp-md: 768px;    /* 平板竖屏（保留现有） */
--bp-lg: 1024px;   /* 平板横屏（保留现有） */
--bp-xl: 1280px;   /* ★ 新增：小屏桌面 */
--bp-2xl: 1536px;  /* ★ 新增：中大屏桌面 */
```

**核心改进：新增 1280px 断点**，填补 1024-1920px 的空白区间。

### 3.2 容器宽度调整

**方案：流式容器宽度**，在不同断点区间使用不同 max-width：

| 视口区间 | 建议 max-width | 当前值 | 变化 |
|---------|---------------|--------|------|
| ≥1536px | 1280px (80rem) | 1152px | ↑ 放大，减少大屏空旷感 |
| 1280-1535px | 1200px (75rem) | 1152px | ↑ 适度放大 |
| 1024-1279px | **1104px (69rem)** | 1152px | ↓ **缩小**，增加小屏桌面留白 |
| 768-1023px | 100% - 48px | 100% - 48px | 不变 |
| <768px | 100% - 32px | 100% - 32px | 不变 |

```css
/* global.css .container */
.container {
  max-width: var(--width-content); /* 默认 72rem */
  padding-inline: var(--space-lg);
  margin-inline: auto;
}

/* ★ 新增：小屏桌面收缩 */
@media (max-width: 1279px) and (min-width: 1024px) {
  :root { --width-content: 69rem; } /* 1104px — 留白率从 0.10 提升至 0.14 */
}

/* ★ 新增：中大屏桌面放大 */
@media (min-width: 1536px) {
  :root { --width-content: 80rem; } /* 1280px — 减少大屏空旷 */
}
```

> **1280px 视口下**：容器 1104px，留白 (1280-1104)/2 = 88px，留白率 0.14（从 0.10 提升 40%）。
> 注意：此方案保持 1152px 为默认值（1280-1535px 区间），避免影响 1366px 等常见分辨率。

**替代方案（更激进）：直接缩小默认值**

```css
:root { --width-content: 68rem; } /* 1088px — 1280px 留白率 0.15 */
```

### 3.3 字体缩放方案

#### Header 字号流式化

```css
/* Header.astro — 当前固定值改为 clamp() */
.header__site-name { font-size: clamp(20px, 2vw, 25px); }  /* 当前 25px */
.header__brief { font-size: clamp(12px, 1.2vw, 13px); }     /* 当前 13px */
.header__nav-link { font-size: clamp(15px, 1.6vw, 18px); }  /* 当前 18px */
```

#### 文章正文流式化

```css
/* article-prose.css — 当前 17px 固定 */
.article-prose {
  font-size: clamp(15px, 1.0625rem + 0.3vw, 17px); /* 768px=15px, 1920px=17px */
  line-height: 1.85;
}
.article-prose h1 {
  font-size: clamp(1.375rem, 1rem + 2vw, 2.25rem); /* 替代三段断点 */
}
```

### 3.4 布局调整方案

#### 首页 Hero — 解除 max-width 限制

```css
/* HomeLayout.astro */
@media (min-width: 1025px) {
  .home-hero__right {
    max-width: none;      /* 解除 480px 限制，让 grid 48% 生效 */
    max-height: 420px;    /* 适度放大高度 */
  }
}
/* 1024px 以下保持 max-width: 400px 不变 */
```

#### 文章页 — 调整 grid 比例

```css
/* ArticleLayout.astro — 当前 minmax(180px,220px) minmax(0,1fr) minmax(180px,240px) */
.article-layout {
  /* 方案A：缩小侧栏，扩大 main */
  grid-template-columns: minmax(160px, 200px) minmax(0, 1fr) minmax(160px, 220px);
  /* main 可用宽：1150-200-220-64=666px（从 580px 提升 86px） */
}
.article-layout__main { max-width: 680px; } /* 从 720px 降至 680px，与实际 grid 分配匹配 */
```

#### 涉及文件清单

| 文件 | 修改内容 | 优先级 |
|------|---------|--------|
| [`global.css`](src/styles/global.css) | 新增 1280/1536 断点 + 容器宽度变量 | P0 |
| [`Header.astro`](src/components/Header.astro) | 字号 clamp() + 390px actions 溢出修复 | P0 |
| [`HomeLayout.astro`](src/layouts/HomeLayout.astro) | Hero right max-width 解除 | P1 |
| [`ArticleLayout.astro`](src/layouts/ArticleLayout.astro) | grid 比例调整 + main max-width | P1 |
| [`article-prose.css`](src/styles/article-prose.css) | 正文 clamp() + h1-h3 clamp() | P2 |
| [`ArticleLayout.astro`](src/layouts/ArticleLayout.astro) | 断点 1023→1024、767→768 统一 | P2 |

---

## 四、风险分析

### 4.1 对动画的影响

| 动画 | 风险 | 分析 |
|------|------|------|
| ScienceMap 3D 旋转 | 低 | SVG `preserveAspectRatio="xMidYMid meet"` 自适应，解除 max-width 后仅放大显示区域，动画逻辑不变 |
| 粒子背景 | 低 | tsParticles 已有 768px 移动端适配，容器宽度变化不影响粒子 canvas 全屏覆盖 |
| 阅读进度条 | 低 | `max-width: var(--width-content)` 跟随容器变量，自动适配 |
| Hero 标题 | 低 | 已使用 `clamp(2.75rem, 6vw, 4.25rem)`，无需改动 |

### 4.2 对 Header 持久化的影响

| 风险 | 分析 |
|------|------|
| `transition:persist` Header 尺寸变化 | **需验证**：Header 在 swap 时不重建，若断点切换导致 Header 尺寸变化（如窗口缩放），persist 的 Header 可能与新页面内容宽度不匹配。但 Header 宽度跟随 `.container`（100% width），CSS 变量 `--width-content` 变化会实时反映，**风险低** |
| Header 隐藏/显示逻辑 | 不受影响：scroll-hide 逻辑基于 scrollY，与宽度无关 |

### 4.3 对首页分页滚动的影响

| 风险 | 分析 |
|------|------|
| `scrollToLatest()` 定位 | 容器宽度变化不影响 `#latest-articles` 的 `scroll-margin-top` 和 `scrollIntoView` 逻辑 |
| 分页 History API | 不受宽度影响 |
| 平滑滚动 `'instant'` 回退 | 不受宽度影响 |

### 4.4 对 ClientRouter 导航的影响

| 风险 | 分析 |
|------|------|
| 页面 swap 后布局重算 | **低风险**：CSS 变量变化在 swap 后新 DOM 上自动生效，无需 JS 干预 |
| TOC observer 重建 | 不受影响：`astro:page-load` 事件机制不变 |
| CopyLink 按钮重绑 | 不受影响 |

### 4.5 回归测试方案

| 测试项 | 方法 | 验收标准 |
|--------|------|---------|
| 多视口渲染 | 重跑 [`tests/viewport-layout-audit.mjs`](tests/viewport-layout-audit.mjs) | 0 个 high 级溢出 |
| Header 内部空间 | 重跑 [`tests/viewport-metrics-detail.mjs`](tests/viewport-metrics-detail.mjs) | 1280px 留白率 ≥0.14 |
| 分页滚动 | 运行 [`tests/home-pagination-scroll.mjs`](tests/home-pagination-scroll.mjs) | 全部 PASS |
| 导航持久化 | 运行 [`tests/nav-persist-regression.mjs`](tests/nav-persist-regression.mjs) | 全部 PASS |
| 文章返回导航 | 运行 [`tests/article-back-nav.mjs`](tests/article-back-nav.mjs) | 全部 PASS |
| 复制链接 | 运行 [`tests/copy-link.mjs`](tests/copy-link.mjs) | 全部 PASS |
| 关于页手风琴 | 运行 [`tests/about-accordion-visual.mjs`](tests/about-accordion-visual.mjs) | 全部 PASS |
| 归档时间线 | 运行 [`tests/archive-timeline-visual.mjs`](tests/archive-timeline-visual.mjs) | 全部 PASS |
| 主题搜索 | 运行 [`tests/topics-search.mjs`](tests/topics-search.mjs) | 全部 PASS |

---

## 五、实施优先级

### P0 — 必须修复（影响功能或严重视觉缺陷）

| 编号 | 问题 | 修改 | 工作量 |
|------|------|------|--------|
| P1 | 390px Header 菜单按钮溢出 11px | [`Header.astro`](src/components/Header.astro) `.header__actions` 在 ≤480px 时缩小 search 按钮或减小 toggle 间距 | 小 |
| P2 | 1280px 容器留白率 0.10 拥挤 | [`global.css`](src/styles/global.css) 新增 `@media (max-width:1279px) and (min-width:1024px)` 缩小 `--width-content` 至 69rem | 小 |

### P1 — 建议修复（明显视觉优化）

| 编号 | 问题 | 修改 | 工作量 |
|------|------|------|--------|
| P3 | 1366px 留白率 0.16 偏紧 | 同 P2 断点方案覆盖 1280-1535px 区间 | 随 P2 |
| P4 | 文章 main 区 580px 偏窄 | [`ArticleLayout.astro`](src/layouts/ArticleLayout.astro) grid 比例调整 + main max-width 降至 680px | 中 |
| P5 | Hero 内容未充分利用容器 | [`HomeLayout.astro`](src/layouts/HomeLayout.astro) 解除 `.home-hero__right` max-width 480px | 小 |

### P2 — 可选优化（锦上添花）

| 编号 | 问题 | 修改 | 工作量 |
|------|------|------|--------|
| R1 | Header 字号固定 px | [`Header.astro`](src/components/Header.astro) site-name/nav-link 改 clamp() | 小 |
| R3 | 正文 17px 无 fluid | [`article-prose.css`](src/styles/article-prose.css) body 改 clamp() | 小 |
| R4 | 断点 1023/767 不统一 | 统一为 1024/768 | 小 |
| R2 | 1920px+ 大屏空旷 | [`global.css`](src/styles/global.css) 新增 `@media (min-width:1536px)` 放大 `--width-content` | 小 |

---

## 附录：实测数据完整矩阵

### A.1 容器留白矩阵

| 视口 | 容器宽 | 左留白 | 右留白 | 留白率 | 评估 |
|------|--------|--------|--------|--------|------|
| 1920 | 1150 | 378 | 393 | 0.40 | 空旷 |
| 1600 | 1150 | 218 | 233 | 0.28 | 合适 |
| 1366 | 1150 | 101 | 116 | 0.16 | 偏紧 |
| 1280 | 1150 | 58 | 73 | 0.10 | 拥挤 |
| 1024 | 1007 | 1 | 16 | 0.02 | 贴边 |
| 768 | 735 | 9 | 24 | 0.04 | 正常 |
| 390 | 357 | 9 | 24 | 0.08 | 正常 |

### A.2 Header 内部空间矩阵（桌面端）

| 视口 | Header 宽 | brand 区 | nav 区 | search | brand→nav 间距 | nav→search 间距 |
|------|----------|---------|--------|--------|---------------|----------------|
| 1920 | 1152 | 253px [402→655] | 294px [902→1196] | 60px [1444→1504] | 247px | 248px |
| 1600 | 1152 | 253px [242→495] | 294px [742→1036] | 60px [1284→1344] | 247px | 248px |
| 1366 | 1152 | 253px [125→378] | 294px [625→919] | 60px [1167→1227] | 247px | 248px |
| 1280 | 1152 | 253px [82→335] | 294px [582→876] | 60px [1124→1184] | 247px | 248px |
| 1024 | 1009 | 253px [1→254] | 294px [401→695] | 60px [902→962] | 147px | 207px |

> Header 内部空间在所有桌面视口下均充足，最小间距 147px（1024px），**Header 本身不拥挤**。

### A.3 文章页三栏网格矩阵

| 视口 | grid-cols | gap | left | main | right | 布局 |
|------|-----------|-----|------|------|-------|------|
| ≥1280 | 220/580/240 | 32px | 220px | 580px | 240px | 三栏 |
| 1024 | 220/437/240 | 32px | 220px | 437px | 240px | 三栏（main 压缩） |
| 768 | 461/220 | 24px | 隐藏 | 461px | 220px | 两栏 |
| 390 | 343 | 0px | 隐藏 | 343px | 隐藏 | 单栏 |

### A.4 首页 Hero 网格矩阵

| 视口 | grid-cols | gap | left | right | 布局 |
|------|-----------|-----|------|-------|------|
| ≥1280 | 565/522 | 48px | 480px | 480px(max-w限制) | 两列 |
| 1024 | 两列 | 48px | 480px | 400px | 两列（缩小） |
| 768 | 721 | 32px | 721px | 340px | 单列 |
| 390 | 343 | 32px | 343px | 340px | 单列 |

---

*报告结束。本审计为只读操作，未修改任何源文件。待用户确认方案后方可实施。*
