/**
 * 超智全球视野 — 分页工具
 *
 * 提供文章列表分页的通用逻辑：数据层切分、分页 URL 生成、页码序列计算。
 * 供首页、主题合集、年度归档、月度归档的 getStaticPaths 与页面渲染复用。
 *
 * 设计原则：
 * - 构建时静态分页：每个分页页面只渲染对应页的最多 PER_PAGE 篇文章。
 * - 第一页保留原有 URL（/、/topics/<tag>/ 等），后续页用 /page/<n>/ 后缀。
 * - 中文/空格/+ 等特殊标签：Astro getStaticPaths 的 params 自动处理编码，
 *   URL 生成时传入原始值即可，withBase 拼接 BASE_URL 兼容子路径部署。
 * - 不改变文章排序、筛选与 DEV/PROD 隔离逻辑（分页只对已查出的数组切片）。
 */

/** 每页文章数量上限 */
export const PER_PAGE = 10;

/**
 * 分页切片结果。
 * @property items  当前页的文章（已切片，最多 PER_PAGE 篇）
 * @property page   当前页码（从 1 开始）
 * @property total  文章总数
 * @property pages  总页数
 */
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  total: number;
  pages: number;
}

/**
 * 对文章数组进行分页切片。
 * @param all 完整文章数组（已排序、已筛选）
 * @param page 当前页码（从 1 开始；超出范围返回空 items）
 * @returns 分页结果（items/pages/total/page）
 */
export function paginate<T>(all: T[], page: number): PaginatedResult<T> {
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * PER_PAGE;
  const items = all.slice(start, start + PER_PAGE);
  return { items, page: safePage, total, pages };
}

/**
 * 计算需要为指定文章集合生成分页页面的页码列表。
 * 第一页由各页面原路由处理，此函数返回第 2 页及之后的页码。
 * @returns 需要生成的页码数组（如 [2, 3]），文章不足一页时返回空数组。
 */
export function getExtraPageNumbers(total: number): number[] {
  const pages = Math.ceil(total / PER_PAGE);
  if (pages <= 1) return [];
  const result: number[] = [];
  for (let p = 2; p <= pages; p++) result.push(p);
  return result;
}

// ────────────────────────────────────────────────────────────
// 分页 URL 生成
// ────────────────────────────────────────────────────────────

/**
 * 分页 URL 生成器：根据列表基础路径生成指定页码的 URL。
 *
 * 约定：
 * - page === 1 → 返回基础路径（保留原有 URL，如 /、/topics/<tag>/）
 * - page >= 2 → 在基础路径后插入 /page/<n>/（如 /page/2/、/topics/<tag>/page/2/）
 *
 * @param basePath 列表第一页的基础路径（不含 BASE_URL，以 / 开头，以 / 结尾）
 *                 例：'/'、'/topics/HPC/'、'/archive/2026/'、'/archive/2026/11/'
 * @param page     页码（从 1 开始）
 * @returns 已拼接 BASE_URL 的绝对路径（供 <a href> 直接使用）
 */
export function pageUrl(basePath: string, page: number): string {
  // 规范化 basePath：确保以 / 开头且以 / 结尾
  let base = basePath.startsWith('/') ? basePath : `/${basePath}`;
  if (!base.endsWith('/')) base += '/';

  if (page <= 1) return base;
  return `${base}page/${page}/`;
}

// ────────────────────────────────────────────────────────────
// 页码序列计算（分页导航用）
// ────────────────────────────────────────────────────────────

/** 页码序列条目类型：数字页码或省略号 */
export type PageItem = number | '...';

/**
 * 计算分页导航显示的页码序列。
 *
 * 规则（参考新闻网站分页）：
 * - 总页数 <= 1：返回空数组（不显示分页控件）
 * - 总页数 <= 7：显示全部页码
 * - 总页数 > 7：始终显示首尾页与当前页±1，其余用省略号折叠
 *
 * @param current 当前页码（从 1 开始）
 * @param pages   总页数
 * @returns 页码条目数组，如 [1, 2, 3, '...', 12]
 */
export function getPageItems(current: number, pages: number): PageItem[] {
  if (pages <= 1) return [];

  // 页数较少：全部显示
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }

  const items: PageItem[] = [];
  const first = 1;
  const last = pages;
  // 当前页附近的窗口（当前页±1）
  const winStart = Math.max(2, current - 1);
  const winEnd = Math.min(pages - 1, current + 1);

  items.push(first);

  // 首页与窗口之间是否需要省略号
  if (winStart > first + 1) {
    items.push('...');
  }

  // 窗口内的连续页码
  for (let p = winStart; p <= winEnd; p++) {
    items.push(p);
  }

  // 窗口与末页之间是否需要省略号
  if (winEnd < last - 1) {
    items.push('...');
  }

  items.push(last);
  return items;
}

/**
 * 分页导航所需的全量信息（供 Pagination.astro 组件使用）。
 */
export interface PaginationData {
  /** 当前页码（从 1 开始） */
  current: number;
  /** 总页数 */
  pages: number;
  /** 显示用的页码序列（含省略号） */
  items: PageItem[];
  /** 当前页文章总数 */
  total: number;
}
