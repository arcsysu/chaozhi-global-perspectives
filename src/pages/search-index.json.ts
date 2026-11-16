/**
 * 搜索索引静态 JSON 端点 (/search-index.json)
 *
 * 构建时由 getSearchIndex() 生成静态 JSON 文件，前端原生 JS fetch 加载。
 * 索引仅含标题、摘要、发布时间、缩略图、文章 ID，不含正文。
 *
 * 内容隔离：
 * - 生产构建：仅已发布文章（approved + publishedAt），草稿和 Demo 不进入。
 * - 开发环境：额外包含 Demo 文章（标题前缀 [Demo]），供本地预览搜索。
 * - Demo 文章链接前缀为 /demo/，由前端根据标题前缀判断。
 */
import type { APIRoute } from 'astro';
import { getSearchIndex } from '@/utils/articles';

export const GET: APIRoute = async () => {
  const index = await getSearchIndex();
  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 静态索引可长期缓存，内容变更通过文件 hash 自动失效
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
