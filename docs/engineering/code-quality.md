# 代码规范

> 好的代码规范不是束缚，是团队沟通的共同语言。自动化执行是关键——不要靠人工 review 来保证格式。

## 工具全景

```
代码检查（Linting）  →  ESLint（JS/TS）、Stylelint（CSS）
代码格式化           →  Prettier、Biome
提交规范             →  Commitlint + Conventional Commits
Git Hooks            →  Husky + lint-staged
一体化替代           →  Biome（ESLint + Prettier 合体，Rust 编写，极快）
```

## ESLint

静态分析工具，找出代码中的问题和不规范写法。

### 安装与配置（Flat Config，ESLint 9+）

```bash
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react
```

```javascript
// eslint.config.js（新的 flat config 格式）
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  // 忽略目录
  { ignores: ['dist', 'node_modules', '*.config.js'] },

  // JS 推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则
  ...tseslint.configs.recommended,

  // React 规则
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // React 17+ 不需要导入
      'react/prop-types': 'off',          // TypeScript 已经覆盖
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // 自定义规则
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },
)
```

### 常用规则说明

```javascript
{
  // 变量相关
  'no-unused-vars': 'error',           // 禁止未使用的变量
  'no-undef': 'error',                 // 禁止未定义的变量
  'prefer-const': 'error',             // 能用 const 就用 const
  'no-var': 'error',                   // 禁止 var

  // 代码质量
  'eqeqeq': ['error', 'always'],       // 必须用 === 而不是 ==
  'no-implicit-coercion': 'error',     // 禁止隐式类型转换
  'no-throw-literal': 'error',         // throw 必须是 Error 对象
  'no-return-await': 'error',          // 禁止多余的 return await

  // TypeScript 特有
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/consistent-type-imports': 'error', // import type
}
```

## Prettier

**只管格式，不管语法**。和 ESLint 分工明确：
- ESLint → 代码质量
- Prettier → 代码风格

```bash
npm install -D prettier eslint-config-prettier
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

```
// .prettierignore
dist
node_modules
*.min.js
pnpm-lock.yaml
```

:::tip ESLint + Prettier 共存
安装 `eslint-config-prettier` 禁用 ESLint 中与 Prettier 冲突的格式规则：

```javascript
// eslint.config.js
import prettierConfig from 'eslint-config-prettier'

export default [
  ...tseslint.configs.recommended,
  prettierConfig, // 放在最后，覆盖冲突规则
]
```
:::

## Biome（推荐新项目）

Biome 是 ESLint + Prettier 的 Rust 替代方案，**速度是传统方案的 10-35 倍**。

```bash
npm install -D @biomejs/biome
npx biome init
```

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error"
      },
      "style": {
        "useConst": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "asNeeded"
    }
  }
}
```

```bash
# 检查
npx biome check src/
# 格式化
npx biome format src/ --write
# 修复
npx biome lint src/ --apply
```

## Git Hooks：Husky + lint-staged

在提交代码前自动检查，防止问题进入仓库。

```bash
npm install -D husky lint-staged

# 初始化 husky
npx husky init
```

```bash
# .husky/pre-commit
npx lint-staged
```

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss}": [
      "stylelint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

## 提交规范：Conventional Commits

统一提交信息格式，便于自动生成 CHANGELOG 和版本管理。

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 类型说明

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档修改 |
| `style` | 代码格式（不影响逻辑）|
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统或依赖变更 |
| `ci` | CI 配置 |
| `chore` | 杂项（不改代码/测试）|
| `revert` | 回滚 |

```bash
# 示例
feat(auth): 添加 OAuth2 Google 登录
fix(button): 修复 disabled 状态下仍可点击的问题
docs(readme): 更新安装文档
refactor(api): 将 fetch 调用抽取为 useApi hook
perf(list): 使用虚拟滚动优化长列表性能

# 破坏性变更：在 footer 中标注
feat(api): 重构用户接口

BREAKING CHANGE: /api/users 接口不再支持 GET 方法获取单个用户，请使用 /api/users/:id
```

### Commitlint 配置

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

```javascript
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'build', 'ci', 'chore', 'revert'
    ]],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
  },
}
```

## EditorConfig

跨编辑器的基础格式配置：

```ini
# .editorconfig
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

## 推荐项目配置清单

```bash
frontend-project/
├── .editorconfig           # 编辑器基础配置
├── .prettierrc             # Prettier 格式配置
├── .prettierignore         # Prettier 忽略文件
├── eslint.config.js        # ESLint 规则配置
├── commitlint.config.js    # 提交规范配置
├── .husky/
│   ├── pre-commit          # 提交前：lint-staged
│   └── commit-msg          # 提交信息：commitlint
└── package.json            # lint-staged 配置
```

## 延伸阅读

- [ESLint 文档](https://eslint.org/)
- [Prettier 文档](https://prettier.io/)
- [Biome 文档](https://biomejs.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)
- [Husky 文档](https://typicode.github.io/husky/)
