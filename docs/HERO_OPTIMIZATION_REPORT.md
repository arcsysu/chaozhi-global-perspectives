# 首页 Hero 区域小尺寸桌面视口精细响应式优化报告

> **优化性质：仅修改首页 Hero 直接相关的 CSS 布局参数**
> **优化日期：2026-11-19**
> **验证方法：Playwright 10 视口量化测量 + 截图 + 回归测试**
> **基线脚本：[`tests/hero-metrics-baseline.mjs`](tests/hero-metrics-baseline.mjs) / 验证脚本：[`tests/hero-verify-post.mjs`](tests/hero-verify-post.mjs)**

---

## 一、问题诊断

通过 Playwright 在 10 个视口下对 Hero 区域进行精细化量化测量（[`tests/hero-metrics-baseline.mjs`](tests/hero-metrics-baseline.mjs)），发现以下三个根因导致小尺寸桌面端拥挤：

### 1.1 标题字号在 1280-1536px 全为最大值 68px

原 CSS：`.home-hero__title { font-size: clamp(2.75rem, 6vw, 4.25rem); }`

| 视口 | 6vw 计算值 | clamp 结果 | 问题 |
|------|-----------|-----------|------|
| 1280px | 76.8px | **68px**（被 max 截断） | 🔴 不缩小 |
| 1366px | 81.96px | **68px**（被 max 截断） | 🔴 不缩小 |
| 1440px | 86.4px | **68px**（被 max 截断） | 🔴 不缩小 |
| 1536px | 92.16px | **68px**（被 max 截断） | 🔴 不缩小 |
| 1600px | 96px | **68px**（被 max 截断） | 🔴 不缩小 |

**根因**：`6vw` 在 1133px 视口即达到 max 值 68px，导致 1280-1600px 整个区间标题始终为 68px，不随视口缩小。

### 1.2 标题内嵌空 `<p>` 制造虚假间距

HTML 结构（[`HomeLayout.astro`](src/layouts/HomeLayout.astro):65-71）：
```html
<h1 class="home-hero__title">
  <span class="home-hero__title-line--1">看见科学的</span>
  <p class="home-hero__desc"></p>   <!-- ← 空的，但在标题内部 -->
  <span class="home-hero__title-line--2">下一步。</span>
</h1>
```

这个空 `<p>` 继承了 `.home-hero__desc` 的 `margin-top: 32px`，在两行标题之间制造了 32px 的虚假间距，导致标题总高度 = 181px（实际文字仅约 142px）。

### 1.3 所有间距为固定 px，不随视口缩放

| 参数 | 原值 | 问题 |
|------|------|------|
| `.home-hero__inner` gap | `var(--space-2xl, 3rem)` = 48px 固定 | 720px 高度视口下不缩放 |
| `.home-hero__desc` margin-top | `var(--space-xl, 2rem)` = 32px 固定 | 同上 |
| `.home-hero__actions` margin-top | `var(--space-2xl, 3rem)` = 48px 固定 | 同上 |
| `.home-hero__inner` padding-block | `6rem 4rem` = 96px/64px 固定 | 顶部留白在小屏桌面过大 |

---

## 二、修改明细

**仅修改 1 个文件**：[`src/layouts/HomeLayout.astro`](src/layouts/HomeLayout.astro) 的 `<style>` 块，共 4 处 CSS 变更，零 HTML/JS/路由改动。

### 2.1 `.home-hero__inner` — gap + padding-block 流式化

| 属性 | 变更前 | 变更后 | 原因 |
|------|--------|--------|------|
| `padding-block` | `6rem var(--space-3xl, 4rem)` (96px/64px 固定) | `clamp(3rem, 5vw, 6rem) clamp(2rem, 3vw, var(--space-3xl, 4rem))` | 顶部留白随视口流式缩放：320px→48px、1280px→64px、1920px→96px |
| `gap` | `var(--space-2xl, 3rem)` (48px 固定) | `clamp(1.5rem, 3vw, 3rem)` | 左右栏间距流式：1024px→32px、1280px→38px、1920px→48px |

### 2.2 `.home-hero__title` — 字号 vw 系数降低

| 属性 | 变更前 | 变更后 | 原因 |
|------|--------|--------|------|
| `font-size` | `clamp(2.75rem, 6vw, 4.25rem)` | `clamp(2.25rem, 4vw, 4.25rem)` | vw 系数 6→4，使 1280px=51px、1440px=58px、1600px=64px、≥1706px 才达 68px |

### 2.3 `.home-hero__title > .home-hero__desc` — 新增选择器消除空 p 间距

```css
/* 新增：标题内嵌的空 <p> 不应继承 .home-hero__desc 的 margin-top */
.home-hero__title > .home-hero__desc {
  margin: 0;
  height: 0;
  overflow: hidden;
}
```

**原因**：标题内部的空 `<p class="home-hero__desc">` 继承了简介的 `margin-top: 32px`，在两行标题之间制造虚假间距。此选择器精确匹配标题内的空 p，将其 margin 归零、高度归零，不影响标题外的实际简介 `<p>`。

### 2.4 `.home-hero__desc` + `.home-hero__actions` — margin 流式化

| 选择器 | 属性 | 变更前 | 变更后 | 原因 |
|--------|------|--------|--------|------|
| `.home-hero__desc` | `margin-top` | `var(--space-xl, 2rem)` (32px 固定) | `clamp(1rem, 2vw, 2rem)` | 标题→简介间距流式：390px→16px、1280px→26px、1920px→32px |
| `.home-hero__actions` | `margin-top` | `var(--space-2xl, 3rem)` (48px 固定) | `clamp(1.5rem, 3vw, 3rem)` | 简介→按钮间距流式：390px→24px、1280px→38px、1920px→48px |

