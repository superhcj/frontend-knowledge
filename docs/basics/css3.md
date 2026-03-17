# CSS3 & 现代布局

> CSS 已经不只是"样式"，它是一套完整的布局引擎、动画系统和设计语言。

## Flexbox

Flexbox 解决**一维布局**（行或列）。

```css
.container {
  display: flex;
  flex-direction: row;        /* row | row-reverse | column | column-reverse */
  justify-content: center;    /* 主轴对齐 */
  align-items: center;        /* 交叉轴对齐 */
  gap: 16px;                  /* 间距（替代 margin hack）*/
  flex-wrap: wrap;            /* 允许换行 */
}

.item {
  flex: 1;                    /* flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
  flex: 0 0 200px;            /* 固定宽度，不伸缩 */
  align-self: flex-start;     /* 单独覆盖交叉轴对齐 */
  order: 2;                   /* 调整顺序（不影响 DOM）*/
}
```

### 常用场景

```css
/* 水平垂直居中（终极方案）*/
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 导航栏：左边 logo，右边菜单 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 卡片等宽布局，自动换行 */
.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}
.card {
  flex: 1 1 280px; /* 最小 280px，超出自动换行 */
  max-width: 400px;
}
```

## Grid

Grid 解决**二维布局**（行 + 列）。

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);   /* 3 列等宽 */
  grid-template-rows: auto;
  gap: 24px;
}

/* 响应式列数 */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
```

### 区域命名布局

```css
.layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main    main"
    "footer footer footer";
  grid-template-columns: 240px 1fr 1fr;
  grid-template-rows: 64px 1fr 48px;
  min-height: 100vh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

### 跨行跨列

```css
.feature-card {
  grid-column: 1 / 3;    /* 跨 2 列 */
  grid-row: 1 / 3;       /* 跨 2 行 */
  /* 简写 */
  grid-column: span 2;
}
```

## CSS 自定义属性（变量）

```css
/* 定义：推荐在 :root 定义全局变量 */
:root {
  --color-primary: #646cff;
  --color-text: #213547;
  --color-bg: #ffffff;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --radius-md: 8px;
  --font-size-base: 16px;
}

/* 暗色主题覆盖 */
[data-theme="dark"] {
  --color-text: #ffffffde;
  --color-bg: #1a1a2e;
}

/* 使用 */
.button {
  background: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  /* 提供回退值 */
  color: var(--color-button-text, #ffffff);
}

/* JavaScript 中读写 */
```

```javascript
// 读取
const primary = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary')

// 动态修改
document.documentElement.style.setProperty('--color-primary', '#ff6464')
```

## 层叠层（@layer）

CSS 2022 新特性，彻底解决样式优先级混乱问题。

```css
/* 声明层的顺序（越后越高优先级）*/
@layer reset, base, components, utilities;

@layer reset {
  * { box-sizing: border-box; margin: 0; }
}

@layer base {
  body { font-family: system-ui, sans-serif; }
  h1 { font-size: 2rem; }
}

@layer components {
  .btn {
    padding: 8px 16px;
    border-radius: 4px;
  }
}

/* utilities 层最高，覆盖一切 */
@layer utilities {
  .mt-4 { margin-top: 16px !important; }
}
```

## 容器查询（Container Queries）

比媒体查询更灵活：**组件根据容器大小响应**，而不是视口。

```css
/* 1. 声明容器 */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* 2. 容器查询 */
@container card (min-width: 400px) {
  .card {
    display: flex;
    flex-direction: row;
  }
}

@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}
```

## 现代选择器

```css
/* :is() - 简化选择器列表 */
:is(h1, h2, h3, h4) {
  line-height: 1.2;
}

/* :where() - 与 :is() 类似，但优先级为 0 */
:where(.card, .panel, .box) {
  border-radius: 8px;
}

/* :has() - 父选择器（划时代！）*/
/* 包含 img 的 figure，给它加边框 */
figure:has(img) {
  border: 1px solid #ddd;
}

/* 表单有焦点输入框时，高亮标签 */
.form-group:has(input:focus) label {
  color: var(--color-primary);
}

/* :not() - 排除 */
li:not(:last-child) {
  border-bottom: 1px solid #eee;
}

/* 嵌套（原生 CSS 嵌套，无需 Sass！）*/
.card {
  padding: 16px;

  & .title {
    font-size: 1.25rem;
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  @media (max-width: 768px) {
    padding: 12px;
  }
}
```

## 动画

### Transition

```css
.button {
  background: var(--color-primary);
  /* property duration timing-function delay */
  transition: background 0.2s ease, transform 0.1s ease;
}

.button:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
}

/* 只对特定属性过渡 */
.smooth-all {
  transition: all 0.3s ease; /* ⚠️ 性能差，避免用 */
}
```

### Keyframe Animation

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-text {
  animation: fadeInUp 0.6s ease forwards;
}

/* 多阶段 */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.05); }
}

.badge {
  animation: pulse 2s ease-in-out infinite;
}
```

### 尊重用户的减少动画偏好

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 响应式设计

### 现代断点策略

```css
/* 移动优先（推荐）*/
.container {
  padding: 16px;
  max-width: 100%;
}

@media (min-width: 640px) {   /* sm */
  .container { padding: 24px; }
}

@media (min-width: 768px) {   /* md */
  .container { max-width: 768px; margin: 0 auto; }
}

@media (min-width: 1024px) {  /* lg */
  .container { max-width: 1024px; }
}

@media (min-width: 1280px) {  /* xl */
  .container { max-width: 1280px; }
}
```

### clamp() 流体排版

```css
/* clamp(最小值, 推荐值, 最大值) */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem); /* 随视口流畅缩放 */
}

.container {
  padding: clamp(16px, 5vw, 48px);
  width: min(100% - 32px, 1200px); /* 现代居中方案 */
  margin-inline: auto;
}
```

## 性能优化

```css
/* 开启 GPU 合成层，优化动画 */
.animated {
  will-change: transform, opacity; /* 仅在需要时使用，不要滥用 */
}

/* 优先动画 transform 和 opacity（不触发重排重绘）*/
/* ✅ */
.move { transform: translateX(100px); }
.fade { opacity: 0; }

/* ❌ 触发重排，性能差 */
.bad  { left: 100px; width: 200px; }

/* content-visibility：跳过屏幕外内容的渲染 */
.article {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* 预估高度，防止滚动条跳动 */
}
```

## 延伸阅读

- [MDN - CSS](https://developer.mozilla.org/zh-CN/docs/Web/CSS)
- [CSS Tricks - Flexbox 完整指南](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Tricks - Grid 完整指南](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [web.dev - Learn CSS](https://web.dev/learn/css/)
- [State of CSS 年度调查](https://stateofcss.com/)
