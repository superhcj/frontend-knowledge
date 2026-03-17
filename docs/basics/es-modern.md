# ES2015~ES2025 新特性

> 每年一个版本，逐步打磨出现代 JavaScript 的面貌。

## ES2015 (ES6) — 奠基之作

### 解构赋值

```javascript
// 数组解构
const [a, b, ...rest] = [1, 2, 3, 4, 5]
// a=1, b=2, rest=[3,4,5]

// 对象解构 + 重命名 + 默认值
const { name: userName = 'anonymous', age = 0 } = user

// 函数参数解构
function render({ title, content, theme = 'light' }) {
  // ...
}
```

### 展开运算符

```javascript
// 数组合并
const merged = [...arr1, ...arr2, newItem]

// 对象合并（后面覆盖前面）
const config = { ...defaults, ...userConfig, env: 'prod' }

// 函数参数
Math.max(...numbers)
```

### 模板字符串

```javascript
const html = `
  <div class="${cls}">
    <h1>${title}</h1>
    ${items.map(item => `<li>${item}</li>`).join('')}
  </div>
`

// 标签模板（Tag Template）
const safe = html`<p>${userInput}</p>` // 自动转义 XSS
```

### 箭头函数

```javascript
const add = (a, b) => a + b
const double = x => x * 2
const getObj = () => ({ key: 'value' }) // 返回对象需括号

// 核心区别：没有自己的 this、arguments、prototype
```

### Promise、Symbol、Map、Set、WeakMap、WeakSet

```javascript
// Map：键可以是任意类型
const map = new Map()
map.set({ id: 1 }, 'value')

// Set：不重复的集合
const unique = [...new Set([1, 2, 2, 3, 3])] // [1, 2, 3]

// WeakMap / WeakSet：弱引用，键被 GC 后自动清除
// 常用于：私有数据存储、缓存（不阻止垃圾回收）
const privateData = new WeakMap()
class Foo {
  constructor() { privateData.set(this, { secret: 42 }) }
  getSecret() { return privateData.get(this).secret }
}
```

## ES2017 — async/await

```javascript
// 见《JavaScript 核心》异步编程章节
async function fetchData() {
  const data = await fetch('/api/data').then(r => r.json())
  return data
}

// Object.entries / Object.values
const obj = { a: 1, b: 2 }
Object.entries(obj) // [['a', 1], ['b', 2]]
Object.values(obj)  // [1, 2]
```

## ES2018 — 异步迭代、Rest/Spread

```javascript
// 对象展开/Rest（ES2018 才支持对象）
const { a, ...others } = obj

// 异步迭代
async function processStream(stream) {
  for await (const chunk of stream) {
    process(chunk)
  }
}

// Promise.finally
fetch('/api').then(handle).catch(handleError).finally(cleanup)
```

## ES2019 — flat、flatMap、trimStart/trimEnd

```javascript
// Array.flat（默认展开一层）
[1, [2, [3, [4]]]].flat()    // [1, 2, [3, [4]]]
[1, [2, [3, [4]]]].flat(Infinity) // [1, 2, 3, 4]

// Array.flatMap（map + flat(1) 组合）
['hello world', 'foo bar'].flatMap(s => s.split(' '))
// ['hello', 'world', 'foo', 'bar']

// Object.fromEntries（entries 的逆操作）
const entries = [['a', 1], ['b', 2]]
Object.fromEntries(entries) // { a: 1, b: 2 }

// 实用：过滤/转换对象
const doubled = Object.fromEntries(
  Object.entries(obj).map(([k, v]) => [k, v * 2])
)
```

## ES2020 — 可选链、空值合并、BigInt

```javascript
// 可选链 ?.（避免 Cannot read property of undefined）
const city = user?.address?.city
const first = arr?.[0]
const result = obj?.method?.()

// 空值合并 ??（只有 null/undefined 才取默认值）
const name = user.name ?? 'anonymous'
// 与 || 的区别：|| 对 0、''、false 也取默认值

// ??= 空值合并赋值（ES2021）
user.name ??= 'default'

// ||=  &&= 逻辑赋值（ES2021）
cache ||= loadCache()   // cache 为 falsy 时才赋值
obj.count &&= obj.count + 1  // obj.count 为 truthy 时才赋值

// BigInt
const big = 9007199254740993n
const result2 = big * 2n  // 类型必须匹配
Number(big)               // 转换（可能精度损失）

// Promise.allSettled
const results = await Promise.allSettled(promises)
results.forEach(r => {
  if (r.status === 'fulfilled') console.log(r.value)
  else console.error(r.reason)
})

// globalThis（统一 window/global/self）
globalThis.setTimeout(...)
```

