# 简洁犀利的错误处理方案

## 核心理念

对于小项目，错误处理要**快速、直接、用户友好**，不需要复杂的架构。

## 基于你现有代码的简化方案

你的 `src/utils/error.ts` 已经很好了，只需要添加几个简单的增强：

### 1. 添加快速错误处理函数

```typescript
// 在 src/utils/error.ts 中添加
export function quickError(message: string, suggestion?: string): never {
  console.log()
  console.error(chalk.red(`❌ ${message}`))
  if (suggestion) {
    console.log(chalk.cyan(`💡 ${suggestion}`))
  }
  console.log()
  process.exit(1)
}

export function quickWarn(message: string, suggestion?: string): void {
  console.log(chalk.yellow(`⚠️ ${message}`))
  if (suggestion) {
    console.log(chalk.gray(`提示: ${suggestion}`))
  }
}

export function quickSuccess(message: string): void {
  console.log(chalk.green(`✅ ${message}`))
}
```

### 2. 包装常见操作

```typescript
// 安全执行，失败直接退出
export async function safeRun<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  suggestion?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    quickError(`${errorMessage}: ${msg}`, suggestion)
  }
}

// 安全执行，失败返回默认值
export async function safeRunWithDefault<T>(
  operation: () => Promise<T>,
  defaultValue: T,
  warningMessage?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (warningMessage) {
      quickWarn(warningMessage)
    }
    return defaultValue
  }
}

// 网络请求包装
export async function safeDownload(
  url: string,
  targetPath: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<void> {
  await safeRun(
    () => downloadFile(url, targetPath, onProgress, signal),
    '下载失败',
    '请检查网络连接或稍后重试'
  )
}
```

### 3. 一行式错误处理

```typescript
// 检查条件，失败直接退出
export function assert(condition: boolean, message: string, suggestion?: string): asserts condition {
  if (!condition) {
    quickError(message, suggestion)
  }
}

// 检查值存在
export function assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value == null) {
    quickError(message)
  }
}

// 平台检查
export function assertPlatform(supportedPlatforms: string[], feature?: string): void {
  const platform = process.platform
  assert(
    supportedPlatforms.includes(platform),
    `不支持的平台: ${platform}`,
    feature 
      ? `${feature} 功能仅支持: ${supportedPlatforms.join(', ')}`
      : `仅支持: ${supportedPlatforms.join(', ')}`
  )
}
```

## 实际使用示例

### 重构你的安装函数

```typescript
// apps/cli/src/installer/automatic.ts
import { safeRun, safeDownload, quickSuccess, quickWarn, assertExists } from '@/utils/error'

export async function runAutomaticInstallation(environment: Environment, abortController?: AbortController) {
  const spinner = ora('正在安装 yt-dlp...').start()

  try {
    const executableName = getYtDlpExecutableName(environment)
    
    // 检查是否已安装
    const isInstalled = await checkYtDlpInstalled(executableName)
    if (isInstalled) {
      spinner.succeed('yt-dlp 已安装')
      return
    }

    // 创建目录
    await safeRun(
      () => fs.mkdir(YTDLP_INSTALL_DIR, { recursive: true }),
      '无法创建安装目录',
      '请检查权限或使用 sudo 运行'
    )

    // 下载文件
    const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/2025.06.09/${executableName}`
    const targetPath = path.join(YTDLP_INSTALL_DIR, executableName)
    
    spinner.text = chalk.cyan('下载 yt-dlp 中...')
    
    await safeDownload(downloadUrl, targetPath, ({ progress, totalSize, currentSize }) => {
      spinner.text = chalk.cyan(`下载 yt-dlp 中... ${progress}% (${formatBytes(currentSize)}/${formatBytes(totalSize)})`)
    }, abortController?.signal)

    spinner.succeed('yt-dlp 安装成功')
    
  } catch (error) {
    spinner.fail()
    
    // 用户取消
    if (error instanceof Error && (error.message.includes('取消') || error.name === 'AbortError')) {
      console.log(chalk.yellow('\n安装已被用户取消'))
      process.exit(0)
    }
    
    // 其他错误（safeRun 已经处理过了，这里不应该到达）
    throw error
  }
}
```

### 重构环境检测

```typescript
// apps/cli/src/installer/environment.ts
import { safeRunWithDefault, quickWarn, assertPlatform } from '@/utils/error'

export async function detectEnvironment(): Promise<Environment> {
  // 平台检查
  assertPlatform(['win32', 'darwin', 'linux'], 'yt-dlp 安装')
  
  const environment: Environment = {
    platform: process.platform as any,
    arch: process.arch as any,
    // 安全获取系统信息，失败时使用默认值
    memory: await safeRunWithDefault(
      () => getMemoryInfo(),
      { total: 0, available: 0 },
      '无法获取内存信息，使用默认值'
    ),
    disk: await safeRunWithDefault(
      () => getDiskInfo(),
      { total: 0, available: 0 },
      '无法获取磁盘信息，使用默认值'
    ),
    dependencies: await safeRunWithDefault(
      () => checkDependencies(),
      {},
      '部分依赖检查失败'
    )
  }
  
  return environment
}
```

### 简化命令行主入口

```typescript
// apps/cli/src/index.ts
import { quickError, safeRun } from '@/utils/error'

// 全局错误处理
process.on('uncaughtException', (error) => {
  quickError('程序遇到意外错误', '请重新运行，如问题持续请报告此错误')
})

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  quickError(`未处理的错误: ${message}`)
})

// 主函数
async function main() {
  await safeRun(
    () => runInteractiveSetup(),
    '设置失败',
    '请检查系统环境和网络连接后重试'
  )
}

main()
```

## 工具函数集合

```typescript
// 一些常用的快速检查
export const check = {
  // 检查网络连接
  network: async (url = 'https://www.google.com') => {
    await safeRun(
      () => fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) }),
      '网络连接失败',
      '请检查网络连接'
    )
  },

  // 检查命令存在
  command: async (cmd: string) => {
    await safeRun(
      () => execAsync(`which ${cmd}`),
      `命令 ${cmd} 不存在`,
      `请安装 ${cmd}`
    )
  },

  // 检查目录权限
  writePermission: async (dir: string) => {
    await safeRun(
      () => fs.access(dir, fs.constants.W_OK),
      `目录 ${dir} 无写入权限`,
      `请使用 sudo chmod 755 ${dir} 修改权限`
    )
  }
}
```

## 使用模式

```typescript
// ✅ 好的用法 - 简洁直接
await safeRun(
  () => downloadLargeFile(url, path),
  '下载失败',
  '请检查网络连接'
)

// ✅ 检查条件
assert(fs.existsSync(configFile), '配置文件不存在', '请先运行 init 命令')

// ✅ 获取值
const config = await safeRunWithDefault(
  () => loadConfig(),
  defaultConfig,
  '配置加载失败，使用默认配置'
)

// ✅ 快速反馈
quickSuccess('安装完成!')
quickWarn('跳过可选步骤')
```

## 总结

这个方案的特点：

1. **简洁**：只有几个核心函数，容易记忆
2. **直接**：错误直接显示并退出，不拖泥带水
3. **实用**：覆盖 90% 的常见场景
4. **渐进**：可以逐步替换现有代码
5. **零依赖**：基于你现有的错误处理架构

从最关键的下载和安装函数开始使用，逐步应用到其他地方。