# 浏览器安全

> 安全不是功能，是基础设施。一个漏洞可以让整个产品崩塌。

## XSS（跨站脚本攻击）

攻击者将恶意脚本注入到网页，在用户浏览器中执行。

### 攻击类型

```
存储型 XSS：恶意脚本存储在服务器（数据库），每次页面加载都执行
反射型 XSS：恶意代码在 URL 中，服务器将其反射到响应页面
DOM 型 XSS：客户端 JS 不安全地操作 DOM，不经过服务器
```

### 防御

```javascript
// 1. 转义 HTML 输出（最基础）
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// 2. 使用框架的安全 API（React/Vue 默认转义）
// ✅ React 自动转义
const name = '<script>alert(1)</script>'
return <div>{name}</div>  // 安全，显示为文本

// ❌ 危险：绕过 React 转义
return <div dangerouslySetInnerHTML={{ __html: userInput }} />

// 3. 如果必须渲染富文本，使用白名单净化库
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'title'],
})
return <div dangerouslySetInnerHTML={{ __html: clean }} />

// 4. 避免危险的 DOM 操作
// ❌
element.innerHTML = userInput
document.write(userInput)
eval(userInput)

// ✅
element.textContent = userInput
```

### Content Security Policy（CSP）

最强力的 XSS 防御——告诉浏览器哪些来源的资源是可信的。

```http
# 严格 CSP（推荐）
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{随机值}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.example.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

```html
<!-- 使用 nonce 允许内联脚本（每次请求随机生成）-->
<script nonce="abc123xyz">
  // 只有带正确 nonce 的内联脚本才会执行
</script>
```

```javascript
// Next.js 中配置 CSP
// middleware.ts
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'nonce-${nonce}';
  `.replace(/\s+/g, ' ').trim()

  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', cspHeader)

  return NextResponse.next({ request: { headers } })
}
```

## CSRF（跨站请求伪造）

攻击者诱导已登录用户访问恶意页面，以用户身份发起请求。

```html
<!-- 攻击示例：用户访问恶意页面 -->
<img src="https://bank.com/transfer?to=attacker&amount=10000">
<!-- 浏览器自动携带 bank.com 的 Cookie 发送请求！-->
```

### 防御

```javascript
// 1. SameSite Cookie（现代主流方案）
// Set-Cookie: session=xxx; SameSite=Strict; Secure; HttpOnly
// SameSite=Strict：完全禁止跨站携带 Cookie
// SameSite=Lax：GET 导航允许，POST 等不允许（默认值）

// 2. CSRF Token
// 服务端生成随机 token，存入 Cookie（允许 JS 读取）
// 客户端每次请求在 Header 中带上 token
// 服务端验证 Header 中的 token 与 Cookie 中的一致

// axios 中自动携带 CSRF token
axios.defaults.headers.common['X-CSRF-Token'] = getCookie('csrf_token')

// 3. 验证 Origin/Referer 头
// 服务端检查请求来源是否为合法域名
```

## CORS（跨源资源共享）

浏览器的安全策略：**同源策略**限制不同源的请求，CORS 是允许跨源的机制。

### 同源定义

```
协议 + 域名 + 端口 三者完全相同才算同源

https://example.com:443/api  ← 基准
https://example.com:443/other  ✅ 同源
http://example.com:443/api     ❌ 协议不同
https://sub.example.com/api    ❌ 子域不同
https://example.com:3000/api   ❌ 端口不同
```

### 预检请求（Preflight）

```
复杂请求（POST + JSON、自定义 Header）会先发 OPTIONS 预检：

Browser → Server: OPTIONS /api/users
                  Origin: https://example.com
                  Access-Control-Request-Method: POST
                  Access-Control-Request-Headers: Content-Type

Server → Browser: Access-Control-Allow-Origin: https://example.com
                  Access-Control-Allow-Methods: GET, POST, PUT
                  Access-Control-Allow-Headers: Content-Type
                  Access-Control-Max-Age: 86400  ← 缓存预检结果

Browser → Server: POST /api/users（正式请求）
```

### 服务端配置

```javascript
// Express
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,          // 允许携带 Cookie
  maxAge: 86400,
}))

// Nginx
location /api {
  add_header Access-Control-Allow-Origin $http_origin always;
  add_header Access-Control-Allow-Credentials true always;
  add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
  add_header Access-Control-Allow-Headers 'Authorization, Content-Type' always;

  if ($request_method = 'OPTIONS') {
    add_header Access-Control-Max-Age 86400;
    return 204;
  }
}
```

```javascript
// 客户端：带 Cookie 的跨源请求
fetch('https://api.example.com/data', {
  credentials: 'include',  // 携带 Cookie
})
```

## 其他安全响应头

```http
# 防止点击劫持（iframe 嵌套攻击）
X-Frame-Options: DENY
# 或用 CSP：
Content-Security-Policy: frame-ancestors 'none';

# 防止 MIME 类型嗅探
X-Content-Type-Options: nosniff

# 强制 HTTPS（HSTS）
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# 引用来源策略
Referrer-Policy: strict-origin-when-cross-origin

# 权限策略（禁止不需要的浏览器 API）
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 安全存储

```javascript
// Token 存储方案对比
// localStorage：可被 XSS 窃取，但 CSRF 安全
localStorage.setItem('token', token)

// Cookie（HttpOnly + Secure + SameSite）：XSS 无法读取，最安全
// 由服务端 Set-Cookie，客户端无法用 JS 访问

// 推荐方案：
// Access Token → 内存（变量），短期有效（15分钟）
// Refresh Token → HttpOnly Cookie，用于续签

// 实现内存存储
let accessToken: string | null = null

export const tokenManager = {
  set: (token: string) => { accessToken = token },
  get: () => accessToken,
  clear: () => { accessToken = null },
}
```

## 依赖安全

```bash
# 定期审计
npm audit
pnpm audit

# 自动修复低风险漏洞
npm audit fix

# 使用 Snyk 扫描
npx snyk test

# GitHub Dependabot：自动 PR 更新有漏洞的依赖
# .github/dependabot.yml
```

## 延伸阅读

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN - Web 安全](https://developer.mozilla.org/zh-CN/docs/Web/Security)
- [web.dev - 安全](https://web.dev/secure/)
- [securityheaders.com](https://securityheaders.com/) — 检测响应头安全性
