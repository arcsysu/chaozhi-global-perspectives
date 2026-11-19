/**
 * Header 内部空间分配精细测量 + 关键布局边界检测（只读审计）
 *
 * 自动检测只能发现硬性溢出，但用户反馈的"拥挤感"是视觉层面的：
 * 容器在 1280px 视口占据 90% 宽度，两侧留白过少。
 *
 * 本脚本测量：
 *   1. Header 内每个子元素的精确 rect（Logo/站名/简介/nav项/搜索按钮）
 *   2. Header 内部剩余空间（flex gap 实际值）
 *   3. 首页 Hero 52%/48% 网格的列宽实测
 *   4. 文章页三栏布局的列宽实测
 *   5. 各视口下的左右留白（viewport - containerWidth）/2
 *
 * 用法：node tests/viewport-metrics-detail.mjs
 */
import { createRequire } from 'module';

const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';

const VIEWPORTS = [
  { width: 1920, height: 1080, label: '1920' },
  { width: 1600, height: 900, label: '1600' },
  { width: 1366, height: 768, label: '1366' },
  { width: 1280, height: 720, label: '1280' },
  { width: 1024, height: 768, label: '1024' },
  { width: 768, height: 1024, label: '768' },
  { width: 390, height: 844, label: '390' },
];

/**
 * 测量 Header 内部所有直接子元素的 rect
 */
async function measureHeader(page) {
  return page.evaluate(() => {
    const header = document.querySelector('header, .site-header, .header');
    if (!header) return null;
    const hRect = header.getBoundingClientRect();
    const data = {
      headerRect: { width: Math.round(hRect.width), height: Math.round(hRect.height), left: Math.round(hRect.left), right: Math.round(hRect.right) },
      children: [],
    };

    // 测量 header 的直接子元素
    Array.from(header.children).forEach((child) => {
      const r = child.getBoundingClientRect();
      const cs = getComputedStyle(child);
      data.children.push({
        tag: child.tagName.toLowerCase(),
        cls: (typeof child.className === 'string' ? child.className : '').slice(0, 50),
        text: (child.textContent || '').trim().slice(0, 20),
        rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) },
        position: cs.position,
        display: cs.display,
      });
    });

    // 深度测量关键元素
    const targets = [
      { sel: '.header__logo, .logo', name: 'logo' },
      { sel: '.header__site-name, .site-name', name: 'site-name' },
      { sel: '.header__brief, .header__subtitle', name: 'brief' },
      { sel: '.header__brand, .header__brand-text', name: 'brand' },
      { sel: '.header__nav-list, nav ul, .nav-list', name: 'nav-list' },
      { sel: '.header__search, .search-btn', name: 'search' },
      { sel: '.header__actions', name: 'actions' },
      { sel: '.header__toggle, .menu-toggle', name: 'toggle' },
    ];
    data.keyElements = {};
    targets.forEach(({ sel, name }) => {
      const el = header.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        data.keyElements[name] = {
          selector: sel,
          rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) },
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          whiteSpace: cs.whiteSpace,
        };
      }
    });

    // nav 项详情
    const navItems = header.querySelectorAll('.header__nav-link, .nav-list a, nav ul a');
    data.navItems = [];
    navItems.forEach((a) => {
      const r = a.getBoundingClientRect();
      data.navItems.push({
        text: (a.textContent || '').trim().slice(0, 15),
        width: Math.round(r.width),
        fontSize: getComputedStyle(a).fontSize,
      });
    });

    return data;
  });
}

/**
 * 测量首页 Hero 网格列宽
 */
async function measureHero(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('.home-hero__inner');
    if (!hero) return null;
    const cs = getComputedStyle(hero);
    const gridCols = cs.gridTemplateColumns;
    const children = Array.from(hero.children);
    const childData = children.map((c) => {
      const r = c.getBoundingClientRect();
      return {
        cls: (typeof c.className === 'string' ? c.className : '').slice(0, 40),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    });
    return { gridTemplateColumns: gridCols, gap: cs.gap || cs.columnGap, children: childData };
  });
}

/**
 * 测量文章页三栏布局列宽
 */
async function measureArticleLayout(page) {
  return page.evaluate(() => {
    const layout = document.querySelector('.article-layout');
    if (!layout) return null;
    const cs = getComputedStyle(layout);
    const children = Array.from(layout.children);
    const childData = children.map((c) => {
      const r = c.getBoundingClientRect();
      return {
        cls: (typeof c.className === 'string' ? c.className : '').slice(0, 40),
        width: Math.round(r.width),
        height: Math.round(r.height),
        display: getComputedStyle(c).display,
      };
    });
    return {
      gridTemplateColumns: cs.gridTemplateColumns,
      gap: cs.gap || cs.columnGap,
      children: childData,
    };
  });
}