### 2.5 移动端注释补充

768px 断点内 `.home-hero__title` 的 `font-size: clamp(2.25rem, 8vw, 3rem)` 保持不变，仅补充注释说明移动端用更大 vw 系数。

---

## 三、前后视口量化对比

### 3.1 标题字号对比（核心改善）

| 视口 | 优化前 | 优化后 | 变化 | 评估 |
|------|--------|--------|------|------|
| 1920px | 68px | **68px** | 不变 | ✅ 宽屏不变 |
| 1600px | 68px | **64px** | -4px | ✅ 适当缩小 |
| 1536px | 68px | **61.44px** | -6.6px | ✅ 流式缩小 |
| 1440px | 68px | **57.6px** | -10.4px | ✅ 显著改善 |
| 1366px | 68px | **54.64px** | -13.4px | ✅ 显著改善 |
| 1280px | 68px | **51.2px** | -16.8px | ✅ 最大改善 |
| 1024px | 61.44px | **40.96px** | -20.5px | ✅ 平板改善 |
| 768px | 48px | **48px** | 不变 | ✅ 移动端不变 |
| 390px | 36px | **36px** | 不变 | ✅ 移动端不变 |
| 320px | 36px | **36px** | 不变 | ✅ 移动端不变 |

### 3.2 标题高度对比（空 p 间距消除）

| 视口 | 优化前 titleH | 优化后 titleH | 变化 | 评估 |
|------|--------------|--------------|------|------|
| 1920px | 181px | **149px** | -32px | ✅ 消除虚假间距 |
| 1440px | 181px | **126px** | -55px | ✅ 显著紧凑 |
| 1280px | 181px | **112px** | -69px | ✅ 显著紧凑 |
| 1024px | 166px | **89px** | -77px | ✅ 显著紧凑 |

### 3.3 间距对比（流式化）

| 视口 | 优化前 gap | 优化后 gap | 优化前 t→d | 优化后 t→d | 优化前 d→a | 优化后 d→a |
|------|-----------|-----------|-----------|-----------|-----------|-----------|
| 1920px | 48px | 48px | 32px | 32px | 48px | 48px |
| 1440px | 48px | **43px** | 32px | **29px** | 48px | **43px** |
| 1280px | 48px | **38px** | 32px | **26px** | 48px | **38px** |
| 1024px | 32px | 32px | 32px | **20px** | 48px | **31px** |

> t→d = 标题→简介间距；d→a = 简介→按钮间距

### 3.4 ScienceMap 越界检测

| 视口 | 优化前 nodeOverflow | 优化后 nodeOverflow | 评估 |
|------|---------------------|---------------------|------|
| 全部 10 视口 | 无 | 无 | ✅ 三角形/节点/标签未越界 |

### 3.5 横向滚动 / 左右重叠

| 视口 | scrollOverflow | leftRightOverlap | 评估 |
|------|---------------|-----------------|------|
| 1920-1024px（桌面） | 0 | false | ✅ 无溢出无重叠 |
| 768-320px（移动） | 0 | true（单栏布局预期） | ✅ 移动端单栏正常 |

### 3.6 截图

10 个视口的 Hero 区域截图已保存至 [`tests/hero-screenshots/`](tests/hero-screenshots/)：
- `hero-1920.png` ~ `hero-320.png`

---

## 四、回归测试结果

| 测试脚本 | 结果 | 说明 |
|----------|------|------|
| `home-pagination-scroll.mjs` | **48/48 PASS** | ✅ 分页+滚动恢复+persist 完整 |
| `viewport-verify-post.mjs` | **45/45 PASS** | ✅ 9视口×5页面零问题 |

---

## 五、未修改项说明

| 项目 | 状态 |
|------|------|
| ScienceMap 动画/旋转算法/标签跟随逻辑 | ✅ 未触碰 |
| ScienceMap SVG viewBox / JS | ✅ 未触碰 |
| Header / 导航 / Logo / 搜索 | ✅ 未触碰 |
| 最新文章区域 / 分页 / 滚动恢复 | ✅ 未触碰 |
| ClientRouter / History API / 页面生命周期 | ✅ 未触碰 |
| 粒子系统 | ✅ 未触碰 |
| 其他页面（主题/时间树/关于/文章页） | ✅ 未触碰 |
| 全站 CSS 变量 | ✅ 未触碰（仅用 Hero 局部样式） |
| HTML 结构 / Markdown / 路由 / 构建配置 | ✅ 未触碰 |
| `transform:scale` / 全局 zoom / `overflow-x:hidden` | ✅ 未使用 |

---

## 六、结论

本次优化以**单文件 4 处 CSS 变更**完成了首页 Hero 小尺寸桌面视口的精细优化：

- **标题字号**：1280px 从 68px 降至 51.2px（-25%），1440px 降至 57.6px（-15%），宽屏 1920px 保持 68px 不变
- **虚假间距消除**：标题内空 p 的 32px margin 归零，标题高度降低 32-77px
- **全间距流式化**：gap/padding/margin 全部用 `clamp()` 实现连续适配，无断点跳变
- **ScienceMap 无越界**：10 视口全部确认节点/标签不溢出容器
- **回归测试全通过**：48+45=93 项检查零失败
- **移动端无退化**：768/390/320px 标题字号和布局完全不变

**截图已保存至 `tests/hero-screenshots/`，等待用户视觉验收。未执行任何 git 操作。**
