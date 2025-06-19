# @icebreakers/monorepo 使用文档

## 简介

`@icebreakers/monorepo` 是一个 monorepo 配置生成器和管理工具，用于快速创建和管理 monorepo 项目。

## 安装

```bash
# 使用 npx 运行（推荐）
npx @icebreakers/monorepo@latest

# 或全局安装
npm install -g @icebreakers/monorepo
```

## 使用方式

### 基本命令

```bash
# 显示帮助信息
npx @icebreakers/monorepo --help

# 显示版本信息
npx @icebreakers/monorepo --version
```

### 主要功能

#### 1. 升级/同步 monorepo 配置（默认命令）

```bash
# 交互式模式
npx @icebreakers/monorepo -i

# 原始模式（非交互式）
npx @icebreakers/monorepo --raw

# 指定输出目录
npx @icebreakers/monorepo --outDir ./my-output
```

**功能说明：**
- 自动生成 monorepo 项目所需的配置文件
- 包括 `biome.json`、`tsconfig.json`、`turbo.json` 等
- 生成 Docker 相关配置文件
- 创建 `.vscode` 和 `.changeset` 配置

#### 2. 初始化项目

```bash
npx @icebreakers/monorepo init
```

**功能说明：**
- 初始化 `package.json` 文件
- 生成项目 `README.md`

#### 3. 创建新的子包

```bash
# 交互式创建
npx @icebreakers/monorepo new

# 指定包名
npx @icebreakers/monorepo new my-package

# 使用别名
npx @icebreakers/monorepo create my-package

# 使用模板选项
npx @icebreakers/monorepo new my-package --tsup      # 创建 tsup 库
npx @icebreakers/monorepo new my-package --unbuild   # 创建 unbuild 库
npx @icebreakers/monorepo new my-package --vue-ui    # 创建 Vue UI 库
```

**支持的模板类型：**
- `tsup`：使用 tsup 进行打包的库
- `unbuild`：使用 unbuild 进行打包的库
- `vue-lib`：Vue 组件库

#### 4. 同步到 npm 镜像

```bash
npx @icebreakers/monorepo sync
```

**功能说明：**
- 将所有子包同步到 npmmirror

#### 5. 清理项目

```bash
npx @icebreakers/monorepo clean
```

**功能说明：**
- 清除所有默认包

#### 6. 设置 VSCode 二进制镜像

```bash
npx @icebreakers/monorepo mirror
```

**功能说明：**
- 配置 VSCode 二进制文件镜像设置

## 配置选项

### 命令行选项

| 选项 | 描述 | 示例 |
|------|------|------|
| `-i, --interactive` | 交互式模式 | `npx @icebreakers/monorepo -i` |
| `--raw` | 原始模式（非交互式） | `npx @icebreakers/monorepo --raw` |
| `--outDir <dir>` | 指定输出目录 | `npx @icebreakers/monorepo --outDir ./output` |
| `-V, --version` | 显示版本信息 | `npx @icebreakers/monorepo --version` |
| `-h, --help` | 显示帮助信息 | `npx @icebreakers/monorepo --help` |

## 生成的文件结构

运行工具后，会生成以下文件：

```
project-root/
├── .changeset/
│   └── config.json
├── .vscode/
│   ├── extensions.json
│   └── settings.json
├── .dockerignore
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .npmrc
├── Dockerfile
├── biome.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
└── vitest.config.ts
```

## 环境要求

- Node.js >= v20.11.0
- 支持 ESM 模块

## 相关链接

- [官方文档](https://monorepo.icebreaker.top/)
- [GitHub 仓库](https://github.com/sonofmagic/monorepo-template)
- [问题反馈](https://github.com/sonofmagic/monorepo-template/issues)

## 示例用法

### 创建新的 monorepo 项目

```bash
# 1. 创建项目目录
mkdir my-monorepo
cd my-monorepo

# 2. 初始化 git
git init

# 3. 运行 monorepo 工具
npx @icebreakers/monorepo --raw

# 4. 初始化项目
npx @icebreakers/monorepo init

# 5. 创建第一个子包
npx @icebreakers/monorepo new my-first-package --tsup
```

### 在现有项目中使用

```bash
# 在现有项目根目录运行
npx @icebreakers/monorepo -i

# 选择需要的配置文件并生成
```