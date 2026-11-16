import { defineConfig } from 'astro/config';

// 超智全球视野 — Astro 静态站点配置
//
// 设计说明：
// - output: 'static'（Astro 默认）保持纯静态生成，无后端 / SSR，符合内容优先 Blog 定位。
// - 暂不设置 site / base：当前仅负责前端开发，未来部署时再根据目标平台配置。
//   代码中所有内部链接统一通过 withBase()（基于 import.meta.env.BASE_URL）拼接，
//   本地开发 BASE_URL 默认为 '/'，部署时只需设置 base 即可全局生效，无需改动组件代码。
// - trailingSlash: 'ignore' 容忍链接末尾斜杠差异，减少本地与部署环境跳转问题。
// - 暂不集成任何集成（@astrojs/react / tailwind 等），遵循"最小必要依赖"原则。

export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // 静态产物输出目录，保持默认 dist/。
    format: 'directory',
  },
  devToolbar: {
    // 开发工具栏默认开启，便于调试；如需关闭可设为 false。
    enabled: true,
  },
});
