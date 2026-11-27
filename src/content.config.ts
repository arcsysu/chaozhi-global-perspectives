/**
 * 超智全球视野 — 文章 Content Collections 定义
 *
 * 采用 Astro 5 Content Layer API + glob() loader + Zod Schema。
 *
 * 目录结构（每篇文章独立文件夹）：
 *   src/content/articles/<slug>/index.md          ← 公开文章
 *   src/content/_demo/<slug>/index.md             ← 本地 Demo（内部报告/测试，不发布）
 *
 * ID 冲突处理：
 *   glob() loader 默认用文件路径去扩展名作 ID，所有 index.md 会冲突（全为 "index"）。
 *   通过 generateId 取父文件夹名作为稳定 ID，避免冲突。
 *
 * 内容隔离：
 *   demo Collection 在生产构建（astro build / NODE_ENV=production）时 pattern 为空数组，
 *   不加载任何文件；开发时正常加载。配合 .gitignore 排除 _demo/ 目录，双重保障内部资料不外泄。
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ────────────────────────────────────────────────────────────
// 环境判定：生产构建时隔离 Demo 内容
// ────────────────────────────────────────────────────────────
const isProduction = import.meta.env.PROD;

// Demo 内容 pattern：生产为空（不加载），开发加载 _demo 下所有 md
const demoPattern = isProduction ? [] : ['**/*.md'];

// ────────────────────────────────────────────────────────────
// 共享 Schema 片段
// ────────────────────────────────────────────────────────────
// 日期时间字段：YAML frontmatter 会将 ISO 8601 字符串自动解析为 Date 对象，
// 因此使用 z.coerce.date() 同时接受字符串与 Date，统一输出 Date。
// Frontmatter 中应写带时区的 ISO 8601（如 2026-10-18T09:00:00+08:00）。
const isoDatetime = z.coerce.date({
  message: '日期需为带时区的 ISO 8601 格式，如 2026-10-18T09:00:00+08:00',
});

