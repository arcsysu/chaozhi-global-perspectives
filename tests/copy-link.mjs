/**
 * Playwright 端到端测试：文章页"分享本文"复制链接按钮
 *
 * 根因：CopyLinkButton.astro 的 <script> 在首次加载时通过 getElementById
 * 绑定一次 click 事件。Astro ClientRouter 站内导航（首页→文章页）swap DOM
 * 后，新按钮元素无事件绑定 → 点击"分享本文"无反应。
 *
 * 修复：改用 astro:page-load 在每次页面加载后重新初始化（与 ArticleTOC /
 * ReadingProgressBar 等组件一致），并加 data-copy-bound 防重复绑定。
 *
 * 验证场景：
 * 1. 直达文章页 → 点击复制 → 剪贴板含当前 URL + 反馈"链接已复制"
 * 2. 首页点文章链接（站内导航）→ 进入文章页 → 点击复制生效
 * 3. 文章页刷新后 → 点击复制生效
 * 4. 站内导航切换两篇文章 → 每篇点击复制都生效
 * 5. 降级路径：navigator.clipboard 不可用时走 execCommand 回退
 */
import { createRequire } from 'module';

const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
const ARTICLE_SLUG = 'hpc-ai-for-science-observation-plan-launched';
const ARTICLE_URL = `${BASE}/articles/${ARTICLE_SLUG}/`;

const results = [];
let passCount = 0;
let failCount = 0;

function record(name, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
  if (ok) passCount++; else failCount++;
  results.push({ name, status, detail });
  console.log(`  [${status}] ${name}${detail ? ' — ' + detail : ''}`);
}

function section(title) {
  console.log(`\n── ${title} ─────────────────────────`);
}

