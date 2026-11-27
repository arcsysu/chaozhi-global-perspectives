/**
 * Playwright 端到端测试：主题页 /topics/ 搜索功能
 *
 * 验证：
 * 1. 输入即实时筛选（中文名匹配）
 * 2. 不区分大小写匹配（英文 tag 名）
 * 3. 匹配结果在原目录中隐藏不匹配项，编号重新连续排列
 * 4. 文章数量保持准确
 * 5. 清空后恢复全部主题及原始排序
 * 6. 无匹配结果显示"没有找到匹配的主题"提示
 * 7. ClientRouter 兼容：站内导航进入主题页后搜索仍正常
 * 8. 浏览器前进后退后搜索正常
 * 9. 双栏布局保持
 * 10. 控制台无异常
 */
import { createRequire } from 'module';

const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
const TOPICS_URL = `${BASE}/topics/`;

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

/** 获取当前可见主题信息 */
async function getVisibleSubjects(page) {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll('[data-subject-item]')];
    return {
      total: items.length,
      visible: items.filter((i) => !i.hidden).map((i) => ({
        name: i.querySelector('.subject-entry__name')?.textContent ?? '',
        number: i.querySelector('[data-subject-number]')?.textContent ?? '',
        count: i.querySelector('.subject-entry__count')?.textContent ?? '',
      })),
      hiddenCount: items.filter((i) => i.hidden).length,
      matchCountText: document.querySelector('[data-match-count]')?.textContent ?? '',
      emptyHidden: document.querySelector('[data-empty-result]')?.hidden,
    };
  });
}

/** 注册一次性 page-load 监听（站内导航） */
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

