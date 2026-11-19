/**
 * Playwright 端到端测试：文章末尾"阅读下一篇"导航 base 重复拼接修复
 *
 * 背景：生产部署到 GitHub Pages 子路径 /chaozhi-global-perspectives/，
 * 修复前 ArticleNav 的"继续阅读"链接会把部署前缀拼两次，导致 404。
 *
 * 验证目标（按用户要求）：
 * 1. 所有存在上一篇/下一篇入口的文章，"继续阅读"链接 base 前缀恰好出现一次。
 * 2. 链接指向实际存在的文章页面（HTTP 200，非 404）。
 * 3. 点击链接后页面正常加载，新文章正文可见。
 * 4. ClientRouter 客户端导航、刷新页面、浏览器前进/后退后链接仍然正确。
 * 5. 循环导航：末篇 → 首篇链接正确。
 * 6. 无 404 响应。
 *
 * 运行环境：需先 `npm run build` 并启动 `astro preview`（生产 base 配置）。
 *   预览地址：http://127.0.0.1:4321/chaozhi-global-perspectives
 *
 * 运行: node tests/article-nav-base-fix.mjs
 */
import { createRequire } from 'module';

// 从 npx 缓存加载 playwright（项目无本地依赖，与现有测试一致）
const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4321/chaozhi-global-perspectives';
const SUBPATH = '/chaozhi-global-perspectives/';

// 已发布文章（构建产物确认）
const ARTICLES = [
  'elmerfold-el-capitan-protein-structure-prediction',
  'hpc-ai-for-science-observation-plan-launched',
];

let pass = 0;
let fail = 0;
const failures = [];

function record(name, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
  if (ok) pass++; else fail++;
  failures.push({ name, status, detail });
  console.log(`  [${status}] ${name}${detail ? ' — ' + detail : ''}`);
}

function section(title) {
  console.log(`\n── ${title} ─────────────────────────`);
}

/**
 * 客户端导航辅助：点击链接后等待 astro:page-load 事件（ClientRouter 完成）。
 */