## ES2021 — String.replaceAll、WeakRef

```javascript
// String.replaceAll（告别正则）
'a.b.c.d'.replaceAll('.', '-') // 'a-b-c-d'

// WeakRef：弱引用（不阻止 GC）
const ref = new WeakRef(heavyObject)
const obj = ref.deref() // 可能返回 undefined（已被 GC）

// FinalizationRegistry：对象被 GC 后回调
const registry = new FinalizationRegistry(key => {
  cache.delete(key)
})
registry.register(obj, cacheKey)
```

## ES2022 — class 字段、at()、Error cause

```javascript
// class 私有字段和方法（见 JS 核心章节）
class MyClass {
  publicField = 'public'
  #privateField = 'private'
  static #privateStatic = 0

  #privateMethod() {}
  static staticMethod() {}
}

// Array/String.at()（支持负索引）
const arr = [1, 2, 3, 4, 5]
arr.at(-1)  // 5（最后一个）
arr.at(-2)  // 4

'hello'.at(-1) // 'o'

// Object.hasOwn（替代 hasOwnProperty）
Object.hasOwn(obj, 'key') // 更安全，不怕原型被覆盖

// Error cause（链式错误）
try {
  await fetchData()
} catch (error) {
  throw new Error('加载用户数据失败', { cause: error })
}

// Top-level await（ES Module 中）
const data = await fetch('/api').then(r => r.json())
export default data
```

## ES2023 — Array 查找、toSorted/toReversed

```javascript
// Array.findLast / findLastIndex（从后往前找）
[1, 2, 3, 4].findLast(x => x % 2 === 0) // 4

// 不修改原数组的操作（返回新数组）
const arr = [3, 1, 2]
arr.toSorted()              // [1, 2, 3]，arr 不变
arr.toReversed()            // [2, 1, 3]，arr 不变
arr.toSpliced(1, 1, 99)     // [3, 99, 2]，arr 不变
arr.with(0, 100)            // [100, 1, 2]，arr 不变

// Array.from 现在可以复制 Map/Set 的 groupBy 不稳定，用 Object.groupBy
const grouped = Object.groupBy(people, person => person.age >= 18 ? 'adult' : 'minor')
```

## ES2024 — Promise.withResolvers、groupBy

```javascript
// Promise.withResolvers（解决 Promise 构造函数不够灵活的问题）
const { promise, resolve, reject } = Promise.withResolvers()

// 可以在 Promise 构造函数外部控制 resolve/reject
someEventEmitter.once('data', resolve)
someEventEmitter.once('error', reject)
await promise

// Object.groupBy / Map.groupBy（ES2024）
const files = ['a.js', 'b.css', 'c.js', 'd.html']
const byExt = Object.groupBy(files, f => f.split('.').pop())
// { js: ['a.js', 'c.js'], css: ['b.css'], html: ['d.html'] }
```

## ES2025（草案阶段）

```javascript
// Iterator Helpers（迭代器链式操作，无需转 Array）
function* range(start, end) {
  for (let i = start; i < end; i++) yield i
}

const result = range(0, 100)
  .filter(x => x % 2 === 0)
  .map(x => x * x)
  .take(5)
  .toArray()
// [0, 4, 16, 36, 64]

// RegExp.escape（安全转义用户输入）
const userInput = 'hello (world)'
const regex = new RegExp(RegExp.escape(userInput))

// Import Attributes（已在多数运行时实现）
import data from './data.json' with { type: 'json' }
import styles from './style.css' with { type: 'css' }
```

## 快速参考：特性浏览器支持

| 特性 | 最低支持 | 备注 |
|------|----------|------|
| ES2015 全部特性 | Chrome 51 / Firefox 54 | Babel 可降级 |
| async/await | Chrome 55 | |
| 可选链 `?.` | Chrome 80 / Node 14 | |
| 空值合并 `??` | Chrome 80 / Node 14 | |
| class 私有字段 `#` | Chrome 74 / Node 12 | |
| `Array.at()` | Chrome 92 / Node 16.6 | |
| Top-level await | Chrome 89 / Node 14.8 | 仅 ES Module |
| `structuredClone` | Chrome 98 / Node 17 | |

## 延伸阅读

- [TC39 提案跟踪](https://github.com/tc39/proposals)
- [Can I use](https://caniuse.com/) — 浏览器兼容性查询
- [Node.green](https://node.green/) — Node.js ES 特性支持
- [Babel REPL](https://babeljs.io/repl) — 在线查看编译结果
