/**
 * 响应式布局多视口审计脚本（只读审计，不修改任何源文件）
 *
 * 目标：在 7 个视口宽度下实际渲染 5 个关键页面，自动检测：
 *   - 横向滚动（scrollWidth > clientWidth）
 *   - 元素溢出视口（getBoundingClientRect.right > viewportWidth + 阈值）
 *   - 文本截断/裁切（scrollWidth > offsetWidth 且 overflow:hidden 的元素）
 *   - 元素重叠（两个可见块级元素的矩形相交面积 > 阈值）
 *   - Header 内部子元素是否溢出 Header 容器宽度
 *
 * 视口：1920 / 1600 / 1366 / 1280 / 1024 / 768 / 390
 * 页面：首页 / 关于 / 归档 / 主题 / 文章页
 *
 * 用法：node tests/viewport-layout-audit.mjs
 * 前置：Astro dev server 运行在 http://localhost:4321
 */
import { createRequire } from 'module';

const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';

const VIEWPORTS = [
  { width: 1920, height: 1080, label: '1920×1080 (大屏桌面)' },
  { width: 1600, height: 900, label: '1600×900 (中大屏桌面)' },
  { width: 1366, height: 768, label: '1366×768 (小屏笔记本)' },
  { width: 1280, height: 720, label: '1280×720 (小屏桌面)' },
  { width: 1024, height: 768, label: '1024×768 (平板横屏)' },
  { width: 768, height: 1024, label: '768×1024 (平板竖屏)' },
  { width: 390, height: 844, label: '390×844 (iPhone 12 Pro)' },
];

const PAGES = [
  { path: '/', name: '首页', key: 'home' },
  { path: '/about/', name: '关于', key: 'about' },
  { path: '/archive/', name: '归档', key: 'archive' },
  { path: '/topics/', name: '主题', key: 'topics' },
  { path: '/articles/hpc-ai-for-science-observation-plan-launched/', name: '文章页', key: 'article' },
];

// 累积所有问题
const allIssues = [];
let totalChecks = 0;
let totalIssues = 0;

function log(msg) {
  console.log(msg);
}