/**
 * 测量容器留白
 */
async function measureContainerWhitespace(page, vw) {
  return page.evaluate((viewportWidth) => {
    const container = document.querySelector('.container');
    if (!container) return null;
    const r = container.getBoundingClientRect();
    return {
      containerWidth: Math.round(r.width),
      leftWhitespace: Math.round(r.left),
      rightWhitespace: Math.round(viewportWidth - r.right),
      totalWhitespace: Math.round(viewportWidth - r.width),
      whitespaceRatio: Math.round((viewportWidth - r.width) / viewportWidth * 100) / 100,
    };
  }, vw);
}

async function main() {
  console.log(`${'═'.repeat(90)}`);
  console.log('  Header 内部空间分配 + 关键布局精细测量（只读）');
  console.log(`${'═'.repeat(90)}\n`);

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n${'─'.repeat(90)}`);
    console.log(`  视口 ${vp.label}px`);
    console.log(`${'─'.repeat(90)}`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    // --- 首页 ---
    const homePage = await context.newPage();
    await homePage.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
    await homePage.waitForTimeout(1500);

    const homeHeader = await measureHeader(homePage);
    const homeHero = await measureHero(homePage);
    const homeWs = await measureContainerWhitespace(homePage, vp.width);

    console.log(`\n[首页] 容器留白: container=${homeWs?.containerWidth}px, 左=${homeWs?.leftWhitespace}px, 右=${homeWs?.rightWhitespace}px, 留白率=${homeWs?.whitespaceRatio}`);

    if (homeHeader) {
      console.log(`[首页] Header: width=${homeHeader.headerRect.width}px`);
      console.log(`  直接子元素 (${homeHeader.children.length}):`);
      homeHeader.children.forEach((c) => {
        console.log(`    <${c.tag}.${c.cls?.split(' ')[0] || ''}> w=${c.rect.width}px [${c.rect.left}→${c.rect.right}] display=${c.display} pos=${c.position} text="${c.text}"`);
      });
      console.log(`  关键元素:`);
      Object.entries(homeHeader.keyElements).forEach(([name, info]) => {
        console.log(`    ${name}: w=${info.rect.width}px [${info.rect.left}→${info.rect.right}] fs=${info.fontSize} ws=${info.whiteSpace}`);
      });
      if (homeHeader.navItems.length > 0) {
        console.log(`  导航项 (${homeHeader.navItems.length}):`);
        homeHeader.navItems.forEach((a) => {
          console.log(`    "${a.text}" w=${a.width}px fs=${a.fontSize}`);
        });
        const navTotal = homeHeader.navItems.reduce((s, a) => s + a.width, 0);
        console.log(`  导航项总宽: ${navTotal}px`);
      }
    }

    if (homeHero) {
      console.log(`[首页] Hero 网格: grid-cols="${homeHero.gridTemplateColumns}" gap="${homeHero.gap}"`);
      homeHero.children.forEach((c) => {
        console.log(`    .${c.cls?.split(' ')[0] || ''} w=${c.width}px h=${c.height}px`);
      });
    }
    await homePage.close();

    // --- 文章页 ---
    const artPage = await context.newPage();
    await artPage.goto(BASE + '/articles/hpc-ai-for-science-observation-plan-launched/', { waitUntil: 'networkidle', timeout: 30000 });
    await artPage.waitForTimeout(1500);

    const artLayout = await measureArticleLayout(artPage);
    const artHeader = await measureHeader(artPage);
    const artWs = await measureContainerWhitespace(artPage, vp.width);

    console.log(`\n[文章页] 容器留白: container=${artWs?.containerWidth}px, 左=${artWs?.leftWhitespace}px, 右=${artWs?.rightWhitespace}px, 留白率=${artWs?.whitespaceRatio}`);

    if (artLayout) {
      console.log(`[文章页] 三栏网格: grid-cols="${artLayout.gridTemplateColumns}" gap="${artLayout.gap}"`);
      artLayout.children.forEach((c) => {
        console.log(`    .${c.cls?.split(' ')[0] || ''} w=${c.width}px h=${c.height}px display=${c.display}`);
      });
    }
    // 文章页 Header 与首页相同（persist），只在首个视口输出
    if (vp === VIEWPORTS[0] || vp.width <= 768) {
      console.log(`[文章页] Header: width=${artHeader?.headerRect.width}px（与首页${artHeader?.headerRect.width === homeHeader?.headerRect.width ? '相同' : '不同'}）`);
    }
    await artPage.close();

    await context.close();
  }

  await browser.close();
  console.log(`\n${'═'.repeat(90)}`);
  console.log('精细测量完成。');
}

main().catch((err) => {
  console.error('测量脚本执行失败:', err);
  process.exit(1);
});
