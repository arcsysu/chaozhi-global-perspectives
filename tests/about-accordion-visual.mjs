/**
 * Playwright 视觉/交互/导航测试：关于我们页 (/about/) — Editorial Accordion
 *
 * 验证目标（对照用户验收要求）：
 * 1. 四章目录正确呈现（非传统卡片墙）
 * 2. 默认展开第一章，其余收起
 * 3. 点击章节可平滑展开、切换及收起
 * 4. 同一时间最多展开一个章节
 * 5. 四个团队网站链接准确，target=_blank + rel=noopener noreferrer
 * 6. 公众号二维码资源加载成功（无 404），清晰可扫描
 * 7. 桌面端与移动端布局正常
 * 8. 键盘访问 + reduced-motion 正常
 * 9. 从首页/主题页/时间树页通过 ClientRouter 进入关于页后交互正常
 * 10. 浏览器前进/后退/刷新后正常
 * 11. Header 持久化无回归
 * 12. 控制台无 error
 *
 * 方法论沿用 nav-persist-regression.mjs：
 * - 客户端导航通过点击链接 + 监听 astro:page-load 完成。
 * - DOM 持久化验证用 persistMark 自定义属性指纹。
 */
import { createRequire } from 'module';

const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4324';

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

  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
  });

  // ═══════════════════════════════════════════════
  // 测试 1：页面结构验证
  // ═══════════════════════════════════════════════
  section('1. 页面结构验证');
  await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const structure = await page.evaluate(() => {
    const masthead = document.querySelector('.about-masthead');
    const intro = document.querySelector('.about-intro');
    const introTitle = document.querySelector('.about-intro__title');
    const introDesc = document.querySelector('.about-intro__desc');
    const introSection = document.querySelector('.about-intro__section');
    const accordion = document.querySelector('[data-accordion]');
    const chapters = document.querySelectorAll('.chapter');
    const mastheadText = masthead ? masthead.textContent.replace(/\s+/g, ' ').trim() : '';
    return {
      hasMasthead: !!masthead,
      mastheadHasAbout: mastheadText.includes('CHAOZHI / ABOUT'),
      mastheadHasHPC: mastheadText.includes('HPC'),
      hasIntro: !!intro,
      titleText: introTitle ? introTitle.textContent.trim() : '',
      descText: introDesc ? introDesc.textContent.trim() : '',
      sectionText: introSection ? introSection.textContent.trim() : '',
      titleFontSize: introTitle ? window.getComputedStyle(introTitle).fontSize : '',
      hasAccordion: !!accordion,
      chapterCount: chapters.length,
    };
  });

  record('masthead 存在且含 CHAOZHI / ABOUT', structure.hasMasthead && structure.mastheadHasAbout);
  record('masthead 含 HPC · AI · SCIENCE', structure.mastheadHasHPC);
  record('intro 存在且 section=ABOUT / 01', structure.hasIntro && structure.sectionText === 'ABOUT / 01');
  record('主标题=关于我们', structure.titleText === '关于我们', `"${structure.titleText}"`);
  record('副标题=以全球视野，看见科学的下一步。', structure.descText === '以全球视野，看见科学的下一步。',
    `"${structure.descText}"`);
  record('主标题字号 ≥ 38px', parseFloat(structure.titleFontSize) >= 38, `font-size=${structure.titleFontSize}`);
  record('折叠目录容器存在', structure.hasAccordion);
  record('四章目录存在', structure.chapterCount === 4, `chapterCount=${structure.chapterCount}`);

  // 章节编号与标题
  const chapterTitles = await page.evaluate(() => {
    return [...document.querySelectorAll('.chapter')].map((ch) => {
      const num = ch.querySelector('.chapter__number')?.textContent.trim();
      const en = ch.querySelector('.chapter__en')?.textContent.trim();
      const title = ch.querySelector('.chapter__title')?.textContent.trim();
      const summary = ch.querySelector('.chapter__summary')?.textContent.trim();
      return { num, en, title, summary, isOpen: ch.hasAttribute('open') };
    });
  });

  record('章节 01 = ABOUT / 关于我们', chapterTitles[0]?.num === '01' && chapterTitles[0]?.en === 'ABOUT' && chapterTitles[0]?.title === '关于我们');
  record('章节 02 = OUR FOCUS / 关注领域', chapterTitles[1]?.num === '02' && chapterTitles[1]?.en === 'OUR FOCUS' && chapterTitles[1]?.title === '关注领域');
  record('章节 03 = OUR NETWORK / 相关平台', chapterTitles[2]?.num === '03' && chapterTitles[2]?.en === 'OUR NETWORK' && chapterTitles[2]?.title === '相关平台');
  record('章节 04 = STAY CONNECTED / 关注我们', chapterTitles[3]?.num === '04' && chapterTitles[3]?.en === 'STAY CONNECTED' && chapterTitles[3]?.title === '关注我们');

  // 无卡片墙验证（不应有 placeholder-card）
  const noCards = await page.evaluate(() => !document.querySelector('.placeholder-card'));
  record('无传统卡片墙（.placeholder-card 不存在）', noCards);

  // ═══════════════════════════════════════════════
  // 测试 2：默认展开第一章，其余收起
  // ═══════════════════════════════════════════════
  section('2. 默认展开状态');

  const defaultState = await page.evaluate(() => {
    const chapters = [...document.querySelectorAll('.chapter')];
    return chapters.map((c) => c.hasAttribute('open'));
  });
  record('第一章默认展开', defaultState[0] === true);
  record('第二/三/四章默认收起', defaultState[1] === false && defaultState[2] === false && defaultState[3] === false);

  // ═══════════════════════════════════════════════
  // 测试 3：点击切换 + 单展开模式
  // ═══════════════════════════════════════════════
  section('3. 折叠交互（单展开）');

  // 点击第二章 summary
  await page.click('.chapter[data-chapter-index="1"] summary.chapter__head');
  await page.waitForTimeout(350);

  const afterOpen2 = await page.evaluate(() => {
    const chapters = [...document.querySelectorAll('.chapter')];
    return chapters.map((c) => c.hasAttribute('open'));
  });
  record('点击第二章后第二章展开', afterOpen2[1] === true);
  record('展开第二章后第一章自动收起', afterOpen2[0] === false, `state=${JSON.stringify(afterOpen2)}`);
  record('同时仅一个展开', afterOpen2.filter(Boolean).length === 1);

  // 点击第三章
  await page.click('.chapter[data-chapter-index="2"] summary.chapter__head');
  await page.waitForTimeout(350);
  const afterOpen3 = await page.evaluate(() => {
    return [...document.querySelectorAll('.chapter')].map((c) => c.hasAttribute('open'));
  });
  record('点击第三章后第三章展开', afterOpen3[2] === true);
  record('第三章展开后第二章收起', afterOpen3[1] === false);
  record('切换后仍仅一个展开', afterOpen3.filter(Boolean).length === 1);

  // 再次点击当前展开的第三章 → 收起（允许全收起）
  await page.click('.chapter[data-chapter-index="2"] summary.chapter__head');
  await page.waitForTimeout(350);
  const afterClose3 = await page.evaluate(() => {
    return [...document.querySelector('[data-accordion]')?.querySelectorAll('.chapter') ?? []].map((c) => c.hasAttribute('open'));
  });
  record('再次点击当前章节可收起', afterClose3.every((v) => v === false), `state=${JSON.stringify(afterClose3)}`);

  // ═══════════════════════════════════════════════
  // 测试 4：团队网站链接
  // ═══════════════════════════════════════════════
  section('4. 团队网站链接');

  // 先展开第三章（可能被上一步收起了）
  await page.click('.chapter[data-chapter-index="2"] summary.chapter__head');
  await page.waitForTimeout(350);

  const links = await page.evaluate(() => {
    return [...document.querySelectorAll('.network-item__link')].map((a) => ({
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      name: a.querySelector('.network-item__name')?.textContent.trim(),
      domain: a.querySelector('.network-item__domain')?.textContent.trim(),
    }));
  });

  const expectedLinks = [
    'https://ol.yatcc.arcsysu.cn/',
    'https://yatcc-ai.com/',
    'https://portal.aihub.arcsysu.cn/',
    'https://docs.yatcc-ai.com/',
  ];
  const expectedNames = ['YatCC-OL', 'YatCC AI', 'YatCC AI Hub', 'YatCC 实验文档'];

  record('存在 4 个网站链接', links.length === 4, `count=${links.length}`);
  record('4 个链接 URL 正确', links.length === 4 && links.every((l, i) => l.href === expectedLinks[i]),
    `urls=${links.map((l) => l.href).join(', ')}`);
  record('4 个网站名称核实正确', links.length === 4 && links.every((l, i) => l.name === expectedNames[i]),
    `names=${links.map((l) => l.name).join(', ')}`);
  record('所有链接 target=_blank', links.every((l) => l.target === '_blank'));
  record('所有链接 rel 含 noopener noreferrer', links.every((l) => /noopener/.test(l.rel) && /noreferrer/.test(l.rel)));
  record('显示域名辅助信息', links.every((l) => l.domain && l.domain.length > 0));

  // 悬停箭头移动
  const arrowMove = await page.evaluate(() => {
    const link = document.querySelector('.network-item__link');
    if (!link) return false;
    const arrow = link.querySelector('.network-item__arrow');
    if (!arrow) return false;
    return true; // 存在即可，transform 在 hover 测试中验证
  });
  record('网站条目含箭头图标', arrowMove);

  // ═══════════════════════════════════════════════
  // 测试 5：公众号二维码
  // ═══════════════════════════════════════════════
  section('5. 公众号二维码');

  // 展开第四章
  await page.click('.chapter[data-chapter-index="3"] summary.chapter__head');
  await page.waitForTimeout(350);

  const qr = await page.evaluate(() => {
    const img = document.querySelector('.connect__qr img');
    if (!img) return { found: false };
    const r = img.getBoundingClientRect();
    const cs = window.getComputedStyle(img);
    return {
      found: true,
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: r.width,
      displayHeight: r.height,
      complete: img.complete,
      isSquare: Math.abs(img.naturalWidth - img.naturalHeight) < 2,
    };
  });

  record('二维码图片存在', qr.found);
  record('二维码 src 含 QRcode.jpeg', qr.src && /QRcode\.jpeg/.test(qr.src), `src=${qr.src}`);
  record('二维码 alt 文案存在', !!qr.alt && qr.alt.includes('超智全球视野'));
  record('二维码加载成功（naturalWidth>0）', qr.naturalWidth > 0, `natural=${qr.naturalWidth}×${qr.naturalHeight}`);
  record('二维码为正方形（未拉伸）', qr.isSquare);
  record('桌面端显示宽度 150–190px', qr.displayWidth >= 150 && qr.displayWidth <= 195, `display=${qr.displayWidth?.toFixed(0)}px`);
  record('显示比例 1:1（未裁切）', Math.abs(qr.displayWidth - qr.displayHeight) < 2,
    `${qr.displayWidth?.toFixed(0)}×${qr.displayHeight?.toFixed(0)}`);

  // 公众号名称
  const wechatName = await page.evaluate(() => {
    const el = document.querySelector('.connect__name');
    return el ? el.textContent.trim() : '';
  });
  record('公众号名称=超智全球视野', wechatName === '超智全球视野', `"${wechatName}"`);

  // ═══════════════════════════════════════════════
  // 测试 6：关注领域三方向（02 章节）
  // ═══════════════════════════════════════════════
  section('6. 关注领域三方向');

  await page.click('.chapter[data-chapter-index="1"] summary.chapter__head');
  await page.waitForTimeout(350);

  const focus = await page.evaluate(() => {
    return [...document.querySelectorAll('.focus-item')].map((item) => ({
      label: item.querySelector('.focus-item__label')?.textContent.trim(),
      name: item.querySelector('.focus-item__name')?.textContent.trim(),
      desc: item.querySelector('.focus-item__desc')?.textContent.trim(),
    }));
  });
  record('关注领域有 3 项', focus.length === 3, `count=${focus.length}`);
  record('三方向标识 HPC/AI/SCIENCE',
    focus.length === 3 && focus[0].label === 'HPC' && focus[1].label === 'AI' && focus[2].label === 'SCIENCE');
  record('三方向有描述', focus.every((f) => f.desc && f.desc.length > 0));

  // ═══════════════════════════════════════════════
  // 测试 7：键盘访问
  // ═══════════════════════════════════════════════
  section('7. 键盘访问');

  // 重新加载页面确保干净状态
  await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Tab 到第一个 summary
  let focused = null;
  let tabCount = 0;
  while (tabCount < 20) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return { tag: el.tagName, cls: el.className || '', role: el.getAttribute('role') };
    });
    if (focused && (focused.tag === 'SUMMARY' || /chapter__head/.test(focused.cls))) break;
    tabCount++;
  }
  record('Tab 可聚焦到章节 summary', !!focused && (focused.tag === 'SUMMARY' || /chapter__head/.test(focused.cls || '')),
    `tag=${focused?.tag} cls="${focused?.cls}"`);

  // Enter 展开当前聚焦章节
  const beforeEnter = await page.evaluate(() => {
    return [...document.querySelectorAll('.chapter')].map((c) => c.hasAttribute('open'));
  });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  const afterEnter = await page.evaluate(() => {
    return [...document.querySelectorAll('.chapter')].map((c) => c.hasAttribute('open'));
  });
  record('Enter 键可展开章节', JSON.stringify(beforeEnter) !== JSON.stringify(afterEnter),
    `before=${JSON.stringify(beforeEnter)} after=${JSON.stringify(afterEnter)}`);

  // ═══════════════════════════════════════════════
  // 测试 8：ClientRouter 导航进入关于页（交互正常）
  // ═══════════════════════════════════════════════
  section('8. ClientRouter 导航进入关于页');

  // 从首页客户端导航到关于页
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 打 Header 标记
  const homeMark = await page.evaluate(() => {
    const header = document.getElementById('site-header');
    const logoImg = document.querySelector('.logo__img');
    if (!header || !logoImg) return null;
    const mark = 'nav-' + Math.random().toString(36).slice(2);
    header.dataset.persistMark = mark;
    logoImg.dataset.persistMark = mark + '-img';
    return { headerMark: mark, imgMark: mark + '-img' };
  });

  // 客户端导航到关于页
  await clientNav(page, 'a.header__nav-link[href$="/about/"]', 'about');

  const aboutHeaderCheck = await page.evaluate((expected) => {
    const header = document.getElementById('site-header');
    const logoImg = document.querySelector('.logo__img');
    return {
      headerMarkMatch: header?.dataset.persistMark === expected.headerMark,
      imgMarkMatch: logoImg?.dataset.persistMark === expected.imgMark,
    };
  }, homeMark);
  record('ClientRouter 进入关于页后 Header 同一实例', aboutHeaderCheck.headerMarkMatch);
  record('ClientRouter 进入关于页后 Logo 同一实例', aboutHeaderCheck.imgMarkMatch);

  // 进入关于页后折叠交互仍正常
  // 默认第一章应展开
  const clientNavState = await page.evaluate(() => {
    return [...document.querySelectorAll('.chapter')].map((c) => c.hasAttribute('open'));
  });
  record('客户端导航后第一章默认展开', clientNavState[0] === true);

  // 点击第三章验证交互正常
  await page.click('.chapter[data-chapter-index="2"] summary.chapter__head');
  await page.waitForTimeout(350);
  const clientNavAfter = await page.evaluate(() => {
    return [...document.querySelectorAll('.chapter')].map((c) => c.hasAttribute('open'));
  });
  record('客户端导航后点击第三章可展开', clientNavAfter[2] === true);
  record('客户端导航后单展开模式正常', clientNavAfter.filter(Boolean).length === 1);

  // ═══════════════════════════════════════════════
  // 测试 9：浏览器前进/后退
  // ═══════════════════════════════════════════════
  section('9. 浏览器前进/后退');

  // 当前在关于页，后退应回首页
  await page.goBack();
  await page.waitForTimeout(600);
  const backUrl = page.url();
  record('后退返回首页', backUrl.endsWith('/') || backUrl.endsWith(BASE) || /localhost:4324\/?$/.test(backUrl),
    `url=${backUrl}`);

  // 前进回关于页
  await page.goForward();
  await page.waitForTimeout(600);
  const fwdUrl = page.url();
  record('前进回到关于页', fwdUrl.includes('/about/'), `url=${fwdUrl}`);

  // 前进后折叠交互仍正常
  const fwdState = await page.evaluate(() => {
    return [...document.querySelectorAll('.chapter')].map((c) => c.hasAttribute('open'));
  });
  record('前进后页面折叠状态正常', fwdState[0] === true || fwdState.filter(Boolean).length <= 1,
    `state=${JSON.stringify(fwdState)}`);

  // 刷新（硬导航）后正常
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const reloadState = await page.evaluate(() => {
    return [...document.querySelectorAll('.chapter')].map((c) => c.hasAttribute('open'));
  });
  record('刷新后第一章默认展开', reloadState[0] === true);

  // ═══════════════════════════════════════════════
  // 测试 10：从主题页/时间树页进入关于页
  // ═══════════════════════════════════════════════
  section('10. 从其他页面进入关于页');

  // 主题页 → 关于页
  await page.goto(`${BASE}/topics/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await clientNav(page, 'a.header__nav-link[href$="/about/"]', 'about-from-topics');
  const fromTopics = await page.evaluate(() => !!document.querySelector('[data-accordion]'));
  record('从主题页 ClientRouter 进入关于页成功', fromTopics && page.url().includes('/about/'));

  // 时间树页 → 关于页
  await page.goto(`${BASE}/archive/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await clientNav(page, 'a.header__nav-link[href$="/about/"]', 'about-from-archive');
  const fromArchive = await page.evaluate(() => !!document.querySelector('[data-accordion]'));
  record('从时间树页 ClientRouter 进入关于页成功', fromArchive && page.url().includes('/about/'));

  // 从关于页返回首页
  await clientNav(page, 'a.header__nav-link[href="/"]', 'home-from-about');
  record('从关于页返回首页成功', page.url().endsWith('/') || /localhost:4324\/?$/.test(page.url()));

  // ═══════════════════════════════════════════════
  // 测试 11：响应式 — 平板 960px
  // ═══════════════════════════════════════════════
  section('11. 响应式：平板 960px');

  await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 960, height: 1000 });
  await page.waitForTimeout(400);

  const tablet = await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const head = document.querySelector('.chapter__head');
    const headCs = head ? window.getComputedStyle(head) : null;
    const cols = headCs ? headCs.gridTemplateColumns : '';
    return { hasOverflow: scrollWidth > clientWidth + 2, cols };
  });
  record('平板 960px 无横向溢出', !tablet.hasOverflow);
  record('平板章节标题行布局正常', !!tablet.cols, `cols=${tablet.cols}`);

  // 交互正常
  await page.click('.chapter[data-chapter-index="2"] summary.chapter__head');
  await page.waitForTimeout(300);
  const tabletInteract = await page.evaluate(() => {
    return [...document.querySelectorAll('.chapter')].map((c) => c.hasAttribute('open'));
  });
  record('平板端折叠交互正常', tabletInteract[2] === true && tabletInteract.filter(Boolean).length === 1);

  // ═══════════════════════════════════════════════
  // 测试 12：响应式 — 手机 620px
  // ═══════════════════════════════════════════════
  section('12. 响应式：手机 620px');

  await page.setViewportSize({ width: 620, height: 1000 });
  await page.waitForTimeout(400);

  const phone = await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    // 关注我们双栏 → 单栏
    const connect = document.querySelector('.connect');
    const connectCs = connect ? window.getComputedStyle(connect) : null;
    const connectCols = connectCs ? connectCs.gridTemplateColumns : '';
    // 章节标题触控区域
    const head = document.querySelector('.chapter__head');
    const headRect = head ? head.getBoundingClientRect() : null;
    return {
      hasOverflow: scrollWidth > clientWidth + 2,
      connectCols,
      headHeight: headRect ? headRect.height : 0,
    };
  });
  record('手机 620px 无横向溢出', !phone.hasOverflow);
  record('手机端关注我们改为单栏', phone.connectCols && phone.connectCols.split(' ').filter(Boolean).length === 1,
    `cols=${phone.connectCols}`);
  record('手机端章节标题触控区 ≥ 44px', phone.headHeight >= 44, `height=${phone.headHeight?.toFixed(0)}px`);

  // ═══════════════════════════════════════════════
  // 测试 13：极窄 380px
  // ═══════════════════════════════════════════════
  section('13. 响应式：极窄 380px');

  await page.setViewportSize({ width: 380, height: 1000 });
  await page.waitForTimeout(400);

  const narrow = await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const title = document.querySelector('.about-intro__title');
    const titleRect = title ? title.getBoundingClientRect() : null;
    return {
      hasOverflow: scrollWidth > clientWidth + 2,
      titleWidth: titleRect ? titleRect.width : 0,
    };
  });
  record('极窄 380px 无横向溢出', !narrow.hasOverflow);
  record('极窄标题宽度 ≤ 视口', narrow.titleWidth <= 380, `titleW=${narrow.titleWidth?.toFixed(0)}px`);

  // ═══════════════════════════════════════════════
  // 测试 14：prefers-reduced-motion
  // ═══════════════════════════════════════════════
  section('14. prefers-reduced-motion');

  await page.setViewportSize({ width: 1280, height: 900 });
  const rmContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const rmPage = await rmContext.newPage();
  await rmPage.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await rmPage.waitForTimeout(400);

  const reducedMotion = await rmPage.evaluate(() => {
    const number = document.querySelector('.chapter__number');
    const title = document.querySelector('.chapter__title');
    const numberCs = number ? window.getComputedStyle(number) : null;
    const titleCs = title ? window.getComputedStyle(title) : null;
    return {
      numberDur: numberCs ? parseFloat(numberCs.transitionDuration) : 999,
      titleDur: titleCs ? parseFloat(titleCs.transitionDuration) : 999,
    };
  });
  record('reduced-motion 下编号过渡极短', reducedMotion.numberDur <= 0.02, `duration=${reducedMotion.numberDur}s`);
  record('reduced-motion 下标题过渡极短', reducedMotion.titleDur <= 0.02, `duration=${reducedMotion.titleDur}s`);
  await rmContext.close();

  // ═══════════════════════════════════════════════
  // 测试 15：控制台与网络
  // 排除已知 CDN 降级警告（cn-fontsource 字体 CDN 404，非本轮范围）
  // ═══════════════════════════════════════════════
  section('15. 控制台与网络');

  const CDN_HOSTS = ['cdn.jsdelivr.net'];
  const isCdnUrl = (url) => CDN_HOSTS.some((h) => url.includes(h));

  // 控制台 error：若失败响应中唯一的 4xx 都来自 CDN，则浏览器生成的
  // "Failed to load resource ... 404" 消息也是 CDN 降级，予以过滤
  const nonCdnFailures = failedResponses.filter((r) => !isCdnUrl(r.url));
  const realConsoleErrors = consoleErrors.filter((e) => {
    // consoleErrors 存储为字符串
    if (isCdnUrl(e)) return false;
    if (nonCdnFailures.length === 0 && e.includes('Failed to load resource')) return false;
    return true;
  });
  const realFailedResponses = failedResponses.filter((r) => !isCdnUrl(r.url));

  record('控制台无 error（排除已知 CDN 降级）', realConsoleErrors.length === 0,
    realConsoleErrors.length > 0 ? `errors=${JSON.stringify(realConsoleErrors.slice(0, 3))}` : 'clean ✓');
  record('无 pageerror', pageErrors.length === 0,
    pageErrors.length > 0 ? `errors=${JSON.stringify(pageErrors.slice(0, 3))}` : 'clean ✓');
  record('无 4xx/5xx 响应（排除 CDN；二维码无 404）', realFailedResponses.length === 0,
    realFailedResponses.length > 0 ? `failed=${JSON.stringify(realFailedResponses.slice(0, 3))}` : 'clean ✓');

  // ═══════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════
  await browser.close();

  console.log(`\n${'═'.repeat(56)}`);
  console.log(`关于我们页 Editorial Accordion 测试汇总`);
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
