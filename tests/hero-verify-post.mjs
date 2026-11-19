/**
 * 首页 Hero 区域优化后验证 + 截图
 *
 * 测量 10 视口下 Hero 的量化指标（与基线对比），
 * 同时截取每个视口的 Hero 区域截图用于视觉检查。
 */
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import { join } from 'path';

const require = createRequire('/home/gyy/.npm/_npx/e41f203b7505f1fb/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
const SHOT_DIR = join(process.cwd(), 'tests', 'hero-screenshots');

const VIEWPORTS = [
  { width: 1920, height: 1080, label: '1920' },
  { width: 1600, height: 900, label: '1600' },
  { width: 1536, height: 864, label: '1536' },
  { width: 1440, height: 900, label: '1440' },
  { width: 1366, height: 768, label: '1366' },
  { width: 1280, height: 720, label: '1280' },
  { width: 1024, height: 768, label: '1024' },
  { width: 768, height: 1024, label: '768' },
  { width: 390, height: 844, label: '390' },
  { width: 320, height: 568, label: '320' },
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
    const smNodes = document.querySelectorAll('.science-map__node');

    const cs = (el) => el ? getComputedStyle(el) : null;
    const r = (el) => el ? el.getBoundingClientRect() : null;

    data.heroH = Math.round(r(hero).height);
    data.innerW = Math.round(r(inner).width);
    data.gap = cs(inner).gap;
    data.paddingBlock = cs(inner).paddingBlock;
    data.leftW = Math.round(r(left).width);
    data.rightW = Math.round(r(right).width);

    data.titleFs = cs(title).fontSize;
    data.titleLh = cs(title).lineHeight;
    data.titleW = Math.round(r(title).width);
    data.titleH = Math.round(r(title).height);
    data.titleLine1H = Math.round(r(titleLine1).height);
    data.titleLine2H = Math.round(r(titleLine2).height);

    const titleRect = r(title);
    const descRect = r(desc);
    const actionsRect = r(actions);
    data.titleToDescGap = Math.round(descRect.top - titleRect.bottom);
    data.descToActionsGap = Math.round(actionsRect.top - descRect.bottom);
    data.descMt = cs(desc).marginTop;
    data.actionsMt = cs(actions).marginTop;

    data.smContainerW = Math.round(r(smContainer).width);
    data.smContainerH = Math.round(r(smContainer).height);

    // 节点越界检测
    data.nodeOverflow = [];
    if (smContainer) {
      const cRect = r(smContainer);
      smNodes.forEach((node, i) => {
        const nr = r(node);
        if (nr.right > cRect.right + 2) {
          data.nodeOverflow.push({ i, overflow: Math.round(nr.right - cRect.right) });
        }
      });
    }

    data.leftRightOverlap = r(left).right > r(right).left + 1;

    // 横向滚动检测
    const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    data.scrollOverflow = scrollW > document.documentElement.clientWidth + 2 ? scrollW - document.documentElement.clientWidth : 0;

    return data;
  });
}

async function main() {
  mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vw of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vw.width, height: vw.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const data = await measureHero(page);
    results.push({ viewport: vw.label, vw: vw.width, ...data });

    // 截取 Hero 区域截图
    const heroEl = await page.$('.home-hero');
    if (heroEl) {
      await heroEl.screenshot({ path: join(SHOT_DIR, `hero-${vw.label}.png`) });
    }
    await context.close();
  }

  await browser.close();

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('  首页 Hero 优化后量化验证（10 视口）');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('【标题 / 间距】（对比基线）');
  console.log('视口  | titleFs   | titleH | t→d gap | d→a gap | descMt    | actMt     | heroH');
  console.log('------|-----------|--------|---------|---------|-----------|-----------|------');
  results.forEach(d => {
    console.log(`${d.viewport.padEnd(5)} | ${d.titleFs.padEnd(9)} | ${String(d.titleH).padEnd(6)} | ${String(d.titleToDescGap).padEnd(7)} | ${String(d.descToActionsGap).padEnd(7)} | ${d.descMt.padEnd(9)} | ${d.actionsMt.padEnd(9)} | ${d.heroH}`);
  });

  console.log('\n【布局 / ScienceMap / 越界】');
  console.log('视口  | innerW | leftW | rightW | gap    | padBlock           | smW  | smH  | overlap | scrollOv | nodeOv');
  console.log('------|--------|-------|--------|--------|--------------------|------|------|---------|----------|-------');
  results.forEach(d => {
    const ov = d.nodeOverflow.length > 0 ? `${d.nodeOverflow.length}个` : '无';
    console.log(`${d.viewport.padEnd(5)} | ${String(d.innerW).padEnd(6)} | ${String(d.leftW).padEnd(5)} | ${String(d.rightW).padEnd(6)} | ${d.gap.padEnd(6)} | ${d.paddingBlock.padEnd(18)} | ${String(d.smContainerW).padEnd(4)} | ${String(d.smContainerH).padEnd(4)} | ${String(d.leftRightOverlap).padEnd(7)} | ${String(d.scrollOverflow).padEnd(8)} | ${ov}`);
  });

  if (results.some(d => d.nodeOverflow.length > 0)) {
    console.log('\n【节点越界详情】');
    results.filter(d => d.nodeOverflow.length > 0).forEach(d => {
      console.log(`  ${d.viewport}: ${JSON.stringify(d.nodeOverflow)}`);
    });
  }

  console.log(`\n截图已保存至: ${SHOT_DIR}/`);
  console.log('优化后验证完成。');
}

main().catch(e => { console.error(e); process.exit(1); });
