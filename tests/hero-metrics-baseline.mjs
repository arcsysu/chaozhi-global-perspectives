/**
 * 首页 Hero 区域精细量化基线（优化前快照）
 *
 * 测量 10 视口下 Hero 的：
 *   - 标题实际渲染字号、行高、占用宽高
 *   - 左右两栏实际宽度比、gap、padding
 *   - 标题与简介间距、简介与按钮间距
 *   - ScienceMap 容器尺寸 + SVG 尺寸 + 节点/标签是否越界容器
 *   - Hero 整体高度 vs 视口高度
 */
import { createRequire } from 'module';

const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';

const VIEWPORTS = [
  { width: 1920, height: 1080, label: '1920×1080' },
  { width: 1600, height: 900, label: '1600×900' },
  { width: 1536, height: 864, label: '1536×864' },
  { width: 1440, height: 900, label: '1440×900' },
  { width: 1366, height: 768, label: '1366×768' },
  { width: 1280, height: 720, label: '1280×720' },
  { width: 1024, height: 768, label: '1024×768' },
  { width: 768, height: 1024, label: '768×1024' },
  { width: 390, height: 844, label: '390×844' },
  { width: 320, height: 568, label: '320×568' },
];

async function measureHero(page) {
  return page.evaluate(() => {
    const data = {};
    const inner = document.querySelector('.home-hero__inner');
    const left = document.querySelector('.home-hero__left');
    const right = document.querySelector('.home-hero__right');
    const title = document.querySelector('.home-hero__title');
    const titleLine1 = document.querySelector('.home-hero__title-line--1');
    const titleLine2 = document.querySelector('.home-hero__title-line--2');
    const desc = document.querySelector('.home-hero__desc');
    const actions = document.querySelector('.home-hero__actions');
    const hero = document.querySelector('.home-hero');
    const smContainer = right;
    const smSvg = document.querySelector('.science-map__svg');
    const smNodes = document.querySelectorAll('.science-map__node');

    const cs = (el) => el ? getComputedStyle(el) : null;
    const r = (el) => el ? el.getBoundingClientRect() : null;

    // Hero 整体
    data.heroH = Math.round(r(hero).height);
    data.heroMinHeight = cs(hero).minHeight;
    data.viewportH = window.innerHeight;

    // inner
    data.innerW = Math.round(r(inner).width);
    data.gridCols = cs(inner).gridTemplateColumns;
    data.gap = cs(inner).gap;
    data.paddingBlock = cs(inner).paddingBlock;
    data.paddingInline = cs(inner).paddingInline;

    // 左右栏
    data.leftW = Math.round(r(left).width);
    data.rightW = Math.round(r(right).width);
    data.leftMaxW = cs(left).maxWidth;

    // 标题
    data.titleFs = cs(title).fontSize;
    data.titleLh = cs(title).lineHeight;
    data.titleW = Math.round(r(title).width);
    data.titleH = Math.round(r(title).height);
    data.titleLine1W = Math.round(r(titleLine1).width);
    data.titleLine1H = Math.round(r(titleLine1).height);
    data.titleLine2W = Math.round(r(titleLine2).width);
    data.titleLine2H = Math.round(r(titleLine2).height);

    // 间距
    data.descMt = cs(desc).marginTop;
    data.actionsMt = cs(actions).marginTop;

    // 间距实际像素（元素间垂直距离）
    const titleRect = r(title);
    const descRect = r(desc);
    const actionsRect = r(actions);
    data.titleToDescGap = Math.round(descRect.top - titleRect.bottom);
    data.descToActionsGap = Math.round(actionsRect.top - descRect.bottom);

    // ScienceMap
    data.smContainerW = Math.round(r(smContainer).width);
    data.smContainerH = Math.round(r(smContainer).height);
    data.smContainerMaxW = cs(smContainer).maxWidth;
    if (smSvg) {
      const svgRect = r(smSvg);
      data.smSvgW = Math.round(svgRect.width);
      data.smSvgH = Math.round(svgRect.height);
      data.smSvgOverflow = cs(smSvg).overflow;
      // SVG viewBox
      data.smViewBox = smSvg.getAttribute('viewBox');
    }

    // 节点位置：检测是否超出容器右边界（标签可能溢出）
    data.nodeOverflow = [];
    if (smContainer && smSvg) {
      const cRect = r(smContainer);
      smNodes.forEach((node, i) => {
        const nr = r(node);
        // 检查节点+标签整体是否超出容器右边界
        if (nr.right > cRect.right + 2) {
          data.nodeOverflow.push({ i, right: Math.round(nr.right), containerRight: Math.round(cRect.right), overflow: Math.round(nr.right - cRect.right) });
        }
      });
    }

    // 左右是否重叠
    data.leftRightOverlap = r(left).right > r(right).left + 1;

    return data;
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vw of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vw.width, height: vw.height } });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    // 等待 ScienceMap 动画启动几帧
    await page.waitForTimeout(1500);
    const data = await measureHero(page);
    results.push({ viewport: vw.label, ...data });
    await context.close();
  }

  await browser.close();

  // 输出表格
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('  首页 Hero 精细量化基线（优化前）');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('【Hero 整体 / 容器】');
  console.log('视口        | heroH  | viewportH | innerW | gridCols         | gap    | padBlock');
  console.log('------------|--------|-----------|--------|------------------|--------|---------');
  results.forEach(d => {
    console.log(`${d.viewport.padEnd(11)} | ${String(d.heroH).padEnd(6)} | ${String(d.viewportH).padEnd(9)} | ${String(d.innerW).padEnd(6)} | ${d.gridCols.padEnd(16)} | ${d.gap.padEnd(6)} | ${d.paddingBlock}`);
  });

  console.log('\n【标题】');
  console.log('视口        | titleFs   | titleLh | titleW | titleH | line1W | line2W | leftMaxW');
  console.log('------------|-----------|---------|--------|--------|--------|--------|---------');
  results.forEach(d => {
    console.log(`${d.viewport.padEnd(11)} | ${d.titleFs.padEnd(9)} | ${d.titleLh.padEnd(7)} | ${String(d.titleW).padEnd(6)} | ${String(d.titleH).padEnd(6)} | ${String(d.titleLine1W).padEnd(6)} | ${String(d.titleLine2W).padEnd(6)} | ${d.leftMaxW}`);
  });

  console.log('\n【间距 / ScienceMap】');
  console.log('视口        | t→d gap | d→a gap | descMt | actMt  | smW  | smH  | smMaxW      | overlap | nodeOverflow');
  console.log('------------|---------|---------|--------|--------|------|------|-------------|---------|-------------');
  results.forEach(d => {
    const ov = d.nodeOverflow.length > 0 ? `${d.nodeOverflow.length}个` : '无';
    console.log(`${d.viewport.padEnd(11)} | ${String(d.titleToDescGap).padEnd(7)} | ${String(d.descToActionsGap).padEnd(7)} | ${d.descMt.padEnd(6)} | ${d.actionsMt.padEnd(6)} | ${String(d.smContainerW).padEnd(4)} | ${String(d.smContainerH).padEnd(4)} | ${d.smContainerMaxW.padEnd(11)} | ${String(d.leftRightOverlap).padEnd(7)} | ${ov}`);
  });

  if (results.some(d => d.nodeOverflow.length > 0)) {
    console.log('\n【节点越界详情】');
    results.filter(d => d.nodeOverflow.length > 0).forEach(d => {
      console.log(`  ${d.viewport}:`);
      d.nodeOverflow.forEach(n => console.log(`    节点${n.i}: right=${n.right}px 容器right=${n.containerRight}px 溢出${n.overflow}px`));
    });
  }

  console.log('\n基线测量完成。');
}

main().catch(e => { console.error(e); process.exit(1); });
