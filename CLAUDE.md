# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在处理此仓库代码时提供指导。

##  使用中文回复

## 开发命令

这是一个基于 pnpm 的 monorepo，由 Turbo 管理。所有命令都应该在根目录下运行。

**包管理：**
- `pnpm install` - 安装依赖（必需：pnpm，由 preinstall 钩子强制执行）
- `pnpm dev` - 并行启动所有应用的开发模式
- `pnpm build` - 构建所有包和应用
- `pnpm test` - 在所有包中运行测试
- `pnpm test:dev` - 在监视模式下运行测试

**代码质量：**
- `pnpm lint` - 使用 Biome linter 检查代码
- `pnpm lint:fix` - 自动修复 linting 问题
- `pnpm format` - 使用 Biome 格式化代码

**Monorepo 管理：**
- `pnpm script:init` - 初始化 monorepo 结构
- `pnpm script:sync` - 同步 monorepo 依赖和配置
- `pnpm script:clean` - 清理生成的文件
- `pnpm script:mirror` - 镜像/同步二进制依赖

**单个应用命令：**
- CLI 应用：`pnpm --filter @icebreakers/cli dev`
- 服务器应用：`pnpm --filter @icebreakers/server dev`

## 架构

这是一个围绕 `@icebreakers/monorepo` 包构建的 monorepo 模板系统，该包提供了创建和管理 monorepo 结构的工具。

**结构：**
- `apps/` - 应用包（cli、server、website）
- `packages/` - 可重用包和模板
- `packages/monorepo/` - 核心 monorepo 管理工具
- `packages/*-template/` - 不同构建系统的模板包

**核心组件：**
- **Monorepo 工具**（`packages/monorepo/`）：用于初始化、同步和管理 monorepo 结构的 CLI 工具
- **模板**：为 tsup、unbuild 和 Vue 库构建预配置的模板
- **构建系统**：使用 Turbo 进行任务编排，tsup/unbuild 进行包构建
- **测试**：使用 Vitest 在所有包中进行覆盖测试
- **代码检查**：使用 Biome 进行格式化和代码检查（替代 ESLint/Prettier）

**模板系统：**
monorepo 工具可以使用 `packages/monorepo/templates/` 中的模板生成新项目：
- `tsup-template` - 使用 tsup (esbuild) 的 TypeScript 包
- `unbuild-template` - 使用 unbuild 的 TypeScript 包
- `vue-lib-template` - 使用 Vite 的 Vue 组件库

**构建配置：**
- 使用 Turbo 进行构建编排，具有依赖感知缓存
- 各个包使用 tsup 或 unbuild 进行构建
- 输出到 `dist/` 目录
- 使用严格配置的 TypeScript

**环境要求：**
- Node.js >= 20.0.0
- pnpm（由 preinstall 钩子强制执行）
- 全程使用 ES 模块