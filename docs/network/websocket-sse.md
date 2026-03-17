# WebSocket & SSE

> 实时通信选哪个？WebSocket 是双向全双工，SSE 是服务端单向推送——大多数"实时"场景 SSE 就够了。

## WebSocket

全双工通信协议，客户端和服务端可以随时互相发消息。

### 客户端

```javascript
const ws = new WebSocket('wss://api.example.com/ws')

// 连接建立
ws.onopen = () => {
  console.log('连接成功')
  ws.send(JSON.stringify({ type: 'auth', token: getToken() }))
}

// 收到消息
ws.onmessage = event => {
  const data = JSON.parse(event.data)
  handleMessage(data)
}

// 连接关闭
ws.onclose = event => {
  console.log(`连接关闭：${event.code} ${event.reason}`)
  if (event.code !== 1000) {
    // 非正常关闭，尝试重连
    setTimeout(reconnect, 3000)
  }
}

// 错误
ws.onerror = error => {
  console.error('WebSocket 错误', error)
}

// 发送消息
ws.send(JSON.stringify({ type: 'chat', content: 'Hello' }))
ws.send(new Uint8Array([1, 2, 3])) // 发送二进制数据

// 关闭连接
ws.close(1000, '正常关闭')
```

### 自动重连封装

```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseDelay = 1000

  constructor(
    private url: string,
    private onMessage: (data: unknown) => void,
  ) {
    this.connect()
  }

  private connect() {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      console.log('WebSocket 已连接')
    }

    this.ws.onmessage = e => this.onMessage(JSON.parse(e.data))

    this.ws.onclose = e => {
      if (e.code !== 1000) this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return

    // 指数退避
    const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => this.connect(), Math.min(delay, 30000))
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close(1000, '主动关闭')
  }
}
```

### React Hook 封装

```typescript
function useWebSocket<T>(url: string) {
  const [messages, setMessages] = useState<T[]>([])
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setStatus('open')
    ws.onclose = () => setStatus('closed')
    ws.onmessage = e => {
      setMessages(prev => [...prev, JSON.parse(e.data)])
    }

    return () => ws.close(1000, '组件卸载')
  }, [url])

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data))
  }, [])

  return { messages, status, send }
}
```

## SSE（Server-Sent Events）

服务端到客户端的单向推送，基于 HTTP，比 WebSocket 简单。

```javascript
// 客户端
const sse = new EventSource('/api/events', {
  withCredentials: true, // 携带 Cookie
})

// 默认消息
sse.onmessage = event => {
  const data = JSON.parse(event.data)
  setEvents(prev => [...prev, data])
}

// 自定义事件类型
sse.addEventListener('notification', event => {
  showNotification(JSON.parse(event.data))
})

sse.addEventListener('status', event => {
  updateStatus(JSON.parse(event.data))
})

// 错误与重连（浏览器会自动重连！）
sse.onerror = error => {
  if (sse.readyState === EventSource.CLOSED) {
    console.log('连接已关闭，不再重连')
  }
}

// 手动关闭
sse.close()
```

```javascript
// 服务端（Node.js / Express）
app.get('/api/events', (req, res) => {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // 发送注释保持连接
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n')
  }, 15000)

  // 发送事件
  function sendEvent(eventType, data) {
    res.write(`event: ${eventType}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  sendEvent('notification', { message: '你有新消息', count: 3 })

  // 客户端断开时清理
  req.on('close', () => {
    clearInterval(keepAlive)
    console.log('客户端已断开')
  })
})
```

### SSE 协议格式

```
data: Hello World\n\n              # 简单消息

event: notification\n              # 自定义事件类型
data: {"count": 5}\n\n

id: 123\n                          # 消息 ID（断线重连后从此 ID 续传）
event: update\n
data: {"content": "新内容"}\n\n

retry: 5000\n                      # 重连间隔（ms）
data: 重连设置\n\n

: 这是注释，用于保持连接\n\n
```

## WebSocket vs SSE vs 轮询

| 维度 | WebSocket | SSE | 短轮询 | 长轮询 |
|------|-----------|-----|--------|--------|
| 方向 | 双向 | 单向（服务→客户端）| 单向 | 单向 |
| 协议 | WS | HTTP | HTTP | HTTP |
| 自动重连 | 需手动 | 浏览器内置 | N/A | N/A |
| 负载均衡 | 复杂（需 sticky session）| 简单 | 简单 | 简单 |
| 适合场景 | 聊天、游戏、协同 | 通知、进度、动态 | 低频更新 | 中频更新 |
| 服务端压力 | 中 | 中 | 高 | 中 |

## AI 流式输出（SSE 实战）

ChatGPT 式的打字机效果，就是 SSE：

```typescript
// 客户端
async function streamChat(prompt: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        const { content } = JSON.parse(data)
        appendToMessage(content)
      }
    }
  }
}
```

## 延伸阅读

- [MDN - WebSocket](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket)
- [MDN - Server-sent events](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events)
- [socket.io - WebSocket 封装库](https://socket.io/)
