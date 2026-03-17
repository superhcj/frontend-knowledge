# JavaScript 核心

> 理解 JS 的底层机制，比背 API 更重要。原型链、闭包、事件循环——这三件事搞清楚，JS 就通了大半。

## 执行上下文与作用域

### 执行上下文

每次调用函数，JS 引擎都会创建一个**执行上下文（Execution Context）**，包含：

- **变量环境**：`var` 声明的变量
- **词法环境**：`let`/`const` 声明
- **`this` 绑定**

```javascript
// 全局执行上下文
const name = '全局'

function outer() {
  // outer 的执行上下文
  const name = 'outer'

  function inner() {
    // inner 的执行上下文
    console.log(name) // 'outer'（作用域链向上查找）
  }

  inner()
}
outer()
```

### 变量提升（Hoisting）

```javascript
// var 被提升，但初始化不提升
console.log(a) // undefined（不报错）
var a = 1

// let/const 存在暂时性死区（TDZ），访问会报错
console.log(b) // ReferenceError: Cannot access 'b' before initialization
let b = 2

// 函数声明整体提升
sayHi() // 'Hi'（可以在声明前调用）
function sayHi() { console.log('Hi') }

// 函数表达式不提升
greet() // TypeError: greet is not a function
var greet = function() { console.log('Hello') }
```

## 原型与原型链

JS 的继承基于**原型链**，而不是传统类继承（`class` 只是语法糖）。

```javascript
// 每个对象都有 [[Prototype]] 内部属性
const obj = { name: '张三' }
// obj.__proto__ === Object.prototype

// 原型链查找
function Animal(name) {
  this.name = name
}

Animal.prototype.speak = function() {
  return `${this.name} 发出声音`
}

const cat = new Animal('咪咪')
cat.speak()        // '咪咪 发出声音'（从原型找到）
cat.hasOwnProperty('name')  // true（自身属性）
cat.hasOwnProperty('speak') // false（原型上的属性）

// 原型链：cat → Animal.prototype → Object.prototype → null
```

### 现代 class 语法

```javascript
class Animal {
  #name  // 私有字段（ES2022）

  constructor(name) {
    this.#name = name
  }

  get name() { return this.#name }

  speak() {
    return `${this.#name} 发出声音`
  }

  static create(name) {
    return new Animal(name)
  }
}

class Dog extends Animal {
  #breed

  constructor(name, breed) {
    super(name)
    this.#breed = breed
  }

  speak() {
    return `${this.name} 汪汪叫`  // 调用 getter
  }

  toString() {
    return `${super.speak()}（${this.#breed}）`
  }
}

const dog = Dog.create('旺财')
// 实际上等价于 new Dog('旺财', undefined)
```

## 闭包

闭包 = **函数 + 它被定义时的词法环境**。

```javascript
// 经典用法：数据私有化
function createCounter(initial = 0) {
  let count = initial  // 私有变量

  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
    reset: () => { count = initial }
  }
}

const counter = createCounter(10)
counter.increment() // 11
counter.increment() // 12
counter.value()     // 12
// count 无法从外部直接访问
```

```javascript
// 经典陷阱：循环中的闭包
// ❌ 问题代码
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// 输出: 3, 3, 3（共享同一个 var i）

// ✅ 解决方案 1：let（块级作用域）
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// 输出: 0, 1, 2

// ✅ 解决方案 2：IIFE
for (var i = 0; i < 3; i++) {
  ;((j) => setTimeout(() => console.log(j), 100))(i)
}
```

## this 绑定规则

`this` 不在定义时决定，而在**调用时**决定。有四条规则（优先级从高到低）：

```javascript
// 1. new 绑定（最高优先级）
function Person(name) { this.name = name }
const p = new Person('张三')
// this → 新创建的对象

// 2. 显式绑定（call / apply / bind）
function greet(greeting) {
  return `${greeting}, ${this.name}`
}
const user = { name: '李四' }
greet.call(user, 'Hello')           // 'Hello, 李四'
greet.apply(user, ['Hi'])           // 'Hi, 李四'
const boundGreet = greet.bind(user) // 返回新函数
boundGreet('Hey')                   // 'Hey, 李四'

// 3. 隐式绑定（方法调用）
const obj = {
  name: '王五',
  greet() { return this.name }
}
obj.greet() // '王五'，this → obj

// 4. 默认绑定
function standalone() { return this }
standalone() // 严格模式: undefined；非严格模式: globalThis

