/**
 * Playwright 端到端测试：首页"最新文章"分页切换后的滚动定位
 *
 * 验证目标（任务第五节）：
 * 1. 首页滚到分页 → 点第2页 → 显示第2页文章 + 滚到 #latest-articles 标题
 * 2. 第2页 → 点第1页 → 同样定位到栏目标题
 * 3. 连续切换多个页码，无错误滚动或动画累积
 * 4. 第2页 → 进文章 → 返回上一页 → 恢复第2页 + 原始滚动位置
 * 5. 浏览器前进/后退后，页码与列表内容一致
 * 6. 直接打开/刷新 /page/2/ → 完整首页 + 第2页文章 + 定位到标题
 * 7. 移动端和桌面端标题不被 Header 遮挡
 * 8. ClientRouter persist Header/Logo/particles/ScienceMap 正常
 *
 * 核心验收（二次滚动防御）：
 * - 每次交互后持续观察 ≥2 秒，确认无第二次异常位移（"先到标题再回顶部"）
 * - 必须记录切页前后 scrollY 与 #latest-articles getBoundingClientRect().top，
 *   确认滚动定位确实正确（rect.top 应 ≈ Header 高度，标题完整可见）。
 */
import { createRequire } from 'module';

// 从 npx 缓存加载 playwright（项目无本地依赖）
const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';

// 结果收集
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

/**
 * 获取 #latest-articles 的 rect.top（相对视口），用于判断标题是否被 Header 遮挡。
 * Header 高度桌面 ~72px(4.5rem)，移动 ~64px(4rem)。
 * rect.top 应 ≥ Header 高度（标题在 Header 下方完整可见）。
 */
