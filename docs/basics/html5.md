# HTML5

> HTML 不只是标签——它是文档的语义层，影响 SEO、可访问性和组件化架构。

## 语义化标签

语义化的核心思想：**用正确的标签表达正确的含义**，而不是一切皆 `<div>`。

### 结构类标签

```html
<header>   <!-- 页眉，导航区域 -->
<nav>      <!-- 导航链接集合 -->
<main>     <!-- 页面主体内容（每页唯一） -->
<article>  <!-- 独立可复用的内容单元（博客文章、新闻条目）-->
<section>  <!-- 主题性内容分组 -->
<aside>    <!-- 侧边栏、补充信息 -->
<footer>   <!-- 页脚 -->
```

### 典型页面结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>页面标题</title>
</head>
<body>
  <header>
    <nav aria-label="主导航">
      <ul>
        <li><a href="/">首页</a></li>
        <li><a href="/about">关于</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <article>
      <h1>文章标题</h1>
      <section>
        <h2>第一节</h2>
        <p>内容...</p>
      </section>
    </article>

    <aside>
      <h2>相关阅读</h2>
    </aside>
  </main>

  <footer>
    <p>Copyright © 2026</p>
  </footer>
</body>
</html>
```

### 内容类标签

| 标签 | 用途 | 替代的错误用法 |
|------|------|----------------|
| `<figure>` + `<figcaption>` | 图片+说明 | `<div>` + `<p>` |
| `<time datetime="2026-03-17">` | 时间日期 | 纯文本 |
| `<mark>` | 高亮文本 | `<span style="background:yellow">` |
| `<details>` + `<summary>` | 折叠展开 | JS 手写 |
| `<dialog>` | 原生模态框 | `<div class="modal">` |
| `<meter>` | 量度值（磁盘用量）| `<div>` 模拟进度 |
| `<progress>` | 进度条 | `<div>` 模拟进度 |

```html
<!-- figure 示例 -->
<figure>
  <img src="chart.png" alt="2026年前端框架使用率图表">
  <figcaption>图1：2026年主流前端框架使用率</figcaption>
</figure>

<!-- details 折叠 -->
<details>
  <summary>查看更多详情</summary>
  <p>这里是隐藏的内容，点击展开。</p>
</details>

<!-- 原生 dialog -->
<dialog id="confirm-dialog">
  <h2>确认删除？</h2>
  <button onclick="this.closest('dialog').close()">取消</button>
  <button>确认</button>
</dialog>
<button onclick="document.getElementById('confirm-dialog').showModal()">打开</button>
```

## 可访问性（Accessibility / a11y）

可访问性不是额外工作，而是写好 HTML 的必然结果。

### ARIA 属性

```html
<!-- aria-label：为无文本元素提供标签 -->
<button aria-label="关闭对话框">✕</button>

<!-- aria-labelledby：引用其他元素作为标签 -->
<h2 id="dialog-title">确认删除</h2>
<dialog aria-labelledby="dialog-title">...</dialog>

<!-- aria-describedby：补充描述 -->
<input type="password" aria-describedby="pwd-hint">
<p id="pwd-hint">密码至少8位，包含字母和数字</p>

<!-- aria-live：动态内容通知屏幕阅读器 -->
<div aria-live="polite" aria-atomic="true">
  <!-- 内容变化时自动播报 -->
</div>

<!-- role：为非语义元素赋予角色 -->
<div role="alert">操作成功！</div>
<div role="tablist">
  <button role="tab" aria-selected="true">标签1</button>
  <button role="tab" aria-selected="false">标签2</button>
</div>
```

### 键盘可访问性

```html
<!-- 所有交互元素必须可通过 Tab 键聚焦 -->
<!-- 不要用 div 模拟按钮，用真正的 button -->

<!-- ❌ 错误 -->
<div onclick="submit()">提交</div>

<!-- ✅ 正确 -->
<button type="submit">提交</button>

<!-- 如果必须用非交互元素，添加 tabindex 和键盘事件 -->
<div
  role="button"
  tabindex="0"
  onclick="handleClick()"
  onkeydown="e.key === 'Enter' && handleClick()"
>
  点击我
