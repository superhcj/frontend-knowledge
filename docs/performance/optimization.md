# 性能优化手段

> 优化要有数据驱动，先测量后优化。没有 Profile 的优化是猜测。

## 测量先行

```javascript
// Performance API
const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.log(entry.name, entry.duration)
  }
})
observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'longtask'] })

// 标记自定义性能点
performance.mark('myFeature-start')
// ... 执行代码
performance.mark('myFeature-end')
performance.measure('myFeature', 'myFeature-start', 'myFeature-end')
const measures = performance.getEntriesByName('myFeature')
console.log(measures[0].duration) // ms
```

## 代码分割与懒加载

### 路由级代码分割

```typescript
// React Router + lazy
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings  = lazy(() => import('./pages/Settings'))
const Reports   = lazy(() => import('./pages/Reports'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Dashboard />
          </Suspense>
        ),
      },
    ],
  },
])
```

### 组件级懒加载

```typescript
// 按条件懒加载
const HeavyChart = lazy(() => import('./HeavyChart'))
const VideoPlayer = lazy(() => import('./VideoPlayer'))

function App() {
  const [showChart, setShowChart] = useState(false)

  return (
    <div>
      <button onClick={() => setShowChart(true)}>显示图表</button>
      {showChart && (
        <Suspense fallback={<Skeleton height={400} />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  )
}

// 预加载（鼠标悬停时提前加载）
function NavItem({ to, component: Component }) {
  const preload = () => import('./pages/Dashboard') // 触发加载

  return (
    <Link to={to} onMouseEnter={preload}>
      Dashboard
    </Link>
  )
}
```

### Intersection Observer 懒加载

```typescript
// 进入视口才渲染
function LazySection({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' } // 提前 200px 开始加载
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref}>
      {visible ? children : <Skeleton />}
    </div>
  )
}
```

## 图片优化

```html
<!-- 1. 现代格式（AVIF > WebP > JPEG/PNG）-->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="..." width="800" height="600" loading="lazy">
</picture>

<!-- 2. 响应式图片 -->
<img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  alt="..."
>

<!-- 3. 首屏图片：高优先级，不懒加载 -->
<img src="hero.webp" fetchpriority="high" loading="eager" alt="Hero">

<!-- 4. 非首屏图片：懒加载 -->
<img src="below-fold.jpg" loading="lazy" alt="...">
```

```css
/* 5. 防止布局偏移 */
img {
  aspect-ratio: 16/9;
  width: 100%;
  object-fit: cover;
}
```

## 虚拟列表

渲染 10000 条数据，只渲染可视区域内的 DOM：

```typescript
// @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualTable({ rows }: { rows: Row[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,  // 预估行高
    overscan: 5,             // 视口外多渲染 5 行（缓冲）
  })

  return (
    <div
      ref={parentRef}
      style={{ height: '600px', overflow: 'auto' }}
    >
      {/* 占位撑开滚动高度 */}
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
              width: '100%',
            }}
          >
            <TableRow row={rows[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 防抖与节流

```typescript
// 防抖（Debounce）：最后一次触发后延迟执行
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 节流（Throttle）：固定频率执行
function throttle<T extends (...args: any[]) => any>(fn: T, interval: number) {
  let lastTime = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn(...args)
    }
  }
}

// React 场景：
// 搜索框输入 → 防抖（等用户停止输入）
const handleSearch = useMemo(
  () => debounce((query: string) => search(query), 300),
  []
)

// 滚动事件 → 节流（限制频率）
const handleScroll = useMemo(
  () => throttle(() => updateScrollPosition(), 100),
  []
)
```

## Web Worker

将 CPU 密集型计算移到后台线程，不阻塞 UI：

```javascript
// worker.js
self.onmessage = function(e) {
  const { data, type } = e.data

  if (type === 'SORT_LARGE_ARRAY') {
    const sorted = [...data].sort((a, b) => a - b)
    self.postMessage({ type: 'SORTED', result: sorted })
  }
}

// 主线程
const worker = new Worker('/worker.js')

worker.postMessage({ type: 'SORT_LARGE_ARRAY', data: largeArray })
worker.onmessage = e => {
  if (e.data.type === 'SORTED') {
    setSortedData(e.data.result)
  }
}

// React Hook 封装
function useWorker(workerUrl: string) {
  const workerRef = useRef<Worker>()

  useEffect(() => {
    workerRef.current = new Worker(workerUrl)
    return () => workerRef.current?.terminate()
  }, [workerUrl])

  return workerRef.current
}
```

## Bundle 分析与优化

```bash
# 分析包大小
npm run build
# Vite + rollup-plugin-visualizer
npx vite-bundle-visualizer

# 检查是否引入了过大的库
npx bundlephobia-cli lodash  # 查看 lodash 大小
```

```typescript
// 常见优化

// 1. 按需导入（Tree-shaking）
import { debounce } from 'lodash-es'     // ✅ 只引入 debounce
import _ from 'lodash'                    // ❌ 全量引入

// 2. 用轻量替代品
// date-fns 替代 moment（小 10 倍）
// day.js 替代 moment（2KB vs 72KB）
import dayjs from 'dayjs'

// 3. 动态导入大型库
async function exportToPdf() {
  const { jsPDF } = await import('jspdf')  // 只在用时加载
  const doc = new jsPDF()
  // ...
}

// 4. 利用 CDN externals（从 CDN 加载，不打入 bundle）
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: { react: 'React', 'react-dom': 'ReactDOM' }
      }
    }
  }
})
```

## 延伸阅读

- [web.dev - 性能优化](https://web.dev/performance/)
- [Chrome DevTools - Performance 面板](https://developer.chrome.com/docs/devtools/performance/)
- [@tanstack/react-virtual](https://tanstack.com/virtual)
- [Bundlephobia](https://bundlephobia.com/) — 查看 npm 包大小
