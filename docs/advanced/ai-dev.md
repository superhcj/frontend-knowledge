# AI 辅助开发

> AI 不会替代工程师，但会用 AI 的工程师会替代不会用的。2025 年，AI 辅助开发已经是必备技能。

## 现状全景

```
代码补全        GitHub Copilot、Cursor、Codeium
对话编程        Claude、GPT-4o、Gemini
代码审查        CodeRabbit、PR-Agent
代码生成        v0.dev（UI）、Vercel AI SDK
测试生成        Cursor、GitHub Copilot
文档生成        Mintlify、Docstring AI
架构设计        Claude Opus、GPT-4
```

## GitHub Copilot 高效用法

```typescript
// 1. 注释驱动开发：先写注释，再让 AI 补全
// 将数组中的对象按 key 分组，返回 Map<key, T[]>
// 示例：groupBy([{type:'a'}, {type:'b'}, {type:'a'}], 'type')
// 返回：Map { 'a' => [{type:'a'}, {type:'a'}], 'b' => [{type:'b'}] }
function groupBy<T, K extends keyof T>(items: T[], key: K): Map<T[K], T[]> {
  // Copilot 会根据注释和函数签名生成实现
}

// 2. 测试生成：光标放在函数上，Alt+\ 生成测试
// 3. 函数重构：选中代码，右键 → Copilot → 解释/重构/添加文档
```

## Cursor 工作流

Cursor 是目前最强的 AI 编辑器，基于 VS Code：

```
常用快捷键：
  Ctrl+K    → 行内编辑（描述修改意图）
  Ctrl+L    → 打开 Chat（对话模式）
  Ctrl+I    → Composer（多文件编辑）
  Tab       → 接受 AI 补全

高效模式：
  1. Chat + 代码库上下文：
     "@codebase 我需要添加用户权限系统，现有架构是什么？"

  2. 多文件重构：
     Composer → "将所有 API 调用从 fetch 改成 axios，保持类型安全"

  3. Bug 诊断：
     选中报错信息 → Add to Chat → "帮我分析这个错误"
```

## Vercel AI SDK

在前端应用中集成 LLM 的标准工具库：

```typescript
// npm install ai @ai-sdk/openai
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

// Next.js App Router 流式 API
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    system: '你是一个前端技术助手，回答简洁专业。',
  })

  return result.toDataStreamResponse()
}
```

```typescript
// 客户端：useChat Hook
'use client'
import { useChat } from 'ai/react'

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  })

  return (
    <div>
      <div className="messages">
        {messages.map(m => (
          <div key={m.id} className={m.role}>
            {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>发送</button>
      </form>
    </div>
  )
}
```

### 结构化输出

```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

const schema = z.object({
  components: z.array(z.object({
    name: z.string(),
    props: z.array(z.string()),
    description: z.string(),
  })),
  suggestedArchitecture: z.string(),
})

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema,
  prompt: '为一个电商网站设计 React 组件结构',
})

// object 的类型完全由 schema 推断
console.log(object.components[0].name) // TypeScript 完整提示
```

## Prompt Engineering for Developers

```typescript
// 🔴 低效 Prompt
"帮我写一个列表组件"

// 🟢 高效 Prompt（提供上下文 + 约束 + 示例）
`
技术栈：React 18 + TypeScript + Tailwind CSS
需求：虚拟化列表组件
- 支持 10万+ 条数据
- 每行高度固定 48px
- 支持选中状态（单选/多选）
- 支持键盘导航（上下箭头、Enter、Space）
- 导出 onSelect 回调，参数为 Set<string>（选中的 id 集合）
现有代码风格参考：[粘贴已有的类似组件]
`

// 最佳实践：
// 1. 给 AI "角色"：你是一个高级 React 工程师...
// 2. 提供约束：只用 React 原生 API，不引入新依赖
// 3. 给出示例输入/输出（few-shot）
// 4. 指定输出格式：只输出代码，不要解释
// 5. 分步骤拆解复杂任务
```

## AI 代码审查

```yaml
# .github/workflows/ai-review.yml（CodeRabbit）
# 在 PR 上自动进行 AI 代码审查

# 或手动 Prompt：
# 将 diff 粘贴给 Claude/GPT：
# "请审查以下代码变更，关注：
# 1. 潜在的 Bug 和边界情况
# 2. 性能问题
# 3. 安全漏洞（XSS、注入等）
# 4. TypeScript 类型安全
# 5. 可读性和可维护性
# 用中文回答，按严重程度排序。"
```

## AI 生成 UI：v0.dev

Vercel 的 AI UI 生成器，输入描述生成 React + Tailwind 组件：

```
// 提示词技巧
"设计一个数据分析看板，包含：
- 顶部 4 个 KPI 卡片（总销售额、订单数、转化率、客单价）
- 中间折线图（近30天趋势）
- 右侧饼图（销售分类占比）
- 底部数据表格（最近订单列表）
使用深色主题，专业商务风格。"
```

## 使用边界

```
✅ AI 擅长的：
- 样板代码生成（CRUD、表单、类型定义）
- 代码翻译（从一种框架迁移到另一种）
- 文档注释生成
- 测试用例生成
- Bug 定位辅助
- 代码解释

⚠️ 需要审查的：
- 安全相关代码（认证、加密）
- 业务核心逻辑
- 性能关键路径

❌ 不能盲信的：
- AI 的幻觉（Hallucination）：会捏造不存在的 API
- 过时知识：训练数据截止日期后的新特性
- 复杂业务逻辑：AI 不理解你的业务
```

## 延伸阅读

- [Vercel AI SDK 文档](https://sdk.vercel.ai/)
- [GitHub Copilot 文档](https://docs.github.com/copilot)
- [Cursor 文档](https://docs.cursor.com/)
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/)