</div>
```

### 颜色与对比度

- 正文文字对比度 ≥ **4.5:1**（WCAG AA 标准）
- 大号文字（18px+）对比度 ≥ **3:1**
- 不要仅靠颜色传达信息（色盲用户）

```html
<!-- ❌ 仅用颜色区分状态 -->
<span style="color: red">错误</span>

<!-- ✅ 颜色 + 图标/文字 -->
<span style="color: red">
  <svg aria-hidden="true"><!-- error icon --></svg>
  错误：请填写必填字段
</span>
```

## 表单最佳实践

```html
<form>
  <!-- 始终用 label 关联 input -->
  <label for="email">邮箱地址</label>
  <input
    type="email"
    id="email"
    name="email"
    autocomplete="email"
    required
    aria-required="true"
  >

  <!-- fieldset 对相关字段分组 -->
  <fieldset>
    <legend>联系方式</legend>
    <label>
      <input type="radio" name="contact" value="email"> 邮件
    </label>
    <label>
      <input type="radio" name="contact" value="phone"> 电话
    </label>
  </fieldset>

  <!-- 错误提示 -->
  <input
    type="text"
    aria-invalid="true"
    aria-describedby="name-error"
  >
  <span id="name-error" role="alert">姓名不能为空</span>
</form>
```

### HTML5 输入类型

```html
<input type="email">      <!-- 邮箱验证 + 移动端弹出邮箱键盘 -->
<input type="tel">        <!-- 移动端弹出数字键盘 -->
<input type="url">        <!-- URL 验证 -->
<input type="number" min="1" max="100" step="1">
<input type="range" min="0" max="100">
<input type="date">
<input type="datetime-local">
<input type="color">
<input type="search">     <!-- 自带清除按钮 -->
```

## Web Components

Web Components 是浏览器原生的组件封装方案，无需框架。

### Custom Elements

```javascript
class UserCard extends HTMLElement {
  // 监听属性变化
  static observedAttributes = ['name', 'avatar']

  constructor() {
    super()
    // 创建 Shadow DOM
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this.render()
  }

  render() {
    const name = this.getAttribute('name') || '匿名'
    const avatar = this.getAttribute('avatar') || ''

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          background: #f5f5f5;
        }
        img { width: 48px; height: 48px; border-radius: 50%; }
        .name { font-weight: bold; }
      </style>
      <img src="${avatar}" alt="${name} 的头像">
      <span class="name">${name}</span>
    `
  }
}

// 注册自定义元素
customElements.define('user-card', UserCard)
```

```html
<!-- 使用 -->
<user-card name="张三" avatar="https://example.com/avatar.jpg"></user-card>
```

### HTML Templates

```html
<!-- 模板不会渲染，只是定义结构 -->
<template id="card-template">
  <div class="card">
    <h3 class="card-title"></h3>
    <p class="card-desc"></p>
  </div>
</template>

<script>
const template = document.getElementById('card-template')
const clone = template.content.cloneNode(true)
clone.querySelector('.card-title').textContent = '标题'
document.body.appendChild(clone)
</script>
```

## 性能相关

### 资源加载优化

```html
<!-- 预连接到重要域名 -->
<link rel="preconnect" href="https://fonts.googleapis.com">

<!-- 预加载关键资源 -->
<link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>
<link rel="preload" href="/hero-image.webp" as="image">

<!-- 预获取下一页资源（低优先级） -->
<link rel="prefetch" href="/next-page.js">

<!-- 懒加载图片 -->
<img src="photo.jpg" loading="lazy" alt="...">

<!-- 异步/延迟脚本 -->
<script src="analytics.js" async></script>   <!-- 不阻塞，无顺序保证 -->
<script src="app.js" defer></script>          <!-- 不阻塞，DOM 解析后按顺序执行 -->
```

### 图片最佳实践

```html
<!-- 响应式图片 -->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="描述文字" width="800" height="600">
</picture>

<!-- 指定 width/height 防止布局偏移（CLS） -->
<img src="photo.jpg" width="400" height="300" alt="...">
```

## 延伸阅读

- [MDN Web Docs - HTML](https://developer.mozilla.org/zh-CN/docs/Web/HTML)
- [HTML Living Standard](https://html.spec.whatwg.org/)
- [WCAG 2.2 无障碍指南](https://www.w3.org/TR/WCAG22/)
- [web.dev - Accessible to all](https://web.dev/accessible/)
