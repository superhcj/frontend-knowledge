import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '前端知识框架',
  description: '一份全面、系统、持续更新的前端工程师知识体系',
  lang: 'zh-CN',
  base: '/frontend-knowledge/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: '前端知识框架',

    nav: [
      { text: '首页', link: '/' },
      { text: '语言基础', link: '/basics/' },
      { text: '工程化', link: '/engineering/' },
      { text: '框架与库', link: '/frameworks/' },
      { text: '网络协议', link: '/network/' },
      { text: '性能优化', link: '/performance/' },
      { text: '测试质量', link: '/testing/' },
      { text: '前沿技术', link: '/advanced/' },
    ],

    sidebar: {
      '/basics/': [
        {
          text: '语言基础',
          items: [
            { text: '概览', link: '/basics/' },
            { text: 'HTML5', link: '/basics/html5' },
            { text: 'CSS3 & 现代布局', link: '/basics/css3' },
            { text: 'JavaScript 核心', link: '/basics/javascript' },
            { text: 'ES2015~ES2025 新特性', link: '/basics/es-modern' },
            { text: 'TypeScript', link: '/basics/typescript' },
          ],
        },
      ],
      '/engineering/': [
        {
          text: '工程化体系',
          items: [
            { text: '概览', link: '/engineering/' },
            { text: '构建工具', link: '/engineering/build-tools' },
            { text: '包管理', link: '/engineering/package-managers' },
            { text: '代码规范', link: '/engineering/code-quality' },
            { text: 'Monorepo', link: '/engineering/monorepo' },
            { text: 'CI/CD', link: '/engineering/cicd' },
          ],
        },
      ],
      '/frameworks/': [
        {
          text: '框架与库',
          items: [
            { text: '概览', link: '/frameworks/' },
            { text: 'React', link: '/frameworks/react' },
            { text: 'Vue 3', link: '/frameworks/vue3' },
            { text: 'Svelte & Solid.js', link: '/frameworks/svelte-solid' },
            { text: '状态管理', link: '/frameworks/state-management' },
            { text: '路由', link: '/frameworks/routing' },
          ],
        },
      ],
      '/network/': [
        {
          text: '网络与协议',
          items: [
            { text: '概览', link: '/network/' },
            { text: 'HTTP 全解析', link: '/network/http' },
            { text: 'WebSocket & SSE', link: '/network/websocket-sse' },
            { text: 'REST / GraphQL / tRPC', link: '/network/api-design' },
            { text: '浏览器安全', link: '/network/security' },
            { text: '缓存策略', link: '/network/caching' },
          ],
        },
      ],
      '/performance/': [
        {
          text: '性能与体验',
          items: [
            { text: '概览', link: '/performance/' },
            { text: 'Core Web Vitals', link: '/performance/cwv' },
            { text: '渲染模式', link: '/performance/rendering-modes' },
            { text: '优化手段', link: '/performance/optimization' },
            { text: 'PWA & Service Worker', link: '/performance/pwa' },
          ],
        },
      ],
      '/testing/': [
        {
          text: '测试与质量',
          items: [
            { text: '概览', link: '/testing/' },
            { text: '单元测试（Vitest）', link: '/testing/unit-testing' },
            { text: '组件测试', link: '/testing/component-testing' },
            { text: 'E2E 测试（Playwright）', link: '/testing/e2e' },
            { text: '可视化回归', link: '/testing/visual-regression' },
          ],
        },
      ],
      '/advanced/': [
        {
          text: '前沿与生态',
          items: [
            { text: '概览', link: '/advanced/' },
            { text: 'AI 辅助开发', link: '/advanced/ai-dev' },
            { text: 'WebAssembly', link: '/advanced/wasm' },
            { text: 'Edge Runtime', link: '/advanced/edge-runtime' },
            { text: '微前端', link: '/advanced/micro-frontends' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/superhcj/frontend-knowledge' },
    ],

    footer: {
      message: '持续更新中 · 欢迎贡献',
      copyright: 'Copyright © 2026',
    },

    editLink: {
      pattern: 'https://github.com/superhcj/frontend-knowledge/edit/master/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
    },
  },

  markdown: {
    lineNumbers: true,
  },

  ignoreDeadLinks: true,
})
