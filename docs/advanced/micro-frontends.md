# 微前端

> 微前端是将微服务思想应用到前端的架构模式，解决大型团队、大型应用的协作问题。

## 什么时候需要微前端

```
❌ 不需要微前端的场景：
- 小型团队（< 5人）
- 单一业务线
- 技术栈统一
- 没有遗留系统集成需求

✅ 适合微前端的场景：
- 多个团队独立开发、独立部署
- 需要集成遗留系统（jQuery/AngularJS）
- 大型平台型产品（超级 App）
- 技术栈差异化需求
```

## 核心方案对比

| 方案 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| Module Federation | Webpack 运行时共享模块 | 性能好、原生支持 | 需要 Webpack 5 |
| qiankun / single-spa | JS 沙箱 + 路由劫持 | 生态好、兼容性强 | 性能开销较大 |
| iframe | 原生隔离 | 完全隔离、简单 | 体验差、通信复杂 |
| Web Components | 自定义元素封装 | 框架无关 | 学习成本、兼容性 |
| Vite + 模块联邦 | @originjs/vite-plugin-federation | Vite 生态 | 相对不成熟 |

## Module Federation（Webpack 5）

运行时动态加载远程模块，是目前最主流的微前端方案。

### Host（主应用）

```javascript
// webpack.config.js - 主应用
const { ModuleFederationPlugin } = require('webpack').container

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        // 远程应用：名称 → 远程地址
        userApp: 'userApp@http://localhost:3001/remoteEntry.js',
        orderApp: 'orderApp@http://localhost:3002/remoteEntry.js',
        analyticsApp: 'analyticsApp@http://cdn.example.com/analytics/remoteEntry.js',
      },
      shared: {
        // 共享依赖，避免重复加载
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        'react-router-dom': { singleton: true },
      },
    }),
  ],
}
```

```typescript
// 主应用中使用远程模块
import { lazy, Suspense } from 'react'

// 动态导入远程组件
const UserModule = lazy(() => import('userApp/UserDashboard'))
const OrderModule = lazy(() => import('orderApp/OrderList'))

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/users/*"
          element={
            <Suspense fallback={<Loading />}>
              <UserModule />
            </Suspense>
          }
        />
        <Route
          path="/orders/*"
          element={
            <Suspense fallback={<Loading />}>
              <OrderModule />
            </Suspense>
          }
        />
      </Routes>
    </Router>
  )
}
```

### Remote（子应用）

```javascript
// webpack.config.js - 子应用（用户模块）
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'userApp',
      filename: 'remoteEntry.js',   // 暴露的入口文件
      exposes: {
        // 对外暴露的模块
        './UserDashboard': './src/pages/UserDashboard',
        './UserCard': './src/components/UserCard',
        './useUser': './src/hooks/useUser',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
  devServer: { port: 3001 }
}
```

## qiankun

基于 single-spa 的完整微前端框架，国内使用广泛。

### 主应用

```typescript
// 主应用入口
import { registerMicroApps, start } from 'qiankun'

registerMicroApps([
  {
    name: 'user-app',
    entry: '//localhost:7100',
    container: '#micro-container',
    activeRule: '/user',
    props: {
      // 传递给子应用的数据
      token: getToken(),
      onGlobalEvent: handleGlobalEvent,
    },
  },
  {
    name: 'order-app',
    entry: '//localhost:7200',
    container: '#micro-container',
    activeRule: '/order',
  },
], {
  beforeLoad: app => console.log('before load', app.name),
  afterMount: app => console.log('after mount', app.name),
})

// 启动
start({
  prefetch: 'all',      // 预加载所有子应用
  sandbox: {
    strictStyleIsolation: true, // Shadow DOM 样式隔离
    experimentalStyleIsolation: true,
  },
})
```

### 子应用改造

```typescript
// 子应用入口（以 React 为例）
// src/index.ts

let root: ReactDOM.Root | null = null

function render(props?: any) {
  const { container } = props || {}
  const dom = container
    ? container.querySelector('#root')
    : document.getElementById('root')

  root = ReactDOM.createRoot(dom!)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// 独立运行时直接渲染
if (!window.__POWERED_BY_QIANKUN__) {
  render()
}

// qiankun 生命周期钩子
export async function bootstrap() {
  console.log('user-app bootstrapped')
}

export async function mount(props: any) {
  render(props)
}

export async function unmount() {
  root?.unmount()
  root = null
}
```

```javascript
// webpack.config.js - 子应用打包为 UMD
output: {
  library: 'userApp',
  libraryTarget: 'umd',
  publicPath: '//localhost:7100/',
},
```

## 微前端通信

```typescript
// 方案 1：基于事件总线（跨框架通用）
class MicroEventBus {
  private events = new Map<string, Set<Function>>()

  emit(event: string, data: unknown) {
    this.events.get(event)?.forEach(fn => fn(data))
  }

  on(event: string, fn: Function) {
    if (!this.events.has(event)) this.events.set(event, new Set())
    this.events.get(event)!.add(fn)
    return () => this.off(event, fn)
  }

  off(event: string, fn: Function) {
    this.events.get(event)?.delete(fn)
  }
}

// 挂载到全局，所有子应用共享
window.__eventBus = new MicroEventBus()

// 子应用发布事件
window.__eventBus.emit('user:login', { userId: 123 })

// 另一个子应用订阅
const unsubscribe = window.__eventBus.on('user:login', ({ userId }) => {
  loadUserOrders(userId)
})

// 方案 2：共享状态（qiankun initGlobalState）
import { initGlobalState } from 'qiankun'

const actions = initGlobalState({ user: null, theme: 'light' })

// 主应用修改状态
actions.setGlobalState({ user: currentUser })

// 子应用监听
export async function mount(props) {
  props.onGlobalStateChange((state, prev) => {
    if (state.user !== prev.user) updateUserInfo(state.user)
  }, true) // true = 立即触发一次
}
```

## 样式隔离

```css
/* 方案 1：CSS Modules / BEM 命名约定 */
.user-app__header { }
.user-app__nav { }

/* 方案 2：Shadow DOM（完全隔离）*/
/* qiankun 的 strictStyleIsolation 选项 */

/* 方案 3：CSS-in-JS（天然隔离）*/
/* styled-components / emotion 生成唯一类名 */
```

## 性能最佳实践

```javascript
// 1. 共享核心依赖（避免重复加载 React 等大库）
shared: {
  react: { singleton: true, eager: true },
}

// 2. 按需激活（不用的子应用不加载）
activeRule: (location) => location.pathname.startsWith('/user')

// 3. 预加载空闲时间加载
prefetch: 'all'  // 或 ['user-app']

// 4. 子应用独立部署，使用 CDN
entry: 'https://cdn.example.com/user-app/index.html'
```

## 延伸阅读

- [Module Federation 官方文档](https://webpack.js.org/concepts/module-federation/)
- [qiankun 官方文档](https://qiankun.umijs.org/zh)
- [Micro Frontends - Martin Fowler](https://martinfowler.com/articles/micro-frontends.html)
- [single-spa 文档](https://single-spa.js.org/)
