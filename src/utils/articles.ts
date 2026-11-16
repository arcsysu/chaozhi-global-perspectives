/**
 * 超智全球视野 — 文章数据读取工具
 *
 * 提供可复用的文章查询接口，供后续页面（首页列表、主题、时间树、详情页）调用。
 *
 * 核心原则：
 * - 公开读取接口（getPublished*）只返回 status='approved' 且 publishedAt 存在的文章。
 * - 草稿（draft）和缺少发布时间的文章不进入公开查询。
 * - Demo 内容（内部报告）仅开发环境可读，生产构建不加载（由 content.config.ts 门控）。
 * - 按发布时间倒序排序。
 *
 * 缩略图策略：
 * - 优先使用 frontmatter coverImage（相对文章文件夹的路径）。
 * - 否则渲染 Markdown 正文，提取首个 <img> 的 src 作为首图。
 * - 无图则 coverImage 为 null，列表采用纯文字布局。
 * - 图片路径统一通过 withBase() 拼接 BASE_URL，兼容 GitHub Pages 子路径。
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import { withBase } from './site';

// ────────────────────────────────────────────────────────────
// 类型定义
// ────────────────────────────────────────────────────────────
export type ArticleEntry = CollectionEntry<'articles'>;
export type DemoEntry = CollectionEntry<'demo'>;

/** 公开文章的精简元数据（列表用） */
export interface ArticleMeta {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  /** 发布时间（ISO 8601 UTC 字符串） */
  publishedAt: string;
  /**
   * 缩略图（已拼接 BASE_URL 的绝对路径，供 <img src> 直接使用）。
   * 优先 frontmatter coverImage；否则提取正文首图；无图则为 null。
   */
  coverImage: string | null;
  articleSource: 'agent' | 'curated';
  /** Agent 生成时间或人工整理时间（ISO UTC 字符串），用于列表显示 */
  sourceTime: string;
}

/** 标签统计节点（主题页用） */
export interface TagStat {
  tag: string;
  count: number;
}

/** 归档树节点 */
export interface ArchiveYearNode {
  year: string;
  months: Array<{ month: string; count: number; articleIds: string[] }>;
  count: number;
}

// ────────────────────────────────────────────────────────────
// 内部辅助
// ────────────────────────────────────────────────────────────

/**
 * 判断文章是否符合公开发布条件：
 * status='approved' 且 publishedAt 存在。
 */
function isPublished(entry: ArticleEntry): boolean {
  return entry.data.status === 'approved' && !!entry.data.publishedAt;
}

/**
 * 从 Markdown 源码中提取首张图片的 URL。
 * 匹配 Markdown 图片语法 ![alt](url)，不依赖 HTML 渲染，轻量且可靠。
 * - 跳过代码块（``` 包裹）内的伪图片语法。
 * - 支持 alt 中含 ] 的边缘情况（非贪婪匹配）。
 * 返回的 url 可能是相对路径或绝对 URL。
 */
function extractFirstImageSrc(markdown: string): string | null {
  if (!markdown) return null;
  // 按行分割，跳过代码块（``` 或 ~~~ 包裹）内的内容
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    // 匹配 ![alt](url)，url 不含空白
    const imgMatch = line.match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
    if (imgMatch) return imgMatch[1];
  }
  return null;
}

/**
 * 解析缩略图路径：
 * - 绝对 URL（http/https）直接返回。
 * - 相对路径（如 images/cover.svg）需拼接文章资源前缀 + BASE_URL。
 * Astro 将文章文件夹内的资源 import 后会生成带 hash 的绝对路径，
 * 但 frontmatter 中的字符串路径需手动处理。
 */
