/**
 * 生产环境验证脚本 (Playwright)
 * 模拟 GitHub Pages 的 /chaozhi-global-perspectives/ base 路径
 * 检查：CSS/JS/图片/字体加载 + 响应式效果 + 回归
 *
 * 运行: node tests/prod-verify.mjs
 */
import { createRequire } from 'module';
const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321/chaozhi-global-perspectives';
const VIEWPORTS = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'desktop-1536', width: 1536, height: 864 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-320', width: 320, height: 568 },
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about/' },
  { name: 'archive', path: '/archive/' },
  { name: 'topics', path: '/topics/' },
  { name: 'article-elmerfold', path: '/articles/elmerfold-el-capitan-protein-structure-prediction/' },
];

let pass = 0, fail = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    pass++;
  } else {
    fail++;
    failures.push(`${name}: ${detail}`);
  }
}

(async () => {
  const browser = await chromium.launch();

  // ========== Phase 1: 资源加载完整性 (首页) ==========
  console.log('\n=== Phase 1: 资源加载完整性 (首页 1920px) ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    const failedRequests = [];
    const cssLoaded = [];
    const jsLoaded = [];

    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      // 只检查本地资源 (排除 CDN)
      if (url.includes('localhost') || url.startsWith(BASE)) {
        if (status >= 400) {
          failedRequests.push(`${status} ${url}`);
        }
        if (url.endsWith('.css')) cssLoaded.push(url.split('/').pop());
        if (url.endsWith('.js')) jsLoaded.push(url.split('/').pop());
      }
    });

    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    check('P1-no-failed-requests', failedRequests.length === 0,
      `${failedRequests.length} 个请求失败: ${failedRequests.join(', ')}`);
    check('P1-css-loaded', cssLoaded.length >= 3,
      `仅加载 ${cssLoaded.length} 个 CSS: ${cssLoaded.join(', ')}`);
    check('P1-js-loaded', jsLoaded.length >= 1,
      `仅加载 ${jsLoaded.length} 个 JS: ${jsLoaded.join(', ')}`);

    // 检查 CSS 是否真正生效 (computed style)
    const heroTitle = await page.locator('.home-hero__title').first();
    if (await heroTitle.count() > 0) {
      const fontSize = await heroTitle.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });
      check('P1-css-effective-hero-title', fontSize !== '16px' && fontSize !== '',
        `Hero title computed font-size: ${fontSize} (应 > 16px)`);
    } else {
      check('P1-hero-title-exists', false, 'Hero title 元素不存在');
    }

    // 检查 body 是否有样式 (CSS 生效标志)
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    check('P1-body-has-bg', bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== '',
      `body background: ${bodyBg}`);

    await page.close();
  }

  // ========== Phase 2: 所有页面资源加载 ==========
  console.log('\n=== Phase 2: 所有页面资源加载 (1920px) ===');
  for (const pg of PAGES) {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    const failedReqs = [];

    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      if ((url.includes('localhost') || url.startsWith(BASE)) && status >= 400) {
        failedReqs.push(`${status} ${url.replace(BASE, '')}`);
      }
    });

    try {
      await page.goto(BASE + pg.path, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      check(`P2-${pg.name}-no-404`, failedReqs.length === 0,
        `${failedReqs.length} 个 4xx/5xx: ${failedReqs.join(', ')}`);
    } catch (e) {
      check(`P2-${pg.name}-load`, false, `页面加载失败: ${e.message}`);
    }
    await page.close();
  }

  // ========== Phase 3: 响应式视口验证 ==========
  console.log('\n=== Phase 3: 响应式视口验证 (首页) ===');
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);

    // 检查水平溢出
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    check(`P3-${vp.name}-no-hoverflow`, scrollWidth <= clientWidth + 1,
      `scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`);

    // 检查 Hero 标题可见
    const heroVisible = await page.locator('.home-hero__title').first().isVisible().catch(() => false);
    check(`P3-${vp.name}-hero-visible`, heroVisible, 'Hero 标题不可见');

    // 检查 Header 可见
    const headerVisible = await page.locator('#site-header').first().isVisible().catch(() => false);
    check(`P3-${vp.name}-header-visible`, headerVisible, 'Header 不可见');

    // 移动端检查汉堡菜单
    if (vp.width <= 768) {
      const hamburger = await page.locator('.header__toggle, [aria-expanded]').first();
      if (await hamburger.count() > 0) {
        check(`P3-${vp.name}-hamburger-exists`, true);
      }
    }

    await page.close();
  }

  // ========== Phase 4: 文章页响应式 ==========
  console.log('\n=== Phase 4: 文章页响应式 ===');
  for (const vp of [VIEWPORTS[0], VIEWPORTS[5], VIEWPORTS[7]]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto(BASE + '/articles/elmerfold-el-capitan-protein-structure-prediction/', {
      waitUntil: 'networkidle', timeout: 15000
    });
    await page.waitForTimeout(500);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    check(`P4-article-${vp.name}-no-hoverflow`, scrollWidth <= clientWidth + 1,
      `scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`);

    // 文章正文存在
    const proseExists = await page.locator('.article-prose, .prose, article').first().count();
    check(`P4-article-${vp.name}-prose-exists`, proseExists > 0, '文章正文容器不存在');

    await page.close();
  }

  // ========== Phase 5: CDN 字体加载 ==========
  console.log('\n=== Phase 5: CDN 字体加载 ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    let fontCssOk = false;
    page.on('response', (response) => {
      if (response.url().includes('cn-fontsource-smiley-sans-oblique') && response.url().endsWith('.css')) {
        fontCssOk = response.status() === 200;
      }
    });
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    check('P5-font-css-loaded', fontCssOk, 'Smiley Sans 字体 CSS 未加载');
    await page.close();
  }

  await browser.close();

  // ========== 报告 ==========
  console.log('\n========================================');
  console.log('  生产环境验证报告');
  console.log('========================================');
  console.log(`  通过: ${pass}`);
  console.log(`  失败: ${fail}`);
  console.log(`  总计: ${pass + fail}`);
  console.log('========================================');

  if (failures.length > 0) {
    console.log('\n失败项:');
    failures.forEach((f) => console.log(`  ✗ ${f}`));
  } else {
    console.log('\n✓ 全部通过，无失败项');
  }

  process.exit(fail > 0 ? 1 : 0);
})();
