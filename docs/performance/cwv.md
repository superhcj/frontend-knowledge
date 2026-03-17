# Core Web Vitals

> Google 将用户体验量化成了指标。理解 CWV，才能知道优化什么、如何度量效果。

## 三大核心指标（2024 版）

| 指标 | 全称 | 衡量 | 良好 | 需改进 | 差 |
|------|------|------|------|--------|-----|
| **LCP** | Largest Contentful Paint | 加载性能 | ≤2.5s | 2.5~4s | >4s |
| **INP** | Interaction to Next Paint | 交互响应 | ≤200ms | 200~500ms | >500ms |
| **CLS** | Cumulative Layout Shift | 视觉稳定性 | ≤0.1 | 0.1~0.25 | >0.25 |

:::tip INP 替代 FID
2024年3月，**INP**（Interaction to Next Paint）正式替代 FID（First Input Delay）成为核心指标。INP 更全面地衡量整个页面生命周期中的所有交互响应，而不只是第一次。
:::

## LCP（最大内容绘制）

LCP 测量视口内**最大可见元素**完成渲染的时间。

### 哪些元素会被计算？

- `<img>` 元素
- `<image>` inside `<svg>`
- `<video>` 的 poster 图片
- CSS `background-image`（通过 `url()` 加载）
- 包含文本的块级元素

### 影响 LCP 的因素

```
LCP 时间 = 资源加载延迟 + 资源加载时间 + 元素渲染延迟

1. 服务器响应时间慢（TTFB 高）
2. 渲染阻塞资源（CSS、JS）
3. 资源加载时间（图片过大、没有 CDN）
4. 客户端渲染（CSR 框架延迟渲染）
```

### 优化策略

```html
<!-- 1. 预加载 LCP 图片 -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

<!-- 2. 给 LCP 图片设置 fetchpriority -->
<img src="/hero.webp" fetchpriority="high" alt="Hero">

<!-- 3. 避免懒加载 LCP 图片 -->
<!-- ❌ -->
<img src="/hero.webp" loading="lazy">
<!-- ✅ -->
<img src="/hero.webp" loading="eager">
```

```javascript
// 4. 使用 Server-Side Rendering（SSR/SSG）
// 避免 CSR 延迟，HTML 直接包含 LCP 元素

// 5. 图片格式优化
// WebP 比 JPEG 小 25-35%，AVIF 比 WebP 小 20%
```

## INP（交互到下次绘制）

INP 测量用户**点击、键盘输入、触摸**等交互后，到浏览器下次绘制的时间。

```
INP = 事件处理时间 + 主线程阻塞时间 + 渲染更新时间
```

### 诊断高 INP

```javascript
// 使用 PerformanceObserver 监测
const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 200) {
      console.warn(`慢交互: ${entry.name}, 耗时: ${entry.duration}ms`)
    }
  }
})
observer.observe({ type: 'event', buffered: true, durationThreshold: 200 })
```

### 优化策略

```javascript
// 1. 分解长任务（Long Task > 50ms）
// ❌ 阻塞主线程
function processLargeData(data) {
  // 同步处理 10000 条数据
  return data.map(item => heavyTransform(item))
}

// ✅ 使用 scheduler.yield() 让出主线程
async function processLargeData(data) {
  const results = []
  for (let i = 0; i < data.length; i++) {
    results.push(heavyTransform(data[i]))
    // 每处理 100 条让出一次主线程
    if (i % 100 === 0) await scheduler.yield()
  }
  return results
}

// 2. Web Worker：将计算密集型任务移出主线程
const worker = new Worker('/heavy-worker.js')
worker.postMessage({ data: largeData })
worker.onmessage = e => setResult(e.data)

// 3. 使用 useTransition 降低更新优先级（React）
const [isPending, startTransition] = useTransition()
startTransition(() => {
  setExpensiveState(newValue)
})

// 4. 防抖输入处理
import { useDeferredValue } from 'react'
const deferredQuery = useDeferredValue(query) // 自动延迟
```

## CLS（累积布局偏移）

CLS 测量页面生命周期中**意外布局偏移的累积分数**。

### 布局偏移来源

```html
<!-- 1. 没有尺寸的图片（最常见！）-->
<!-- ❌ 加载完才知道大小，撑开页面 -->
<img src="photo.jpg" alt="">

<!-- ✅ 指定宽高，浏览器预留空间 -->
<img src="photo.jpg" width="800" height="600" alt="">

<!-- 或用 CSS aspect-ratio -->
<style>
img { aspect-ratio: 4/3; width: 100%; }
</style>
```

```css
/* 2. 字体加载替换（FOUT/FOIT）*/
/* ❌ 字体替换时文字重排 */
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2');
  /* 默认 font-display: auto */
}

/* ✅ 使用 font-display: optional 或 swap + size-adjust */
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2');
  font-display: optional; /* 超时则不替换 */
}

/* 或：使用 size-adjust 减少替换时的偏移 */
@font-face {
  font-family: 'FallbackFont';
  src: local('Arial');
  size-adjust: 105%; /* 调整回退字体大小以匹配目标字体 */
}
```

```javascript
// 3. 动态插入内容
// ❌ 在内容上方插入广告/通知，导致内容下移
document.body.prepend(adBanner)

// ✅ 预留空间，或在内容下方插入
// 预留固定高度的占位符
<div style={{ minHeight: '100px' }}>
  {adLoaded && <AdBanner />}
</div>
```

## 测量工具

### 实验室数据 vs 真实数据

| 工具 | 类型 | 场景 |
|------|------|------|
| Lighthouse | 实验室 | 开发阶段，快速诊断 |
| Chrome DevTools Performance | 实验室 | 深入分析 |
| WebPageTest | 实验室 | 多地区、多设备测试 |
| CrUX（Chrome UX Report）| 真实 | 真实用户数据 |
| Search Console | 真实 | 整站健康度 |
| web-vitals.js | 真实 | 自建监控 |

### web-vitals.js 集成监控

```javascript
// npm install web-vitals
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals'

function sendToAnalytics(metric) {
  // 发送到你的分析平台
  navigator.sendBeacon('/analytics', JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    id: metric.id,
    navigationType: metric.navigationType,
  }))
}

onLCP(sendToAnalytics)
onINP(sendToAnalytics)
onCLS(sendToAnalytics)
onFCP(sendToAnalytics)
onTTFB(sendToAnalytics)
```

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      https://example.com/
      https://example.com/blog
    budgetPath: ./budget.json
    uploadArtifacts: true

# budget.json
[{
  "path": "/*",
  "resourceSizes": [{ "resourceType": "total", "budget": 500 }],
  "timings": [
    { "metric": "largest-contentful-paint", "budget": 2500 },
    { "metric": "cumulative-layout-shift", "budget": 0.1 }
  ]
}]
```

## 延伸阅读

- [web.dev - Core Web Vitals](https://web.dev/vitals/)
- [Chrome CrUX Dashboard](https://lookerstudio.google.com/s/lFlAfl7MF5w)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [web-vitals GitHub](https://github.com/GoogleChrome/web-vitals)