function resolveCoverImage(
  coverImage: string | null | undefined,
  firstImageSrc: string | null,
  articleId: string,
): string | null {
  const raw = coverImage ?? firstImageSrc;
  if (!raw) return null;
  // 绝对 URL 直接使用
  if (/^https?:\/\//i.test(raw)) return raw;
  // 以 / 开头的站点绝对路径，拼 BASE_URL
  if (raw.startsWith('/')) return withBase(raw);
  // 相对路径：拼接到文章资源路径
  // 注意：静态构建时文章图片需通过 import 或 public 目录访问。
  // 此处统一用 /articles/<id>/<path> 形式，配合文章图片放置在 content 目录内的场景。
  return withBase(`/articles/${articleId}/${raw.replace(/^\.\//, '')}`);
}

/**
 * 将 CollectionEntry 转为精简元数据（不含缩略图渲染，需调用 getThumbnailedArticles）。
 */
function toMeta(entry: ArticleEntry): ArticleMeta {
  const sourceTime =
    entry.data.articleSource === 'agent'
      ? (entry.data.generatedAt as Date | undefined)?.toISOString() ?? ''
      : (entry.data.curatedAt as Date | undefined)?.toISOString() ?? '';
  return {
    id: entry.id,
    title: entry.data.title,
    summary: entry.data.summary,
    tags: entry.data.tags,
    // isPublished 已保证 publishedAt 存在；Date → ISO 字符串
    publishedAt: (entry.data.publishedAt as Date).toISOString(),
    coverImage: resolveCoverImage(entry.data.coverImage, null, entry.id),
    articleSource: entry.data.articleSource,
    sourceTime,
  };
}

// ────────────────────────────────────────────────────────────
// 公开读取接口
// ────────────────────────────────────────────────────────────

/**
 * 读取全部已发布文章元数据，按发布时间倒序。
 * 仅返回 approved + 有 publishedAt 的文章；草稿与无发布时间的文章被排除。
 * publishedAt 相等时以 id 升序作为次级排序，保证顺序稳定。
 */
export async function getPublishedArticles(): Promise<ArticleMeta[]> {
  const entries = await getCollection('articles', isPublished);
  return entries
    .map(toMeta)
    .sort((a, b) => {
      if (a.publishedAt !== b.publishedAt) {
        return a.publishedAt < b.publishedAt ? 1 : -1; // 倒序：新在前
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; // id 升序次级排序
    });
}

/**
 * 按 ID 读取单篇已发布文章（含完整 CollectionEntry，供详情页渲染正文）。
 * 若文章不存在或未发布（草稿/无 publishedAt），返回 null。
 */
export async function getArticleById(
  id: string,
): Promise<ArticleEntry | null> {
  const entries = await getCollection('articles', isPublished);
  return entries.find((e) => e.id === id) ?? null;
}

/**
 * 获取指定文章的上一篇和下一篇（按 publishedAt 倒序相邻）。
 * publishedAt 相等时以 id 升序作为次级排序，保证相邻关系稳定。
 * 第一篇无上一篇，最后一篇无下一篇，对应字段为 null。
 * 仅在已发布文章序列中导航，不混入 Demo。
 */
export async function getAdjacentArticles(
  id: string,
): Promise<{ prev: ArticleMeta | null; next: ArticleMeta | null }> {
  const articles = await getPublishedArticles(); // 已按 publishedAt 倒序
  const index = articles.findIndex((a) => a.id === id);
  if (index === -1) return { prev: null, next: null };
  // 倒序数组中：index-1 是更早的文章（下一篇），index+1 是更新的文章（上一篇）
  return {
    prev: index < articles.length - 1 ? articles[index + 1] : null,
    next: index > 0 ? articles[index - 1] : null,
  };
}

/**
 * 聚合全部已发布文章的标签，返回去重后的标签数组。
 * 标签自由增长，不预设、不硬编码。
 */
export async function getAllTags(): Promise<string[]> {
  const articles = await getPublishedArticles();
  const tagSet = new Set<string>();
  for (const a of articles) {
    for (const t of a.tags) tagSet.add(t);
  }
  return [...tagSet].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/**
 * 按标签筛选已发布文章，按发布时间倒序。
 */
export async function getArticlesByTag(tag: string): Promise<ArticleMeta[]> {
  const articles = await getPublishedArticles();
  return articles.filter((a) => a.tags.includes(tag));
}

/**
 * 按年份筛选已发布文章，按发布时间倒序。
 */
export async function getArticlesByYear(year: string): Promise<ArticleMeta[]> {
  const articles = await getPublishedArticles();
  return articles.filter((a) => {
    const d = new Date(a.publishedAt);
    return !Number.isNaN(d.getTime()) && String(d.getUTCFullYear()) === year;
  });
}

/**
 * 按年份+月份筛选已发布文章，按发布时间倒序。
 * month 格式为两位数字符串，如 "01"、"10"。
 */
export async function getArticlesByYearMonth(
  year: string,
  month: string,
): Promise<ArticleMeta[]> {
  const articles = await getPublishedArticles();
  return articles.filter((a) => {
    const d = new Date(a.publishedAt);
    return (
      !Number.isNaN(d.getTime()) &&
      String(d.getUTCFullYear()) === year &&
      String(d.getUTCMonth() + 1).padStart(2, '0') === month
    );
  });
}

/**
 * 生成时间归档树：按年 → 月 分组，每级含文章数量与 ID 列表。
 * 依据 publishedAt（ISO 8601 带时区）解析年月。
 */
export async function getArchiveTree(): Promise<ArchiveYearNode[]> {
  const articles = await getPublishedArticles();
  const tree = new Map<string, Map<string, string[]>>();

  for (const a of articles) {
    // publishedAt 形如 "2026-10-18T09:00:00+08:00"
    const date = new Date(a.publishedAt);
    if (Number.isNaN(date.getTime())) continue;
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');

    if (!tree.has(year)) tree.set(year, new Map());
    const yearNode = tree.get(year)!;
    if (!yearNode.has(month)) yearNode.set(month, []);
    yearNode.get(month)!.push(a.id);
  }

  const result: ArchiveYearNode[] = [];
  for (const [year, months] of [...tree.entries()].sort((a, b) =>
    a[0] < b[0] ? 1 : -1,
  )) {
    const monthList = [...months.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([month, ids]) => ({
        month,
        count: ids.length,
        articleIds: ids,
      }));
    result.push({
      year,
      months: monthList,
      count: monthList.reduce((sum, m) => sum + m.count, 0),
    });
  }
  return result;
}

// ────────────────────────────────────────────────────────────
// Demo 读取接口（仅开发环境有效，生产返回空）
// ────────────────────────────────────────────────────────────

/**
 * 读取全部 Demo 文章（内部报告/测试），供本地开发验证。
 * 生产构建时 demo Collection 不加载任何文件，此函数返回空数组。
 */
export async function getDemoArticles(): Promise<DemoEntry[]> {
  try {
    return await getCollection('demo');
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────
// 缩略图增强列表接口
// ────────────────────────────────────────────────────────────

/**
 * 读取全部已发布文章（含缩略图），按发布时间倒序。
 * 缩略图策略：coverImage 优先；否则渲染正文提取首图；无图返回 null。
 * 注意：渲染正文开销较大，仅在需要缩略图的列表页使用。
 */
export async function getThumbnailedArticles(): Promise<ArticleMeta[]> {
  const entries = await getCollection('articles', isPublished);
  const metas: ArticleMeta[] = [];
  for (const entry of entries) {
    let coverImage = resolveCoverImage(entry.data.coverImage, null, entry.id);
    // 无 coverImage 时从 Markdown 正文提取首图
    if (!coverImage) {
      const firstImg = extractFirstImageSrc(entry.body ?? '');
      if (firstImg) {
        coverImage = resolveCoverImage(null, firstImg, entry.id);
      }
    }
    const baseMeta = toMeta(entry);
    metas.push({ ...baseMeta, coverImage });
  }
  return metas.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

// ────────────────────────────────────────────────────────────
// 主题聚合接口
// ────────────────────────────────────────────────────────────

/**
 * 聚合全部已发布文章的标签，返回带文章数量的标签统计列表。
 * 按文章数量降序排列，同数量按标签名称排序（中文 localeCompare）。
 */
export async function getTagStats(): Promise<TagStat[]> {
  const articles = await getPublishedArticles();
  const counts = new Map<string, number>();
  for (const a of articles) {
    for (const t of a.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

// ────────────────────────────────────────────────────────────
// Demo 预览接口（仅开发环境有效）
// ────────────────────────────────────────────────────────────

/** Demo 文章的精简元数据（预览列表用，结构与 ArticleMeta 一致） */
export interface DemoArticleMeta {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  /** 整理时间或生成时间（ISO UTC 字符串） */
  sourceTime: string;
  coverImage: string | null;
  articleSource: 'agent' | 'curated';
  status: 'draft' | 'approved';
  internal: boolean;
}

/**
 * 读取全部 Demo 文章元数据（含缩略图），供本地预览路由使用。
 * 生产构建时返回空数组（demo Collection 不加载）。
 * sourceTime 相等时以 id 升序作为次级排序，保证顺序稳定。
 */
export async function getDemoArticleMetas(): Promise<DemoArticleMeta[]> {
  const entries = await getDemoArticles();
  const metas: DemoArticleMeta[] = [];
  for (const entry of entries) {
    let coverImage = resolveCoverImage(entry.data.coverImage, null, entry.id);
    if (!coverImage) {
      const firstImg = extractFirstImageSrc(entry.body ?? '');
      if (firstImg) {
        coverImage = resolveCoverImage(null, firstImg, entry.id);
      }
    }
    const sourceTime =
      entry.data.articleSource === 'agent'
        ? (entry.data.generatedAt as Date | undefined)?.toISOString() ?? ''
        : (entry.data.curatedAt as Date | undefined)?.toISOString() ?? '';
    metas.push({
      id: entry.id,
      title: entry.data.title,
      summary: entry.data.summary,
      tags: entry.data.tags,
      sourceTime,
      coverImage,
      articleSource: entry.data.articleSource,
      status: entry.data.status,
      internal: entry.data.internal,
    });
  }
  return metas.sort((a, b) => {
    if (a.sourceTime !== b.sourceTime) {
      return a.sourceTime < b.sourceTime ? 1 : -1; // 倒序：新在前
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; // id 升序次级排序
  });
}

/**
 * 按 ID 读取单篇 Demo 文章（含完整 CollectionEntry，供预览详情页渲染正文）。
 * 生产环境返回 null。
 */
export async function getDemoArticleById(
  id: string,
): Promise<DemoEntry | null> {
  const entries = await getDemoArticles();
  return entries.find((e) => e.id === id) ?? null;
}

/**
 * 获取指定 Demo 文章的上一篇和下一篇（按 sourceTime 倒序相邻）。
 * sourceTime 相等时以 id 升序作为次级排序，保证相邻关系稳定。
 * 仅开发环境有效，生产返回 { prev: null, next: null }。
 */
export async function getAdjacentDemoArticles(
  id: string,
): Promise<{ prev: DemoArticleMeta | null; next: DemoArticleMeta | null }> {
  const demos = await getDemoArticleMetas(); // 已按 sourceTime 倒序
  const index = demos.findIndex((d) => d.id === id);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index < demos.length - 1 ? demos[index + 1] : null,
    next: index > 0 ? demos[index - 1] : null,
  };
}

// ────────────────────────────────────────────────────────────
// 搜索索引接口
// ────────────────────────────────────────────────────────────

/** 搜索索引条目（构建时生成静态 JSON） */
export interface SearchIndexEntry {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  coverImage: string | null;
}

/**
 * 生成标题搜索用的静态索引数据。
 * 仅包含已发布文章（草稿和 Demo 不进入公开搜索索引）。
 * 开发环境额外包含 Demo 文章（明确标记），供本地预览搜索。
 */
export async function getSearchIndex(): Promise<SearchIndexEntry[]> {
  const articles = await getThumbnailedArticles();
  const index = articles.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    publishedAt: a.publishedAt,
    coverImage: a.coverImage,
  }));

  // 开发环境追加 Demo 文章到搜索索引（生产构建 demo 为空，自动隔离）
  if (import.meta.env.DEV) {
    const demos = await getDemoArticleMetas();
    for (const d of demos) {
      index.push({
        id: d.id,
        title: `[Demo] ${d.title}`,
        summary: d.summary,
        publishedAt: d.sourceTime,
        coverImage: d.coverImage,
      });
    }
  }

  return index;
}