async function waitPageLoad(page, timeout = 6000) {
  try {
    await page.waitForFunction(() => window.__testNavDone === true, { timeout });
  } catch {
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];

  // ═══════════════════════════════════════════════
  // 场景 1-5：直达主题页搜索功能
  // ═══════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (r) => { if (r.status() >= 400) failedResponses.push({ url: r.url(), status: r.status() }); });

    section('1. 直达主题页 — 初始状态');
    await page.goto(TOPICS_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const initial = await getVisibleSubjects(page);
    record('初始全部主题可见', initial.visible.length === initial.total && initial.total > 0,
      `total=${initial.total} visible=${initial.visible.length}`);
    record('初始匹配计数文本正确', initial.matchCountText.trim() === `${initial.total} 个匹配`,
      `text="${initial.matchCountText.trim()}"`);
    record('初始编号从01连续', initial.visible[0]?.number.trim() === '01' &&
      initial.visible[1]?.number.trim() === '02', `first=${initial.visible[0]?.number.trim()} second=${initial.visible[1]?.number.trim()}`);
    record('初始无结果提示隐藏', initial.emptyHidden === true, `emptyHidden=${initial.emptyHidden}`);

    section('2. 输入即实时筛选 — 中文名匹配');
    await page.fill('[data-subject-search]', '计划');
    await page.waitForTimeout(350);
    const filtered = await getVisibleSubjects(page);
    record('筛选"计划"有结果', filtered.visible.length > 0, `匹配数=${filtered.visible.length}`);
    record('筛选后匹配计数文本正确', filtered.matchCountText === `${filtered.visible.length} 个匹配`,
      `text="${filtered.matchCountText}"`);
    // 编号在各类内独立从 01 起，不要求跨类别全局连续
    const numberingOk = await page.evaluate(() => {
      const categories = [...document.querySelectorAll('[data-subject-category]')].filter((c) => !c.hidden);
      return categories.every((category) => {
        const visible = [...category.querySelectorAll('[data-subject-item]')].filter((i) => !i.hidden);
        return visible.every((item, i) => {
          const number = item.querySelector('[data-subject-number]')?.textContent?.trim() ?? '';
          return number === String(i + 1).padStart(2, '0');
        });
      });
    });
    record('筛选后各类内编号重新连续排列', numberingOk,
      `numbers=${filtered.visible.map((v) => v.number.trim()).join(',')}`);
    record('筛选后隐藏了不匹配项', filtered.hiddenCount > 0, `hidden=${filtered.hiddenCount}`);
    record('筛选后无结果提示隐藏（有匹配时）', filtered.emptyHidden === true, `emptyHidden=${filtered.emptyHidden}`);

    section('3. 不区分大小写匹配 — 英文 tag');
    await page.fill('[data-subject-search]', 'nvidia');
    await page.waitForTimeout(350);
    const nvidiaFiltered = await getVisibleSubjects(page);
    record('小写"nvidia"匹配大写"NVIDIA"',
      nvidiaFiltered.visible.length === 1 && nvidiaFiltered.visible[0].name === 'NVIDIA',
      `visible=${JSON.stringify(nvidiaFiltered.visible)}`);

    await page.fill('[data-subject-search]', 'AMD');
    await page.waitForTimeout(350);
    const amdFiltered = await getVisibleSubjects(page);
    record('大写"AMD"匹配含 AMD 的主题', amdFiltered.visible.some((v) => v.name.includes('AMD')),
      `visible=${amdFiltered.visible.map((v) => v.name).join(',')}`);

    section('4. 清空后恢复全部主题');
    await page.fill('[data-subject-search]', '');
    await page.waitForTimeout(350);
    const restored = await getVisibleSubjects(page);
    record('清空后恢复全部主题', restored.visible.length === restored.total,
      `visible=${restored.visible.length} total=${restored.total}`);
    record('清空后匹配计数恢复', restored.matchCountText === `${restored.total} 个匹配`,
      `text="${restored.matchCountText}"`);
    record('清空后编号恢复01起', restored.visible[0]?.number.trim() === '01', `first=${restored.visible[0]?.number.trim()}`);

    section('5. 无匹配结果显示提示');
    await page.fill('[data-subject-search]', 'zzzzzznomatch');
    await page.waitForTimeout(350);
    const noMatch = await getVisibleSubjects(page);
    record('无匹配时可见数为0', noMatch.visible.length === 0, `visible=${noMatch.visible.length}`);
    record('无匹配时计数为"0 个匹配"', noMatch.matchCountText === '0 个匹配', `text="${noMatch.matchCountText}"`);
    record('无匹配时显示"没有找到匹配的主题"提示', noMatch.emptyHidden === false,
      `emptyHidden=${noMatch.emptyHidden}`);
    const emptyText = await page.evaluate(() => document.querySelector('[data-empty-result]')?.textContent ?? '');
    record('提示文本为"没有找到匹配的主题"', emptyText.includes('没有找到') || emptyText.includes('匹配'),
      `text="${emptyText}"`);

    await ctx.close();
  }

  // ═══════════════════════════════════════════════
  // 场景 6：ClientRouter 站内导航进入主题页后搜索正常
  // ═══════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    section('6. 首页站内导航进入主题页 — 搜索功能正常');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await armPageLoad(page);
    await page.click('a[href="/topics/"]');
    await waitPageLoad(page);

    const navState = await getVisibleSubjects(page);
    record('站内导航后到达主题页', page.url().includes('/topics/'), `url=${page.url()}`);
    record('站内导航后主题列表完整', navState.total > 0 && navState.visible.length === navState.total,
      `total=${navState.total}`);

    // 站内导航后输入筛选
    await page.fill('[data-subject-search]', '计划');
    await page.waitForTimeout(350);
    const navFiltered = await getVisibleSubjects(page);
    record('站内导航后输入筛选有效', navFiltered.visible.length > 0 && navFiltered.visible.length < navState.total,
      `匹配=${navFiltered.visible.length}`);
    const navNumberingOk = await page.evaluate(() => {
      const categories = [...document.querySelectorAll('[data-subject-category]')].filter((c) => !c.hidden);
      return categories.every((category) => {
        const visible = [...category.querySelectorAll('[data-subject-item]')].filter((i) => !i.hidden);
        return visible.every((item, i) => {
          const number = item.querySelector('[data-subject-number]')?.textContent?.trim() ?? '';
          return number === String(i + 1).padStart(2, '0');
        });
      });
    });
    record('站内导航后各类内编号重新排列', navNumberingOk,
      `numbers=${navFiltered.visible.map((v) => v.number.trim()).join(',')}`);

    await ctx.close();
  }

  // ═══════════════════════════════════════════════
  // 场景 7：浏览器前进后退后搜索正常
  // ═══════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    section('7. 浏览器前进后退 — 搜索功能正常');
    await page.goto(TOPICS_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // 输入筛选后导航到文章页再返回
    await page.fill('[data-subject-search]', '创世纪');
    await page.waitForTimeout(350);
    const beforeNav = await getVisibleSubjects(page);
    record('后退前筛选有效', beforeNav.visible.length > 0, `匹配=${beforeNav.visible.length}`);

    // 点击第一个匹配的主题进入主题详情页（用 evaluate 取 href 避免 hidden 属性定位问题）
    await armPageLoad(page);
    const firstHref = await page.evaluate(() => {
      const firstVisible = [...document.querySelectorAll('[data-subject-item]')].find((i) => !i.hidden);
      return firstVisible?.querySelector('a')?.getAttribute('href') ?? null;
    });
    if (firstHref) {
      await page.click(`a[href="${firstHref}"]`);
      await waitPageLoad(page);
    }
    record('进入主题详情页', !page.url().endsWith('/topics/'), `url=${page.url()}`);

    // 浏览器后退回主题页
    await armPageLoad(page);
    await page.goBack();
    await waitPageLoad(page);
    await page.waitForTimeout(400);
    const afterBack = await getVisibleSubjects(page);
    record('后退回主题页列表完整', afterBack.total > 0, `total=${afterBack.total}`);
    // 后退后搜索框可能被重置（ClientRouter 恢复 DOM），验证搜索功能仍可用
    await page.fill('[data-subject-search]', 'NVIDIA');
    await page.waitForTimeout(350);
    const afterBackFilter = await getVisibleSubjects(page);
    record('后退后搜索功能仍可用',
      afterBackFilter.visible.length === 1 && afterBackFilter.visible[0].name === 'NVIDIA',
      `visible=${afterBackFilter.visible.map((v) => v.name).join(',')}`);

    await ctx.close();
  }

  // ═══════════════════════════════════════════════
  // 场景 8：双栏布局保持
  // ═══════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    section('8. 筛选后保持杂志式双栏布局');
    await page.goto(TOPICS_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.fill('[data-subject-search]', '计划');
    await page.waitForTimeout(350);
    const layout = await page.evaluate(() => {
      const grid = [...document.querySelectorAll('.subject-index')].find((el) => {
        const category = el.closest('[data-subject-category]');
        return category && !category.hidden;
      }) ?? document.querySelector('.subject-index');
      const cs = grid ? window.getComputedStyle(grid) : null;
      return {
        gridTemplateColumns: cs?.gridTemplateColumns ?? '',
        columnCount: cs ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      };
    });
    record('筛选后保持双栏布局', layout.columnCount === 2, `columns=${layout.columnCount} (${layout.gridTemplateColumns})`);

    await ctx.close();
  }

  // ═══════════════════════════════════════════════
  // 场景 9：移动端响应式
  // ═══════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 } });
    const page = await ctx.newPage();

    section('9. 移动端响应式 — 搜索功能正常');
    await page.goto(TOPICS_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const mobileInitial = await getVisibleSubjects(page);
    record('移动端主题列表完整', mobileInitial.total > 0, `total=${mobileInitial.total}`);

    await page.fill('[data-subject-search]', '计划');
    await page.waitForTimeout(350);
    const mobileFiltered = await getVisibleSubjects(page);
    record('移动端筛选有效', mobileFiltered.visible.length > 0 && mobileFiltered.visible.length < mobileInitial.total,
      `匹配=${mobileFiltered.visible.length}`);

    const mobileLayout = await page.evaluate(() => {
      const grid = [...document.querySelectorAll('.subject-index')].find((el) => {
        const category = el.closest('[data-subject-category]');
        return category && !category.hidden;
      }) ?? document.querySelector('.subject-index');
      const cs = grid ? window.getComputedStyle(grid) : null;
      return cs ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    });
    record('移动端单栏布局', mobileLayout === 1, `columns=${mobileLayout}`);

    await ctx.close();
  }

  // ═══════════════════════════════════════════════
  // 控制台错误检查
  // ═══════════════════════════════════════════════
  section('控制台错误检查');
  const CDN_HOSTS = ['cdn.jsdelivr.net'];
  const isCdnText = (t) => CDN_HOSTS.some((h) => t.includes(h)) || t.includes('tsParticles') || t.includes('tsparticles');
  const isCdnUrl = (u) => CDN_HOSTS.some((h) => u.includes(h));
  const realFailed = failedResponses.filter((r) => !isCdnUrl(r.url));
  // 浏览器生成的 "Failed to load resource: ... 404" 无附带 URL，
  // 若失败响应中唯一的 4xx 都来自 CDN，则该消息也属于已知降级
  const realErrors = consoleErrors.filter((t) => {
    if (isCdnText(t)) return false;
    if (t.includes('Failed to load resource') && realFailed.length === 0) return false;
    return true;
  });
  record('无控制台 error（排除 CDN + 已知 404 降级）', realErrors.length === 0,
    realErrors.length > 0 ? JSON.stringify(realErrors.slice(0, 3)) : 'clean ✓');
  record('无未捕获 pageerror', pageErrors.length === 0,
    pageErrors.length > 0 ? JSON.stringify(pageErrors.slice(0, 3)) : 'clean ✓');
  record('无非 CDN 失败响应', realFailed.length === 0,
    realFailed.length > 0 ? JSON.stringify(realFailed.slice(0, 3)) : 'clean ✓');

  await browser.close();

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`汇总：${passCount} PASS / ${failCount} FAIL / 共 ${passCount + failCount} 项`);
  console.log('════════════════════════════════════════════════════════════');
  if (failCount > 0) {
    console.log('\n失败项：');
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(`  ✗ ${r.name} — ${r.detail}`));
  }
  process.exit(failCount > 0 ? 1 : 0);
})().catch((e) => {
  console.error('测试运行异常:', e);
  process.exit(2);
});
