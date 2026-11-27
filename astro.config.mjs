import { defineConfig } from 'astro/config';
import { cp, readdir } from 'node:fs/promises';

// ────────────────────────────────────────────────────────────
// 文章图片复制集成（零第三方依赖）
//
// frontmatter 的 coverImage 按约定解析为 /articles/<slug>/<path>
// （见 src/utils/articles.ts 的 resolveCoverImage），但 Astro 静态构建
// 不会自动把 src/content/ 下的文件复制进 dist。此集成在构建完成后将每篇
// 文章文件夹内的 images/ 复制到 dist/articles/<slug>/images/，
// 使线上封面路径可访问。
// ────────────────────────────────────────────────────────────
function copyArticleImages() {
  return {
    name: 'copy-article-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const articlesRoot = new URL('./src/content/articles/', import.meta.url);
        const outDir = dir.href.endsWith('/') ? dir : new URL(`${dir.href}/`);
        let copied = 0;
        for (const entry of await readdir(articlesRoot, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          try {
            await cp(
              new URL(`./${entry.name}/images/`, articlesRoot),
              new URL(`./articles/${entry.name}/images/`, outDir),
              { recursive: true },
            );
            copied++;
          } catch (err) {
            // 无 images/ 目录的文章属正常情况，跳过；其余错误照常抛出
            if (err.code !== 'ENOENT') throw err;
          }
        }
        logger.info(`Copied images for ${copied} article(s) into dist/articles/`);
      },
    },
  };
}

// 超智全球视野 — Astro 静态站点配置
//
// 设计说明：
// - output: 'static'（Astro 默认）保持纯静态生成，无后端 / SSR，符合内容优先 Blog 定位。
// - 暂不设置 site / base：当前仅负责前端开发，未来部署时再根据目标平台配置。
//   代码中所有内部链接统一通过 withBase()（基于 import.meta.env.BASE_URL）拼接，
//   本地开发 BASE_URL 默认为 '/'，部署时只需设置 base 即可全局生效，无需改动组件代码。
// - trailingSlash: 'ignore' 容忍链接末尾斜杠差异，减少本地与部署环境跳转问题。
// - 不引入第三方集成（@astrojs/react / tailwind 等），仅内置一个零依赖的
//   构建钩子 copyArticleImages，用于把文章图片复制进静态产物。

export default defineConfig({
  output: 'static',
  integrations: [copyArticleImages()],
  trailingSlash: 'ignore',
  build: {
    // 静态产物输出目录，保持默认 dist/。
    format: 'directory',
  },
  devToolbar: {
    // 开发工具栏默认开启，便于调试；如需关闭可设为 false。
    enabled: true,
  },
  site: 'https://insight.yatcc-ai.com',
  base: '/',
});