/** 等待 astro:page-load 完成（站内导航后） */
async function waitPageLoad(page, timeout = 6000) {
  try {
    await page.waitForFunction(() => window.__testNavDone === true, { timeout });
  } catch {
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(300);
}

/** 注册一次性 page-load 监听 */
async function armPageLoad(page) {
  await page.evaluate(() => {
    window.__testNavDone = false;
    document.addEventListener(
      'astro:page-load',
      () => { window.__testNavDone = true; },
      { once: true },
    );
  });
}

/**
 * 点击"分享本文"并校验复制结果。
 * 上下文已 grant clipboard 权限；返回 { ok, copiedUrl, feedback, detail }。
 */
async function clickAndVerifyCopy(page, expectedUrlPrefix = ARTICLE_URL) {
  // 确保按钮存在且已绑定
  const btnExists = await page.evaluate(() => {
    const b = document.getElementById('copy-link-btn');
    return !!b && b.dataset.copyBound === '1';
  });
  if (!btnExists) {
    return { ok: false, detail: '按钮不存在或未绑定 data-copy-bound' };
  }

  // 清空剪贴板，点击，读取反馈文本
  await page.evaluate(() => {
    // 重置反馈以便观察新反馈
    const fb = document.getElementById('copy-link-feedback');
    if (fb) { fb.textContent = ''; fb.classList.remove('is-visible', 'is-error'); }
  });

  // 读取剪贴板（需要 readText 权限，context 已 grant）
  await page.click('#copy-link-btn');
  await page.waitForTimeout(400);

  const { feedback, clipboardText } = await page.evaluate(async () => {
    const fb = document.getElementById('copy-link-feedback');
    let clip = '';
    try {
      clip = await navigator.clipboard.readText();
    } catch (e) {
      clip = `[readErr:${e.message}]`;
    }
    return { feedback: fb?.textContent ?? '', clipboardText: clip };
  });

  const urlMatch = clipboardText.startsWith(expectedUrlPrefix);
  const feedbackOk = feedback.includes('已复制');
  const ok = urlMatch && feedbackOk;
  return {
    ok,
    clipboardText,
    feedback,
    detail: `clip="${clipboardText.slice(0, 60)}" feedback="${feedback}" urlOk=${urlMatch} fbOk=${feedbackOk}`,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];

  // ── 场景 1：直达文章页 ──
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push({ url: response.url(), status: response.status() });
      }
    });

    section('1. 直达文章页 — 点击"分享本文"复制链接');
    await page.goto(ARTICLE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500); // 等 astro:page-load + 脚本绑定

    const r = await clickAndVerifyCopy(page, ARTICLE_URL);
    record('直达文章页复制成功', r.ok, r.detail);

    await context.close();
  }

  // ── 场景 2：首页 → 站内导航进入文章页（核心：原 bug 触发路径）──
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push({ url: response.url(), status: response.status() });
      }
    });

    section('2. 首页站内导航进入文章页 — 复制链接生效');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 找到指向该文章的链接并点击（站内导航）
    const linkSelector = `a[href*="/articles/${ARTICLE_SLUG}/"]`;
    const linkCount = await page.locator(linkSelector).count();
    record('首页存在文章链接', linkCount > 0, `count=${linkCount}`);
    if (linkCount > 0) {
      await armPageLoad(page);
      await page.click(linkSelector);
      await waitPageLoad(page);

      record('站内导航已到达文章页', page.url().includes('/articles/'), `url=${page.url()}`);
      // 关键：进入后给 astro:page-load 脚本绑定时间
      await page.waitForTimeout(400);

      const r = await clickAndVerifyCopy(page, ARTICLE_URL);
      record('站内导航后复制成功（原 bug 修复验证）', r.ok, r.detail);
    }
    await context.close();
  }

  // ── 场景 3：文章页刷新后复制 ──
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push({ url: response.url(), status: response.status() });
      }
    });

    section('3. 文章页刷新后 — 复制链接生效');
    await page.goto(ARTICLE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const r = await clickAndVerifyCopy(page, ARTICLE_URL);
    record('刷新后复制成功', r.ok, r.detail);
    await context.close();
  }

  // ── 场景 4：站内导航连续切换两篇文章 → 每篇复制生效 ──
  // 受单篇文章限制，改为：文章页 → 回首页 → 再进文章页，验证重复绑定防护
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push({ url: response.url(), status: response.status() });
      }
    });

    section('4. 站内导航往返 — 不重复绑定且复制生效');
    await page.goto(ARTICLE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // 第一次复制
    const r1 = await clickAndVerifyCopy(page, ARTICLE_URL);
    record('第一次进入文章页复制成功', r1.ok, r1.detail);

    // 回首页
    await armPageLoad(page);
    await page.click('a[href="/"] , header a[href="/"]');
    await waitPageLoad(page);
    await page.waitForTimeout(300);

    // 再次站内导航进入文章页
    const linkSelector = `a[href*="/articles/${ARTICLE_SLUG}/"]`;
    if (await page.locator(linkSelector).count() > 0) {
      await armPageLoad(page);
      await page.click(linkSelector);
      await waitPageLoad(page);
      await page.waitForTimeout(400);

      // 校验按钮未重复绑定（data-copy-bound 仅 '1'）
      const boundOnce = await page.evaluate(() => {
        const b = document.getElementById('copy-link-btn');
        return b && b.dataset.copyBound === '1';
      });
      record('二次导航后按钮绑定标记正常', boundOnce, `copyBound=${boundOnce ? '1' : 'missing'}`);

      const r2 = await clickAndVerifyCopy(page, ARTICLE_URL);
      record('二次进入文章页复制成功', r2.ok, r2.detail);
    }
    await context.close();
  }

  // ── 场景 5：navigator.clipboard 不可用 → execCommand 回退 ──
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      // 不 grant clipboard 权限，且注入禁用 navigator.clipboard.writeText
    });
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push({ url: response.url(), status: response.status() });
      }
    });

    section('5. navigator.clipboard 不可用 — execCommand 回退');
    // 在每次导航后重新禁用 clipboard.writeText（swap 后脚本重跑）
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: undefined, readText: undefined },
        configurable: true,
      });
    });
    await page.goto(ARTICLE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 点击后仅校验反馈文本（execCommand 在无权限下可能仍触发复制，反馈是关键信号）
    await page.evaluate(() => {
      const fb = document.getElementById('copy-link-feedback');
      if (fb) { fb.textContent = ''; fb.classList.remove('is-visible', 'is-error'); }
    });
    await page.click('#copy-link-btn');
    await page.waitForTimeout(400);
    const feedback = await page.evaluate(() => document.getElementById('copy-link-feedback')?.textContent ?? '');
    // execCommand 成功 → "链接已复制"；失败 → "复制失败..."（两种都证明脚本执行了，非原 bug 的无反应）
    const scriptRan = feedback.includes('已复制') || feedback.includes('失败');
    record('clipboard 降级时脚本仍执行（反馈可见）', scriptRan, `feedback="${feedback}"`);
    await context.close();
  }

  // ── 控制台错误检查 ──
  section('控制台错误检查');
  // 过滤已知 CDN 降级（tsParticles）与 demo 文章缺失封面图（与 article-back-nav.mjs 一致）
  const CDN_HOSTS = ['cdn.jsdelivr.net'];
  const DEMO_COVER_MARKERS = [
    'test-cover-image-article',
    'demo-article-nav-test-202606',
    'images/cover.svg',
    'demo-cover',
  ];
  const isCdnText = (text) =>
    CDN_HOSTS.some((h) => text.includes(h)) ||
    text.includes('tsParticles') ||
    text.includes('tsparticles');
  const isCdnUrl = (url) => CDN_HOSTS.some((h) => url.includes(h));
  const isDemoCoverUrl = (url) =>
    DEMO_COVER_MARKERS.some((m) => url.includes(m));
  const isDemoCoverText = (text) =>
    DEMO_COVER_MARKERS.some((m) => text.includes(m));
  const realFailedResponses = failedResponses.filter(
    (r) => !isCdnUrl(r.url) && !isDemoCoverUrl(r.url)
  );
  const realConsoleErrors = consoleErrors.filter((t) => {
    if (isCdnText(t)) return false;
    if (isDemoCoverText(t)) return false;
    // 浏览器生成的 "Failed to load resource: ... 404" 无附带 URL，
    // 若失败响应中唯一的 4xx 都来自 CDN 或 demo 封面，则该消息也属于已知降级
    if (t.includes('Failed to load resource') && realFailedResponses.length === 0) return false;
    return true;
  });
  record('无控制台 error（排除已知 CDN + demo 封面 404）', realConsoleErrors.length === 0,
    realConsoleErrors.length > 0 ? JSON.stringify(realConsoleErrors.slice(0, 3)) : 'clean ✓');
  record('无未捕获 pageerror', pageErrors.length === 0,
    pageErrors.length > 0 ? JSON.stringify(pageErrors.slice(0, 3)) : 'clean ✓');
  record('无非 CDN/demo 的失败响应', realFailedResponses.length === 0,
    realFailedResponses.length > 0 ? JSON.stringify(realFailedResponses.slice(0, 3)) : 'clean ✓');

  await browser.close();

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`汇总：${passCount} PASS / ${failCount} FAIL / 共 ${passCount + failCount} 项`);
  console.log('════════════════════════════════════════════════════════════');
  process.exit(failCount > 0 ? 1 : 0);
})().catch((e) => {
  console.error('测试运行异常:', e);
  process.exit(2);
});
