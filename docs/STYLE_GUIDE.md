# 前端样式手动微调指南

> 本文档基于当前工作区源码逐行核实生成，所有文件路径、行号、选择器、当前值均从源文件提取。
> 审计范围：首页 Hero、页眉 Header、首页文章列表与分页、文章详情页、其他页面与全局样式。
> 用法：在 VS Code 中按文件路径:行号 定位，修改"当前值"列对应的值即可。

---

## 目录

1. [首页 Hero 区域](#1-首页-hero-区域)
2. [页眉 Header](#2-页眉-header)
3. [首页最新文章列表与分页](#3-首页最新文章列表与分页)
4. [文章详情页](#4-文章详情页)
5. [其他页面与全局样式](#5-其他页面与全局样式)
6. [最常手动修改的 15 个参数速查表](#6-最常手动修改的-15-个参数速查表)

---

## 关键概念速读

修改前请先理解以下机制，避免改了不生效：

| 机制 | 说明 | 影响范围 |
|------|------|----------|
| **CSS 变量定义** | 所有设计令牌集中在 [`global.css`](src/styles/global.css:11) `:root`（行 11–180）。修改一处，全站引用该变量的组件同步生效。 | 全站 |
| **CSS 变量使用** | 组件中写 `var(--color-brand)` 等引用。改变量定义即生效；若组件内写了硬编码值（如 `#2b2640`）则需改组件本身。 | 单组件 |
| **Astro scoped CSS** | 每个 `.astro` 文件的 `<style>` 默认带 `data-astro-cid-xxx` 作用域，选择器编译后追加属性约束，**只作用于当前组件**。跨组件需用 `:global()`。 | 单组件 |
| **`:global()` 例外** | [`SearchPanel.astro`](src/components/SearchPanel.astro:393) 中搜索结果由 JS `innerHTML` 动态生成，不带 cid 属性，必须用 `:global(.search-panel__results .search-result)` 整体包住才生效。 | SearchPanel |
| **桌面 vs 移动端** | 桌面规则写在 `@media` 之外；移动端覆盖写在 `@media (max-width: 768px)` / `(max-width: 767px)` / `(max-width: 640px)` / `(max-width: 480px)` 内。**改移动端要进对应的 @media 块**。 | 响应式 |
| **JS 动态控制** | Header 滚动隐藏、Hero 透明切换、阅读栏显隐、粒子背景、Science Map 动画均由 JS 通过 `body` 的 `data-*` 属性或元素 `style` 驱动 CSS。改行为需改 JS 参数。 | 交互组件 |
| **clamp(min, vw, max)** | 流体字号：视口宽度在 min↔max 之间随 vw 线性变化，低于 min 取 min，高于 max 取 max。如 `clamp(2.75rem, 6vw, 4.25rem)`：视口 ≥708px 时达 max(68px)，≤458px 时取 min(44px)。 | Hero 标题 |
| **rem 单位** | 相对于 `html` 的 `font-size`（`--fs-root: 16px`，[`global.css:98`](src/styles/global.css:98)）。`1rem = 16px`。改 `--fs-root` 会等比缩放所有 rem 值。 | 全站 |
| **vh 单位** | 视口高度的 1%。`78vh` = 视口高度的 78%。 | Hero 高度 |
| **共享 vs 独立** | [`ArticleCard`](src/components/ArticleCard.astro:81) 是共享组件，首页列表、topics、archive 列表页均复用。改它影响所有列表页。`Pagination` 同理共享。 | 跨页面 |

---

## 1. 首页 Hero 区域

Hero 区域由 [`HomeLayout.astro`](src/layouts/HomeLayout.astro:265) 的 scoped `<style>` 定义，包含标题、简介、按钮、两栏布局、Science Map 容器。

### 1.1 Hero 主标题字体

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 标题字体族 | [`HomeLayout.astro:318`](src/layouts/HomeLayout.astro:318) | `.home-hero__title` → `font-family` | `'Smiley Sans Oblique', var(--font-display)` | 改字体名。得意黑通过 CDN 加载（[`HomeLayout.astro:42-52`](src/layouts/HomeLayout.astro:42)）。若换其他网络字体，需同步修改 CDN `<link>` 标签。回退走 `--font-display`（[`global.css:92`](src/styles/global.css:92)）。 |

### 1.2 Hero 主标题字号

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 桌面标题字号 | [`HomeLayout.astro:319`](src/layouts/HomeLayout.astro:319) | `.home-hero__title` → `font-size` | `clamp(2.75rem, 6vw, 4.25rem)` | 三个参数：min=2.75rem(44px)、首选=6vw（视口宽6%）、max=4.25rem(68px)。放大调大 max；缩小调小 min。vw 越大缩放越激进。 |
| 移动端标题字号 | [`HomeLayout.astro:498`](src/layouts/HomeLayout.astro:498) | `@media (max-width:768px) .home-hero__title` → `font-size` | `clamp(2.25rem, 8vw, 3rem)` | 移动端覆盖：min=2.25rem(36px)、首选=8vw、max=3rem(48px)。 |

### 1.3 Hero 主标题颜色

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 第一行颜色（"看见科学的"） | [`HomeLayout.astro:333`](src/layouts/HomeLayout.astro:333) | `.home-hero__title-line--1` → `color` | `#2b2640`（硬编码深灰紫） | 直接改十六进制色值。注意：此处未用变量，改全局 `--color-heading` **不会**影响此处。 |
| 第二行颜色（"下一步。"） | [`HomeLayout.astro:338`](src/layouts/HomeLayout.astro:338) | `.home-hero__title-line--2` → `color` | `var(--color-brand, #6d4aff)` | 引用了品牌色变量。改 [`global.css:17`](src/styles/global.css:17) `--color-brand` 全站品牌色联动；仅改此处可换成硬编码值。 |
| 第二行放大比例 | [`HomeLayout.astro:339`](src/layouts/HomeLayout.astro:339) | `.home-hero__title-line--2` → `font-size` | `1.08em` | 相对父级字号放大 8%。调大强调第二行，调小则两行等大。 |

### 1.4 Hero 简介文字

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 简介字号 | [`HomeLayout.astro:345`](src/layouts/HomeLayout.astro:345) | `.home-hero__desc` → `font-size` | `var(--fs-base, 1rem)` = 16px | 改值或改 [`global.css:101`](src/styles/global.css:101) `--fs-base`。后者影响全站正文基准。 |
| 简介颜色 | [`HomeLayout.astro:347`](src/layouts/HomeLayout.astro:347) | `.home-hero__desc` → `color` | `#4a4660`（硬编码） | 直接改色值。比正文色 `--color-text`(#3d3a4e) 略浅，保证浅紫背景可读。 |
| 简介最大宽度 | [`HomeLayout.astro:348`](src/layouts/HomeLayout.astro:348) | `.home-hero__desc` → `max-width` | `28rem` = 448px | 控制简介换行宽度。 |
| 简介上间距 | [`HomeLayout.astro:344`](src/layouts/HomeLayout.astro:344) | `.home-hero__desc` → `margin-top` | `var(--space-lg, 1.5rem)` = 24px | 与标题的间距。 |

### 1.5 Hero 按钮

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 按钮内边距 | [`HomeLayout.astro:363`](src/layouts/HomeLayout.astro:363) | `.home-hero__btn` → `padding` | `var(--space-sm, 0.75rem) var(--space-xl, 2rem)` | 上下12px、左右32px。调大更"胖"。 |
| 按钮圆角 | [`HomeLayout.astro:364`](src/layouts/HomeLayout.astro:364) | `.home-hero__btn` → `border-radius` | `var(--radius-pill, 999px)` | 胶囊形。改小（如 `var(--radius-md, 8px)`）变方角。 |
| 主按钮底色 | [`HomeLayout.astro:376`](src/layouts/HomeLayout.astro:376) | `.home-hero__btn--primary` → `background-color` | `var(--color-brand, #6d4aff)` | 品牌紫实底。改 [`global.css:17`](src/styles/global.css:17) 联动全站。 |
| 主按钮文字色 | [`HomeLayout.astro:377`](src/layouts/HomeLayout.astro:377) | `.home-hero__btn--primary` → `color` | `#ffffff` | 白字。 |
| 主按钮阴影 | [`HomeLayout.astro:378`](src/layouts/HomeLayout.astro:378) | `.home-hero__btn--primary` → `box-shadow` | `0 4px 14px rgba(109, 74, 255, 0.4)` | 紫色光晕投影。调第四个值改透明度。 |
| 主按钮 hover | [`HomeLayout.astro:382`](src/layouts/HomeLayout.astro:382) | `.home-hero__btn--primary:hover` → `background-color` | `var(--color-brand-strong, #5a36f0)` | hover 深紫。改 [`global.css:21`](src/styles/global.css:21) 联动。 |
| 次按钮底色 | [`HomeLayout.astro:389`](src/layouts/HomeLayout.astro:389) | `.home-hero__btn--ghost` → `background-color` | `rgba(255, 255, 255, 0.35)` | 半透明白。调末位值改透明度。 |
| 次按钮描边 | [`HomeLayout.astro:391`](src/layouts/HomeLayout.astro:391) | `.home-hero__btn--ghost` → `border` | `1px solid rgba(91, 6, 147, 0.35)` | 紫色描边。 |
| 按钮间距 | [`HomeLayout.astro:354`](src/layouts/HomeLayout.astro:354) | `.home-hero__actions` → `gap` | `var(--space-md, 1rem)` = 16px | 两按钮间距。移动端改为纵向排列（[`HomeLayout.astro:501-508`](src/layouts/HomeLayout.astro:501)）。 |

### 1.6 Hero 两栏比例

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 桌面栏比例 | [`HomeLayout.astro:293`](src/layouts/HomeLayout.astro:293) | `.home-hero__inner` → `grid-template-columns` | `52% 48%` | 左文字52%、右Science Map 48%。改如 `55% 45%` 扩大文字区。 |
| 栏间距 | [`HomeLayout.astro:295`](src/layouts/HomeLayout.astro:295) | `.home-hero__inner` → `gap` | `var(--space-2xl, 3rem)` = 48px | 平板缩小为 `var(--space-xl, 2rem)`（[`HomeLayout.astro:463`](src/layouts/HomeLayout.astro:463)）。 |
| 移动端布局 | [`HomeLayout.astro:481`](src/layouts/HomeLayout.astro:481) | `@media(768px) .home-hero__inner` → `grid-template-columns` | `1fr` | 单列上下布局，Science Map 排到文字下方（`order: 2`，[`HomeLayout.astro:494`](src/layouts/HomeLayout.astro:494)）。 |

### 1.7 Hero 高度

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 桌面最小高度 | [`HomeLayout.astro:271`](src/layouts/HomeLayout.astro:271) | `.home-hero` → `min-height` | `78vh` | 视口高度的78%。调大更高（如 `90vh`），调小更早露出文章。移动端改为 `auto`（[`HomeLayout.astro:475`](src/layouts/HomeLayout.astro:475)）。 |
| Hero 上移补偿 | [`HomeLayout.astro:275`](src/layouts/HomeLayout.astro:275) | `.home-hero` → `margin-top` | `calc(-1 * var(--height-header, 4rem))` | 负 margin 让 Hero 覆盖 Header 的 sticky 占位空间，使粒子背景铺到页顶。移动端改为 `calc(-1 * var(--height-header-mobile, 3.5rem))`（[`HomeLayout.astro:476`](src/layouts/HomeLayout.astro:476)）。**勿轻易改为 0**，否则 Hero 下移出现空白。 |

### 1.8 Hero 上下/左右间距

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 内边距（上下/左右） | [`HomeLayout.astro:289-290`](src/layouts/HomeLayout.astro:289) | `.home-hero__inner` → `padding-inline` / `padding-block` | `var(--space-xl, 2rem)` / `var(--space-3xl, 4rem)` | 左右32px、上下64px。移动端缩小（[`HomeLayout.astro:482-483`](src/layouts/HomeLayout.astro:482)）。 |
| 左侧文字最大宽 | [`HomeLayout.astro:300`](src/layouts/HomeLayout.astro:300) | `.home-hero__left` → `max-width` | `30rem` = 480px | 限制文字区不无限拉宽。 |

### 1.9 Hero 到文章区间距

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 文章区上间距 | [`HomeLayout.astro:422`](src/layouts/HomeLayout.astro:422) | `.home-latest` → `padding-block` | `var(--space-3xl, 4rem) var(--space-2xl, 3rem)` | 上64px、下48px。调小收紧 Hero 与文章的间距。 |

### 1.10 粒子背景配置

粒子背景由 JS 动态加载 tsParticles 渲染，**参数在 JS CONFIG 常量中**，不在 CSS。

| 调整项目 | 文件路径:行号 | 参数名 | 当前值 | 如何调整 |
|---------|-------------|--------|--------|---------|
| 背景底色 | [`ParticleBackground.astro:71`](src/components/ParticleBackground.astro:71) | `CONFIG.BG_COLOR` | `'#e8e8fd'` | 浅紫白。同步改 CSS 底色 [`ParticleBackground.astro:48`](src/components/ParticleBackground.astro:48) `#particle-bg` 的 `background-color`（同为 `#e8e8fd`）和 [`HomeLayout.astro:403`](src/layouts/HomeLayout.astro:403) `body` 背景（同为 `#e8e8fd`），三处必须一致。 |
| 粒子颜色 | [`ParticleBackground.astro:72`](src/components/ParticleBackground.astro:72) | `CONFIG.PARTICLE_COLOR` | `'#5b0693'` | 深紫粒子点色。 |
| 粒子数量（桌面） | [`ParticleBackground.astro:73`](src/components/ParticleBackground.astro:73) | `CONFIG.PARTICLE_COUNT` | `50` | 移动端自动减半（[`ParticleBackground.astro:99`](src/components/ParticleBackground.astro:99) `× 0.5`）。调大更密集但耗性能。 |
| 移动速度 | [`ParticleBackground.astro:74`](src/components/ParticleBackground.astro:74) | `CONFIG.MOVE_SPEED` | `1` | 移动端自动 ×0.7（[`ParticleBackground.astro:101`](src/components/ParticleBackground.astro:101)）。 |
| 不透明度 | [`ParticleBackground.astro:75`](src/components/ParticleBackground.astro:75) | `CONFIG.OPACITY` | `0.7` | 0~1。调低更柔和。 |
| 粒子尺寸范围 | [`ParticleBackground.astro:127`](src/components/ParticleBackground.astro:127) | `size.value` | `{ min: 1, max: 3 }` | 粒子半径像素范围。 |
| 密度区域 | [`ParticleBackground.astro:117`](src/components/ParticleBackground.astro:117) | `number.density.area` | `900` | 每 900px² 一个粒子基准。 |
| 闪烁频率 | [`ParticleBackground.astro:145`](src/components/ParticleBackground.astro:145) | `twinkle.frequency` | `0.05` | 5% 概率闪烁。 |
| 帧率上限 | [`ParticleBackground.astro:110`](src/components/ParticleBackground.astro:110) | `fpsLimit` | `60` | 降帧省电。 |

### 1.11 Science Map 配置

Science Map 动画参数集中在 [`ScienceMap.astro`](src/components/ScienceMap.astro:253) 的 `<script>` CONFIG 常量。

| 调整项目 | 文件路径:行号 | 参数名 | 当前值 | 如何调整 |
|---------|-------------|--------|--------|---------|
| 旋转速度 | [`ScienceMap.astro:254`](src/components/ScienceMap.astro:254) | `CONFIG.ROTATE_SPEED` | `0.15` | 弧度/秒，约42秒一圈。调大转更快。 |
| 倾斜速度 | [`ScienceMap.astro:255`](src/components/ScienceMap.astro:255) | `CONFIG.TILT_SPEED` | `0.08` | 平面摇摆速度。 |
| 倾斜幅度 | [`ScienceMap.astro:256`](src/components/ScienceMap.astro:256) | `CONFIG.TILT_AMP` | `0.45` | ≈26°。调大更立体。 |
| 轨道半径 | [`ScienceMap.astro:257`](src/components/ScienceMap.astro:257) | `CONFIG.RADIUS_BASE` | `160` | SVG单位。决定三角形大小，投影宽约占右侧容器55%-75%。调大三角形更大。 |
| 半径变化幅度 | [`ScienceMap.astro:258`](src/components/ScienceMap.astro:258) | `CONFIG.RADIUS_AMP` | `22` | 半径正弦变化幅度，产生"呼吸感"。 |
| 透视距离 | [`ScienceMap.astro:260`](src/components/ScienceMap.astro:260) | `CONFIG.PERSPECTIVE` | `420` | 越大越接近正交投影（扁平），越小透视越强（近大远小）。 |
| 连线弯曲度 | [`ScienceMap.astro:261`](src/components/ScienceMap.astro:261) | `CONFIG.CURVE_OFFSET` | `8` | 贝塞尔控制点偏移。 |
| 悬停减速 | [`ScienceMap.astro:262`](src/components/ScienceMap.astro:262) | `CONFIG.HOVER_SLOWDOWN` | `0.25` | 悬停时速度降至25%。 |
| 节点圆点半径 | [`ScienceMap.astro:263`](src/components/ScienceMap.astro:263) | `CONFIG.DOT_RADIUS` | `4` | 8px直径。SVG `<circle r="4">`（[`ScienceMap.astro:86`](src/components/ScienceMap.astro:86)）。 |
| Science Map 容器高 | [`HomeLayout.astro:306`](src/layouts/HomeLayout.astro:306) | `.home-hero__right` → `height` | `380px` | 桌面。平板320px（[`HomeLayout.astro:467`](src/layouts/HomeLayout.astro:467)），移动280px（[`HomeLayout.astro:492`](src/layouts/HomeLayout.astro:492)）。 |
| Science Map 容器最大宽 | [`HomeLayout.astro:308`](src/layouts/HomeLayout.astro:308) | `.home-hero__right` → `max-width` | `480px` | 平板400px，移动340px。 |
| 节点圆点色 | [`ScienceMap.astro:135`](src/components/ScienceMap.astro:135) | `.science-map__dot` → `fill` | `#6d4aff` | 硬编码品牌紫。hover 变 `#5a36f0`（[`ScienceMap.astro:152`](src/components/ScienceMap.astro:152)）。 |
| 连线色 | [`ScienceMap.astro:122`](src/components/ScienceMap.astro:122) | `.science-map__link` → `stroke` | `rgba(91, 6, 147, 0.22)` | 低透明度灰紫。悬停高亮 `rgba(109, 74, 255, 0.5)`（[`ScienceMap.astro:129`](src/components/ScienceMap.astro:129)）。 |
| 标签字号 | [`ScienceMap.astro:158`](src/components/ScienceMap.astro:158) | `.science-map__label` → `font-size` | `13px` | HPC/AI/Science 文字大小。 |
| SVG viewBox | [`ScienceMap.astro:65`](src/components/ScienceMap.astro:65) | `<svg viewBox>` | `"-200 -160 400 320"` | 投影坐标系范围。与 RADIUS_BASE 配合决定可见区域。 |

---

## 2. 页眉 Header

Header 由 [`Header.astro`](src/components/Header.astro:287) 的 scoped `<style>` 定义。行为由同文件 `<script>` 控制，通过 `body[data-header-hidden]`、`body[data-header-scrolled]`、`body.has-reading-bar` 驱动 CSS。

### 2.1 Header 高度/宽度/阴影

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| Header 高度 | [`global.css:143`](src/styles/global.css:143) | `--height-header` | `4rem` = 64px | 桌面高度。移动端 `--height-header-mobile: 3.5rem`（[`global.css:144`](src/styles/global.css:144)）。改后多处 sticky `top` 偏移自动联动。 |
| Header 最大宽度 | [`Header.astro:298`](src/components/Header.astro:298) | `.header` → `max-width` | `var(--width-content, 72rem)` = 1152px | 居中悬浮宽度。移动端改为 `none`（全宽，[`Header.astro:651`](src/components/Header.astro:651)）。 |
| Header 侧边距 | [`Header.astro:299`](src/components/Header.astro:299) | `.header` → `margin-inline` | `auto` | 居中。移动端 `var(--space-xs, 8px)`（[`Header.astro:650`](src/components/Header.astro:650)）。 |
| Header 背景色 | [`Header.astro:301`](src/components/Header.astro:301) | `.header` → `background-color` | `var(--color-surface)` = #ffffff | 非首页白底。首页透明覆盖见下。 |
| Header 边框 | [`Header.astro:302`](src/components/Header.astro:302) | `.header` → `border` | `1px solid var(--color-border)` | #e7e4f2。 |
| Header 圆角 | [`Header.astro:303`](src/components/Header.astro:303) | `.header` → `border-radius` | `var(--radius-lg, 12px)` | 移动端 `var(--radius-md, 8px)`（[`Header.astro:652`](src/components/Header.astro:652)）。 |
| Header 阴影 | [`Header.astro:304`](src/components/Header.astro:304) | `.header` → `box-shadow` | `var(--shadow-header-float)` = `0 2px 12px rgba(43,38,64,0.06)` | 改 [`global.css:157`](src/styles/global.css:157) 联动。 |
| 过渡动画 | [`Header.astro:306-311`](src/components/Header.astro:306) | `.header` → `transition` | `transform/opacity/bg/border/shadow 各 250ms cubic-bezier(0.4,0,0.2,1)` | 显隐/配色过渡。 |

### 2.2 Header 透明状态（首页未滚动）

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 透明背景 | [`Header.astro:331`](src/components/Header.astro:331) | `body[data-header-scrolled='false'] #site-header[data-home='true']` → `background-color` | `transparent` | 首页 Hero 区 Header 透明，让粒子透出。 |
| 透明边框 | [`Header.astro:332`](src/components/Header.astro:332) | 同上 → `border-color` | `transparent` | |
| 透明阴影 | [`Header.astro:333`](src/components/Header.astro:333) | 同上 → `box-shadow` | `none` | |
| 首页文字色定义 | [`Header.astro:323-326`](src/components/Header.astro:323) | `#site-header[data-home='true']` 局部变量 | `--home-header-text: #2b2640`; `--home-header-text-muted: #4a4660` | 首页 Header 专用文字色（深灰紫），区别于非首页的 `--color-heading`。改这两处影响首页 Header 所有文字。 |

> **特异性提示**：`body[data-header-scrolled='false'] #site-header[data-home='true'] .xxx` 选择器特异性高（0,3,1），覆盖下方 `.header__site-name`（0,2,0）。首页未滚动时文字色以此为准。

### 2.3 Header 滚动后背景（首页毛玻璃）

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 毛玻璃背景 | [`Header.astro:379`](src/components/Header.astro:379) | `body[data-header-scrolled='true'] #site-header[data-home='true']` → `background-color` | `rgba(255, 255, 255, 0.72)` | 72% 不透明白。调末位值改透明度。 |
| 模糊滤镜 | [`Header.astro:382`](src/components/Header.astro:382) | 同上 → `backdrop-filter` | `blur(10px) saturate(140%)` | 毛玻璃效果。调 blur 值改模糊强度。 |
| 滚动阴影 | [`Header.astro:381`](src/components/Header.astro:381) | 同上 → `box-shadow` | `0 2px 16px rgba(91, 6, 147, 0.1)` | 紫调阴影。 |

### 2.4 Logo 大小

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| Header 传参 | [`Header.astro:46`](src/components/Header.astro:46) | `<Logo size={36} />` | `36` | Logo 组件通过 prop 接收尺寸。改此值调整 Header 中 Logo 大小。About 页传 `48`（[`about/index.astro:41`](src/pages/about/index.astro:41)）。 |
| Logo CSS 变量 | [`Logo.astro:40`](src/components/Logo.astro:40) | `.logo` → `height` | `var(--logo-size)` | prop `size` 注入为 `--logo-size`。图片宽度自动按比例（原图587×427）。 |

### 2.5 站名文字

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 站名字号 | [`Header.astro:453`](src/components/Header.astro:453) | `.header__site-name` → `font-size` | `var(--fs-md)` = 1.125rem = 18px | 改 [`global.css:102`](src/styles/global.css:102) `--fs-md` 联动全站18px处。 |
| 站名字重 | [`Header.astro:454`](src/components/Header.astro:454) | `.header__site-name` → `font-weight` | `var(--fw-semibold)` = 600 | |
| 站名颜色（非首页） | [`Header.astro:455`](src/components/Header.astro:455) | `.header__site-name` → `color` | `var(--color-heading)` = #2b2640 | 首页覆盖为 `var(--home-header-text)`（[`Header.astro:338`](src/components/Header.astro:338)）。 |

### 2.6 站点简介（brief）

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 简介字号 | [`Header.astro:459`](src/components/Header.astro:459) | `.header__brief` → `font-size` | `var(--fs-xs)` = 0.75rem = 12px | |
| 简介颜色 | [`Header.astro:460`](src/components/Header.astro:460) | `.header__brief` → `color` | `var(--color-text-muted)` = #767289 | 首页覆盖为 `var(--home-header-text-muted)`（[`Header.astro:343`](src/components/Header.astro:343)）。 |
| 移动端隐藏 | [`Header.astro:662`](src/components/Header.astro:662) | `@media(768px) .header__brief` → `display` | `none` | 移动端不显示简介。 |

### 2.7 导航文字

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 导航字号 | [`Header.astro:480`](src/components/Header.astro:480) | `.header__nav-link` → `font-size` | `var(--fs-base)` = 1rem = 16px | |
| 导航字重 | [`Header.astro:481`](src/components/Header.astro:481) | `.header__nav-link` → `font-weight` | `var(--fw-medium)` = 500 | |
| 导航颜色 | [`Header.astro:479`](src/components/Header.astro:479) | `.header__nav-link` → `color` | `var(--color-text)` = #3d3a4e | 首页覆盖为 `var(--home-header-text-muted)`（[`Header.astro:348`](src/components/Header.astro:348)）。 |
| 导航间距 | [`Header.astro:472`](src/components/Header.astro:472) | `.header__nav-list` → `gap` | `var(--space-xl)` = 2rem = 32px | 各导航项间距。 |
| 导航内边距 | [`Header.astro:478`](src/components/Header.astro:478) | `.header__nav-link` → `padding-block` | `var(--space-sm)` = 12px | 上下内边距，影响下划线位置。 |

### 2.8 当前栏目下划线

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 下划线高度 | [`Header.astro:500`](src/components/Header.astro:500) | `.header__nav-link.is-active::after` → `height` | `2px` | |
| 下划线颜色 | [`Header.astro:501`](src/components/Header.astro:501) | 同上 → `background-color` | `var(--color-nav-active)` = `var(--color-brand)` = #6d4aff | 改 [`global.css:67`](src/styles/global.css:67) `--color-nav-active` 联动。 |
| 下划线位置 | [`Header.astro:499`](src/components/Header.astro:499) | 同上 → `bottom` | `-1px` | 略低于链接底部。 |
| 当前栏目文字色 | [`Header.astro:491`](src/components/Header.astro:491) | `.header__nav-link.is-active` → `color` | `var(--color-brand)` = #6d4aff | 首页覆盖为 `var(--home-header-text)`（[`Header.astro:358`](src/components/Header.astro:358)）。 |

### 2.9 搜索图标

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 搜索按钮尺寸 | [`Header.astro:517-518`](src/components/Header.astro:517) | `.header__search` → `width/height` | `40px` / `40px` | |
| 搜索按钮圆角 | [`Header.astro:519`](src/components/Header.astro:519) | `.header__search` → `border-radius` | `var(--radius-md)` = 8px | |
| 搜索图标色 | [`Header.astro:520`](src/components/Header.astro:520) | `.header__search` → `color` | `var(--color-text-muted)` = #767289 | hover 变 `var(--color-brand)`（[`Header.astro:527`](src/components/Header.astro:527)）。 |
| 搜索图标 SVG | [`Header.astro:85-97`](src/components/Header.astro:85) | `<svg width/height>` | `20` / `20` | 改 SVG 尺寸属性。 |

### 2.10 滚动阈值（JS 参数）

| 调整项目 | 文件路径:行号 | 参数名 | 当前值 | 如何调整 |
|---------|-------------|--------|--------|---------|
| 隐藏触发阈值 | [`Header.astro:195`](src/components/Header.astro:195) | `SCROLL_HIDE_THRESHOLD` | `12` | 滚动超过12px才允许隐藏，防顶部抖动。 |
| 方向变化阈值 | [`Header.astro:196`](src/components/Header.astro:196) | `SCROLL_DELTA_THRESHOLD` | `8` | 滚动方向变化需超过8px才切换显隐，防触控板闪烁。 |
| Hero 离开阈值 | [`Header.astro:217`](src/components/Header.astro:217) | `threshold` | `window.innerHeight * 0.6` | 滚动超过视口高度60%视为离开 Hero，触发 Header 配色切换。与 Hero `min-height: 78vh`（[`HomeLayout.astro:271`](src/layouts/HomeLayout.astro:271)）配合——0.6 阈值落在 Hero 内部。调大（如 0.8）则更晚切换。 |

### 2.11 首页 vs 文章页 Header

| 调整项目 | 文件路径:行号 | 机制 | 当前值 | 如何调整 |
|---------|-------------|------|--------|---------|
| 首页标记 | [`Header.astro:42`](src/components/Header.astro:42) | `data-home` 属性 | `isHome ? 'true' : 'false'` | `isHome` 由 `pathname === '/'` 判断（[`Header.astro:31`](src/components/Header.astro:31)）。首页 `true` 触发透明/毛玻璃规则；其他页 `false` 保持白底实体。 |
| 文章页阅读栏互斥 | [`ReadingProgressBar.astro:78`](src/components/ReadingProgressBar.astro:78) | `body.classList.add('has-reading-bar')` | — | 文章页 body 添加此类，Header 展开延迟 150ms 等阅读栏收回（[`Header.astro:424-426`](src/components/Header.astro:424)）。 |
| Header 隐藏驱动 | [`Header.astro:417`](src/components/Header.astro:417) | `body[data-header-hidden='true'] #site-header` → `transform` | `translateY(-110%)` | JS 设置 body 属性驱动 CSS 上滑隐藏。 |

---

## 3. 首页最新文章列表与分页

文章列表区由 [`HomeLayout.astro`](src/layouts/HomeLayout.astro:420) 定义容器，列表项由共享组件 [`ArticleCard.astro`](src/components/ArticleCard.astro:81) 渲染，分页由共享组件 [`Pagination.astro`](src/components/Pagination.astro:126) 渲染。

### 3.1 区块标题

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| "最新文章"字号 | [`HomeLayout.astro:440`](src/layouts/HomeLayout.astro:440) | `.home-latest__title` → `font-size` | `var(--fs-lg, 1.375rem)` = 22px | |
| 标题字重 | [`HomeLayout.astro:441`](src/layouts/HomeLayout.astro:441) | `.home-latest__title` → `font-weight` | `var(--fw-semibold, 600)` | |
| 标题颜色 | [`HomeLayout.astro:442`](src/layouts/HomeLayout.astro:442) | `.home-latest__title` → `color` | `var(--color-heading, #2b2640)` | |
| 标题下划线 | [`HomeLayout.astro:444`](src/layouts/HomeLayout.astro:444) | `.home-latest__title` → `border-bottom` | `2px solid var(--color-brand-border, #d9ccff)` | 紫色细线。 |
| 标题下间距 | [`HomeLayout.astro:445`](src/layouts/HomeLayout.astro:445) | `.home-latest__title` → `margin-bottom` | `var(--space-md, 1rem)` = 16px | |

### 3.2 列表宽度

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 列表区最大宽 | [`HomeLayout.astro:434`](src/layouts/HomeLayout.astro:434) | `.home-latest__inner` → `max-width` | `53.125rem` = 850px | 文章列表左对齐、右侧自然留白的宽度约束。比全站 `--width-content`(1152px) 窄，阅读更聚焦。 |
| 列表左右内边距 | [`HomeLayout.astro:436`](src/layouts/HomeLayout.astro:436) | `.home-latest__inner` → `padding-inline` | `var(--space-lg, 1.5rem)` = 24px | 移动端缩小为 `var(--space-md, 1rem)`（[`HomeLayout.astro:511`](src/layouts/HomeLayout.astro:511)）。 |

### 3.3 文章卡片标题

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 卡片标题字号 | [`ArticleCard.astro:113`](src/components/ArticleCard.astro:113) | `.article-card__title` → `font-size` | `var(--fs-md)` = 1.125rem = 18px | **共享组件**，改此影响首页/topics/archive 所有列表。 |
| 卡片标题字重 | [`ArticleCard.astro:114`](src/components/ArticleCard.astro:114) | `.article-card__title` → `font-weight` | `var(--fw-semibold)` = 600 | |
| 卡片标题行高 | [`ArticleCard.astro:115`](src/components/ArticleCard.astro:115) | `.article-card__title` → `line-height` | `var(--lh-snug)` = 1.35 | |
| 卡片标题色 | [`ArticleCard.astro:120`](src/components/ArticleCard.astro:120) | `.article-card__title a` → `color` | `var(--color-heading)` = #2b2640 | hover 变 `var(--color-brand)`（[`ArticleCard.astro:125`](src/components/ArticleCard.astro:125)）。 |

### 3.4 文章卡片摘要

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 摘要字号 | [`ArticleCard.astro:130`](src/components/ArticleCard.astro:130) | `.article-card__summary` → `font-size` | `var(--fs-sm)` = 0.875rem = 14px | |
| 摘要颜色 | [`ArticleCard.astro:131`](src/components/ArticleCard.astro:131) | `.article-card__summary` → `color` | `var(--color-text-muted)` = #767289 | |
| 摘要行数限制 | [`ArticleCard.astro:135`](src/components/ArticleCard.astro:135) | `.article-card__summary` → `-webkit-line-clamp` | `3` | 超过3行省略。改 `2` 更紧凑。 |

### 3.5 文章卡片日期/元信息

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 元信息字号 | [`ArticleCard.astro:142`](src/components/ArticleCard.astro:142) | `.article-card__meta` → `font-size` | `var(--fs-xs)` = 0.75rem = 12px | |
| 元信息颜色 | [`ArticleCard.astro:143`](src/components/ArticleCard.astro:143) | `.article-card__meta` → `color` | `var(--color-text-muted)` = #767289 | |
| 元信息间距 | [`ArticleCard.astro:146`](src/components/ArticleCard.astro:146) | `.article-card__meta` → `gap` | `var(--space-sm)` = 12px | 日期与标签间距。 |

### 3.6 文章封面缩略图

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 缩略图宽 | [`ArticleCard.astro:91`](src/components/ArticleCard.astro:91) | `.article-card__thumb` → `width` | `120px` | 桌面。移动端缩小为 88px（[`ArticleCard.astro:190`](src/components/ArticleCard.astro:190)）。 |
| 缩略图高 | [`ArticleCard.astro:92`](src/components/ArticleCard.astro:92) | `.article-card__thumb` → `height` | `80px` | 移动端 64px。 |
| 缩略图圆角 | [`ArticleCard.astro:94`](src/components/ArticleCard.astro:94) | `.article-card__thumb` → `border-radius` | `var(--radius-md)` = 8px | |
| 图片填充 | [`ArticleCard.astro:102`](src/components/ArticleCard.astro:102) | `.article-card__thumb img` → `object-fit` | `cover` | 裁剪填充。 |

### 3.7 卡片间距

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 卡片内边距（上下） | [`ArticleCard.astro:81`](src/components/ArticleCard.astro:81) | `.article-card` → `padding-block` | `var(--space-lg)` = 1.5rem = 24px | 每张卡片的上下间距。无图卡片同为 `var(--space-lg)`（[`ArticleCard.astro:184`](src/components/ArticleCard.astro:184)）。 |
| 卡片图文间距 | [`ArticleCard.astro:82`](src/components/ArticleCard.astro:82) | `.article-card` → `gap` | `var(--space-md)` = 1rem = 16px | 缩略图与文字的间距。移动端缩小为 `var(--space-sm)`（[`ArticleCard.astro:195`](src/components/ArticleCard.astro:195)）。 |
| 卡片分隔线 | [`ArticleList.astro:86`](src/components/ArticleList.astro:86) | `.article-list :global(.article-card)` → `border-bottom` | `1px solid var(--color-border)` | 每张卡片底部分隔线。 |

### 3.8 Demo 徽章

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 徽章底色 | [`ArticleCard.astro:174`](src/components/ArticleCard.astro:174) | `.article-card__demo-badge` → `background-color` | `#fef3c7` | 浅黄。文章详情页 Demo 标签同色（[`ArticleLayout.astro:333`](src/layouts/ArticleLayout.astro:333)）。 |
| 徽章文字色 | [`ArticleCard.astro:175`](src/components/ArticleCard.astro:175) | `.article-card__demo-badge` → `color` | `#92400e` | 深棕。 |
| 徽章圆角 | [`ArticleCard.astro:176`](src/components/ArticleCard.astro:176) | `.article-card__demo-badge` → `border-radius` | `var(--radius-sm)` = 4px | |
| 徽章字号 | [`ArticleCard.astro:177`](src/components/ArticleCard.astro:177) | `.article-card__demo-badge` → `font-size` | `var(--fs-xs)` = 12px | |

### 3.9 分页组件

分页由共享组件 [`Pagination.astro`](src/components/Pagination.astro:125) 渲染。

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 分页上间距 | [`Pagination.astro:132`](src/components/Pagination.astro:132) | `.pagination` → `margin-top` | `var(--space-2xl)` = 3rem = 48px | 列表与分页的间距。 |
| 分页上边框 | [`Pagination.astro:134`](src/components/Pagination.astro:134) | `.pagination` → `border-top` | `1px solid var(--color-border)` | |
| 页码按钮尺寸 | [`Pagination.astro:160-161`](src/components/Pagination.astro:160) | `.pagination__link` → `min-width/height` | `2.25rem` / `2.25rem` = 36px | |
| 页码字号 | [`Pagination.astro:164`](src/components/Pagination.astro:164) | `.pagination__link` → `font-size` | `var(--fs-sm)` = 14px | |
| 当前页底色 | [`Pagination.astro:184`](src/components/Pagination.astro:184) | `.pagination__link--current` → `background-color` | `var(--color-brand)` = #6d4aff | 品牌紫实底。 |
| 当前页文字色 | [`Pagination.astro:185`](src/components/Pagination.astro:185) | `.pagination__link--current` → `color` | `#ffffff` | |
| 页码间距 | [`Pagination.astro:150`](src/components/Pagination.astro:150) | `.pagination__list` → `gap` | `var(--space-2xs)` = 4px | 移动端缩小为 0（[`Pagination.astro:234`](src/components/Pagination.astro:234)）。 |
| 信息文本 | [`Pagination.astro:141`](src/components/Pagination.astro:141) | `.pagination__info` → `font-size` | `var(--fs-sm)` = 14px | "第 X / Y 页，共 Z 篇"。 |

### 3.10 列表到 Footer 间距

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 首页 Footer 去除默认间距 | [`HomeLayout.astro:427-431`](src/layouts/HomeLayout.astro:427) | `:global(.main + .footer)` → `margin-top` | `0` | 首页 Footer 透明无边框，紧贴文章列表。Footer 默认 `margin-top: var(--space-4xl)` = 96px（[`Footer.astro:47`](src/components/Footer.astro:47)），首页覆盖为 0。 |

---

## 4. 文章详情页

文章详情页布局由 [`ArticleLayout.astro`](src/layouts/ArticleLayout.astro:268) 的 scoped `<style>` 定义（三栏 Grid），正文排版由 [`article-prose.css`](src/styles/article-prose.css:21) 全局样式定义。

### 4.1 文章标题

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 标题字体 | [`ArticleLayout.astro:347`](src/layouts/ArticleLayout.astro:347) | `.article-head__title` → `font-family` | `var(--font-serif, Georgia, serif)` | 衬线体。改 [`global.css:86`](src/styles/global.css:86) `--font-serif` 联动全站衬线。 |
| 标题字号（桌面） | [`ArticleLayout.astro:348`](src/layouts/ArticleLayout.astro:348) | `.article-head__title` → `font-size` | `2.25rem` = 36px | 移动端覆盖为 `1.5rem` = 24px（[`ArticleLayout.astro:441`](src/layouts/ArticleLayout.astro:441)）。 |
| 标题字重 | [`ArticleLayout.astro:349`](src/layouts/ArticleLayout.astro:349) | `.article-head__title` → `font-weight` | `var(--fw-bold, 700)` | |
| 标题行高 | [`ArticleLayout.astro:350`](src/layouts/ArticleLayout.astro:350) | `.article-head__title` → `line-height` | `var(--lh-tight, 1.2)` | |
| 标题颜色 | [`ArticleLayout.astro:351`](src/layouts/ArticleLayout.astro:351) | `.article-head__title` → `color` | `var(--color-heading, #2b2640)` | |
| 标题字间距 | [`ArticleLayout.astro:352`](src/layouts/ArticleLayout.astro:352) | `.article-head__title` → `letter-spacing` | `-0.01em` | 微收紧。 |

### 4.2 文章摘要

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 摘要字号 | [`ArticleLayout.astro:366`](src/layouts/ArticleLayout.astro:366) | `.article-head__summary` → `font-size` | `14px` | 硬编码（注释标注可手动调整）。移动端同为 14px（[`ArticleLayout.astro:445`](src/layouts/ArticleLayout.astro:445)）。 |
| 摘要斜体 | [`ArticleLayout.astro:367`](src/layouts/ArticleLayout.astro:367) | `.article-head__summary` → `font-style` | `italic` | 仅文章详情页摘要斜体。 |
| 摘要颜色 | [`ArticleLayout.astro:368`](src/layouts/ArticleLayout.astro:368) | `.article-head__summary` → `color` | `var(--color-text-muted, #767289)` | |
| 摘要字体 | [`ArticleLayout.astro:370`](src/layouts/ArticleLayout.astro:370) | `.article-head__summary` → `font-family` | `var(--font-serif, Georgia, serif)` | 衬线体。 |
| 摘要行高 | [`ArticleLayout.astro:369`](src/layouts/ArticleLayout.astro:369) | `.article-head__summary` → `line-height` | `1.6` | |

### 4.3 文章标签

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 标签底色 | [`ArticleLayout.astro:384`](src/layouts/ArticleLayout.astro:384) | `.article-head__tag` → `background-color` | `var(--color-brand-soft, #efeaff)` | 极浅紫。 |
| 标签文字色 | [`ArticleLayout.astro:385`](src/layouts/ArticleLayout.astro:385) | `.article-head__tag` → `color` | `var(--color-brand-strong, #5a36f0)` | 深紫。 |
| 标签圆角 | [`ArticleLayout.astro:386`](src/layouts/ArticleLayout.astro:386) | `.article-head__tag` → `border-radius` | `var(--radius-pill, 999px)` | 胶囊形。 |
| 标签描边 | [`ArticleLayout.astro:388`](src/layouts/ArticleLayout.astro:388) | `.article-head__tag` → `border` | `1px solid var(--color-brand-border, #d9ccff)` | |
| 标签字号 | [`ArticleLayout.astro:382`](src/layouts/ArticleLayout.astro:382) | `.article-head__tag` → `font-size` | `var(--fs-xs, 12px)` | |
| 标签间距 | [`ArticleLayout.astro:378`](src/layouts/ArticleLayout.astro:378) | `.article-head__tags` → `gap` | `var(--space-xs, 8px)` | |

### 4.4 正文 17px 基准字号

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 正文字号 | [`article-prose.css:23`](src/styles/article-prose.css:23) | `.article-prose` → `font-size` | `17px` | 硬编码（注释写"15px"但实际值为17px）。桌面与移动端统一基准，不随屏幕变化。改此值影响所有文章正文。 |
| 正文行高 | [`article-prose.css:24`](src/styles/article-prose.css:24) | `.article-prose` → `line-height` | `1.85` | 中文行距加大。 |
| 正文颜色 | [`article-prose.css:25`](src/styles/article-prose.css:25) | `.article-prose` → `color` | `#33303f` | 柔和深灰（硬编码）。 |
| 正文字体 | [`article-prose.css:22`](src/styles/article-prose.css:22) | `.article-prose` → `font-family` | `var(--font-serif)` | 衬线体。 |
| 字间距 | [`article-prose.css:26`](src/styles/article-prose.css:26) | `.article-prose` → `letter-spacing` | `0.01em` | 中文微调。 |
| 段落首行缩进 | [`article-prose.css:116`](src/styles/article-prose.css:116) | `.article-prose > p` → `text-indent` | `2em` | 两个汉字宽度。仅直接子段落缩进，引用/列表/表格内不缩进（[`article-prose.css:122-128`](src/styles/article-prose.css:122)）。 |
| 段落间距 | [`article-prose.css:114`](src/styles/article-prose.css:114) | `.article-prose > p` → `margin-bottom` | `1.1rem` ≈ 17px | 移动端缩小为 `1rem`（[`article-prose.css:480`](src/styles/article-prose.css:480)）。 |
| 段落对齐 | [`article-prose.css:117`](src/styles/article-prose.css:117) | `.article-prose > p` → `text-align` | `justify` | 两端对齐。 |

### 4.5 H1–H4 标题层次

> **注意**：文章详情页有两套标题样式。[`ArticleLayout.astro:346`](src/layouts/ArticleLayout.astro:346) `.article-head__title` 是文章页大标题（36px）；[`article-prose.css`](src/styles/article-prose.css:38) `.article-prose h1~h6` 是正文内 Markdown 标题。正文内 h1 通常不出现（文章标题已在 head 中），h2/h3 是主要章节标题。

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值（桌面） | 移动端覆盖 | 如何调整 |
|---------|-------------|--------------|--------|---------|---------|
| 正文 H1 | [`article-prose.css:40`](src/styles/article-prose.css:40) | `.article-prose h1` → `font-size` | `2rem` = 32px | [`article-prose.css:466`](src/styles/article-prose.css:466) `1.375rem` = 22px（≤767px）；[`article-prose.css:447`](src/styles/article-prose.css:447) `1.625rem` = 26px（≤1023px） | 三级响应式。 |
| 正文 H2 | [`article-prose.css:51`](src/styles/article-prose.css:51) | `.article-prose h2` → `font-size` | `1.3125rem` = 21px | ≤1023px: `1.1875rem` = 19px；≤767px: `1.1875rem` | 带 `border-bottom: 2px solid var(--color-brand-border)`（[`article-prose.css:58`](src/styles/article-prose.css:58)）紫色下划线。 |
| 正文 H3 | [`article-prose.css:65`](src/styles/article-prose.css:65) | `.article-prose h3` → `font-size` | `1.125rem` = 18px | ≤1023px/≤767px: `1.0625rem` = 17px | |
| 正文 H4 | [`article-prose.css:76`](src/styles/article-prose.css:76) | `.article-prose h4` → `font-size` | `1rem` = 16px | 无覆盖 | |
| H2 上间距 | [`article-prose.css:55`](src/styles/article-prose.css:55) | `.article-prose h2` → `margin-top` | `var(--space-2xl)` = 3rem = 48px | ≤767px: `var(--space-xl)` = 32px | 章节间距。 |
| 标题锚点偏移 | [`article-prose.css:100`](src/styles/article-prose.css:100) | `.article-prose h1~h6` → `scroll-margin-top` | `calc(var(--height-header, 4rem) + var(--space-lg, 24px))` | — | 点击目录跳转时避开固定 Header 遮挡。 |

### 4.6 章节目录（TOC）

TOC 由 [`ArticleTOC.astro`](src/components/ArticleTOC.astro:106) 渲染，仅当 h2+h3 ≥ 3 个时显示（[`ArticleTOC.astro:32`](src/components/ArticleTOC.astro:32)）。

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 目录标题字号 | [`ArticleTOC.astro:113`](src/components/ArticleTOC.astro:113) | `.article-toc__title` → `font-size` | `13px` | 硬编码（注释标注可调）。 |
| h2 条目字号 | [`ArticleTOC.astro:139`](src/components/ArticleTOC.astro:139) | `.article-toc__link` → `font-size` | `14px` | 硬编码。 |
| h3 子条目字号 | [`ArticleTOC.astro:150`](src/components/ArticleTOC.astro:150) | `.article-toc__item--h3 .article-toc__link` → `font-size` | `13px` | 比 h2 小1px。 |
| 目录左边框 | [`ArticleTOC.astro:125`](src/components/ArticleTOC.astro:125) | `.article-toc__list` → `border-left` | `2px solid var(--color-border)` | |
| 当前高亮色 | [`ArticleTOC.astro:158`](src/components/ArticleTOC.astro:158) | `.article-toc__link.is-active` → `color` | `var(--color-brand)` | 滚动到对应章节时高亮（IntersectionObserver，[`ArticleTOC.astro:72`](src/components/ArticleTOC.astro:72)）。 |
| 高亮左边框 | [`ArticleTOC.astro:160`](src/components/ArticleTOC.astro:160) | `.article-toc__link.is-active` → `border-left-color` | `var(--color-brand)` | |
| 观察偏移 | [`ArticleTOC.astro:96`](src/components/ArticleTOC.astro:96) | IntersectionObserver `rootMargin` | `'-100px 0px -70% 0px'` | JS 参数。-100px 上偏移考虑固定栏高度。 |

### 4.7 引用块 / 代码 / 表格

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 引用块左边框 | [`article-prose.css:143`](src/styles/article-prose.css:143) | `.article-prose blockquote` → `border-left` | `3px solid var(--color-brand-border)` | 紫色细线。 |
| 引用块底色 | [`article-prose.css:144`](src/styles/article-prose.css:144) | `.article-prose blockquote` → `background-color` | `var(--color-surface-alt)` = #f1eff8 | |
| 引用块字号 | [`article-prose.css:147`](src/styles/article-prose.css:147) | `.article-prose blockquote` → `font-size` | `1rem` = 16px | 移动端 `0.9375rem` = 15px（[`article-prose.css:490`](src/styles/article-prose.css:490)）。 |
| 行内代码字号 | [`article-prose.css:228`](src/styles/article-prose.css:228) | `.article-prose code` → `font-size` | `0.875em` | 相对于父级17px → ≈15px。 |
| 行内代码底色 | [`article-prose.css:230`](src/styles/article-prose.css:230) | `.article-prose code` → `background-color` | `var(--color-surface-alt)` | |
| 行内代码色 | [`article-prose.css:232`](src/styles/article-prose.css:232) | `.article-prose code` → `color` | `var(--color-brand-strong)` = #5a36f0 | 深紫。 |
| 代码块底色 | [`article-prose.css:243`](src/styles/article-prose.css:243) | `.article-prose pre` → `background-color` | `#1e1e2e` | 深色主题。 |
| 代码块字号 | [`article-prose.css:247`](src/styles/article-prose.css:247) | `.article-prose pre` → `font-size` | `0.875rem` = 14px | 移动端 `0.8125rem` = 13px。 |
| 代码块文字色 | [`article-prose.css:254`](src/styles/article-prose.css:254) | `.article-prose pre code` → `color` | `#cdd6f4` | 浅色文字。 |
| 表格字号 | [`article-prose.css:305`](src/styles/article-prose.css:305) | `.article-prose table` → `font-size` | `0.9375rem` = 15px | 移动端 `0.875rem` = 14px。 |
| 表头底色 | [`article-prose.css:320`](src/styles/article-prose.css:320) | `.article-prose th` → `background-color` | `var(--color-surface-alt)` | |
| 表格最小宽 | [`article-prose.css:307`](src/styles/article-prose.css:307) | `.article-prose table` → `min-width` | `480px` | 窄屏横向滚动（`.table-wrapper` overflow-x，[`article-prose.css:297`](src/styles/article-prose.css:297)）。 |

### 4.8 正文区域宽度与边距

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 三栏布局 | [`ArticleLayout.astro:272-275`](src/layouts/ArticleLayout.astro:272) | `.article-layout` → `grid-template-columns` | `minmax(180px,220px) minmax(0,1fr) minmax(180px,240px)` | 左目录/中正文/右来源。平板双栏（[`ArticleLayout.astro:410`](src/layouts/ArticleLayout.astro:410)），手机单栏（[`ArticleLayout.astro:427`](src/layouts/ArticleLayout.astro:427)）。 |
| 栏间距 | [`ArticleLayout.astro:276`](src/layouts/ArticleLayout.astro:276) | `.article-layout` → `gap` | `var(--space-xl, 32px)` | 平板 `var(--space-lg, 24px)`。 |
| 中栏最大宽 | [`ArticleLayout.astro:295`](src/layouts/ArticleLayout.astro:295) | `.article-layout__main` → `max-width` | `720px` | 正文阅读宽度上限。 |
| 布局最大宽 | [`ArticleLayout.astro:277`](src/layouts/ArticleLayout.astro:277) | `.article-layout` → `max-width` | `var(--width-content, 72rem)` = 1152px | |
| 左栏 sticky | [`ArticleLayout.astro:286-287`](src/layouts/ArticleLayout.astro:286) | `.article-layout__left` → `position/top` | `sticky` / `calc(var(--height-header,4rem) + var(--space-lg,24px))` | 滚动时目录跟随。 |
| 右栏 sticky | [`ArticleLayout.astro:301-302`](src/layouts/ArticleLayout.astro:301) | `.article-layout__right` → `position/top` | `sticky` / 同上 | |
| 顶部间距 | [`ArticleLayout.astro:280`](src/layouts/ArticleLayout.astro:280) | `.article-layout` → `padding-top` | `var(--space-xl, 32px)` | 正文区与 Header 的间距。 |

### 4.9 返回按钮

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 返回链接字号 | [`ArticleLayout.astro:321`](src/layouts/ArticleLayout.astro:321) | `.article-back__link` → `font-size` | `var(--fs-sm, 14px)` | |
| 返回链接颜色 | [`ArticleLayout.astro:322`](src/layouts/ArticleLayout.astro:322) | `.article-back__link` → `color` | `var(--color-text-muted, #767289)` | hover 变 `var(--color-brand)`（[`ArticleLayout.astro:327`](src/layouts/ArticleLayout.astro:327)）。 |
| 返回下间距 | [`ArticleLayout.astro:314`](src/layouts/ArticleLayout.astro:314) | `.article-back` → `padding-bottom` | `var(--space-md, 16px)` | |
| Demo 标签 | [`ArticleLayout.astro:333-334`](src/layouts/ArticleLayout.astro:333) | `.article-back__demo-tag` → `background-color/color` | `#fef3c7` / `#92400e` | 浅黄底深棕字。 |

### 4.10 阅读进度条

进度条由 [`ReadingProgressBar.astro`](src/components/ReadingProgressBar.astro:133) 定义，JS 驱动显隐与进度。

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 阅读栏高度 | [`ReadingProgressBar.astro:166`](src/components/ReadingProgressBar.astro:166) | `.reading-bar__inner` → `height` | `var(--height-header, 4rem)` = 64px | 与 Header 同高避免布局跳动。移动端 `var(--height-header-mobile, 3.5rem)`（[`ReadingProgressBar.astro:216`](src/components/ReadingProgressBar.astro:216)）。 |
| 进度条高度 | [`ReadingProgressBar.astro:200`](src/components/ReadingProgressBar.astro:200) | `.reading-bar__progress-track` → `height` | `3px` | 底部进度线粗细。 |
| 进度条底色 | [`ReadingProgressBar.astro:201`](src/components/ReadingProgressBar.astro:201) | `.reading-bar__progress-track` → `background-color` | `var(--color-border)` = #e7e4f2 | |
| 进度填充色 | [`ReadingProgressBar.astro:207`](src/components/ReadingProgressBar.astro:207) | `.reading-bar__progress-fill` → `background-color` | `var(--color-brand)` = #6d4aff | 品牌紫。 |
| 阅读栏标题字号 | [`ReadingProgressBar.astro:190`](src/components/ReadingProgressBar.astro:190) | `.reading-bar__title` → `font-size` | `var(--fs-sm, 14px)` | 移动端 `var(--fs-xs, 12px)`（[`ReadingProgressBar.astro:221`](src/components/ReadingProgressBar.astro:221)）。 |
| 显隐过渡 | [`ReadingProgressBar.astro:150`](src/components/ReadingProgressBar.astro:150) | `.reading-bar` → `transition` | `transform var(--transition-base, 250ms) cubic-bezier(0.4,0,0.2,1)` | 滑入滑出。显示延迟150ms（[`ReadingProgressBar.astro:159`](src/components/ReadingProgressBar.astro:159)）。 |
| 进度计算范围 | [`ReadingProgressBar.astro:75`](src/components/ReadingProgressBar.astro:75) | JS `articleBody` | `.article-body` | 进度范围仅文章正文，不含导航和 Footer。 |
| 触发条件 | [`ReadingProgressBar.astro:90`](src/components/ReadingProgressBar.astro:90) | JS IntersectionObserver | 标题 `boundingClientRect.top < 0` | 标题离开视口顶部时显示阅读栏。 |

---

## 5. 其他页面与全局样式

### 5.1 主题页（topics）

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 主题网格 | [`topics/index.astro:55`](src/pages/topics/index.astro:55) | `.topic-grid` → `grid-template-columns` | `repeat(auto-fill, minmax(200px, 1fr))` | 自适应填充，每列最小200px。改 minmax 值调卡片最小宽。 |
| 主题卡片间距 | [`topics/index.astro:56`](src/pages/topics/index.astro:56) | `.topic-grid` → `gap` | `var(--space-sm)` = 12px | |
| 主题卡片内边距 | [`topics/index.astro:67`](src/pages/topics/index.astro:67) | `.topic-item` → `padding` | `var(--space-md) var(--space-lg)` = 16px/24px | |
| 主题名字号 | [`topics/index.astro:81`](src/pages/topics/index.astro:81) | `.topic-item__name` → `font-size` | `var(--fs-base)` = 16px | |
| 计数徽章底色 | [`topics/index.astro:89`](src/pages/topics/index.astro:89) | `.topic-item__count` → `background-color` | `var(--color-brand-soft)` = #efeaff | |

### 5.2 时间树页（archive）

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 年份字号 | [`archive/index.astro:85`](src/pages/archive/index.astro:85) | `.archive-year__link` → `font-size` | `var(--fs-lg)` = 22px | |
| 年份下划线 | [`archive/index.astro:80`](src/pages/archive/index.astro:80) | `.archive-year__header` → `border-bottom` | `2px solid var(--color-brand-border)` | 紫色细线。 |
| 月份胶囊圆角 | [`archive/index.astro:116`](src/pages/archive/index.astro:116) | `.archive-month__link` → `border-radius` | `var(--radius-pill)` = 999px | |
| 月份间距 | [`archive/index.astro:103`](src/pages/archive/index.astro:103) | `.archive-months` → `gap` | `var(--space-sm)` = 12px | |

### 5.3 关于页（about）

关于页主体使用 [`page.css`](src/styles/page.css:56) 的 `.placeholder-card` 共享样式。

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 卡片内边距 | [`page.css:57`](src/styles/page.css:57) | `.placeholder-card` → `padding` | `var(--space-xl)` = 32px | |
| 卡片底色 | [`page.css:58`](src/styles/page.css:58) | `.placeholder-card` → `background-color` | `var(--color-surface)` = #ffffff | |
| 卡片圆角 | [`page.css:60`](src/styles/page.css:60) | `.placeholder-card` → `border-radius` | `var(--radius-lg)` = 12px | |
| 卡片标题字号 | [`page.css:68`](src/styles/page.css:68) | `.placeholder-card__title` → `font-size` | `var(--fs-md)` = 18px | |
| 卡片间距 | [`page.css:64`](src/styles/page.css:64) | `.placeholder-card + .placeholder-card` → `margin-top` | `var(--space-lg)` = 24px | |
| 品牌区布局 | [`about/index.astro:67`](src/pages/about/index.astro:67) | `.about__brand` → `display/gap` | `flex` / `var(--space-md)` = 16px | Logo 与文字横排。移动端改为纵向（[`about/index.astro:78`](src/pages/about/index.astro:78)）。 |

### 5.4 搜索面板

| 调整项目 | 文件路径:行号 | CSS选择器/变量 | 当前值 | 如何调整 |
|---------|-------------|--------------|--------|---------|
| 面板最大宽 | [`SearchPanel.astro:309`](src/components/SearchPanel.astro:309) | `.search-panel__inner` → `max-width` | `var(--width-content, 760px)` | 注释写760px但变量实际为72rem=1152px。 |
| 输入框字号 | [`SearchPanel.astro:339`](src/components/SearchPanel.astro:339) | `.search-panel__input` → `font-size` | `var(--fs-base, 16px)` | |
| 结果标题字号 | [`SearchPanel.astro:408`](src/components/SearchPanel.astro:408) | `:global(.search-result__title)` → `font-size` | `16px` | 硬编码。 |
| 结果标题色 | [`SearchPanel.astro:410`](src/components/SearchPanel.astro:410) | `:global(.search-result__title)` → `color` | `#30273b` | 硬编码深灰紫。 |
| 结果日期色 | [`SearchPanel.astro:421`](src/components/SearchPanel.astro:421) | `:global(.search-result__date)` → `color` | `#91879c` | 硬编码浅灰紫。 |
| 悬停底色 | [`SearchPanel.astro:427`](src/components/SearchPanel.astro:427) | `:global(.search-result:hover)` → `background-color` | `#f3ecff` | 硬编码淡紫。 |
| 结果最大高 | [`SearchPanel.astro:367`](src/components/SearchPanel.astro:367) | `.search-panel__results` → `max-height` | `60vh` | 超出滚动。 |

> **Astro scoped 陷阱**：搜索结果由 JS `innerHTML` 动态生成（[`SearchPanel.astro:194`](src/components/SearchPanel.astro:194)），DOM 不带 `data-astro-cid` 属性。scoped 选择器 `.search-result` 编译后追加 `[data-astro-cid-xxx]` 无法命中。**必须用 `:global(.search-panel__results .search-result)` 整体包住**（[`SearchPanel.astro:393`](src/components/SearchPanel.astro:393)）。改搜索结果样式只改这些 `:global()` 块。

### 5.5 全局设计变量速查

所有设计令牌集中在 [`global.css`](src/styles/global.css:11) `:root`（行 11–180）。

| 类别 | 变量名 | 文件:行号 | 当前值 | 影响范围 |
|------|--------|----------|--------|---------|
| 品牌色 | `--color-brand` | [`global.css:17`](src/styles/global.css:17) | `#6d4aff` | Logo/链接/按钮/选中态/进度条/分页当前页 |
| 品牌 hover | `--color-brand-strong` | [`global.css:21`](src/styles/global.css:21) | `#5a36f0` | hover/按下 |
| 极浅紫 | `--color-brand-soft` | [`global.css:22`](src/styles/global.css:22) | `#efeaff` | 标签底/选中底 |
| 紫描边 | `--color-brand-border` | [`global.css:23`](src/styles/global.css:23) | `#d9ccff` | 描边/H2下划线/目录边框 |
| 页面背景 | `--color-bg` | [`global.css:33`](src/styles/global.css:33) | `#f7f6fc` | body 背景（非首页） |
| 卡片背景 | `--color-surface` | [`global.css:35`](src/styles/global.css:35) | `#ffffff` | Header/卡片/阅读栏 |
| 次级表面 | `--color-surface-alt` | [`global.css:37`](src/styles/global.css:37) | `#f1eff8` | Footer/引用块/代码底 |
| 边框 | `--color-border` | [`global.css:39`](src/styles/global.css:39) | `#e7e4f2` | 全站分隔线 |
| 标题色 | `--color-heading` | [`global.css:47`](src/styles/global.css:47) | `#2b2640` | 深灰紫 |
| 正文色 | `--color-text` | [`global.css:49`](src/styles/global.css:49) | `#3d3a4e` | 柔和深灰 |
| 次要文字 | `--color-text-muted` | [`global.css:51`](src/styles/global.css:51) | `#767289` | 摘要/元信息/占位 |
| 衬线字体 | `--font-serif` | [`global.css:86`](src/styles/global.css:86) | `'Source Han Serif SC', ...Georgia, serif` | 文章正文/标题 |
| 无衬线 | `--font-sans` | [`global.css:75`](src/styles/global.css:75) | `-apple-system, ...sans-serif` | UI 文字 |
| 中文字体 | `--font-zh` | [`global.css:79`](src/styles/global.css:79) | `'PingFang SC', 'Microsoft YaHei', ...` | 中文优先 |
| 根字号 | `--fs-root` | [`global.css:98`](src/styles/global.css:98) | `16px` | html font-size，所有 rem 基准 |
| 正文字号 | `--fs-base` | [`global.css:101`](src/styles/global.css:101) | `1rem` = 16px | UI 正文基准 |
| 内容宽度 | `--width-content` | [`global.css:139`](src/styles/global.css:139) | `72rem` = 1152px | Header/Container/阅读栏 |
| 文章宽度 | `--width-article` | [`global.css:141`](src/styles/global.css:141) | `48rem` = 768px | 预留三栏阅读宽 |
| Header 高 | `--height-header` | [`global.css:143`](src/styles/global.css:143) | `4rem` = 64px | 桌面 Header/阅读栏/sticky 偏移 |
| Header 高（移动） | `--height-header-mobile` | [`global.css:144`](src/styles/global.css:144) | `3.5rem` = 56px | 移动端 |
| 过渡快 | `--transition-fast` | [`global.css:174`](src/styles/global.css:174) | `150ms ease` | hover/颜色过渡 |
| 过渡基准 | `--transition-base` | [`global.css:175`](src/styles/global.css:175) | `250ms ease` | 显隐/变换过渡 |
| Header z-index | `--z-header` | [`global.css:178`](src/styles/global.css:178) | `100` | Header/阅读栏/搜索面板 |
| 移动端字号缩减 | `@media(768px)` | [`global.css:267-270`](src/styles/global.css:267) | `--fs-2xl: 1.75rem; --fs-xl: 1.5rem` | 移动端覆盖大标题字号 |

---

## 6. 最常手动修改的 15 个参数速查表

按常用程度排列。修改前请确认是改**变量定义**（全站联动）还是改**组件硬编码值**（仅当前组件）。

| 排名 | 调整项目 | 文件路径:行号 | 选择器/参数 | 当前值 | 影响范围 | 一句话说明 |
|------|---------|-------------|-----------|--------|---------|-----------|
| 1 | 品牌主色 | [`global.css:17`](src/styles/global.css:17) | `--color-brand` | `#6d4aff` | 全站 | 改一处，Logo/链接/按钮/选中态/进度条/分页全联动 |
| 2 | 文章正文字号 | [`article-prose.css:23`](src/styles/article-prose.css:23) | `.article-prose` → `font-size` | `17px` | 所有文章正文 | 硬编码，改此值调正文大小 |
| 3 | Hero 标题字号 | [`HomeLayout.astro:319`](src/layouts/HomeLayout.astro:319) | `.home-hero__title` → `font-size` | `clamp(2.75rem, 6vw, 4.25rem)` | 首页标题 | 调 max(4.25rem) 放大上限，调 min(2.75rem) 缩小下限 |
| 4 | 页面内容宽度 | [`global.css:139`](src/styles/global.css:139) | `--width-content` | `72rem` = 1152px | 全站布局 | Header/Container/阅读栏最大宽 |
| 5 | Header 高度 | [`global.css:143`](src/styles/global.css:143) | `--height-header` | `4rem` = 64px | 全站 | 影响 sticky 偏移、阅读栏高度、锚点 scroll-margin |
| 6 | Hero 高度 | [`HomeLayout.astro:271`](src/layouts/HomeLayout.astro:271) | `.home-hero` → `min-height` | `78vh` | 首页 | 调大更高，调小更早露出文章 |
| 7 | 粒子数量 | [`ParticleBackground.astro:73`](src/components/ParticleBackground.astro:73) | `CONFIG.PARTICLE_COUNT` | `50` | 首页背景 | 调大更密集但耗性能 |
| 8 | 文章列表宽度 | [`HomeLayout.astro:434`](src/layouts/HomeLayout.astro:434) | `.home-latest__inner` → `max-width` | `53.125rem` = 850px | 首页文章列表 | 比全站窄，阅读更聚焦 |
| 9 | Science Map 三角形大小 | [`ScienceMap.astro:257`](src/components/ScienceMap.astro:257) | `CONFIG.RADIUS_BASE` | `160` | 首页 Hero 右侧 | 投影宽约占容器55%-75% |
| 10 | 文章标题字号 | [`ArticleLayout.astro:348`](src/layouts/ArticleLayout.astro:348) | `.article-head__title` → `font-size` | `2.25rem` = 36px | 文章详情页 | 移动端 1.5rem |
| 11 | 正文行高 | [`article-prose.css:24`](src/styles/article-prose.css:24) | `.article-prose` → `line-height` | `1.85` | 所有文章正文 | 中文行距，调大更松 |
| 12 | 卡片标题字号 | [`ArticleCard.astro:113`](src/components/ArticleCard.astro:113) | `.article-card__title` → `font-size` | `var(--fs-md)` = 18px | 所有列表页 | 共享组件，改影响首页/topics/archive |
| 13 | Header 滚动切换阈值 | [`Header.astro:217`](src/components/Header.astro:217) | `threshold` | `innerHeight * 0.6` | 首页 Header 配色 | 滚动超过视口60%切换毛玻璃 |
| 14 | 段落首行缩进 | [`article-prose.css:116`](src/styles/article-prose.css:116) | `.article-prose > p` → `text-indent` | `2em` | 所有文章正文 | 改 `0` 取消缩进 |
| 15 | 正文衬线字体 | [`global.css:86`](src/styles/global.css:86) | `--font-serif` | `'Source Han Serif SC', ...Georgia, serif` | 文章正文/标题 | 改字体栈，需确保系统已安装 |

---

## 附：文件索引

| 文件 | 用途 | 样式定义方式 |
|------|------|------------|
| [`src/styles/global.css`](src/styles/global.css:1) | 设计令牌 + 基础排版 | 全局 CSS（`:root` 变量 + body/h1/a 等） |
| [`src/styles/reset.css`](src/styles/reset.css:1) | 最小化 reset | 全局 CSS |
| [`src/styles/page.css`](src/styles/page.css:1) | 页面骨架（page-header/placeholder-card/badge） | 全局 CSS，多页面 `import` |
| [`src/styles/article-prose.css`](src/styles/article-prose.css:1) | 文章正文排版（17px/H1-H6/引用/代码/表格） | 全局 CSS，ArticleLayout `import` |
| [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:1) | 基础 HTML 骨架 | scoped `<style>`（`.main`） |
| [`src/layouts/HomeLayout.astro`](src/layouts/HomeLayout.astro:265) | 首页布局（Hero + 文章列表） | scoped `<style>` |
| [`src/layouts/ArticleLayout.astro`](src/layouts/ArticleLayout.astro:268) | 文章详情三栏布局 | scoped `<style>` |
| [`src/components/Header.astro`](src/components/Header.astro:287) | 站点 Header | scoped `<style>` + `<script>` |
| [`src/components/Logo.astro`](src/components/Logo.astro:40) | Logo 组件 | scoped `<style>`（`--logo-size`） |
| [`src/components/ArticleCard.astro`](src/components/ArticleCard.astro:81) | 文章卡片（共享） | scoped `<style>` |
| [`src/components/ArticleList.astro`](src/components/ArticleList.astro:80) | 文章列表容器 | scoped `<style>` |
| [`src/components/Pagination.astro`](src/components/Pagination.astro:125) | 分页（共享） | scoped `<style>` |
| [`src/components/ArticleTOC.astro`](src/components/ArticleTOC.astro:106) | 章节目录 | scoped `<style>` + `<script>` |
| [`src/components/ReadingProgressBar.astro`](src/components/ReadingProgressBar.astro:133) | 阅读进度条 | scoped `<style>` + `<script>` |
| [`src/components/ArticleFootnotes.astro`](src/components/ArticleFootnotes.astro:129) | 引用来源边注 | scoped `<style>` |
| [`src/components/ArticleNav.astro`](src/components/ArticleNav.astro:95) | 下一篇导航 | scoped `<style>` |
| [`src/components/CopyLinkButton.astro`](src/components/CopyLinkButton.astro:82) | 复制链接按钮 | scoped `<style>` |
| [`src/components/ParticleBackground.astro`](src/components/ParticleBackground.astro:33) | 粒子背景 | scoped `<style>` + `<script>` CONFIG |
| [`src/components/ScienceMap.astro`](src/components/ScienceMap.astro:103) | Science Map 动画 | scoped `<style>` + `<script>` CONFIG |
| [`src/components/SearchPanel.astro`](src/components/SearchPanel.astro:280) | 搜索面板 | scoped `<style>`（含 `:global()`） |
| [`src/components/Footer.astro`](src/components/Footer.astro:45) | 页脚 | scoped `<style>` |
| [`src/components/Container.astro`](src/components/Container.astro:21) | 内容容器 | scoped `<style>` |
| [`src/pages/topics/index.astro`](src/pages/topics/index.astro:52) | 主题页 | scoped `<style>` |
| [`src/pages/archive/index.astro`](src/pages/archive/index.astro:68) | 时间树页 | scoped `<style>` |
| [`src/pages/about/index.astro`](src/pages/about/index.astro:65) | 关于页 | scoped `<style>` |
