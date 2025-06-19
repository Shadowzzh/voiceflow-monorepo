# CLI 应用开发指南

本指南介绍如何在此 monorepo 中开发 CLI 应用。

## 现有 CLI 应用结构

monorepo 中已有一个示例 CLI 应用位于 `apps/cli/`：

```
apps/cli/
├── bin/                 # 构建后的可执行文件
├── dev/                 # 开发环境入口
│   └── index.ts
├── src/                 # 源代码
│   ├── cli.ts          # CLI 主逻辑
│   └── index.ts        # 入口文件
├── package.json        # 包配置
└── tsup.config.ts      # 构建配置
```

## 快速开始

### 1. 创建新的 CLI 应用

可以通过以下两种方式创建新的 CLI 应用：

#### 方式一：使用 monorepo 工具
```bash
# 使用内置模板创建新应用
pnpm script:init
```

#### 方式二：手动创建
```bash
# 在 apps/ 目录下创建新的 CLI 应用
mkdir apps/my-cli
cd apps/my-cli
```

### 2. 配置 package.json

参考现有 CLI 应用的 package.json 配置：

```json
{
  "name": "@icebreakers/my-cli",
  "type": "module",
  "version": "0.0.0",
  "description": "我的 CLI 应用",
  "bin": {
    "my-cli": "./dev/index.ts"
  },
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsup --watch --sourcemap",
    "build": "tsup"
  },
  "publishConfig": {
    "bin": {
      "my-cli": "./bin/index.js"
    }
  }
}
```

### 3. 创建源代码文件

#### src/index.ts
```typescript
import process from 'node:process'

console.log('我的 CLI 应用启动:', process.argv)
```

#### dev/index.ts
```typescript
#!/usr/bin/env tsx
import '../src/index.ts'
```

#### tsup.config.ts
```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true
})
```

## 开发流程

### 1. 安装依赖
```bash
# 在项目根目录执行
pnpm install
```

### 2. 开发模式
```bash
# 启动特定 CLI 应用的开发模式
pnpm --filter @icebreakers/my-cli dev

# 或者在 CLI 应用目录下执行
cd apps/my-cli
pnpm dev
```

### 3. 测试 CLI
```bash
# 直接运行开发版本
pnpm --filter @icebreakers/my-cli start

# 或使用 tsx 运行
tsx apps/my-cli/src/index.ts
```

### 4. 构建
```bash
# 构建特定 CLI 应用
pnpm --filter @icebreakers/my-cli build

# 构建所有应用
pnpm build
```

## 模板系统

monorepo 提供了多种模板，可以用于快速创建不同类型的包：

- **tsup-template**: 使用 tsup (esbuild) 的 TypeScript 包
- **unbuild-template**: 使用 unbuild 的 TypeScript 包  
- **vue-lib-template**: 使用 Vite 的 Vue 组件库

CLI 应用通常使用 tsup-template 作为基础。

## 最佳实践

### 1. 项目结构
- 将可执行逻辑放在 `src/` 目录
- 使用 `dev/index.ts` 作为开发环境入口
- 构建输出到 `bin/` 或 `dist/` 目录

### 2. 包命名
- 使用 `@icebreakers/` 作为命名空间
- CLI 命令名称应简洁明了

### 3. 开发工具
- 使用 `tsx` 进行开发时热重载
- 使用 `tsup` 进行生产构建
- 使用 `vitest` 进行测试

### 4. 依赖管理
- 在 package.json 中明确声明依赖
- 使用 `workspace:*` 引用 monorepo 内部包
- 避免在 CLI 中引入过重的依赖

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式（所有应用）
pnpm dev

# 开发特定 CLI 应用
pnpm --filter @icebreakers/my-cli dev

# 构建所有应用
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 格式化代码
pnpm format
```

## 发布

CLI 应用构建完成后，可以通过以下方式发布：

```bash
# 构建应用
pnpm build

# 发布包
pnpm --filter @icebreakers/my-cli publish
```

发布后，用户可以通过 npm/pnpm 安装和使用：

```bash
# 安装
npm install -g @icebreakers/my-cli

# 使用
my-cli --help
```