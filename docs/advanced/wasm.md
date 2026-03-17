# WebAssembly

> WebAssembly 让 C/C++/Rust 等语言运行在浏览器里，速度接近原生，解锁了 JavaScript 无法胜任的计算场景。

## 什么是 WebAssembly

WebAssembly（Wasm）是一种低级**二进制指令格式**，专为浏览器设计：
- **高性能**：接近原生速度（比 JS 快 10-100 倍在计算密集型任务）
- **安全**：运行在沙箱中，与 JS 共享内存隔离
- **跨语言**：Rust、C/C++、Go、AssemblyScript 都能编译到 Wasm

```
应用场景：
- 图像/视频处理（ffmpeg.wasm、Sharp）
- 音频处理（Audacity 移植）
- 游戏引擎（Unity、Godot）
- 密码学运算（加解密、哈希）
- 科学计算（物理模拟、机器学习推理）
- PDF 生成（pdf.js）
- 代码编辑器语言服务（VS Code WASM）
```

## 在 JavaScript 中使用 Wasm

### 加载现有 Wasm 模块

```javascript
// 方式 1：fetch + WebAssembly.instantiateStreaming（推荐）
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/module.wasm'),
  {
    imports: {
      // 提供给 Wasm 模块的 JS 函数
      env: {
        log: (value) => console.log('From Wasm:', value),
        memory: new WebAssembly.Memory({ initial: 256 }),
      }
    }
  }
)

// 调用 Wasm 导出的函数
const result = instance.exports.add(10, 20)  // 30
instance.exports.processImage(imageDataPtr, width, height)
```

### ffmpeg.wasm 实战（视频转码）

```typescript
// 在浏览器中转码视频（完全客户端，无需上传服务器）
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const ffmpeg = new FFmpeg()

async function convertVideoToGif(videoFile: File): Promise<Blob> {
  // 加载 ffmpeg wasm（约 30MB，缓存后很快）
  await ffmpeg.load({
    coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
    wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
  })

  // 写入输入文件
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))

  // 执行转码命令（和命令行 ffmpeg 一样！）
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', 'fps=10,scale=320:-1',
    '-loop', '0',
    'output.gif',
  ])

  // 读取输出文件
  const data = await ffmpeg.readFile('output.gif')
  return new Blob([data], { type: 'image/gif' })
}
```

## Rust + WebAssembly

用 Rust 编写高性能模块，编译到 Wasm 供 JS 调用。

### 环境搭建

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 wasm-pack
cargo install wasm-pack

# 添加 wasm 编译目标
rustup target add wasm32-unknown-unknown

# 创建项目
cargo new --lib my-wasm-module
```

### Rust 代码

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

// #[wasm_bindgen] 标记导出到 JS 的函数
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// 处理大数组（图像像素处理示例）
#[wasm_bindgen]
pub fn grayscale(pixels: &mut [u8]) {
    // pixels: [R, G, B, A, R, G, B, A, ...]
    for chunk in pixels.chunks_mut(4) {
        let gray = (chunk[0] as u32 * 299
            + chunk[1] as u32 * 587
            + chunk[2] as u32 * 114)
            / 1000;
        chunk[0] = gray as u8;
        chunk[1] = gray as u8;
        chunk[2] = gray as u8;
        // chunk[3] = Alpha，不变
    }
}

// 更复杂：操作 JS 的 DOM
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
```

### 编译和使用

```bash
# 编译为 npm 包
wasm-pack build --target web --out-dir pkg
```

```typescript
// 在 Vite + React 项目中使用
import init, { add, grayscale } from './pkg/my_wasm_module'

// 必须先初始化
await init()

console.log(add(10, 20))  // 30

// 图像灰度处理
function applyGrayscale(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // 直接操作 SharedArrayBuffer，零拷贝传递给 Wasm
  grayscale(imageData.data)

  ctx.putImageData(imageData, 0, 0)
}
```

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['my-wasm-module'],  // Wasm 包不需要 Vite 预构建
  },
  server: {
    headers: {
      // COOP/COEP：启用 SharedArrayBuffer（多线程 Wasm 需要）
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
```

## AssemblyScript（TypeScript → Wasm）

用类 TypeScript 语法写 Wasm，学习成本低：

```typescript
// assembly/index.ts（AssemblyScript）
export function fibonacci(n: i32): i32 {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

export function sumArray(arr: Int32Array): i64 {
  let sum: i64 = 0
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i]
  }
  return sum
}
```

```bash
npm install -D assemblyscript
npx asc assembly/index.ts --outFile build/module.wasm --optimize
```

## 性能对比

```javascript
// JS 斐波那契 vs Wasm 斐波那契
function fibJS(n) {
  if (n <= 1) return n
  return fibJS(n - 1) + fibJS(n - 2)
}

// n=45 时：
// JS：~8000ms
// Wasm（Rust）：~500ms
// Wasm 快约 16 倍（纯计算，无 IO）
```

:::tip 何时用 Wasm
- CPU 密集型计算（图像处理、加解密、编解码）
- 移植现有 C/C++ 库到浏览器
- 游戏、仿真、科学计算

❌ 不适合：DOM 操作、网络请求（JS 更合适）
:::

## 延伸阅读

- [WebAssembly 官网](https://webassembly.org/)
- [wasm-pack 文档](https://rustwasm.github.io/wasm-pack/)
- [AssemblyScript 文档](https://www.assemblyscript.org/)
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app/)
