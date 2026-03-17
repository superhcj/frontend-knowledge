# TypeScript

> TypeScript 不是约束，是文档、是测试、是协作工具。

## 为什么用 TypeScript

```typescript
// ❌ 纯 JS：运行时才发现错误
function getUser(id) {
  return fetch(`/api/users/${id}`).then(r => r.json())
}
getUser('abc').then(user => {
  console.log(user.nme) // 拼写错误，运行时报 undefined，难排查
})

// ✅ TypeScript：编写时就发现错误
interface User {
  id: number
  name: string
  email: string
}

async function getUser(id: number): Promise<User> {
  return fetch(`/api/users/${id}`).then(r => r.json())
}

const user = await getUser(1)
console.log(user.nme) // ❌ Property 'nme' does not exist（编译时报错）
console.log(user.name) // ✅
```

## 基础类型

```typescript
// 基本类型
let str: string = 'hello'
let num: number = 42
let bool: boolean = true
let n: null = null
let u: undefined = undefined
let big: bigint = 100n
let sym: symbol = Symbol('key')

// 数组
let nums: number[] = [1, 2, 3]
let strs: Array<string> = ['a', 'b']

// 元组（固定长度、固定类型的数组）
let pair: [string, number] = ['age', 25]
let rgb: [number, number, number] = [255, 128, 0]

// 对象
let obj: { name: string; age: number } = { name: '张三', age: 25 }

// any（逃生舱，尽量避免）
let anything: any = 'could be anything'

// unknown（比 any 更安全，使用前必须类型收窄）
let value: unknown = getExternalValue()
if (typeof value === 'string') {
  value.toUpperCase() // ✅ 收窄后可以使用
}

// never（永不返回的函数）
function throwError(msg: string): never {
  throw new Error(msg)
}

// void（无返回值的函数）
function logMessage(msg: string): void {
  console.log(msg)
}
```

## 接口与类型别名

```typescript
// Interface：描述对象形状，可以合并声明
interface User {
  id: number
  name: string
  email?: string        // 可选属性
  readonly createdAt: Date  // 只读
}

// 接口继承
interface Admin extends User {
  role: 'admin' | 'superadmin'
  permissions: string[]
}

// 类型别名：更灵活，适合联合类型、工具类型
type ID = string | number
type Status = 'pending' | 'active' | 'inactive'
type Callback = (event: MouseEvent) => void
type Point = { x: number; y: number }

// interface vs type：
// - 都可以描述对象/函数
// - interface 可以合并声明（适合库的类型扩展）
// - type 可以用联合、交叉、工具类型（更灵活）
// 推荐：对象形状用 interface，其他用 type
```

## 联合类型与交叉类型

```typescript
// 联合类型（A 或 B）
type Result<T> = { success: true; data: T } | { success: false; error: string }

function handleResult(result: Result<User>) {
  if (result.success) {
    console.log(result.data.name) // ✅ 收窄后可访问 data
  } else {
    console.error(result.error)   // ✅
  }
}

// 交叉类型（A 且 B，合并所有属性）
type AdminUser = User & { role: string; permissions: string[] }

// 判别联合（Discriminated Union）
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':   return Math.PI * shape.radius ** 2
    case 'rect':     return shape.width * shape.height
    case 'triangle': return 0.5 * shape.base * shape.height
    // TS 会检测是否覆盖了所有分支！
  }
}
```

## 泛型

```typescript
// 基础泛型
function identity<T>(value: T): T {
  return value
}

// 泛型约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// 泛型接口
interface Repository<T extends { id: number }> {
  findById(id: number): Promise<T | null>
  findAll(): Promise<T[]>
  save(entity: T): Promise<T>
  delete(id: number): Promise<void>
}

// 泛型类
class Stack<T> {
  #items: T[] = []

  push(item: T): void { this.#items.push(item) }
  pop(): T | undefined { return this.#items.pop() }
  peek(): T | undefined { return this.#items.at(-1) }
  get size(): number { return this.#items.length }
}

const stack = new Stack<number>()
stack.push(1)
stack.push(2)
stack.pop() // 2
```

