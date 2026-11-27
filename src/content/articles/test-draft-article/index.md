---
title: 测试：草稿状态文章
summary: 用于验证 status='draft' 的公开文章不被 getPublishedArticles() 读取，但可在管理界面/测试中查询。此为公开 Collection 中的草稿测试文章。
tags:
  科学智能体: []
  项目:
    - 测试
  主体: []
  领域: []
articleSource: curated
status: draft
curatedAt: 2026-11-16T00:00:00+08:00
eventDate: 2026-11-16
sourceType: other
---

> **开发测试文章**：验证草稿状态过滤。此文章 status 为 draft，不应出现在公开文章列表中。

## 测试目的

验证 [`getPublishedArticles()`](src/utils/articles.ts:1) 的过滤逻辑：

1. **status='approved' 且 publishedAt 存在** → 出现在公开列表
2. **status='draft'** → 不出现在公开列表（即使有 publishedAt）
3. **status='approved' 但无 publishedAt** → 不出现在公开列表（Schema 会发出警告）

本文 status 为 `draft`，且未设置 `publishedAt`，因此不应被 `getPublishedArticles()` 返回。

## 后续处理

当此文章完成审核后，应：

1. 将 `status` 改为 `approved`
2. 补充 `publishedAt` 字段（ISO 8601 带时区）
3. 届时将出现在公开文章列表中