async function clientNav(page, selector, label = '') {
  await page.evaluate(() => {
    window.__testNavDone = false;
    document.addEventListener(
      'astro:page-load',
      () => {
        window.__testNavDone = true;
      },
      { once: true },
    );
  });
  await page.click(selector);
  try {
    await page.waitForFunction(() => window.__testNavDone === true, { timeout: 8000 });
  } catch {
    await page.waitForTimeout(2000);
  }
  await page.waitForTimeout(400);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  // ═══════════════════════════════════════════════
  // 阶段 1：每篇文章的 ArticleNav 链接 href 正确性
  // ═══════════════════════════════════════════════
  section('1. ArticleNav 链接 href：base 前缀恰好一次');
  const navLinkMap = {}; // articleId -> { href, targetSlug }
  for (const slug of ARTICLES) {
    const page = await context.newPage();
    const failedResponses = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(`${BASE}/articles/${slug}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);

    // 页面本身加载无 4xx
    record(`文章页 ${slug} 加载无 4xx/5xx`, failedResponses.length === 0,
      failedResponses.length > 0 ? JSON.stringify(failedResponses.slice(0, 3)) : 'clean');

    // 提取"继续阅读"链接（.article-nav__link）
    const navLink = await page.locator('.article-nav__link').first();
    const linkExists = (await navLink.count()) > 0;
    record(`文章 ${slug} 存在 ArticleNav 入口`, linkExists,
      linkExists ? '' : '未找到 .article-nav__link');

    if (linkExists) {
      const href = await navLink.getAttribute('href');
      // base 前缀恰好出现一次（在路径前缀位置，非重复）
      const occurrences = (href.match(/\/chaozhi-global-perspectives\//g) || []).length;
      record(`文章 ${slug} 链接 base 恰好一次`, occurrences === 1,
        `href=${href}, base 出现 ${occurrences} 次`);

      // 不含重复拼接
      const hasDup = href.includes('/chaozhi-global-perspectives/chaozhi-global-perspectives/');
      record(`文章 ${slug} 链接无重复拼接`, !hasDup,
        hasDup ? `href=${href}` : `href=${href}`);

      // 链接指向的文章 slug 应为另一篇（循环导航）
      const targetSlug = ARTICLES.find((s) => s !== slug);
      const pointsToValidArticle = href.includes(`/articles/${targetSlug}/`);
      record(`文章 ${slug} 链接指向有效文章`, pointsToValidArticle,
        `期望含 /articles/${targetSlug}/, 实际 href=${href}`);

      navLinkMap[slug] = { href, targetSlug };

      // 直接 fetch 该 href 验证 HTTP 状态（绕过 ClientRouter，确认静态文件存在）
      const res = await page.evaluate(async (url) => {
        try {
          const r = await fetch(url, { method: 'GET' });
          return { status: r.status, ok: r.ok };
        } catch (e) {
          return { status: 0, ok: false, error: String(e) };
        }
      }, href);
      record(`文章 ${slug} 目标链接 HTTP 200`, res.status === 200,
        `状态=${res.status}`);
    }

    await page.close();
  }

  // ═══════════════════════════════════════════════
  // 阶段 2：点击"继续阅读"后页面正常加载（ClientRouter 导航）
  // ═══════════════════════════════════════════════
  section('2. 点击"继续阅读"后页面加载（ClientRouter）');
  {
    const page = await context.newPage();
    const failedResponses = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push({ url: response.url(), status: response.status() });
      }
    });

    // 从文章 A 点击继续阅读到文章 B
    const startSlug = ARTICLES[0];
    const targetSlug = ARTICLES[1];
    await page.goto(`${BASE}/articles/${startSlug}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);

    failedResponses.length = 0; // 仅统计导航后的请求
    await clientNav(page, '.article-nav__link', 'next-article');
    const newUrl = page.url();
    record(`点击后 URL 切换到目标文章`, newUrl.includes(`/articles/${targetSlug}/`),
      `url=${newUrl}`);

    // base 前缀在地址栏恰好一次
    const urlOccur = (newUrl.match(/\/chaozhi-global-perspectives\//g) || []).length;
    record(`点击后地址栏 base 恰好一次`, urlOccur === 1,
      `url=${newUrl}, base 出现 ${urlOccur} 次`);

    // 新文章正文可见（验证真实加载，非 404 页）
    const proseExists = await page.locator('.article-prose, .article-body, article').first().count();
    record(`目标文章正文容器存在`, proseExists > 0, '未找到正文容器');

    const titleText = await page.evaluate(() => {
      return document.querySelector('.article-head__title')?.textContent?.trim() ?? '';
    });
    record(`目标文章标题可见`, titleText.length > 0, `title="${titleText.slice(0, 40)}"`);

    // 导航过程无 4xx
    const realFailed = failedResponses.filter((r) => !r.url.includes('cdn.jsdelivr.net'));
    record(`点击导航过程无 4xx/5xx`, realFailed.length === 0,
      realFailed.length > 0 ? JSON.stringify(realFailed.slice(0, 3)) : 'clean');

    await page.close();
  }

  // ═══════════════════════════════════════════════
  // 阶段 3：循环导航 A → B → A（末篇→首篇循环）
  // ═══════════════════════════════════════════════
  section('3. 循环导航 A → B → A');
  {
    const page = await context.newPage();
    await page.goto(`${BASE}/articles/${ARTICLES[0]}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);

    // 第一次点击 → 文章 B
    await clientNav(page, '.article-nav__link', 'toB');
    const url1 = page.url();
    record(`第一次点击到文章 B`, url1.includes(`/articles/${ARTICLES[1]}/`), `url=${url1}`);

    // 文章 B 的继续阅读应指向文章 A（循环）
    const href2 = await page.locator('.article-nav__link').first().getAttribute('href');
    record(`文章 B 的继续阅读指向文章 A`, href2.includes(`/articles/${ARTICLES[0]}/`),
      `href=${href2}`);
    const occ2 = (href2.match(/\/chaozhi-global-perspectives\//g) || []).length;
    record(`文章 B 链接 base 恰好一次`, occ2 === 1, `href=${href2}`);

    // 第二次点击 → 回到文章 A
    await clientNav(page, '.article-nav__link', 'toA');
    const url2 = page.url();
    record(`第二次点击回到文章 A`, url2.includes(`/articles/${ARTICLES[0]}/`), `url=${url2}`);

    await page.close();
  }

  // ═══════════════════════════════════════════════
  // 阶段 4：刷新页面后链接仍正确
  // ═══════════════════════════════════════════════
  section('4. 刷新页面后链接仍正确');
  {
    const page = await context.newPage();
    await page.goto(`${BASE}/articles/${ARTICLES[0]}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);

    // 硬刷新（重新加载）
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const href = await page.locator('.article-nav__link').first().getAttribute('href');
    const occ = (href.match(/\/chaozhi-global-perspectives\//g) || []).length;
    record(`刷新后 ArticleNav 链接 base 恰好一次`, occ === 1, `href=${href}`);
    record(`刷新后链接指向有效文章`, href.includes(`/articles/${ARTICLES[1]}/`),
      `href=${href}`);

    // 刷新后标题仍在（确认非 404 兜底页）
    const title = await page.evaluate(() => {
      return document.querySelector('.article-head__title')?.textContent?.trim() ?? '';
    });
    record(`刷新后文章标题仍在`, title.length > 0, `title="${title.slice(0, 30)}"`);

    await page.close();
  }

  // ═══════════════════════════════════════════════
  // 阶段 5：浏览器前进/后退后链接仍正确
  // ═══════════════════════════════════════════════
  section('5. 浏览器前进/后退后链接仍正确');
  {
    const page = await context.newPage();
    // 文章 A
    await page.goto(`${BASE}/articles/${ARTICLES[0]}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);
    const urlA = page.url();

    // 点击到文章 B
    await clientNav(page, '.article-nav__link', 'toB');
    const urlB = page.url();
    record(`前进导航到文章 B`, urlB.includes(`/articles/${ARTICLES[1]}/`), `url=${urlB}`);

    // 浏览器后退 → 回到文章 A
    await page.evaluate(() => {
      window.__testNavDone = false;
      document.addEventListener('astro:page-load', () => {
        window.__testNavDone = true;
      }, { once: true });
    });
    await page.goBack();
    try {
      await page.waitForFunction(() => window.__testNavDone === true, { timeout: 8000 });
    } catch {
      await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(400);
    const urlAfterBack = page.url();
    record(`后退回到文章 A`, urlAfterBack.includes(`/articles/${ARTICLES[0]}/`),
      `url=${urlAfterBack}`);

    // 后退后 ArticleNav 链接仍正确
    const hrefBack = await page.locator('.article-nav__link').first().getAttribute('href');
    const occBack = (hrefBack.match(/\/chaozhi-global-perspectives\//g) || []).length;
    record(`后退后 ArticleNav 链接 base 恰好一次`, occBack === 1, `href=${hrefBack}`);

    // 浏览器前进 → 回到文章 B
    await page.evaluate(() => {
      window.__testNavDone = false;
      document.addEventListener('astro:page-load', () => {
        window.__testNavDone = true;
      }, { once: true });
    });
    await page.goForward();
    try {
      await page.waitForFunction(() => window.__testNavDone === true, { timeout: 8000 });
    } catch {
      await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(400);
    const urlAfterForward = page.url();
    record(`前进回到文章 B`, urlAfterForward.includes(`/articles/${ARTICLES[1]}/`),
      `url=${urlAfterForward}`);

    // 前进后 ArticleNav 链接仍正确（应指向文章 A，循环）
    const hrefFwd = await page.locator('.article-nav__link').first().getAttribute('href');
    const occFwd = (hrefFwd.match(/\/chaozhi-global-perspectives\//g) || []).length;
    record(`前进后 ArticleNav 链接 base 恰好一次`, occFwd === 1, `href=${hrefFwd}`);
    record(`前进后链接指向文章 A（循环）`, hrefFwd.includes(`/articles/${ARTICLES[0]}/`),
      `href=${hrefFwd}`);

    await page.close();
  }

  // ═══════════════════════════════════════════════
  // 阶段 6：全文章无 404（兜底）
  // ═══════════════════════════════════════════════
  section('6. 全文章页面与导航目标 HTTP 状态');
  for (const slug of ARTICLES) {
    const res = await fetch(`${BASE}/articles/${slug}/`);
    record(`文章 ${slug} 直接访问 HTTP 200`, res.status === 200, `状态=${res.status}`);
  }
  // 验证所有 ArticleNav 目标链接均 200（href 为站点相对路径，需拼完整 URL 供 Node fetch）
  for (const [slug, info] of Object.entries(navLinkMap)) {
    if (info) {
      const fullUrl = info.href.startsWith('http') ? info.href : `http://127.0.0.1:4321${info.href}`;
      const res = await fetch(fullUrl);
      record(`文章 ${slug} 的 ArticleNav 目标 HTTP 200`, res.status === 200,
        `href=${info.href}, 状态=${res.status}`);
    }
  }

  await browser.close();

  // ═══════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`汇总：${pass} PASS / ${fail} FAIL / 共 ${pass + fail} 项`);
  console.log(`${'═'.repeat(60)}`);

  if (fail > 0) {
    console.log('\n失败项：');
    failures
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.log(`  ✗ ${r.name} — ${r.detail}`));
  } else {
    console.log('\n✓ 全部通过，文章末尾导航 base 重复拼接问题已修复，无 404，无回归。');
  }

  process.exit(fail > 0 ? 1 : 0);
})().catch((err) => {
  console.error('测试脚本异常：', err);
  process.exit(2);
});