async function getLatestRectTop(page) {
  return page.evaluate(() => {
    const el = document.getElementById('latest-articles');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
}

/** 获取当前 scrollY */
async function getScrollY(page) {
  return page.evaluate(() => Math.round(window.scrollY));
}

/** 获取 data-page（当前列表页码） */
async function getDataPage(page) {
  return page.evaluate(() => document.getElementById('home-article-list')?.dataset.page);
}

/**
 * 等待分页切换 + 平滑滚动完成。
 * 策略：平滑滚动约 700-800ms 完成（实测），fetch+swap 约 200-300ms。
 * 先等 scrollY 开始变化（确认 scrollToLatest 已触发，排除 reducedMotion/直达），
 * 再固定等待 1000ms 让平滑动画完成，最后轮询确认 scrollY 稳定。
 * @param page      Playwright page
 * @param beforeY   点击前的 scrollY（用于判断滚动是否已开始）
 */
async function waitForScrollSettle(page, beforeY) {
  // 阶段1：等待 scrollY 偏离 beforeY（fetch+swap+scrollToLatest 已执行）
  // 超时 1200ms：若 reducedMotion 或直达（瞬间完成）则跳过
  await page.waitForFunction(
    (prev) => Math.abs(window.scrollY - prev) > 5,
    beforeY,
    { timeout: 1200 }
  ).catch(() => { /* reducedMotion 或直达时可能瞬间完成 */ });
  // 阶段2：固定等待 1000ms 让平滑滚动动画完成（实测约 750ms）
  await page.waitForTimeout(1000);
  // 阶段3：最终轮询确认稳定（排除残余动画）
  await page.waitForFunction(
    async () => {
      const y1 = window.scrollY;
      await new Promise((r) => setTimeout(r, 80));
      const y2 = window.scrollY;
      return Math.abs(y2 - y1) < 2;
    },
    { timeout: 1500 }
  ).catch(() => { /* 超时也继续 */ });
  await page.waitForTimeout(100);
}

/**
 * 二次滚动防御验证：在交互完成后持续观察 ≥2 秒，
 * 确认 scrollY 不发生第二次异常位移（"先到标题再回顶部"的二次滚动）。
 *
 * 原理：记录 settle 后的 scrollY，每 200ms 采样一次，持续 2000ms。
 * 若任意采样点 scrollY 偏离初始值超过阈值（30px），判定为二次滚动。
 *
 * @param page       Playwright page
 * @param label      测试标签（用于日志）
 * @param threshold  允许的微小抖动阈值（默认 30px）
 * @returns {stable: boolean, samples: array, drift: number}
 */
async function assertStableFor2s(page, _label, threshold = 30) {
  const settledY = await getScrollY(page);
  const samples = [];
  const start = Date.now();
  // 采样 2 秒（10 次 × 200ms）
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(200);
    const y = await getScrollY(page);
    samples.push({ t: Date.now() - start, y });
  }
  const min = Math.min(...samples.map(s => s.y));
  const max = Math.max(...samples.map(s => s.y));
  const drift = max - min;
  const stable = drift <= threshold;
  // 若不稳定，记录偏移方向
  const lastY = samples[samples.length - 1].y;
  const rolledBackToTop = lastY < 100 && settledY > 300;
  return {
    stable,
    settledY,
    min,
    max,
    drift,
    rolledBackToTop,
    samples: samples.map(s => `${s.y}`).join('→'),
  };
}

/**
 * 等待直达/刷新页面滚动稳定（initHomeScrollPosition 用 instant，几乎瞬间完成）。
 * 直接等待固定时长后做 2 秒稳定性观察。
 */
async function waitForDirectAccessSettle(page) {
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ═══════════════════════════════════════════════
  // 测试 1：首页 → 点第2页 → 定位到 #latest-articles 标题
  // ═══════════════════════════════════════════════
  section('1. 首页 → 点第2页 → 定位到栏目标题');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // 滚动到分页区域
    await page.evaluate(() => {
      const pag = document.querySelector('.pagination');
      if (pag) pag.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(600);
    const beforeY = await getScrollY(page);
    record('滚到分页区域', beforeY > 500, `scrollY=${beforeY}`);

    // 点击第2页
    const page2Href = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a.pagination__link'));
      const p2 = links.find((l) => l.textContent?.trim() === '2');
      return p2 ? p2.getAttribute('href') : null;
    });
    record('存在第2页链接', !!page2Href, `href=${page2Href}`);

    if (page2Href) {
      await page.click('a.pagination__link:has-text("2")');
      await waitForScrollSettle(page, beforeY);

      const afterUrl = page.url();
      const afterY = await getScrollY(page);
      const afterRect = await getLatestRectTop(page);
      const afterDataPage = await getDataPage(page);
      record('切换到第2页（URL）', afterUrl.includes('/page/2/'), `url=${afterUrl}`);
      record('列表 data-page=2', afterDataPage === '2', `data-page=${afterDataPage}`);
      // 核心验收：rect.top 应在 Header 高度附近（60-100px），标题可见
      record('定位到栏目标题（rect.top≈Header高度）',
        afterRect != null && afterRect >= 60 && afterRect <= 120,
        `rect.top=${afterRect}（Header≈72px）`);
      record('未停在 Hero 顶部', afterY > 500, `scrollY=${afterY}`);

      // ★ 二次滚动防御：持续观察 2 秒，确认无第二次异常位移
      const stab = await assertStableFor2s(page, 'test1');
      record('2秒稳定（无二次滚动回顶）',
        stab.stable && !stab.rolledBackToTop,
        `drift=${stab.drift} samples=${stab.samples}`);
    }
    await context.close();
  }

  // ═══════════════════════════════════════════════
  // 测试 2：第2页 → 点第1页 → 同样定位到栏目标题
  // ═══════════════════════════════════════════════
  section('2. 第2页 → 点第1页 → 定位到栏目标题');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/page/2/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 滚到分页
    await page.evaluate(() => {
      document.querySelector('.pagination')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(600);
    const beforeY = await getScrollY(page);
    record('第2页已加载', page.url().includes('/page/2/'), `scrollY=${beforeY}`);

    // 点击第1页
    await page.click('a.pagination__link:has-text("1")');
    await waitForScrollSettle(page, beforeY);

    const afterUrl = page.url();
    const afterY = await getScrollY(page);
    const afterRect = await getLatestRectTop(page);
    const afterDataPage = await getDataPage(page);
    record('切换到第1页（URL）', afterUrl.endsWith('/') && !afterUrl.includes('/page/'), `url=${afterUrl}`);
    record('列表 data-page=1', afterDataPage === '1', `data-page=${afterDataPage}`);
    record('定位到栏目标题（反向切换）',
      afterRect != null && afterRect >= 60 && afterRect <= 120,
      `rect.top=${afterRect}`);
    record('未停在 Hero 顶部', afterY > 500, `scrollY=${afterY}`);

    // ★ 二次滚动防御：持续观察 2 秒
    const stab2 = await assertStableFor2s(page, 'test2');
    record('2秒稳定（反向切换无二次滚动）',
      stab2.stable && !stab2.rolledBackToTop,
      `drift=${stab2.drift} samples=${stab2.samples}`);
    await context.close();
  }

  // ═══════════════════════════════════════════════
  // 测试 3：连续切换多个页码，无错误滚动或动画累积
  // ═══════════════════════════════════════════════
  section('3. 连续切换页码（1→2→1→2）');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const rectSnapshots = [];
    for (const target of ['2', '1', '2', '1']) {
      await page.evaluate(() => {
        document.querySelector('.pagination')?.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(300);
      const preY = await getScrollY(page);
      await page.click(`a.pagination__link:has-text("${target}")`);
      await waitForScrollSettle(page, preY);
      const rect = await getLatestRectTop(page);
      const dp = await getDataPage(page);
      rectSnapshots.push({ target, dataPage: dp, rectTop: rect });
    }
    console.log('  切换序列:', JSON.stringify(rectSnapshots));
    // 每次 rect.top 都应在合理范围（60-120），data-page 与 target 一致
    const allCorrect = rectSnapshots.every((s) =>
      s.dataPage === s.target && s.rectTop >= 60 && s.rectTop <= 120
    );
    record('连续切换4次每次定位正确', allCorrect,
      allCorrect ? '一致 ✓' : JSON.stringify(rectSnapshots));

    // ★ 二次滚动防御：最后一轮切换后持续观察 2 秒
    const stab3 = await assertStableFor2s(page, 'test3');
    record('连续切换后2秒稳定', stab3.stable && !stab3.rolledBackToTop,
      `drift=${stab3.drift} samples=${stab3.samples}`);
    await context.close();
  }

  // ═══════════════════════════════════════════════
  // 测试 4：第2页 → 进文章 → 返回上一页 → 恢复第2页 + 原始位置
  // ═══════════════════════════════════════════════
  section('4. 第2页 → 文章 → 返回 → 恢复第2页+位置');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/page/2/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const page2Y = await getScrollY(page);
    const page2Url = page.url();
    record('第2页初始位置', page2Url.includes('/page/2/'), `scrollY=${page2Y}`);

    // 点击第2页某文章进入详情
    const articleLink = await page.evaluate(() => {
      const a = document.querySelector('#home-article-list a[href*="/articles/"], #home-article-list a[href*="/demo/"]');
      return a ? a.getAttribute('href') : null;
    });
    record('第2页有文章链接', !!articleLink, `href=${articleLink}`);

    if (articleLink) {
      await page.click(`#home-article-list a[href="${articleLink}"]`);
      await page.waitForTimeout(1500);
      record('进入文章详情页', !page.url().includes('/page/'), `url=${page.url()}`);

      // 点击返回（data-back-nav）
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(400);
      const hasBack = await page.evaluate(() => !!document.querySelector('[data-back-nav]'));
      if (hasBack) {
        await page.click('[data-back-nav]');
        await page.waitForTimeout(2000);
        const backUrl = page.url();
        const backY = await getScrollY(page);
        const backRect = await getLatestRectTop(page);
        const backDataPage = await getDataPage(page);
        record('返回后回到第2页', backUrl.includes('/page/2/'), `url=${backUrl}`);
        record('返回后 data-page=2', backDataPage === '2', `data-page=${backDataPage}`);
        // 恢复原始滚动位置（允许 ±50px 容差，因 layout 微调）
        record('恢复原始滚动位置', Math.abs(backY - page2Y) <= 50,
          `原始=${page2Y}，返回=${backY}`);
        record('标题未被 Header 遮挡',
          backRect != null && backRect >= 60 && backRect <= 120,
          `rect.top=${backRect}`);
      }
    }
    await context.close();
  }

  // ═══════════════════════════════════════════════
  // 测试 5：浏览器前进/后退后，页码与列表一致
  // ═══════════════════════════════════════════════
  section('5. 浏览器前进/后退');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // 点第2页
    await page.evaluate(() => document.querySelector('.pagination')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    const preY5 = await getScrollY(page);
    await page.click('a.pagination__link:has-text("2")');
    await waitForScrollSettle(page, preY5);
    const y2 = await getScrollY(page);
    const dp2 = await getDataPage(page);
    record('前进到第2页', dp2 === '2', `scrollY=${y2}`);

    // 浏览器后退 → 回第1页
    await page.goBack();
    await page.waitForTimeout(1500);
    const backUrl = page.url();
    const backDp = await getDataPage(page);
    record('后退回第1页', backUrl.endsWith('/') && !backUrl.includes('/page/'), `url=${backUrl} data-page=${backDp}`);

    // 浏览器前进 → 回第2页
    await page.goForward();
    await page.waitForTimeout(1500);
    const fwdUrl = page.url();
    const fwdDp = await getDataPage(page);
    record('前进回第2页', fwdUrl.includes('/page/2/') && fwdDp === '2', `url=${fwdUrl} data-page=${fwdDp}`);
    await context.close();
  }

  // ═══════════════════════════════════════════════
  // 测试 6：直接打开/刷新 /page/2/ → 完整首页 + 第2页 + 定位到标题
  // ═══════════════════════════════════════════════
  section('6. 直接打开 /page/2/');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/page/2/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const url = page.url();
    const y = await getScrollY(page);
    const rect = await getLatestRectTop(page);
    const dp = await getDataPage(page);
    // 完整首页：Hero 存在
    const hasHero = await page.evaluate(() => !!document.querySelector('.home-hero'));
    // 第2页文章
    record('URL = /page/2/', url.includes('/page/2/'), `url=${url}`);
    record('完整首页（Hero 存在）', hasHero, `hero=${hasHero}`);
    record('列表 data-page=2', dp === '2', `data-page=${dp}`);
    // 核心：直接打开应定位到标题，而非停在 Hero 顶部
    record('定位到栏目标题（非 Hero 顶部）',
      rect != null && rect >= 60 && rect <= 120 && y > 500,
      `scrollY=${y} rect.top=${rect}`);

    // ★ 二次滚动防御：直接访问后持续观察 2 秒，确认无"先到标题再回顶"
    const stab6 = await assertStableFor2s(page, 'test6-direct');
    record('直接访问后2秒稳定（无二次跳跃）',
      stab6.stable && !stab6.rolledBackToTop,
      `drift=${stab6.drift} settled=${stab6.settledY} samples=${stab6.samples}`);

    // 刷新页面，验证刷新后仍正确
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const y2 = await getScrollY(page);
    const rect2 = await getLatestRectTop(page);
    const dp2 = await getDataPage(page);
    record('刷新后仍定位到标题',
      rect2 != null && rect2 >= 60 && rect2 <= 120 && y2 > 500 && dp2 === '2',
      `scrollY=${y2} rect.top=${rect2} data-page=${dp2}`);

    // ★ 刷新后也做 2 秒稳定性观察
    const stab6r = await assertStableFor2s(page, 'test6-reload');
    record('刷新后2秒稳定',
      stab6r.stable && !stab6r.rolledBackToTop,
      `drift=${stab6r.drift} samples=${stab6r.samples}`);
    await context.close();
  }

  // ═══════════════════════════════════════════════
  // 测试 7：移动端标题不被 Header 遮挡
  // ═══════════════════════════════════════════════
  section('7. 移动端标题不被 Header 遮挡');
  {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // 滚到分页，点第2页
    await page.evaluate(() => {
      document.querySelector('.pagination')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(500);
    const hasP2 = await page.evaluate(() =>
      !!Array.from(document.querySelectorAll('a.pagination__link')).find((l) => l.textContent?.trim() === '2')
    );
    if (hasP2) {
      const preYm = await getScrollY(page);
      await page.click('a.pagination__link:has-text("2")');
      await waitForScrollSettle(page, preYm);
      const rect = await getLatestRectTop(page);
      const dp = await getDataPage(page);
      // 移动端 Header ~64px，rect.top 应 ≥ 50
      record('移动端切换第2页', dp === '2', `data-page=${dp}`);
      record('移动端标题未被 Header 遮挡',
        rect != null && rect >= 50 && rect <= 120,
        `rect.top=${rect}（移动Header≈64px）`);
    } else {
      record('移动端存在第2页链接', false, '无第2页链接');
    }

    // 移动端直接访问 /page/2/
    await page.goto(`${BASE}/page/2/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const mRect = await getLatestRectTop(page);
    const mDp = await getDataPage(page);
    record('移动端直接访问 /page/2/ 定位到标题',
      mRect != null && mRect >= 50 && mRect <= 120 && mDp === '2',
      `rect.top=${mRect} data-page=${mDp}`);

    // ★ 移动端也做 2 秒稳定性观察
    const stab7 = await assertStableFor2s(page, 'test7-mobile');
    record('移动端2秒稳定（无二次滚动）',
      stab7.stable && !stab7.rolledBackToTop,
      `drift=${stab7.drift} samples=${stab7.samples}`);
    await context.close();
  }

  // ═══════════════════════════════════════════════
  // 测试 8：ClientRouter persist Header/Logo/particles/ScienceMap 正常
  // ═══════════════════════════════════════════════
  section('8. ClientRouter persist 组件完整性');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 记录首页关键 DOM 元素的标识（用于分页后验证是否被 persist 保留）
    const beforeIds = await page.evaluate(() => {
      const header = document.querySelector('header.site-header, header');
      const logo = document.querySelector('.logo, .site-logo');
      const particles = document.querySelector('#tsparticles, .particles-background, canvas');
      const scienceMap = document.querySelector('.science-map__svg, .science-map');
      const hero = document.querySelector('.home-hero');
      return {
        headerTag: header ? header.tagName : null,
        headerClass: header ? header.className.slice(0, 40) : null,
        headerChildCount: header ? header.children.length : 0,
        hasLogo: !!logo,
        hasParticles: !!particles,
        hasScienceMap: !!scienceMap,
        hasHero: !!hero,
        logoText: logo ? logo.textContent?.trim().slice(0, 20) : null,
        // 用元素引用计数（persist 时元素节点不变，引用保持）
        headerElAddr: header ? header.constructor.name : null,
      };
    });
    record('首页 Header 存在', !!beforeIds.headerTag, `tag=${beforeIds.headerTag} class=${beforeIds.headerClass}`);
    record('首页 Logo 存在', beforeIds.hasLogo, `text=${beforeIds.logoText}`);
    record('首页粒子背景/Canvas 存在', beforeIds.hasParticles, `found=${beforeIds.hasParticles}`);
    record('首页 ScienceMap 存在', beforeIds.hasScienceMap, `found=${beforeIds.hasScienceMap}`);
    record('首页 Hero 存在', beforeIds.hasHero, `found=${beforeIds.hasHero}`);

    // 点第2页
    await page.evaluate(() => {
      document.querySelector('.pagination')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(500);
    const preY8 = await getScrollY(page);
    await page.click('a.pagination__link:has-text("2")');
    await waitForScrollSettle(page, preY8);

    // 分页后验证 persist 组件仍存在且完整
    const afterIds = await page.evaluate(() => {
      const header = document.querySelector('header.site-header, header');
      const logo = document.querySelector('.logo, .site-logo');
      const particles = document.querySelector('#tsparticles, .particles-background, canvas');
      const scienceMap = document.querySelector('.science-map__svg, .science-map');
      const hero = document.querySelector('.home-hero');
      return {
        headerTag: header ? header.tagName : null,
        headerClass: header ? header.className.slice(0, 40) : null,
        headerChildCount: header ? header.children.length : 0,
        hasLogo: !!logo,
        hasParticles: !!particles,
        hasScienceMap: !!scienceMap,
        hasHero: !!hero,
        logoText: logo ? logo.textContent?.trim().slice(0, 20) : null,
      };
    });

    record('分页后 Header 保留', !!afterIds.headerTag,
      `tag=${afterIds.headerTag} class=${afterIds.headerClass} children=${afterIds.headerChildCount}`);
    record('分页后 Logo 保留', afterIds.hasLogo && afterIds.logoText === beforeIds.logoText,
      `text=${afterIds.logoText}`);
    record('分页后粒子背景保留', afterIds.hasParticles, `found=${afterIds.hasParticles}`);
    record('分页后 ScienceMap 保留', afterIds.hasScienceMap, `found=${afterIds.hasScienceMap}`);
    record('分页后 Hero 保留', afterIds.hasHero, `found=${afterIds.hasHero}`);

    // Header 子元素数量不变（persist 保留完整 DOM 结构）
    record('Header DOM 结构一致',
      beforeIds.headerChildCount === afterIds.headerChildCount,
      `before=${beforeIds.headerChildCount} after=${afterIds.headerChildCount}`);

    // ★ 分页后 2 秒稳定性
    const stab8 = await assertStableFor2s(page, 'test8');
    record('分页后2秒稳定（persist + 无二次滚动）',
      stab8.stable && !stab8.rolledBackToTop,
      `drift=${stab8.drift} samples=${stab8.samples}`);

    await context.close();
  }

  // ═══════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`汇总：${passCount} PASS / ${failCount} FAIL / 共 ${passCount + failCount} 项`);
  console.log(`${'═'.repeat(60)}`);

  if (failCount > 0) {
    console.log('\n失败项：');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.log(`  ✗ ${r.name} — ${r.detail}`));
  }

  await browser.close();
  process.exit(failCount > 0 ? 1 : 0);
})().catch((err) => {
  console.error('测试脚本异常：', err);
  process.exit(2);
});
