/**
 * 超智全球视野 — 站点元数据与导航配置
 *
 * 集中管理站点信息与导航项，Header / Nav / Footer 共享同一数据源，
 * 避免硬编码重复，便于后续维护与扩展。
 */

export interface SiteMeta {
  /** 网站名称 */
  name: string;
  /** 英文方向 */
  taglineEn: string;
  /** 宣传语 */
  slogan: string;
  /** 团队 */
  team: string;
  /** 英文副标识 */
  direction: string;
  /** 简短品牌介绍（导航栏展示） */
  brief: string;
  /** 微信公众号（关于页展示） */
  wechatAccount: string;
  /** 描述（用于 meta） */
  description: string;
}

export interface NavItem {
  /** 显示名称 */
  label: string;
  /** 路径（相对根，不含 base，运行时拼接 BASE_URL） */
  path: string;
  /** 匹配当前页面的前缀（用于高亮判断），默认同 path */
  matchPrefix?: string;
}

export const site: SiteMeta = {
  name: '超智全球视野',
  taglineEn: 'HPC + AI for Science',
  slogan: '立足全球视野，洞察超智前沿',
  team: 'YatCC',
  direction: 'HPC + AI for Science',
  brief: 'HPC + AI for Science 前沿观察',
  wechatAccount: '超智全球视野',
  description:
    '超智全球视野 — YatCC 团队围绕 HPC + AI for Science 前沿观察计划建设的科技信息展示平台。',
};

/** 主导航栏目（顺序即展示顺序） */
export const navItems: NavItem[] = [
  { label: '首页', path: '/', matchPrefix: '/' },
  { label: '主题', path: '/topics/', matchPrefix: '/topics' },
  { label: '时间树', path: '/archive/', matchPrefix: '/archive' },
  { label: '关于我们', path: '/about/', matchPrefix: '/about' },
];

/**
 * 拼接 BASE_URL 兼容路径。
 * 本地开发 base 为 '/'，生产部署到 GitHub Pages 子路径时
 * 通过 astro.config.mjs 的 base 自动生效，无需改组件代码。
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
