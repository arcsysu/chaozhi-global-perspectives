import { defineConfig } from 'astro/config';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ────────────────────────────────────────────────────────────
// 文章图片复制 / 开发态静态映射（零第三方依赖）
//
// frontmatter 的 coverImage 按约定解析为 /articles/<slug>/<path>
// （见 src/utils/articles.ts 的 resolveCoverImage），但 Astro 静态构建
// 不会自动把 src/content/ 下的文件复制进 dist。此集成：
// 1) 构建完成后把每篇文章 images/ 复制到 dist/articles/<slug>/images/
// 2) 开发服务器把 /articles/<slug>/images/* 映射回 src/content/articles/
// ────────────────────────────────────────────────────────────
const MIME_BY_EXT = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

function copyArticleImages() {
  const articlesRoot = fileURLToPath(new URL('./src/content/articles/', import.meta.url));

  return {
    name: 'copy-article-images',
    hooks: {
      'astro:config:setup': ({ updateConfig, logger }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'serve-article-images-dev',
                configureServer(server) {
                  server.middlewares.use((req, res, next) => {
                    const rawUrl = req.url?.split('?')[0] ?? '';
                    const match = rawUrl.match(/^\/articles\/([^/]+)\/images\/(.+)$/);
                    if (!match) return next();

                    const slug = decodeURIComponent(match[1]);
                    const relPath = decodeURIComponent(match[2]);
                    // 禁止路径穿越：只允许读 articles/<slug>/images 下的文件
                    const imagesRoot = path.resolve(articlesRoot, slug, 'images');
                    const filePath = path.resolve(imagesRoot, relPath);
                    if (!filePath.startsWith(imagesRoot + path.sep) && filePath !== imagesRoot) {
                      res.statusCode = 403;
                      res.end('Forbidden');
                      return;
                    }
                    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
                      return next();
                    }

                    const ext = path.extname(filePath).toLowerCase();
                    res.setHeader('Content-Type', MIME_BY_EXT[ext] ?? 'application/octet-stream');
                    res.setHeader('Cache-Control', 'no-cache');
                    createReadStream(filePath).pipe(res);
                  });
                  logger.info('Dev middleware: /articles/<slug>/images/* → src/content/articles');
                },
              },
            ],
          },
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const articlesRootUrl = new URL('./src/content/articles/', import.meta.url);
        const outDir = dir.href.endsWith('/') ? dir : new URL(`${dir.href}/`);
        let copied = 0;
        for (const entry of await readdir(articlesRootUrl, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          try {
            await cp(
              new URL(`./${entry.name}/images/`, articlesRootUrl),
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
