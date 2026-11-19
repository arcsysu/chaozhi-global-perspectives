/**
 * 响应式优化后多视口验证（只读验证，不修改源文件）
 *
 * 在 9 个视口下渲染主要页面，验证：
 *   - 无横向滚动、元素溢出、文本裁切
 *   - Header 双行布局正常（移动端无纵向大菜单）
 *   - Hero / ScienceMap 不越界
 *   - 文章正文宽度合理
 *
 * 视口：1920/1600/1366/1280/1024/768/390/360/320
 */
import { createRequire } from 'module';

const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';

const VIEWPORTS = [
  { width: 1920, height: 1080, label: '1920×1080' },
  { width: 1600, height: 900, label: '1600×900' },
  { width: 1366, height: 768, label: '1366×768' },
  { width: 1280, height: 720, label: '1280×720' },
  { width: 1024, height: 768, label: '1024×768' },
  { width: 768, height: 1024, label: '768×1024' },
  { width: 390, height: 844, label: '390×844' },
  { width: 360, height: 800, label: '360×800' },
  { width: 320, height: 568, label: '320×568' },
];

const PAGES = [
  { path: '/', name: '首页' },
  { path: '/about/', name: '关于' },
  { path: '/archive/', name: '归档' },
  { path: '/topics/', name: '主题' },
  { path: '/articles/hpc-ai-for-science-observation-plan-launched/', name: '文章页' },
];

const allIssues = [];
let totalChecks = 0;

async function auditPage(page, vw) {
  return page.evaluate((viewportWidth) => {
    const issues = [];
    const threshold = 2;

    // 1. 横向滚动
    const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const clientW = document.documentElement.clientWidth;
    if (scrollW > clientW + threshold) {
      issues.push({ type: 'horizontal-scroll', severity: 'high', detail: `scrollWidth=${scrollW} > clientWidth=${clientW} (溢出${scrollW - clientW}px)` });
    }

    // 2. 元素溢出视口
    const blocks = document.querySelectorAll('div, section, header, footer, nav, main, aside, article, ul, ol, figure, p, h1, h2, h3, table, img, svg');
    const overflowEls = [];
    blocks.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (style.position === 'fixed' || style.position === 'sticky') return;
      if (rect.right > viewportWidth + threshold) {
        overflowEls.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className.slice(0, 50) : ''), right: Math.round(rect.right) });
      }
    });
    if (overflowEls.length > 0) {
      const seen = new Set();
      const top = [];
      overflowEls.sort((a, b) => b.right - a.right).forEach((e) => {
        const k = `${e.tag}.${e.cls}`;
        if (seen.has(k)) return;
        seen.add(k);
        top.push(e);
      });
      issues.push({ type: 'element-overflow', severity: 'high', count: overflowEls.length, detail: `${overflowEls.length}个元素溢出: ${top.slice(0, 5).map(e => `<${e.tag}.${e.cls.split(' ')[0]} right=${e.right}>`).join(', ')}` });
    }

    // 3. Header 内部溢出
    const header = document.querySelector('header, .site-header, .header');
    if (header) {
      const hRect = header.getBoundingClientRect();
      const headerOverflow = [];
      header.querySelectorAll('*').forEach((child) => {
        const cRect = child.getBoundingClientRect();
        if (cRect.width === 0 || cRect.height === 0) return;
        const style = getComputedStyle(child);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (cRect.right > hRect.right + threshold || cRect.left < hRect.left - threshold) {
          headerOverflow.push({ tag: child.tagName.toLowerCase(), cls: (typeof child.className === 'string' ? child.className.slice(0, 40) : ''), right: Math.round(cRect.right), headerRight: Math.round(hRect.right) });
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
        issues.push({ type: 'header-overflow', severity: 'high', count: headerOverflow.length, detail: `Header内${headerOverflow.length}个元素溢出: ${topH.slice(0, 5).map(e => `<${e.tag}.${e.cls.split(' ')[0]} right=${e.right}>headerRight=${e.headerRight}>`).join(', ')}` });
      }
    }

    // 4. 文本截断
    const truncEls = [];
    blocks.forEach((el) => {
      const style = getComputedStyle(el);
      if (style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis') return;
      if (el.scrollWidth > el.clientWidth + threshold && el.clientHeight > 0) {
        const text = (el.textContent || '').trim().slice(0, 40);
        if (text.length > 0) truncEls.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className.slice(0, 40) : ''), text, scrollW: el.scrollWidth, clientW: el.clientWidth });
      }
    });
    if (truncEls.length > 0) {
      issues.push({ type: 'text-truncation', severity: 'medium', count: truncEls.length, detail: `${truncEls.length}个截断: ${truncEls.slice(0, 5).map(e => `<${e.tag}.${e.cls.split(' ')[0]} "${e.text}…">`).join(', ')}` });
    }

    // 5. ScienceMap 越界检测（首页）
    const heroRight = document.querySelector('.home-hero__right, .science-map');
    if (heroRight) {
      const svg = heroRight.querySelector('svg');
      if (svg) {
        const containerRect = heroRight.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        // SVG 实际渲染区域是否超出容器
        if (svgRect.right > containerRect.right + threshold || svgRect.left < containerRect.left - threshold || svgRect.bottom > containerRect.bottom + threshold || svgRect.top < containerRect.top - threshold) {
          issues.push({ type: 'sciencemap-overflow', severity: 'medium', detail: `SVG越界: container[${Math.round(containerRect.left)},${Math.round(containerRect.right)}] svg[${Math.round(svgRect.left)},${Math.round(svgRect.right)}]` });
        }
      }
    }

    return issues;
  }, vw);
}