// ⚠️ 箭头函数没有自己的 this，继承外层
class Timer {
  constructor() {
    this.count = 0
  }
  start() {
    // 箭头函数：this 继承 start() 的 this（即 Timer 实例）
    setInterval(() => {
      this.count++  // ✅ 正确
    }, 1000)
  }
}
```

## 事件循环（Event Loop）

理解 JS 的异步执行模型。

```
调用栈 (Call Stack)
     ↕
Web APIs (setTimeout, fetch, DOM events...)
     ↓
任务队列：
  - 宏任务队列 (Macrotask): setTimeout, setInterval, I/O, UI rendering
  - 微任务队列 (Microtask): Promise.then, queueMicrotask, MutationObserver
```

**执行顺序**：同步代码 → 清空所有微任务 → 执行一个宏任务 → 清空所有微任务 → ...

```javascript
console.log('1')  // 同步

setTimeout(() => console.log('2'), 0)  // 宏任务

Promise.resolve()
  .then(() => console.log('3'))         // 微任务
  .then(() => console.log('4'))         // 微任务

queueMicrotask(() => console.log('5')) // 微任务

console.log('6')  // 同步

// 输出顺序：1 → 6 → 3 → 5 → 4 → 2
```

## 异步编程

### Promise

```javascript
// 创建 Promise
const fetchUser = (id) => new Promise((resolve, reject) => {
  setTimeout(() => {
    if (id > 0) resolve({ id, name: '张三' })
    else reject(new Error('Invalid ID'))
  }, 1000)
})

// 链式调用
fetchUser(1)
  .then(user => user.name)
  .then(name => console.log(name))
  .catch(err => console.error(err))
  .finally(() => console.log('done'))

// 并发
Promise.all([fetchUser(1), fetchUser(2)])   // 全部成功才 resolve
Promise.allSettled([...])                    // 等所有完成，不管成功失败
Promise.race([...])                          // 第一个完成就 resolve/reject
Promise.any([...])                           // 第一个成功就 resolve
```

### async/await

```javascript
async function loadUserData(userId) {
  try {
    const user = await fetchUser(userId)
    const posts = await fetchPosts(user.id)  // 串行
    return { user, posts }
  } catch (error) {
    console.error('加载失败:', error)
    throw error
  }
}

// 并发执行（不要写成串行）
async function loadAll(ids) {
  // ✅ 并发
  const users = await Promise.all(ids.map(id => fetchUser(id)))

  // ❌ 串行（慢）
  // for (const id of ids) {
  //   const user = await fetchUser(id)
  // }

  return users
}

// 顶层 await（ES2022，在 ES Module 中可用）
const config = await fetch('/config.json').then(r => r.json())
```

## 深拷贝与浅拷贝

```javascript
// 浅拷贝：只复制一层
const shallow = { ...original }
const shallow2 = Object.assign({}, original)
const arr = [...original]

// 深拷贝方案对比
// 1. structuredClone（现代标准，推荐）
const deep = structuredClone(original)
// 支持：Date, RegExp, Map, Set, ArrayBuffer, 循环引用
// 不支持：Function, DOM 节点, Symbol 键

// 2. JSON 序列化（简单但有限制）
const deep2 = JSON.parse(JSON.stringify(original))
// 丢失：undefined, Function, Symbol, Date 变字符串, 不支持循环引用

// 3. 第三方库（功能最全）
// import { cloneDeep } from 'lodash-es'
```

## 常用设计模式

```javascript
// 单例模式
class Config {
  static #instance = null
  #settings = {}

  static getInstance() {
    if (!Config.#instance) {
      Config.#instance = new Config()
    }
    return Config.#instance
  }

  set(key, value) { this.#settings[key] = value }
  get(key) { return this.#settings[key] }
}

// 观察者模式（EventEmitter）
class EventEmitter {
  #listeners = new Map()

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, [])
    this.#listeners.get(event).push(fn)
    return () => this.off(event, fn) // 返回取消订阅函数
  }

  off(event, fn) {
    const fns = this.#listeners.get(event) || []
    this.#listeners.set(event, fns.filter(f => f !== fn))
  }

  emit(event, ...args) {
    ;(this.#listeners.get(event) || []).forEach(fn => fn(...args))
  }
}
```

## 延伸阅读

- [MDN - JavaScript 指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide)
- [JavaScript.info](https://javascript.info/)
- [You Don't Know JS](https://github.com/getify/You-Dont-Know-JS)
- [Jake Archibald - Event Loop 可视化](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)
