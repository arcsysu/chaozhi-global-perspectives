/**
 * Playwright 视觉/布局/导航测试：时间树页 (/archive/) — Editorial Timeline
 *
 * 验证目标（对照用户验收要求）：
 * 1. 时间树已由月份按钮改为杂志式开放布局（masthead / intro / timeline-body / foot）
 * 2. 大字号年份、纵向时间轴、三栏月份索引结构存在且对齐
 * 3. 年份从新到旧、月份从新到旧排序正确
 * 4. 文章数量准确，空月份不出现
 * 5. 年份链接 → /archive/<year>/，月份链接 → /archive/<year>/<month>/
 * 6. 点击年份/月份可进入对应路由（ClientRouter 客户端导航）
 * 7. 不同年份月份数量不同时，时间轴仍连续（axis node 存在且竖直对齐）
 * 8. 响应式：桌面 3 栏 / 平板 2 栏 / 手机纵向时间轴
 * 9. 悬停交互（年份数字变品牌紫、月份下划线延伸）
 * 10. ClientRouter 页面切换后正常显示，Header 不闪烁、Logo 不重载
 * 11. 控制台无 error
 *
 * 方法论沿用 nav-persist-regression.mjs：
 * - 客户端导航通过点击链接 + 监听 astro:page-load 完成（非 page.goto 硬导航）。
 * - DOM 持久化验证用 persistMark 自定义属性指纹。
 */
import { createRequire } from 'module';

// 从 npx 缓存加载 playwright（项目无本地依赖）
const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4324';

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
 * 客户端导航辅助：点击链接后等待 astro:page-load 事件。
 */