async function collectMetrics(page, vw) {
  return page.evaluate((viewportWidth) => {
    const m = {};
    const header = document.querySelector('header, .header');
    if (header) {
      m.headerHeight = Math.round(header.getBoundingClientRect().height);
      const nav = header.querySelector('.header__nav-list');
      if (nav) {
        m.navVisible = getComputedStyle(header.querySelector('.header__nav')).display !== 'none';
        m.navWidth = Math.round(nav.getBoundingClientRect().width);
      }
      const toggle = header.querySelector('.header__toggle');
      if (toggle) m.toggleVisible = getComputedStyle(toggle).display !== 'none';
      const mobileNav = header.querySelector('.mobile-nav');
      if (mobileNav) m.mobileNavVisible = !mobileNav.hidden && getComputedStyle(mobileNav).display !== 'none';
    }
    const container = document.querySelector('.container');
    if (container) m.containerWidth = Math.round(container.getBoundingClientRect().width);
    const heroRight = document.querySelector('.home-hero__right');
    if (heroRight) {
      m.heroRightWidth = Math.round(heroRight.getBoundingClientRect().width);
      m.heroRightHeight = Math.round(heroRight.getBoundingClientRect().height);
    }
    const prose = document.querySelector('.article-layout__main, .article-prose');
    if (prose) m.proseWidth = Math.round(prose.getBoundingClientRect().width);
    m.docScrollWidth = document.documentElement.scrollWidth;
    m.docClientWidth = document.documentElement.clientWidth;
    m.viewportWidth = viewportWidth;
    const ws = container ? (viewportWidth - container.getBoundingClientRect().width) / viewportWidth : 0;
    m.whitespaceRatio = Math.round(ws * 100) / 100;
    return m;
  }, vw);
}

async function main() {
  console.log(`${'═'.repeat(85)}`);
  console.log('  响应式优化后多视口验证（9 视口 × 5 页面）');
  console.log(`${'═'.repeat(85)}\n`);

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n${'─'.repeat(85)}`);
    console.log(`  视口 ${vp.label}`);
    console.log(`${'─'.repeat(85)}`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });

    for (const pg of PAGES) {
      const page = await context.newPage();
      try {
        await page.goto(BASE + pg.path, { waitUntil: 'networkidle', timeout: 30000 });
        // 等待 ScienceMap 动画运行几帧以检测越界
        await page.waitForTimeout(2000);
        const issues = await auditPage(page, vp.width);
        const metrics = await collectMetrics(page, vp.width);
        totalChecks++;

        const real = issues.filter((i) => i.severity !== 'info');
        if (real.length === 0) {
          console.log(`  [OK] ${pg.name} — 留白率=${metrics.whitespaceRatio} headerH=${metrics.headerHeight}nav${metrics.navVisible ? '✓' : '✗'}w=${metrics.navWidth}toggle${metrics.toggleVisible ? '✓' : '✗'}mobileNav${metrics.mobileNavVisible ? '✓' : '✗'}${metrics.heroRightWidth ? ' heroR=' + metrics.heroRightWidth + '×' + metrics.heroRightHeight : ''}${metrics.proseWidth ? ' prose=' + metrics.proseWidth : ''}`);
        } else {
          console.log(`  [!] ${pg.name} — ${real.length}个问题：`);
          real.forEach((iss) => {
            console.log(`      └ [${iss.severity}] ${iss.type}: ${iss.detail}`);
            allIssues.push({ viewport: vp.label, page: pg.name, ...iss });
          });
        }
      } catch (err) {
        console.log(`  [ERR] ${pg.name} — ${err.message}`);
        totalChecks++;
      }
      await page.close();
    }
    await context.close();
  }

  await browser.close();

  console.log(`\n${'═'.repeat(85)}`);
  console.log(`验证汇总：${totalChecks} 次检查，${allIssues.length} 个问题`);
  if (allIssues.length > 0) {
    console.log('\n按视口分布：');
    const byVp = {};
    allIssues.forEach((i) => {
      if (!byVp[i.viewport]) byVp[i.viewport] = [];
      byVp[i.viewport].push(i);
    });
    Object.entries(byVp).forEach(([vp, items]) => {
      console.log(`  ${vp}: ${items.length} 个`);
      items.forEach((i) => console.log(`    [${i.page}] [${i.severity}] ${i.type}: ${i.detail}`));
    });
  }
  console.log('\n验证完成。');
}

main().catch((err) => { console.error('验证失败:', err); process.exit(1); });