function logSection(title) {
  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(78)}`);
}

/**
 * 在页面内执行布局检测，返回问题列表。
 * 使用 Playwright page.evaluate 注入检测函数。
 */
async function auditPageLayout(page, viewportWidth) {
  return page.evaluate((vw) => {
    const issues = [];
    const threshold = 2; // 溢出阈值 px

    // 1. 横向滚动检测
    const docEl = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientW = docEl.clientWidth;
    if (scrollW > clientW + threshold) {
      issues.push({
        type: 'horizontal-scroll',
        severity: 'high',
        detail: `scrollWidth=${scrollW}px > clientWidth=${clientW}px（溢出 ${scrollW - clientW}px）`,
      });
    }

    // 2. 逐元素溢出检测：遍历所有块级元素，检查 right 是否超出视口
    const blocks = document.querySelectorAll(
      'div, section, header, footer, nav, main, aside, article, ul, ol, figure, p, h1, h2, h3, table, img'
    );
    const overflowEls = [];
    blocks.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // 只检查可见元素
      if (rect.width === 0 || rect.height === 0) return;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      // 跳过 fixed/sticky 元素（它们以视口为参照，单独检查）
      if (style.position === 'fixed' || style.position === 'sticky') return;
      // 检查右边界溢出视口
      if (rect.right > vw + threshold) {
        overflowEls.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : '',
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          left: Math.round(rect.left),
        });
      }
    });
    // 去重 + 取前 8 个最严重的
    const seen = new Set();
    const topOverflow = [];
    overflowEls
      .sort((a, b) => b.right - a.right)
      .forEach((e) => {
        const key = `${e.tag}.${e.cls}`;
        if (seen.has(key)) return;
        seen.add(key);
        topOverflow.push(e);
      });
    if (topOverflow.length > 0) {
      issues.push({
        type: 'element-overflow',
        severity: 'high',
        count: overflowEls.length,
        detail: `有 ${overflowEls.length} 个元素右边界超出视口，最严重：${topOverflow.slice(0, 5).map(e => `<${e.tag}${e.cls ? '.' + e.cls.split(' ')[0] : ''} right=${e.right}>`).join(', ')}`,
      });
    }

    // 3. 文本截断检测：overflow:hidden + scrollWidth > clientWidth
    const truncEls = [];
    blocks.forEach((el) => {
      const style = getComputedStyle(el);
      if (style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis') return;
      if (el.scrollWidth > el.clientWidth + threshold && el.clientHeight > 0) {
        const text = (el.textContent || '').trim().slice(0, 40);
        if (text.length > 0) {
          truncEls.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 50) : '',
            text,
            scrollW: el.scrollWidth,
            clientW: el.clientWidth,
          });
        }
      }
    });
    if (truncEls.length > 0) {
      issues.push({
        type: 'text-truncation',
        severity: 'medium',
        count: truncEls.length,
        detail: `有 ${truncEls.length} 个元素文本被截断：${truncEls.slice(0, 5).map(e => `<${e.tag}.${e.cls.split(' ')[0]} "${e.text}…" scrollW=${e.scrollW}>clientW=${e.clientW}`).join(', ')}`,
      });
    }

    // 4. Header 内部溢出检测：检查 header 内子元素是否超出 header 宽度
    const header = document.querySelector('header, .site-header, .header');
    if (header) {
      const hRect = header.getBoundingClientRect();
      const headerChildren = header.querySelectorAll('*');
      const headerOverflow = [];
      headerChildren.forEach((child) => {
        const cRect = child.getBoundingClientRect();
        if (cRect.width === 0 || cRect.height === 0) return;
        const style = getComputedStyle(child);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (cRect.right > hRect.right + threshold || cRect.left < hRect.left - threshold) {
          headerOverflow.push({
            tag: child.tagName.toLowerCase(),
            cls: (child.className && typeof child.className === 'string') ? child.className.slice(0, 40) : '',
            right: Math.round(cRect.right),
            headerRight: Math.round(hRect.right),
            text: (child.textContent || '').trim().slice(0, 30),
          });
        }
      });
      if (headerOverflow.length > 0) {
        const seenH = new Set();
        const topH = [];
        headerOverflow.forEach((e) => {
          const k = `${e.tag}.${e.cls}`;
          if (seenH.has(k)) return;
          seenH.add(k);
          topH.push(e);
        });
        issues.push({
          type: 'header-internal-overflow',
          severity: 'high',
          count: headerOverflow.length,
          detail: `Header 内有 ${headerOverflow.length} 个子元素溢出 header 边界：${topH.slice(0, 5).map(e => `<${e.tag}.${e.cls.split(' ')[0]} right=${e.right}>headerRight=${e.headerRight} "${e.text}"`).join(', ')}`,
        });
      }
      // 记录 header 尺寸用于报告
      issues.push({
        type: 'header-dimensions',
        severity: 'info',
        detail: `Header: width=${Math.round(hRect.width)}px, 子元素数=${headerChildren.length}`,
      });
    }

    // 5. 元素重叠检测（仅检查同层级的 flex/grid 子元素）
    const flexContainers = document.querySelectorAll(
      '.home-hero__inner, .header__inner, .article-layout, .article-nav__link, .archive-timeline__row, .topics-index__inner, .footer__inner'
    );
    const overlaps = [];
    flexContainers.forEach((container) => {
      const children = Array.from(container.children).filter((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          const a = children[i].getBoundingClientRect();
          const b = children[j].getBoundingClientRect();
          const intersectX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const intersectY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          const intersectArea = intersectX * intersectY;
          if (intersectArea > 100) { // 面积 > 100px² 视为重叠
            overlaps.push({
              container: container.className.slice(0, 40),
              a: (children[i].tagName.toLowerCase() + '.' + (typeof children[i].className === 'string' ? children[i].className.split(' ')[0] : '')).slice(0, 30),
              b: (children[j].tagName.toLowerCase() + '.' + (typeof children[j].className === 'string' ? children[j].className.split(' ')[0] : '')).slice(0, 30),
              area: Math.round(intersectArea),
            });
          }
        }
      }
    });
    if (overlaps.length > 0) {
      issues.push({
        type: 'element-overlap',
        severity: 'high',
        count: overlaps.length,
        detail: `有 ${overlaps.length} 处子元素重叠：${overlaps.slice(0, 5).map(o => `[${o.container}] ${o.a} ∩ ${o.b} (${o.area}px²)`).join(', ')}`,
      });
    }

    // 6. Grid/Flex 列塌缩检测：检查 grid 子元素宽度是否过小（< 50px）
    const grids = document.querySelectorAll('.home-hero__inner, .article-layout, .archive-timeline__row, .topics-index__inner');
    const collapsed = [];
    grids.forEach((g) => {
      const children = Array.from(g.children);
      children.forEach((c) => {
        const w = c.getBoundingClientRect().width;
        if (w > 0 && w < 50) {
          collapsed.push({
            grid: g.className.slice(0, 40),
            child: (c.tagName.toLowerCase() + '.' + (typeof c.className === 'string' ? c.className.split(' ')[0] : '')).slice(0, 30),
            width: Math.round(w),
          });
        }
      });
    });
    if (collapsed.length > 0) {
      issues.push({
        type: 'column-collapse',
        severity: 'medium',
        count: collapsed.length,
        detail: `有 ${collapsed.length} 个网格子元素宽度 < 50px：${collapsed.slice(0, 5).map(c => `[${c.grid}] ${c.child} width=${c.width}px`).join(', ')}`,
      });
    }

    return issues;
  }, viewportWidth);
}

/**
 * 采集关键尺寸数据用于报告（非问题，仅记录）。
 */
async function collectMetrics(page, viewportWidth) {
  return page.evaluate((vw) => {
    const metrics = {};
    // Container / 容器宽度
    const container = document.querySelector('.container, .home-hero__inner, .article-layout, .topics-index__inner');
    if (container) {
      const r = container.getBoundingClientRect();
      metrics.containerWidth = Math.round(r.width);
    }
    // Header 宽度
    const header = document.querySelector('header, .site-header, .header');
    if (header) {
      metrics.headerWidth = Math.round(header.getBoundingClientRect().width);
      // Header 内部 nav 项
      const navList = header.querySelector('.header__nav-list, nav ul');
      if (navList) {
        metrics.navListWidth = Math.round(navList.getBoundingClientRect().width);
        metrics.navItemCount = navList.children.length;
      }
      // brand 文字
      const brand = header.querySelector('.header__site-name, .site-name');
      if (brand) {
        metrics.brandWidth = Math.round(brand.getBoundingClientRect().width);
      }
    }
    // 正文宽度（文章页）
    const prose = document.querySelector('.article-prose, .article-layout__main, article');
    if (prose) {
      metrics.proseWidth = Math.round(prose.getBoundingClientRect().width);
    }
    // Hero 右侧 ScienceMap
    const heroRight = document.querySelector('.home-hero__right, .science-map');
    if (heroRight) {
      const r = heroRight.getBoundingClientRect();
      metrics.heroRightWidth = Math.round(r.width);
      metrics.heroRightHeight = Math.round(r.height);
    }
    // 文档总宽
    metrics.docScrollWidth = document.documentElement.scrollWidth;
    metrics.docClientWidth = document.documentElement.clientWidth;
    metrics.viewportWidth = vw;
    return metrics;
  }, viewportWidth);
}

async function main() {
  logSection('响应式布局多视口审计（只读）');
  log(`Astro dev server: ${BASE}`);
  log(`视口数: ${VIEWPORTS.length}，页面数: ${PAGES.length}`);
  log(`总检查组合: ${VIEWPORTS.length * PAGES.length}`);

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    logSection(`视口 ${vp.label}`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    for (const pg of PAGES) {
      const page = await context.newPage();
      const url = BASE + pg.path;
      let pageIssues = [];
      let metrics = {};

      try {
        // 导航并等待网络空闲
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        // 额外等待 ScienceMap 动画/字体加载
        await page.waitForTimeout(1500);

        // 执行审计
        pageIssues = await auditPageLayout(page, vp.width);
        metrics = await collectMetrics(page, vp.width);

        totalChecks++;
      } catch (err) {
        pageIssues = [{
          type: 'page-load-error',
          severity: 'high',
          detail: `页面加载/审计失败: ${err.message}`,
        }];
        totalChecks++;
      }

      // 分类输出
      const realIssues = pageIssues.filter((i) => i.severity !== 'info');
      const infoItems = pageIssues.filter((i) => i.severity === 'info');

      if (realIssues.length === 0) {
        log(`  [OK] ${pg.name} (${pg.path}) — 无布局异常`);
      } else {
        totalIssues += realIssues.length;
        log(`  [!] ${pg.name} (${pg.path}) — ${realIssues.length} 个问题：`);
        realIssues.forEach((iss) => {
          log(`      └ [${iss.severity}] ${iss.type}: ${iss.detail}`);
          allIssues.push({
            viewport: vp.label,
            viewportWidth: vp.width,
            page: pg.name,
            pagePath: pg.path,
            ...iss,
          });
        });
      }

      // 输出尺寸指标（精简）
      if (Object.keys(metrics).length > 0) {
        const mStr = Object.entries(metrics)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        log(`      指标: ${mStr}`);
      }

      await page.close();
    }

    await context.close();
  }

  await browser.close();

  // 汇总
  logSection('审计汇总');
  log(`总检查页面数: ${totalChecks}`);
  log(`发现问题总数: ${totalIssues}`);

  if (totalIssues > 0) {
    log('\n按问题类型分组：');
    const byType = {};
    allIssues.forEach((i) => {
      if (!byType[i.type]) byType[i.type] = [];
      byType[i.type].push(i);
    });
    Object.entries(byType)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([type, items]) => {
        log(`  ${type}: ${items.length} 次`);
        // 按视口统计
        const byVp = {};
        items.forEach((i) => {
          const vk = `${i.viewportWidth}`;
          if (!byVp[vk]) byVp[vk] = [];
          byVp[vk].push(i);
        });
        Object.entries(byVp)
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
          .forEach(([vw, vpItems]) => {
            log(`    @${vw}px (${vpItems[0].viewport}):`);
            vpItems.forEach((i) => {
              log(`      [${i.page}] ${i.detail}`);
            });
          });
      });
  }

  // 按视口汇总问题分布
  log('\n按视口汇总问题分布：');
  const vpSummary = {};
  allIssues.forEach((i) => {
    const vk = i.viewport;
    if (!vpSummary[vk]) vpSummary[vk] = { total: 0, high: 0, medium: 0, pages: new Set() };
    vpSummary[vk].total++;
    if (i.severity === 'high') vpSummary[vk].high++;
    if (i.severity === 'medium') vpSummary[vk].medium++;
    vpSummary[vk].pages.add(i.page);
  });
  VIEWPORTS.forEach((vp) => {
    const s = vpSummary[vp.label];
    if (s) {
      log(`  ${vp.label}: ${s.total} 问题 (high=${s.high}, medium=${s.medium}), 涉及页面: ${Array.from(s.pages).join('/')}`);
    } else {
      log(`  ${vp.label}: 无问题`);
    }
  });

  log('\n审计完成。');
}

main().catch((err) => {
  console.error('审计脚本执行失败:', err);
  process.exit(1);
});
