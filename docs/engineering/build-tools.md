# 构建工具

> 构建工具的核心职责：模块打包、代码转换、开发体验。选对工具，事半功倍。

## 现代构建工具全景

```
开发阶段                    生产阶段
─────────────────────────────────────────
Vite (推荐)      ──→  Rollup（内置）
Webpack 5        ──→  Webpack
Parcel           ──→  Parcel
Turbopack        ──→  Turbopack（Rust）
esbuild          ──→  esbuild（Golang，极快）
Rollup           ──→  Rollup（库打包首选）
```

## Vite

Vite 是目前前端开发体验最好的构建工具，核心思路：
- **开发时**：基于原生 ES Module，按需编译，无需打包
- **生产时**：Rollup 打包，输出优化后的产物

### 快速上手

```bash
# 创建项目
npm create vite@latest my-app -- --template react-ts
# 或 vue-ts / vanilla-ts / svelte-ts

cd my-app && npm install && npm run dev
```

### vite.config.ts 核心配置

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // 代码分割策略
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash-es', 'date-fns'],
        },
      },
    },
    // 小于此大小的资源内联为 base64
    assetsInlineLimit: 4096,
  },

  // 环境变量前缀（默认 VITE_）
  envPrefix: 'VITE_',
})
```

### 环境变量

```bash
# .env                # 所有环境
# .env.local          # 本地，不提交 git
# .env.development    # 开发环境
# .env.production     # 生产环境

VITE_API_BASE_URL=https://api.example.com
VITE_APP_TITLE=My App
```

```typescript
// 使用
const apiUrl = import.meta.env.VITE_API_BASE_URL
const isDev = import.meta.env.DEV
const isProd = import.meta.env.PROD

// TypeScript 类型补全
// env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
}
```

### 性能优化技巧

```typescript
// 1. 按需导入（Tree-shaking）
import { debounce } from 'lodash-es' // ✅ ESM，支持 tree-shaking
import _ from 'lodash'               // ❌ CJS，全量引入

// 2. 动态导入（代码分割）
const HeavyComponent = lazy(() => import('./HeavyComponent'))

// 3. 预构建依赖（加快首次加载）
export default defineConfig({
  optimizeDeps: {
    include: ['lodash-es'],  // 预构建，加速 HMR
    exclude: ['my-local-lib']
  }
})

// 4. 分析包大小
// npm i -D rollup-plugin-visualizer
import { visualizer } from 'rollup-plugin-visualizer'
export default defineConfig({
  plugins: [visualizer({ open: true, gzipSize: true })]
})
```

## Webpack 5

老牌打包工具，生态最丰富，大型项目仍广泛使用。

### webpack.config.js 核心配置

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development'

  return {
    entry: './src/index.ts',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isDev ? '[name].js' : '[name].[contenthash:8].js',
      clean: true,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: { '@': path.resolve(__dirname, 'src') },
    },

    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          use: 'babel-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
          ],
        },
        {
          test: /\.(png|svg|jpg|webp)$/,
          type: 'asset',  // Webpack 5 内置，无需 file-loader
          parser: { dataUrlCondition: { maxSize: 4 * 1024 } },
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({ template: './public/index.html' }),
      !isDev && new MiniCssExtractPlugin({
        filename: 'css/[name].[contenthash:8].css',
      }),
    ].filter(Boolean),

    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
          },
        },
      },
    },

    devServer: {
      port: 3000,
      hot: true,
      historyApiFallback: true,
    },
  }
}
```

### Webpack vs Vite

| 维度 | Webpack 5 | Vite |
|------|-----------|------|
| 开发启动 | 慢（全量打包） | 极快（按需编译） |
| HMR | 慢（随项目增大） | 极快（ESM + HMR） |
| 生态 | 极丰富 | 快速成长 |
| 配置复杂度 | 高 | 低 |
| 生产构建 | 灵活 | 基于 Rollup |
| 适合场景 | 大型遗留项目、需要复杂 loader | 新项目、大多数场景 |

## Rollup

专为**库**打包而设计，输出干净，Tree-shaking 效果最好。

```javascript
// rollup.config.js
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import dts from 'rollup-plugin-dts'

const external = ['react', 'react-dom'] // 不打包进产物

export default [
  // 主包（ESM + CJS）
  {
    input: 'src/index.ts',
    external,
    plugins: [resolve(), commonjs(), typescript()],
    output: [
      { file: 'dist/index.esm.js', format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs.js', format: 'cjs', sourcemap: true },
    ],
  },
  // 类型声明文件
  {
    input: 'src/index.ts',
    external,
    plugins: [dts()],
    output: { file: 'dist/index.d.ts', format: 'esm' },
  },
]
```

## esbuild

Go 编写，构建速度是 Webpack 的 10-100 倍，常用作 Vite 的依赖预构建。

```javascript
// 单独使用（适合简单场景/CI 脚本）
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  target: 'es2020',
  format: 'esm',
  outfile: 'dist/bundle.js',
  external: ['react', 'react-dom'],
})
```

## Babel

代码转换工具，将新语法编译为旧语法。

```json
// babel.config.json
{
  "presets": [
    ["@babel/preset-env", {
      "targets": "> 0.5%, last 2 versions, not dead",
      "useBuiltIns": "usage",
      "corejs": 3
    }],
    ["@babel/preset-react", { "runtime": "automatic" }],
    "@babel/preset-typescript"
  ],
  "plugins": [
    "@babel/plugin-proposal-decorators"
  ]
}
```

:::tip
在 Vite 项目中，TypeScript 由 esbuild 处理（仅移除类型，不做类型检查），类型检查由 `tsc --noEmit` 单独进行。
:::

## PostCSS

CSS 的 Babel，插件生态强大。

```javascript
// postcss.config.js
export default {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {},             // 自动添加浏览器前缀
    'postcss-preset-env': {         // 使用未来 CSS 语法
      stage: 3,
      features: { 'nesting-rules': true }
    },
    'cssnano': process.env.NODE_ENV === 'production' ? {} : false, // 压缩
  }
}
```

## 延伸阅读

- [Vite 官方文档](https://vitejs.dev/)
- [Webpack 文档](https://webpack.js.org/)
- [Rollup 文档](https://rollupjs.org/)
- [esbuild 文档](https://esbuild.github.io/)
- [2024 前端工具链调查](https://stateofjs.com/)
