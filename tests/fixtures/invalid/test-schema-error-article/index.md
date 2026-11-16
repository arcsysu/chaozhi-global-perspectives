---
title: ""
summary: ""
tags: []
articleSource: curated
status: draft
curatedAt: 2026-11-16T00:00:00+08:00
---

> **故意违反 Schema 的错误文章 — 用于验证 Zod 校验拦截能力。**
>
> 本文件 frontmatter 故意缺失 title、summary，且 tags 为空数组。
> 预期行为：若被 Content Collection 加载，Astro Content Layer 报 `InvalidContentEntryDataError`，
> 指出 title: Required、summary: Required、tags: 至少需要一个标签。
>
> **此文件放置在 `tests/fixtures/invalid/`，不在 Content Collection 的 glob 扫描范围内，
> 因此不会影响 `astro dev` / `astro build`。** 仅供人工或测试脚本单独引用验证 Schema 校验逻辑。

## 如何用于测试

1. **手动验证**：临时将本文件复制到 `src/content/_demo/` 下，运行 `astro dev`，观察控制台报错。
2. **脚本验证**：编写 Node 脚本，用 Zod schema 解析本文件 frontmatter，断言校验失败。
3. **验证后清理**：测试完毕务必从 `_demo/` 删除，避免阻塞开发服务器。