// ────────────────────────────────────────────────────────────
// 文章 Schema
// ────────────────────────────────────────────────────────────
const articleSchema = z
  .object({
    /** 文章标题（必填） */
    title: z.string().min(1, 'title 不能为空'),

    /** 摘要（必填） */
    summary: z.string().min(1, 'summary 不能为空'),

    /**
     * 分类标签：四键对象，空类别保留 []。
     * 类别顺序：科学智能体 → 项目跟踪 → 科学领域 → 实施主体。
     * 实施主体再分为：企业 / 超级计算机 / 研究机构 / 高校 / 政府机构 / 学会。
     * 至少一类（含实施主体任一子类）非空。
     */
    tags: z
      .object({
        科学智能体: z.array(z.string().min(1)).default([]),
        项目跟踪: z.array(z.string().min(1)).default([]),
        实施主体: z
          .object({
            企业: z.array(z.string().min(1)).default([]),
            超级计算机: z.array(z.string().min(1)).default([]),
            研究机构: z.array(z.string().min(1)).default([]),
            高校: z.array(z.string().min(1)).default([]),
            政府机构: z.array(z.string().min(1)).default([]),
            学会: z.array(z.string().min(1)).default([]),
          })
          .default({
            企业: [],
            超级计算机: [],
            研究机构: [],
            高校: [],
            政府机构: [],
            学会: [],
          }),
        科学领域: z.array(z.string().min(1)).default([]),
      })
      .refine(
        (t) => {
          const subjectCount =
            t.实施主体.企业.length +
            t.实施主体.超级计算机.length +
            t.实施主体.研究机构.length +
            t.实施主体.高校.length +
            t.实施主体.政府机构.length +
            t.实施主体.学会.length;
          return (
            t.科学智能体.length + t.项目跟踪.length + subjectCount + t.科学领域.length >= 1
          );
        },
        { message: '至少需要一个标签' },
      ),

    /** 文章来源类型：agent（AI Agent 生成）| curated（人工整理） */
    articleSource: z.enum(['agent', 'curated']).default('agent'),

    /** 状态：draft（草稿，默认）| approved（已审核） */
    status: z.enum(['draft', 'approved']).default('draft'),

    /**
     * Agent 标识：articleSource='agent' 时必填。
     * 记录生成文章的 Agent 名称/版本，便于追溯。
     * 人工整理文章不得填写此字段，避免虚构 AI 生成记录。
     */
    agent: z
      .string()
      .min(1)
      .optional(),

    /**
     * Agent 生成时间（ISO 8601 带时区）。
     * articleSource='agent' 时必填，表示 Agent 生成该文章的时刻。
     * 注意：这是文章生成时间，不是发布时间，也不得与原始事件发生时间混淆。
     */
    generatedAt: isoDatetime.optional(),

    /**
     * 人工整理时间（ISO 8601 带时区）。
     * articleSource='curated' 时必填，表示人工整理/编译该材料的实际时间。
     */
    curatedAt: isoDatetime.optional(),

    /**
     * 发布时间（ISO 8601 带时区，可选）。
     * 公开读取接口仅返回 status='approved' 且 publishedAt 存在的文章。
     * 草稿通常无此字段；approved 文章须由审核流程补充。
     */
    publishedAt: isoDatetime.optional(),

    /**
     * 原始事件/资料的发生日期（ISO 8601 date，仅日期，可选）。
     * 用于记录所报道事件的实际发生日期，与网站发布时间严格区分。
     */
    eventDate: z.coerce.date().optional(),

    /** 封面图（可选）：相对文章文件夹的路径，如 images/cover.webp */
    coverImage: z.string().optional(),

    /** 原始资料来源类型（人工整理文章用）：如 report / press-release / docx 等 */
    sourceType: z
      .enum(['report', 'press-release', 'docx', 'web', 'other'])
      .optional(),

    /** 是否为内部参考资料（仅 Demo 用，公开文章不应设置） */
    internal: z.boolean().default(false),
  })
  // 跨字段校验：区分 agent / curated 的必填字段
  .superRefine((data, ctx) => {
    if (data.articleSource === 'agent') {
      if (!data.agent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['agent'],
          message: 'Agent 生成文章必须填写 agent 标识',
        });
      }
      if (!data.generatedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['generatedAt'],
          message: 'Agent 生成文章必须填写 generatedAt（生成时间）',
        });
      }
      if (data.curatedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['curatedAt'],
          message: 'Agent 生成文章不应填写 curatedAt',
        });
      }
    }

    if (data.articleSource === 'curated') {
      if (data.agent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['agent'],
          message: '人工整理文章不得填写 agent，避免虚构 AI 生成记录',
        });
      }
      if (data.generatedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['generatedAt'],
          message: '人工整理文章不应填写 generatedAt',
        });
      }
      if (!data.curatedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['curatedAt'],
          message: '人工整理文章必须填写 curatedAt（整理时间）',
        });
      }
    }

    // approved 文章建议有 publishedAt（公开读取依赖此项）
    if (data.status === 'approved' && !data.publishedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publishedAt'],
        message: '已审核文章缺少 publishedAt，将无法被公开读取（仅警告，不阻断校验）',
      });
    }
  });

// ────────────────────────────────────────────────────────────
// generateId：取父文件夹名作为稳定 ID，解决多个 index.md 冲突
// ────────────────────────────────────────────────────────────
// Astro glob loader 调用签名为 generateId({ entry, base, data })，
// entry 为相对 base 的路径字符串，形如 "my-article/index.md"。
function generateId({ entry }: { entry: string; base: URL; data: unknown }): string {
  const parts = entry.replace(/\\/g, '/').split('/').filter(Boolean);
  let last = parts[parts.length - 1] ?? entry;
  last = last.replace(/\.(md|mdx)$/i, '');
  if (last.toLowerCase() === 'index' && parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return last;
}

// ────────────────────────────────────────────────────────────
// 公开文章 Collection（可提交、可发布）
// ────────────────────────────────────────────────────────────
const articles = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/articles',
    generateId,
  }),
  schema: articleSchema,
});

// ────────────────────────────────────────────────────────────
// 本地 Demo Collection（内部报告/测试，生产构建不加载）
// ────────────────────────────────────────────────────────────
const demo = defineCollection({
  loader: glob({
    pattern: demoPattern,
    base: './src/content/_demo',
    generateId,
  }),
  schema: articleSchema,
});

export const collections = { articles, demo };
