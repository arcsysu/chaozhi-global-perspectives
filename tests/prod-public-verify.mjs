/**
 * 公网验收脚本 (Playwright)
 * 访问 GitHub Pages 生产环境，验证 CSS/JS/图片/字体加载 + 响应式 + 文章/导航
 *
 * 运行: node tests/prod-public-verify.mjs
 */
import { createRequire } from 'module';
const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'https://arcsysu.github.io/chaozhi-global-perspectives';
const VIEWPORTS = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about/' },
  { name: 'archive', path: '/archive/' },
  { name: 'topics', path: '/topics/' },
  { name: 'article', path: '/articles/elmerfold-el-capitan-protein-structure-prediction/' },
];

let pass = 0, fail = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    pass++;
  } else {
    fail++;
    failures.push(`${name}: ${detail}`);
    console.log(`  ✗ ${name}: ${detail}`);
  }
}

(async () => {
  const browser = await chromium.launch();

  // ========== Phase 1: 首页 CSS/JS 资源加载 ==========
  console.log('\n=== Phase 1: 首页 CSS/JS 资源加载 (公网) ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    const failedRequests = [];
    const cssUrls = [];
    const jsUrls = [];

    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      // 检查 _astro 目录下的资源
      if (url.includes('/_astro/')) {
        if (status >= 400) {
          failedRequests.push(`${status} ${url}`);
        }
        if (url.endsWith('.css')) cssUrls.push(url.split('/').pop());
        if (url.endsWith('.js')) jsUrls.push(url.split('/').pop());
      }
    });

    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    check('P1-no-failed-css-js', failedRequests.length === 0,
      `${failedRequests.length} 个 _astro 资源失败: ${failedRequests.join(', ')}`);
    check('P1-css-loaded', cssUrls.length >= 3,
      `仅加载 ${cssUrls.length} 个 CSS: ${cssUrls.join(', ')}`);
    check('P1-js-loaded', jsUrls.length >= 1,
      `仅加载 ${jsUrls.length} 个 JS: ${jsUrls.join(', ')}`);

    // CSS 生效验证：检查 body 是否有样式
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    check('P1-css-effective', bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent',
      `body background: ${bodyBg} (CSS 可能未生效)`);

    // Hero 标题字号验证（响应式 clamp 生效）
    const heroTitle = page.locator('.home-hero__title').first();
    if (await heroTitle.count() > 0) {
      const fontSize = await heroTitle.evaluate((el) => window.getComputedStyle(el).fontSize);
      const sizeNum = parseFloat(fontSize);
      check('P1-hero-title-size', sizeNum > 30,
        `Hero title font-size: ${fontSize} (应 > 30px，CSS 生效标志)`);
    }

    await page.close();
  }

  // ========== Phase 2: 所有页面资源加载 ==========
  console.log('\n=== Phase 2: 所有页面资源加载 (公网) ===');
  for (const pg of PAGES) {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    const failedReqs = [];

    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      if (url.includes('/_astro/') && status >= 400) {
        failedReqs.push(`${status} ${url.replace(BASE, '')}`);
      }
    });

    try {
      await page.goto(BASE + pg.path, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);
      check(`P2-${pg.name}-no-404`, failedReqs.length === 0,
        `${failedReqs.length} 个 4xx/5xx: ${failedReqs.join(', ')}`);

      // 页面标题验证
      const title = await page.title();
      check(`P2-${pg.name}-has-title`, title.length > 0, `标题为空`);
    } catch (e) {
      check(`P2-${pg.name}-load`, false, `页面加载失败: ${e.message}`);
    }
    await page.close();
  }

  // ========== Phase 3: 响应式视口验证 (首页) ==========
  console.log('\n=== Phase 3: 响应式视口验证 (公网首页) ===');
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    check(`P3-${vp.name}-no-hoverflow`, scrollWidth <= clientWidth + 1,
      `scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`);

    const heroVisible = await page.locator('.home-hero__title').first().isVisible().catch(() => false);
    check(`P3-${vp.name}-hero-visible`, heroVisible, 'Hero 标题不可见');

    const headerVisible = await page.locator('#site-header').first().isVisible().catch(() => false);
    check(`P3-${vp.name}-header-visible`, headerVisible, 'Header 不可见');

    await page.close();
  }

  // ========== Phase 4: 文章页 + 导航 ==========
  console.log('\n=== Phase 4: 文章页 + 导航 (公网) ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    await page.goto(BASE + '/articles/elmerfold-el-capitan-protein-structure-prediction/', {
      waitUntil: 'networkidle', timeout: 30000
    });
    await page.waitForTimeout(1000);

    // 文章正文存在
    const proseExists = await page.locator('.article-prose, .prose, article').first().count();
    check('P4-article-prose', proseExists > 0, '文章正文容器不存在');

    // 封面图片加载
    const coverImg = page.locator('img[src*="cover"]').first();
    if (await coverImg.count() > 0) {
      const imgStatus = await coverImg.evaluate((img) => {
        return img.complete && img.naturalWidth > 0 ? 'ok' : 'broken';
      });
      check('P4-cover-image', imgStatus === 'ok', `封面图片: ${imgStatus}`);
    }

    // 导航链接验证
    const navLinks = await page.locator('.header__nav a, nav a').all();
    check('P4-nav-links-exist', navLinks.length > 0, `导航链接数: ${navLinks.length}`);

    // 点击"首页"导航
    const homeLink = page.locator('a[href*="chaozhi-global-perspectives"]').first();
    if (await homeLink.count() > 0) {
      check('P4-home-link-exists', true);
    }

    await page.close();
  }

  await browser.close();

  // ========== 报告 ==========
  console.log('\n========================================');
  console.log('  公网验收报告 (GitHub Pages)');
  console.log('========================================');
  console.log(`  通过: ${pass}`);
  console.log(`  失败: ${fail}`);
  console.log(`  总计: ${pass + fail}`);
  console.log('========================================');

  if (failures.length > 0) {
    console.log('\n失败项:');
    failures.forEach((f) => console.log(`  ✗ ${f}`));
  } else {
    console.log('\n✓ 全部通过，公网验收成功');
  }

  process.exit(fail > 0 ? 1 : 0);
})();
