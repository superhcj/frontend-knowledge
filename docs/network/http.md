# HTTP 全解析

> HTTP 是前端工程师的必修课——从 1.1 到 3，每一代都在解决上一代的核心痛点。

## HTTP/1.1

1997年定稿，沿用至今，主要特性：

- **持久连接**（Keep-Alive）：一个 TCP 连接可发送多个请求
- **管道化**（Pipelining）：可以连续发送请求，但响应必须按顺序（队头阻塞）
- **缓存机制**：`ETag`、`Last-Modified`、`Cache-Control`

**核心问题：队头阻塞（Head-of-Line Blocking）**

```
客户端     服务端
  │──请求1──▶│
  │          │ 处理中...
  │──请求2──▶│（排队等待）
  │          │
  │◀──响应1──│
  │◀──响应2──│
```

浏览器通常对同一域名开 **6 个并发 TCP 连接**来绕过这个限制。

## HTTP/2

2015年正式发布，解决 HTTP/1.1 的性能问题：

### 多路复用

```
┌─────────────────────────────────────────────────────────┐
│                   单个 TCP 连接                         │
│                                                         │
│  流1: ──[请求1]──────────────────[响应1]──▶             │
│  流2:    ──[请求2]──────────[响应2]──────▶              │
│  流3:        ──[请求3]──[响应3]──────────▶              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **多路复用**：单连接，多并发流，无需排队
- **头部压缩（HPACK）**：压缩重复请求头，减少传输量
- **服务端推送**：服务端主动推送资源（实际很少用，已被废弃方向）
- **二进制分帧**：比文本更高效

### HTTP/2 下的优化变化

```javascript
// HTTP/1.1 时代的优化在 HTTP/2 下可能适得其反：

// ❌ HTTP/1.1 的优化（HTTP/2 不再需要）
// 1. CSS Sprites（合并图片减少请求数）
// 2. 资源合并（把所有 JS 打成一个包）
// 3. 域名分片（用多个域名绕过 6 个连接限制）

// ✅ HTTP/2 的正确姿势
// 1. 代码分割：按需加载，小文件（利用多路复用）
// 2. 使用单个连接（不需要域名分片）
// 3. 充分利用 HTTP/2 Push（推送关键资源）
```

## HTTP/3

2022年正式发布，基于 **QUIC**（UDP）而非 TCP：

### 解决的问题

```
TCP + TLS 握手（HTTP/2）：
  1. TCP SYN
  2. TCP SYN-ACK
  3. TCP ACK
  4. TLS ClientHello
  5. TLS ServerHello
  ...（至少 1.5 RTT 才能发请求）

QUIC（HTTP/3）：
  1. QUIC Initial（0-RTT 或 1-RTT 建立连接 + 加密）
  直接发请求！
```

**HTTP/3 的优势：**
- **0-RTT 连接**：已有会话记录时，0 次往返即可发请求
- **真正的多路复用**：UDP 流独立，一个丢包不影响其他流（TCP 的队头阻塞是传输层级的）
- **连接迁移**：切换 Wi-Fi 到 4G，连接不中断（基于 Connection ID，非 IP+端口）

## HTTP 方法语义

```http
GET    /users        # 获取资源（幂等、安全）
POST   /users        # 创建资源
PUT    /users/1      # 完整替换资源（幂等）
PATCH  /users/1      # 部分更新资源
DELETE /users/1      # 删除资源（幂等）
HEAD   /users        # 只获取响应头，不返回 body
OPTIONS /users       # 查询服务器支持的方法（CORS 预检）
```

## HTTP 状态码

```
1xx  信息性
  100 Continue       服务器收到请求头，可以继续发 body

2xx  成功
  200 OK
  201 Created        POST 创建成功，响应体包含新资源
  204 No Content     成功，但无响应体（DELETE 常用）

3xx  重定向
  301 Moved Permanently  永久重定向（浏览器会缓存）
  302 Found              临时重定向
  304 Not Modified       资源未修改，使用缓存
  307 Temporary Redirect 临时重定向，且方法不变（POST 还是 POST）
  308 Permanent Redirect 永久重定向，方法不变

4xx  客户端错误
  400 Bad Request        请求格式错误
  401 Unauthorized       未认证（需要登录）
  403 Forbidden          无权限（已认证但无权）
  404 Not Found
  409 Conflict           资源冲突（重复创建）
  422 Unprocessable Entity  数据验证失败
  429 Too Many Requests  限流

5xx  服务端错误
  500 Internal Server Error
  502 Bad Gateway        网关收到上游错误响应
  503 Service Unavailable  服务器暂时不可用
  504 Gateway Timeout    网关等待上游超时
```

## 请求头与响应头

### 常用请求头

```http
GET /api/users HTTP/2
Host: api.example.com
Authorization: Bearer eyJhbGc...    # 认证 token
Content-Type: application/json      # 请求体格式
Accept: application/json            # 期望的响应格式
Accept-Encoding: gzip, br           # 支持的压缩格式
Accept-Language: zh-CN,zh;q=0.9
User-Agent: Mozilla/5.0...
Origin: https://example.com         # CORS
Referer: https://example.com/page
If-None-Match: "abc123"             # 条件请求（协商缓存）
If-Modified-Since: Tue, 01 Jan 2026 00:00:00 GMT
```

### 常用响应头

```http
HTTP/2 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 1234
Content-Encoding: gzip              # 压缩方式
Cache-Control: max-age=3600, public # 缓存策略
ETag: "abc123"                      # 资源版本标识
Last-Modified: Tue, 01 Jan 2026...  # 最后修改时间
Location: /api/users/123            # 重定向目标
Set-Cookie: session=xxx; HttpOnly; Secure; SameSite=Strict
Access-Control-Allow-Origin: *      # CORS
Strict-Transport-Security: max-age=31536000  # HSTS
X-Content-Type-Options: nosniff
```

## HTTPS 与 TLS

```
TLS 1.3 握手（1-RTT）：
Client → Server: ClientHello（支持的加密套件）
Server → Client: ServerHello + 证书 + 密钥
Client → Server: 确认 + 第一个加密请求 ✅

TLS 1.2 握手（2-RTT）：
Client → Server: ClientHello
Server → Client: ServerHello + 证书
Client → Server: 密钥交换
Server → Client: 确认
Client → Server: 第一个加密请求
```

## 延伸阅读

- [MDN - HTTP 概述](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Overview)
- [HTTP/3 explained](https://http3-explained.haxx.se/)
- [High Performance Browser Networking（免费书）](https://hpbn.co/)
- [Cloudflare - 什么是 QUIC](https://www.cloudflare.com/learning/performance/what-is-quic/)