async function clientNav(page, linkSelector, label = '') {
  await page.evaluate(() => {
    window.__testNavDone = false;
    document.addEventListener('astro:page-load', () => {
      window.__testNavDone = true;
    }, { once: true });
  });
  await page.click(linkSelector);
  try {
    await page.waitForFunction(() => window.__testNavDone === true, { timeout: 6000 });
  } catch {
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  // 收集控制台错误
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push({ url: response.url(), status: response.status() });
    }
  });

  // ═══════════════════════════════════════════════
  // 测试 1：首次加载时间树页（结构验证）
  // ═══════════════════════════════════════════════
  section('1. 时间树页结构验证');
  await page.goto(`${BASE}/archive/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const structure = await page.evaluate(() => {
    const masthead = document.querySelector('.timeline-masthead');
    const intro = document.querySelector('.timeline-intro');
    const introTitle = document.querySelector('.timeline-intro__title');
    const introDesc = document.querySelector('.timeline-intro__desc');
    const introSection = document.querySelector('.timeline-intro__section');
    const body = document.querySelector('.timeline-body');
    const timeline = document.querySelector('.timeline');
    const years = document.querySelectorAll('.timeline-year');
    const foot = document.querySelector('.timeline-foot');
    const mastheadText = masthead ? masthead.textContent.replace(/\s+/g, ' ').trim() : '';
    const footText = foot ? foot.textContent.replace(/\s+/g, ' ').trim() : '';
    return {
      hasMasthead: !!masthead,
      mastheadHasChronological: mastheadText.includes('CHRONOLOGICAL ARCHIVE'),
      mastheadHasHPC: mastheadText.includes('HPC'),
      hasIntro: !!intro,
      titleText: introTitle ? introTitle.textContent.trim() : '',
      descText: introDesc ? introDesc.textContent.trim() : '',
      sectionText: introSection ? introSection.textContent.trim() : '',
      hasBody: !!body,
      hasTimeline: !!timeline,
      yearCount: years.length,
      hasFoot: !!foot,
      footText,
      titleFontSize: introTitle ? window.getComputedStyle(introTitle).fontSize : '',
    };
  });

  record('masthead 存在且含 CHRONOLOGICAL ARCHIVE', structure.hasMasthead && structure.mastheadHasChronological,
    structure.mastheadHasChronological ? '栏目标识存在' : '缺失');
  record('masthead 含 HPC · AI · SCIENCE', structure.mastheadHasHPC);
  record('intro 存在且 section 标签=ARCHIVE / 01', structure.hasIntro && structure.sectionText === 'ARCHIVE / 01',
    `section="${structure.sectionText}"`);
  record('主标题=时间树', structure.titleText === '时间树', `"${structure.titleText}"`);
  record('简介文案存在', structure.descText.length > 0, `"${structure.descText}"`);
  record('主标题字号 ≥ 38px（杂志式大字号）', parseFloat(structure.titleFontSize) >= 38,
    `font-size=${structure.titleFontSize}`);
  record('timeline-body 存在', structure.hasBody);
  record('timeline <ol> 存在', structure.hasTimeline);
  record('至少 1 个年份区块', structure.yearCount >= 1, `yearCount=${structure.yearCount}`);
  record('底部 foot 存在且含 AN ARCHIVE OF SCIENTIFIC PROGRESS',
    structure.hasFoot && structure.footText.includes('AN ARCHIVE OF SCIENTIFIC PROGRESS'),
    `"${structure.footText}"`);

  // ═══════════════════════════════════════════════
  // 测试 2：年份/月份排序与文章数
  // ═══════════════════════════════════════════════
  section('2. 年份/月份排序与文章数');

  const ordering = await page.evaluate(() => {
    const yearEls = [...document.querySelectorAll('.timeline-year')];
    const years = yearEls.map((el) => {
      const numEl = el.querySelector('.timeline-year__number');
      const countEl = el.querySelector('.timeline-year__count');
      const countText = countEl ? countEl.textContent.trim() : '';
      const countMatch = countText.match(/(\d+)/);
      const months = [...el.querySelectorAll('.timeline-month')].map((m) => {
        const mNum = m.querySelector('.timeline-month__number')?.textContent.trim();
        const mCount = m.querySelector('.timeline-month__count')?.textContent.trim();
        const mCountMatch = mCount ? mCount.match(/(\d+)/) : null;
        const mAbbr = m.querySelector('.timeline-month__abbr')?.textContent.trim();
        return { month: mNum, count: mCountMatch ? parseInt(mCountMatch[1], 10) : 0, abbr: mAbbr };
      });
      return {
        year: numEl ? numEl.textContent.trim() : '',
        count: countMatch ? parseInt(countMatch[1], 10) : 0,
        months,
      };
    });

    // 年份倒序校验
    const yearNums = years.map((y) => parseInt(y.year, 10));
    const yearsDesc = yearNums.every((v, i, a) => i === 0 || a[i - 1] >= v);

    // 每个年份内月份倒序校验
    let monthsDesc = true;
    for (const y of years) {
      const mNums = y.months.map((m) => parseInt(m.month, 10));
      for (let i = 1; i < mNums.length; i++) {
        if (mNums[i - 1] < mNums[i]) { monthsDesc = false; break; }
      }
    }

    // 年份文章数 = 各月文章数之和
    let countConsistent = true;
    for (const y of years) {
      const sum = y.months.reduce((s, m) => s + m.count, 0);
      if (sum !== y.count) countConsistent = false;
    }

    // 月份缩写映射校验（11→NOV）
    const abbrMap = { '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR', '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AUG', '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC' };
    let abbrCorrect = true;
    for (const y of years) {
      for (const m of y.months) {
        if (abbrMap[m.month] !== m.abbr) abbrCorrect = false;
      }
    }

    // 空月份不出现（count > 0）
    let noEmptyMonths = true;
    for (const y of years) {
      for (const m of y.months) {
        if (m.count <= 0) noEmptyMonths = false;
      }
    }

    return {
      years,
      yearsDesc,
      monthsDesc,
      countConsistent,
      abbrCorrect,
      noEmptyMonths,
      totalMonths: years.reduce((s, y) => s + y.months.length, 0),
    };
  });

  record('年份从新到旧排序', ordering.yearsDesc,
    `years=${ordering.years.map((y) => y.year).join(', ')}`);
  record('月份从新到旧排序', ordering.monthsDesc);
  record('年份文章数 = 各月文章数之和', ordering.countConsistent);
  record('月份英文缩写正确（11→NOV 等）', ordering.abbrCorrect);
  record('空月份不出现（每月 count>0）', ordering.noEmptyMonths);
  record('至少有 1 个月份条目', ordering.totalMonths >= 1, `totalMonths=${ordering.totalMonths}`);

  // ═══════════════════════════════════════════════
  // 测试 3：链接正确性
  // ═══════════════════════════════════════════════
  section('3. 年份/月份链接正确性');

  const links = await page.evaluate(() => {
    const yearLinks = [...document.querySelectorAll('.timeline-year__link')].map((a) => ({
      href: a.getAttribute('href'),
      year: a.querySelector('.timeline-year__number')?.textContent.trim(),
    }));
    const monthLinks = [...document.querySelectorAll('.timeline-month__link')].map((a) => ({
      href: a.getAttribute('href'),
    }));
    return { yearLinks, monthLinks };
  });

  // 年份链接格式 /archive/<year>/
  const yearLinkOk = links.yearLinks.every((l) => {
    const m = l.href.match(/^\/archive\/(\d{4})\/$/);
    return m && m[1] === l.year;
  });
  record('年份链接格式正确 /archive/<year>/', yearLinkOk,
    `示例=${links.yearLinks[0]?.href}`);

  // 月份链接格式 /archive/<year>/<month>/
  const monthLinkOk = links.monthLinks.every((l) => /^\/archive\/\d{4}\/\d{2}\/$/.test(l.href));
  record('月份链接格式正确 /archive/<year>/<month>/', monthLinkOk,
    `示例=${links.monthLinks[0]?.href}`);

  // ═══════════════════════════════════════════════
  // 测试 4：时间轴对齐（axis node 竖直对齐 + 连续）
  // ═══════════════════════════════════════════════
  section('4. 时间轴竖线 + 节点对齐');

  const axis = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.timeline-axis__node')];
    if (nodes.length === 0) return { hasNodes: false, count: 0 };
    const rects = nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { left: r.left, width: r.width, top: r.top, bottom: r.bottom, height: r.height };
    });
    // 节点宽度应很小（1px 竖线）
    const thinLine = rects.every((r) => r.width <= 4);
    // 所有节点 x 中心对齐（竖直连续）
    const centers = rects.map((r) => r.left + r.width / 2);
    const firstCenter = centers[0];
    const aligned = centers.every((c) => Math.abs(c - firstCenter) < 3);
    // 节点竖向覆盖各自年份区块高度（align-self: stretch）
    const stretched = rects.every((r) => r.height > 40);
    // 圆形节点 (::after) 存在
    const firstNode = nodes[0];
    const afterStyle = window.getComputedStyle(firstNode, '::after');
    const hasCircle = afterStyle.content !== 'none' && afterStyle.content !== 'normal' &&
      (afterStyle.width !== '0px' || afterStyle.height !== '0px');
    return {
      hasNodes: true,
      count: nodes.length,
      thinLine,
      aligned,
      stretched,
      hasCircle,
      firstHeight: rects[0].height,
    };
  });

  record('时间轴节点存在', axis.hasNodes, `count=${axis.count}`);
  record('时间轴为细竖线（width ≤ 4px）', axis.thinLine);
  record('各年份节点 x 中心对齐（竖直连续）', axis.aligned);
  record('节点竖向拉伸覆盖年份区块', axis.stretched, `firstHeight=${axis.firstHeight?.toFixed(0)}px`);
  record('圆形节点 (::after) 存在', axis.hasCircle);

  // ═══════════════════════════════════════════════
  // 测试 5：桌面端三栏月份网格
  // ═══════════════════════════════════════════════
  section('5. 桌面端三栏月份网格');

  const grid3 = await page.evaluate(() => {
    const monthsGrid = document.querySelector('.timeline-months');
    if (!monthsGrid) return { found: false };
    const cs = window.getComputedStyle(monthsGrid);
    const cols = cs.gridTemplateColumns;
    const colCount = cols.split(' ').filter(Boolean).length;
    // 月份网格不应有卡片边框
    const firstMonth = document.querySelector('.timeline-month');
    const monthCs = firstMonth ? window.getComputedStyle(firstMonth) : null;
    const noBorder = monthCs ? monthCs.borderStyle === 'none' || monthCs.borderWidth === '0px' : true;
    return { found: true, colCount, cols, noBorder };
  });

  record('月份网格为 3 栏', grid3.found && grid3.colCount === 3,
    `colCount=${grid3.colCount} (${grid3.cols})`);
  record('月份条目无卡片边框', grid3.noBorder);

  // 年份大字号验证
  const yearNumber = await page.evaluate(() => {
    const el = document.querySelector('.timeline-year__number');
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    return {
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontVariantNumeric: cs.fontVariantNumeric,
    };
  });
  record('年份大字号 ≥ 40px', yearNumber && parseFloat(yearNumber.fontSize) >= 40,
    `font-size=${yearNumber?.fontSize}`);
  record('年份使用 monospace 字体', yearNumber && /monospace|mono/i.test(yearNumber.fontFamily),
    `font-family=${yearNumber?.fontFamily}`);
  record('年份使用 tabular-nums', yearNumber && yearNumber.fontVariantNumeric.includes('tabular-nums'),
    `font-variant-numeric=${yearNumber?.fontVariantNumeric}`);

  // ═══════════════════════════════════════════════
  // 测试 6：悬停交互
  // ═══════════════════════════════════════════════
  section('6. 悬停交互');

  // 年份数字悬停变品牌紫
  const yearNumberEl = await page.$('.timeline-year__number');
  let yearHoverColor = '';
  if (yearNumberEl) {
    await yearNumberEl.hover();
    await page.waitForTimeout(300);
    yearHoverColor = await page.evaluate(() => {
      const el = document.querySelector('.timeline-year__number');
      return el ? window.getComputedStyle(el).color : '';
    });
  }
  // 品牌紫 #6d4aff → rgb(109, 74, 255)；strong #5a36f0 → rgb(90,54,240)
  const isBrandPurple = /rgb\((109|90),\s*(74|54),\s*(255|240)\)/.test(yearHoverColor);
  record('年份悬停 → 品牌紫', isBrandPurple, `color=${yearHoverColor}`);

  // 月份下划线延伸
  await page.mouse.move(0, 0); // 清除年份悬停
  await page.waitForTimeout(200);
  const monthLinkEl = await page.$('.timeline-month__link');
  let monthUnderlineScaleX = '';
  if (monthLinkEl) {
    await monthLinkEl.hover();
    await page.waitForTimeout(300);
    monthUnderlineScaleX = await page.evaluate(() => {
      const el = document.querySelector('.timeline-month__link');
      if (!el) return '';
      const after = window.getComputedStyle(el, '::after');
      return after.transform;
    });
  }
  const underlineExtended = /matrix\(/.test(monthUnderlineScaleX) && !/matrix\(0,/.test(monthUnderlineScaleX);
  record('月份悬停 → 下划线 scaleX 延伸', underlineExtended, `transform=${monthUnderlineScaleX}`);

  // ═══════════════════════════════════════════════
  // 测试 7：点击年份进入年度归档页（ClientRouter）
  // ═══════════════════════════════════════════════
  section('7. 点击年份导航（ClientRouter）');

  // 先回到 archive（清除悬停）
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);

  const firstYearHref = await page.evaluate(() => {
    const link = document.querySelector('.timeline-year__link');
    return link ? link.getAttribute('href') : '';
  });
  const firstYearNum = await page.evaluate(() => {
    const el = document.querySelector('.timeline-year__number');
    return el ? el.textContent.trim() : '';
  });

  await clientNav(page, '.timeline-year__link', 'year-archive');

  const yearArchiveUrl = page.url();
  record('点击年份导航成功', yearArchiveUrl.endsWith(firstYearHref),
    `url=${yearArchiveUrl}`);

  // 年度归档页应显示该年份
  const yearArchiveContent = await page.evaluate((expectedYear) => {
    const bodyText = document.body.textContent || '';
    return {
      hasYear: bodyText.includes(expectedYear),
      hasArticles: !!document.querySelector('.article-card, .article-list, .stack a'),
    };
  }, firstYearNum);
  record(`年度归档页含年份 "${firstYearNum}"`, yearArchiveContent.hasYear);
  record('年度归档页有文章列表', yearArchiveContent.hasArticles);

  // 返回时间树页
  await clientNav(page, 'a.header__nav-link[href$="/archive/"]', 'back-to-archive');
  record('从年度页返回时间树页', page.url().endsWith('/archive/'));

  // ═══════════════════════════════════════════════
  // 测试 8：点击月份进入月度归档页（ClientRouter）
  // ═══════════════════════════════════════════════
  section('8. 点击月份导航（ClientRouter）');

  const firstMonthHref = await page.evaluate(() => {
    const link = document.querySelector('.timeline-month__link');
    return link ? link.getAttribute('href') : '';
  });

  await clientNav(page, '.timeline-month__link', 'month-archive');

  const monthArchiveUrl = page.url();
  record('点击月份导航成功', monthArchiveUrl.endsWith(firstMonthHref),
    `url=${monthArchiveUrl}`);

  const monthArchiveContent = await page.evaluate(() => {
    return {
      hasArticles: !!document.querySelector('.article-card, .article-list, .stack a'),
      hasPagination: !!document.querySelector('.pagination, [class*="pag"]'),
    };
  });
  record('月度归档页有文章列表', monthArchiveContent.hasArticles);

  // 返回时间树页
  await page.goto(`${BASE}/archive/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // ═══════════════════════════════════════════════
  // 测试 9：Header 持久化（时间树页 ↔ 首页客户端导航）
  // ═══════════════════════════════════════════════
  section('9. Header 持久化（时间树 ↔ 首页）');

  // 在时间树页给 Header 打标记
  const archiveHeaderMark = await page.evaluate(() => {
    const header = document.getElementById('site-header');
    const logoImg = document.querySelector('.logo__img');
    if (!header || !logoImg) return null;
    const mark = 'arch-' + Math.random().toString(36).slice(2);
    header.dataset.persistMark = mark;
    logoImg.dataset.persistMark = mark + '-img';
    return { headerMark: mark, imgMark: mark + '-img' };
  });
  record('时间树页 Header + Logo 存在', archiveHeaderMark !== null);

  // 客户端导航到首页
  await clientNav(page, 'a.header__nav-link[href="/"]', 'home');

  const homeHeaderCheck = await page.evaluate((expected) => {
    const header = document.getElementById('site-header');
    const logoImg = document.querySelector('.logo__img');
    return {
      headerMarkMatch: header?.dataset.persistMark === expected.headerMark,
      imgMarkMatch: logoImg?.dataset.persistMark === expected.imgMark,
    };
  }, archiveHeaderMark);

  record('首页 Header 是同一 DOM 实例', homeHeaderCheck.headerMarkMatch,
    homeHeaderCheck.headerMarkMatch ? '指纹一致 ✓' : '指纹丢失 ✗');
  record('首页 Logo 是同一 DOM 实例', homeHeaderCheck.imgMarkMatch);

  // 再从首页回到时间树页
  await clientNav(page, 'a.header__nav-link[href$="/archive/"]', 'back-archive');
  const backArchiveCheck = await page.evaluate((expected) => {
    const header = document.getElementById('site-header');
    return { headerMarkMatch: header?.dataset.persistMark === expected.headerMark };
  }, archiveHeaderMark);
  record('返回时间树页 Header 仍同一实例', backArchiveCheck.headerMarkMatch);

  // ═══════════════════════════════════════════════
  // 测试 10：响应式 — 平板 960px（2 栏月份）
  // ═══════════════════════════════════════════════
  section('10. 响应式：平板 960px');

  await page.setViewportSize({ width: 960, height: 1000 });
  await page.waitForTimeout(400);

  const tablet = await page.evaluate(() => {
    const grid = document.querySelector('.timeline-months');
    const cs = grid ? window.getComputedStyle(grid) : null;
    const colCount = cs ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    // 检查无横向溢出
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    return { colCount, hasOverflow: scrollWidth > clientWidth + 2, scrollWidth, clientWidth };
  });
  record('平板 960px 月份网格 ≤ 2 栏', tablet.colCount <= 2, `colCount=${tablet.colCount}`);
  record('平板无横向滚动溢出', !tablet.hasOverflow, `scroll=${tablet.scrollWidth} client=${tablet.clientWidth}`);

  // ═══════════════════════════════════════════════
  // 测试 11：响应式 — 手机 620px（纵向时间轴）
  // ═══════════════════════════════════════════════
  section('11. 响应式：手机 620px');

  await page.setViewportSize({ width: 620, height: 1000 });
  await page.waitForTimeout(400);

  const phone = await page.evaluate(() => {
    const grid = document.querySelector('.timeline-months');
    const cs = grid ? window.getComputedStyle(grid) : null;
    const colCount = cs ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    // 手机端时间轴应在左侧（grid-column: 1）
    const yearEl = document.querySelector('.timeline-year');
    const yearCs = yearEl ? window.getComputedStyle(yearEl) : null;
    const yearCols = yearCs ? yearCs.gridTemplateColumns : '';
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    // 月份触摸目标高度
    const firstMonthLink = document.querySelector('.timeline-month__link');
    const monthRect = firstMonthLink ? firstMonthLink.getBoundingClientRect() : null;
    return {
      monthColCount: colCount,
      yearCols,
      hasOverflow: scrollWidth > clientWidth + 2,
      touchTarget: monthRect ? monthRect.height : 0,
    };
  });
  record('手机 620px 月份网格 ≤ 2 栏', phone.monthColCount <= 2, `colCount=${phone.monthColCount}`);
  record('手机无横向滚动溢出', !phone.hasOverflow);
  record('手机端月份触摸目标 ≥ 36px', phone.touchTarget >= 36, `height=${phone.touchTarget?.toFixed(0)}px`);

  // ═══════════════════════════════════════════════
  // 测试 12：响应式 — 极窄 380px
  // ═══════════════════════════════════════════════
  section('12. 响应式：极窄 380px');

  await page.setViewportSize({ width: 380, height: 1000 });
  await page.waitForTimeout(400);

  const narrow = await page.evaluate(() => {
    const grid = document.querySelector('.timeline-months');
    const cs = grid ? window.getComputedStyle(grid) : null;
    const colCount = cs ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    // 标题不溢出
    const title = document.querySelector('.timeline-intro__title');
    const titleRect = title ? title.getBoundingClientRect() : null;
    return {
      colCount,
      hasOverflow: scrollWidth > clientWidth + 2,
      titleWidth: titleRect ? titleRect.width : 0,
      viewportWidth: 380,
    };
  });
  record('极窄 380px 月份网格 ≤ 1 栏', narrow.colCount <= 1, `colCount=${narrow.colCount}`);
  record('极窄无横向滚动溢出', !narrow.hasOverflow, `scroll vs client`);
  record('极窄标题宽度 ≤ 视口', narrow.titleWidth <= 380, `titleW=${narrow.titleWidth?.toFixed(0)}px`);

  // ═══════════════════════════════════════════════
  // 测试 13：prefers-reduced-motion
  // ═══════════════════════════════════════════════
  section('13. prefers-reduced-motion');

  // 新建 reduced-motion context
  const rmContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const rmPage = await rmContext.newPage();
  await rmPage.goto(`${BASE}/archive/`, { waitUntil: 'networkidle' });
  await rmPage.waitForTimeout(400);

  const reducedMotion = await rmPage.evaluate(() => {
    const yearNumber = document.querySelector('.timeline-year__number');
    const monthNumber = document.querySelector('.timeline-month__number');
    const yearCs = yearNumber ? window.getComputedStyle(yearNumber) : null;
    const monthCs = monthNumber ? window.getComputedStyle(monthNumber) : null;
    // 过渡时长应极短（reduced-motion 下）
    const yearDur = yearCs ? parseFloat(yearCs.transitionDuration) : 999;
    const monthDur = monthCs ? parseFloat(monthCs.transitionDuration) : 999;
    return {
      yearDur,
      monthDur,
      yearReduced: yearDur <= 0.02,
      monthReduced: monthDur <= 0.02,
    };
  });
  record('reduced-motion 下年份过渡时长极短', reducedMotion.yearReduced,
    `duration=${reducedMotion.yearDur}s`);
  record('reduced-motion 下月份过渡时长极短', reducedMotion.monthReduced,
    `duration=${reducedMotion.monthDur}s`);
  await rmContext.close();

  // ═══════════════════════════════════════════════
  // 测试 14：键盘访问
  // ═══════════════════════════════════════════════
  section('14. 键盘访问');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/archive/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Tab 到第一个可聚焦链接
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  let focused = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? { tag: el.tagName, cls: el.className, href: el.getAttribute('href') } : null;
  });
  // 可能先聚焦 header 链接，继续 Tab 直到进入 timeline 区域
  let tabCount = 0;
  while (focused && !/timeline-(year|month)__link/.test(focused.cls) && tabCount < 15) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
    focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName, cls: el.className || '', href: el.getAttribute('href') } : null;
    });
    tabCount++;
  }
  record('Tab 可聚焦到时间树链接', !!focused && /timeline-(year|month)__link/.test(focused.cls || ''),
    `focused.cls="${focused?.cls}"`);

  // 年份链接 href 验证
  record('聚焦的年份链接有有效 href', !!focused && !!focused.href && focused.href.includes('/archive/'));

  // ═══════════════════════════════════════════════
  // 测试 15：控制台无 error
  // ═══════════════════════════════════════════════
  section('15. 控制台与网络');

  record('控制台无 error', consoleErrors.length === 0,
    consoleErrors.length > 0 ? `errors=${JSON.stringify(consoleErrors.slice(0, 3))}` : 'clean ✓');
  record('无 pageerror', pageErrors.length === 0,
    pageErrors.length > 0 ? `errors=${JSON.stringify(pageErrors.slice(0, 3))}` : 'clean ✓');
  record('无 4xx/5xx 响应', failedResponses.length === 0,
    failedResponses.length > 0 ? `failed=${JSON.stringify(failedResponses.slice(0, 3))}` : 'clean ✓');

  // ═══════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════
  await browser.close();

  console.log(`\n${'═'.repeat(56)}`);
  console.log(`时间树页 Editorial Timeline 测试汇总`);
  console.log(`${'═'.repeat(56)}`);
  console.log(`  PASS: ${passCount}`);
  console.log(`  FAIL: ${failCount}`);
  console.log(`  TOTAL: ${passCount + failCount}`);
  console.log(`${'═'.repeat(56)}\n`);

  if (failCount > 0) {
    console.log('失败项：');
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.log(`  ✗ ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
    });
    process.exit(1);
  }
})();