## 内置工具类型

```typescript
interface User {
  id: number
  name: string
  email: string
  password: string
}

// Partial<T>：所有属性变可选
type UpdateUserDto = Partial<User>

// Required<T>：所有属性变必须
type StrictUser = Required<User>

// Pick<T, K>：挑选指定属性
type PublicUser = Pick<User, 'id' | 'name' | 'email'>

// Omit<T, K>：排除指定属性
type SafeUser = Omit<User, 'password'>

// Record<K, V>：构造键值对类型
type UserMap = Record<string, User>
type StatusMap = Record<Status, string>

// Readonly<T>：所有属性变只读
type ImmutableUser = Readonly<User>

// ReturnType<F>：获取函数返回类型
async function fetchUser() { return { id: 1, name: '张三' } }
type UserData = Awaited<ReturnType<typeof fetchUser>>
// { id: number; name: string }

// Parameters<F>：获取函数参数类型
function createUser(name: string, age: number) {}
type CreateUserParams = Parameters<typeof createUser>
// [string, number]

// NonNullable<T>：排除 null 和 undefined
type ValidId = NonNullable<string | null | undefined> // string

// Extract / Exclude
type A = 'a' | 'b' | 'c'
type B = 'b' | 'c' | 'd'
type Common = Extract<A, B>  // 'b' | 'c'
type OnlyA = Exclude<A, B>   // 'a'
```

## 高级类型

```typescript
// 条件类型
type IsArray<T> = T extends any[] ? true : false
type IsString<T> = T extends string ? 'yes' : 'no'

// infer：在条件类型中推断类型
type UnpackPromise<T> = T extends Promise<infer U> ? U : T
type ArrayElement<T> = T extends (infer U)[] ? U : never

// 映射类型
type Nullable<T> = { [K in keyof T]: T[K] | null }
type Optional<T> = { [K in keyof T]?: T[K] }
type Mutable<T> = { -readonly [K in keyof T]: T[K] } // 移除 readonly

// 模板字面量类型（TS 4.1+）
type EventName = 'click' | 'focus' | 'blur'
type Handler = `on${Capitalize<EventName>}` // 'onClick' | 'onFocus' | 'onBlur'

type CSSProperty = `${string}-${string}`
type GridValue = `${number}fr` | `${number}px` | 'auto'
```

## 类型守卫

```typescript
// typeof 守卫
function pad(value: string | number, len: number) {
  if (typeof value === 'string') {
    return value.padStart(len)
  }
  return value.toString().padStart(len)
}

// instanceof 守卫
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message)
  }
}

// 自定义类型守卫
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  )
}

// 断言函数（TS 3.7+）
function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== 'string') throw new TypeError('Expected string')
}
```

## React + TypeScript

```typescript
import { useState, useCallback, type FC, type ReactNode } from 'react'

// 组件 Props 类型
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  children: ReactNode
}

const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// useState 类型推断
const [count, setCount] = useState(0)          // 自动推断 number
const [user, setUser] = useState<User | null>(null)  // 显式指定

// 自定义 Hook
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // ...
  return { data, loading, error }
}

const { data: user } = useFetch<User>('/api/user/1')
```

## tsconfig 关键配置

```json
{
  "compilerOptions": {
    "target": "ES2022",           // 编译目标
    "module": "ESNext",           // 模块系统
    "moduleResolution": "bundler", // 使用 bundler 时推荐
    "strict": true,               // 开启所有严格检查（推荐）
    "noUncheckedIndexedAccess": true, // 数组访问返回 T | undefined
    "exactOptionalPropertyTypes": true, // 更严格的可选属性
    "noImplicitReturns": true,    // 函数所有分支必须有返回值
    "noFallthroughCasesInSwitch": true,
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]          // 路径别名
    },
    "skipLibCheck": true          // 跳过 .d.ts 检查，加速编译
  }
}
```

## 延伸阅读

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Type Challenges](https://github.com/type-challenges/type-challenges) — 类型体操练习
- [总线类型工具库 type-fest](https://github.com/sindresorhus/type-fest)
