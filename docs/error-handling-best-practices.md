# 错误处理最佳实践

## 概述

本文档提供了针对此 monorepo 项目的错误处理最佳实践和推荐方案。基于对现有代码的分析，我们建议采用分层、类型安全的错误处理方法。

## 核心原则

### 1. 分层错误处理
- **底层函数**：返回 Result 类型，不抛出异常
- **中层函数**：转换和丰富错误信息
- **顶层函数**：处理用户交互和显示

### 2. 类型安全
- 使用 TypeScript 的联合类型定义错误
- 避免使用 `any` 或 `unknown` 类型
- 提供完整的错误类型信息

### 3. 用户友好
- 区分技术错误和用户错误
- 提供可操作的错误建议
- 保持错误消息的一致性

## 推荐方案

### 1. Result 类型模式

```typescript
// 核心 Result 类型定义
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

// 辅助函数
export const ok = <T>(data: T): Result<T, never> => ({
  success: true,
  data
})

export const err = <E>(error: E): Result<never, E> => ({
  success: false,
  error
})

// 使用示例
async function downloadFileWithResult(url: string): Promise<Result<string, DownloadError>> {
  try {
    const result = await downloadFile(url)
    return ok(result)
  } catch (error) {
    return err(new DownloadError('下载失败', url, error))
  }
}
```

### 2. 错误类型系统

```typescript
// 基础错误类
export abstract class BaseError extends Error {
  abstract readonly code: string
  abstract readonly category: ErrorCategory
  
  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

// 错误分类
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  USER = 'user'
}

// 具体错误类型
export class NetworkError extends BaseError {
  readonly code = 'NETWORK_ERROR'
  readonly category = ErrorCategory.NETWORK
  
  constructor(message: string, public readonly url: string, cause?: Error) {
    super(message, { url, cause })
  }
}

export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR'
  readonly category = ErrorCategory.VALIDATION
  
  constructor(message: string, public readonly field: string, public readonly value: any) {
    super(message, { field, value })
  }
}

export class SystemError extends BaseError {
  readonly code = 'SYSTEM_ERROR'
  readonly category = ErrorCategory.SYSTEM
  
  constructor(message: string, public readonly operation: string, cause?: Error) {
    super(message, { operation, cause })
  }
}

export class UserError extends BaseError {
  readonly code = 'USER_ERROR'
  readonly category = ErrorCategory.USER
  
  constructor(message: string, public readonly suggestion?: string) {
    super(message, { suggestion })
  }
}
```

### 3. 错误处理工具函数

```typescript
// 安全执行函数
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const result = await fn()
    return ok(result)
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)))
  }
}

// 错误映射函数
export function mapError<T, E1, E2>(
  result: Result<T, E1>,
  mapper: (error: E1) => E2
): Result<T, E2> {
  if (result.success) {
    return result
  }
  return err(mapper(result.error))
}

// 错误链式处理
export function chain<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.success) {
    return fn(result.data)
  }
  return result
}

// 错误恢复
export function recover<T, E>(
  result: Result<T, E>,
  recovery: (error: E) => T
): T {
  if (result.success) {
    return result.data
  }
  return recovery(result.error)
}
```

### 4. 错误处理装饰器

```typescript
// 错误处理装饰器
export function withErrorHandler<T extends any[], R>(
  errorHandler?: (error: Error) => void
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: T): Promise<R> {
      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        if (errorHandler) {
          errorHandler(error as Error)
        }
        throw error
      }
    }
    
    return descriptor
  }
}

// 使用示例
class InstallService {
  @withErrorHandler((error) => {
    console.error('安装失败:', error.message)
  })
  async installDependency(name: string): Promise<void> {
    // 安装逻辑
  }
}
```

### 5. 统一错误处理器

```typescript
// 错误处理策略
export interface ErrorHandlingStrategy {
  canHandle(error: Error): boolean
  handle(error: Error): void
}

// 网络错误处理策略
export class NetworkErrorStrategy implements ErrorHandlingStrategy {
  canHandle(error: Error): boolean {
    return error instanceof NetworkError
  }
  
  handle(error: Error): void {
    const networkError = error as NetworkError
    console.error(chalk.red(`网络错误: ${networkError.message}`))
    console.log(chalk.yellow(`请检查网络连接或稍后重试`))
    console.log(chalk.gray(`URL: ${networkError.url}`))
  }
}

// 用户错误处理策略
export class UserErrorStrategy implements ErrorHandlingStrategy {
  canHandle(error: Error): boolean {
    return error instanceof UserError
  }
  
  handle(error: Error): void {
    const userError = error as UserError
    console.error(chalk.red(`操作失败: ${userError.message}`))
    if (userError.suggestion) {
      console.log(chalk.cyan(`建议: ${userError.suggestion}`))
    }
  }
}

// 错误处理器
export class ErrorHandler {
  private strategies: ErrorHandlingStrategy[] = [
    new NetworkErrorStrategy(),
    new UserErrorStrategy(),
    // 更多策略...
  ]
  
  handle(error: Error): void {
    const strategy = this.strategies.find(s => s.canHandle(error))
    if (strategy) {
      strategy.handle(error)
    } else {
      // 默认处理
      console.error(chalk.red(`未知错误: ${error.message}`))
    }
  }
}
```

## 实际应用示例

### 1. 文件下载错误处理

```typescript
// 使用 Result 模式重构文件下载
export async function downloadFileWithResult(
  url: string,
  targetPath: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<Result<void, DownloadError>> {
  try {
    await ensureDir(path.dirname(targetPath))
    
    const response = await fetch(url, { signal })
    
    if (!response.ok) {
      return err(new NetworkError(
        `HTTP ${response.status}: ${response.statusText}`,
        url
      ))
    }
    
    const totalSize = Number(response.headers.get('content-length'))
    if (!totalSize) {
      return err(new NetworkError('无法获取文件大小', url))
    }
    
    const fileStream = createWriteStream(targetPath)
    const reader = response.body?.getReader()
    
    if (!reader) {
      return err(new NetworkError('无法读取响应体', url))
    }
    
    let currentSize = 0
    
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      fileStream.write(value)
      currentSize += value.length
      
      if (onProgress) {
        const progress = Math.round((currentSize / totalSize) * 100)
        onProgress({ progress, totalSize, currentSize })
      }
    }
    
    fileStream.end()
    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve)
      fileStream.on('error', reject)
    })
    
    return ok(undefined)
    
  } catch (error) {
    if (signal?.aborted) {
      return err(new UserError('下载已取消'))
    }
    
    return err(new SystemError(
      '下载失败',
      'downloadFile',
      error instanceof Error ? error : new Error(String(error))
    ))
  }
}
```

### 2. 命令行错误处理

```typescript
// 重构 setup 命令
export async function setupCommand(): Promise<void> {
  const errorHandler = new ErrorHandler()
  
  const environmentResult = await safeAsync(() => detectEnvironment())
  if (!environmentResult.success) {
    errorHandler.handle(environmentResult.error)
    process.exit(1)
  }
  
  const installResult = await safeAsync(() => 
    runAutomaticInstallation(environmentResult.data)
  )
  
  if (!installResult.success) {
    errorHandler.handle(installResult.error)
    process.exit(1)
  }
  
  console.log(chalk.green('安装完成！'))
}
```

### 3. 全局错误处理

```typescript
// 在 index.ts 中设置全局错误处理
const errorHandler = new ErrorHandler()

process.on('uncaughtException', (error) => {
  console.error(chalk.red('未捕获的异常:'))
  errorHandler.handle(error)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('未处理的 Promise 拒绝:'))
  const error = reason instanceof Error ? reason : new Error(String(reason))
  errorHandler.handle(error)
  process.exit(1)
})

// 信号处理
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n程序被用户中断'))
  process.exit(0)
})
```

## 迁移建议

### 1. 渐进式迁移
- 从新功能开始使用 Result 模式
- 逐步重构现有的关键函数
- 保持向后兼容性

### 2. 重构优先级
1. **高频使用的工具函数**（如文件下载、命令执行）
2. **用户交互密集的功能**（如安装过程）
3. **错误处理复杂的模块**（如硬件检测）

### 3. 测试策略
- 为每种错误类型编写单元测试
- 测试错误处理策略的正确性
- 验证用户友好的错误消息

## 工具推荐

### 1. 开发工具
- **@types/node**: 提供 Node.js 类型定义
- **ts-pattern**: 用于模式匹配的库
- **fp-ts**: 函数式编程工具（可选）

### 2. 测试工具
- **vitest**: 用于单元测试
- **@vitest/coverage-v8**: 代码覆盖率
- **@testing-library/jest-dom**: DOM 测试工具

### 3. 代码质量
- **biome**: 代码检查和格式化
- **typescript-eslint**: TypeScript 特定的规则
- **prettier**: 代码格式化

## 针对本项目的 CLI 错误处理建议

### 1. 基于现有架构的优化

你的项目已经有了很好的错误处理基础（`src/utils/error.ts` 和 `src/utils/logger.ts`），建议在此基础上进行优化：

#### 1.1 增强现有错误类型系统

```typescript
// 扩展现有的 CLIError 接口
export interface EnhancedCLIError extends CLIError {
  // 添加错误恢复选项
  recoveryOptions?: {
    canRetry: boolean
    retryDelay?: number
    maxRetries?: number
    fallbackAction?: () => Promise<void>
  }
  
  // 添加用户操作建议
  actionSuggestions?: {
    primary: string
    secondary?: string[]
    documentation?: string
  }
  
  // 添加错误影响范围
  impact?: {
    severity: 'blocking' | 'degraded' | 'informational'
    affectedFeatures: string[]
  }
}
```

#### 1.2 CLI 特有的错误处理装饰器

```typescript
// 为 CLI 命令添加统一错误处理
export function cliCommand(options?: {
  name?: string
  category?: ErrorCategory
  allowRetry?: boolean
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const commandName = options?.name || propertyKey
    
    descriptor.value = async function (...args: any[]) {
      const timer = createTimer(commandName)
      
      try {
        logger.info(`开始执行命令: ${commandName}`)
        const result = await originalMethod.apply(this, args)
        timer.end({ success: true })
        return result
        
      } catch (error) {
        timer.end({ success: false })
        
        // 根据错误类型进行处理
        const cliError = error instanceof Error 
          ? mapErrorToCliError(error, options?.category)
          : createCLIError(
              ErrorCategory.UNKNOWN,
              ErrorSeverity.HIGH,
              '未知错误',
              '命令执行失败'
            )
        
        // 如果允许重试且错误可恢复，询问用户是否重试
        if (options?.allowRetry && cliError.recoveryOptions?.canRetry) {
          const shouldRetry = await promptRetry(cliError)
          if (shouldRetry) {
            return await originalMethod.apply(this, args)
          }
        }
        
        safeExit(cliError, { verbose: process.env.DEBUG === 'true' })
      }
    }
    
    return descriptor
  }
}
```

### 2. CLI 特定的错误处理模式

#### 2.1 交互式错误恢复

```typescript
// 交互式错误恢复系统
export class InteractiveErrorRecovery {
  static async handleError(error: EnhancedCLIError): Promise<void> {
    displayError(error)
    
    // 如果有恢复选项，询问用户
    if (error.recoveryOptions?.canRetry) {
      const { action } = await enquirer.prompt({
        type: 'select',
        name: 'action',
        message: '选择下一步操作:',
        choices: [
          { name: '重试', value: 'retry' },
          { name: '跳过', value: 'skip' },
          { name: '退出', value: 'exit' },
          ...(error.recoveryOptions.fallbackAction ? [{ name: '使用备选方案', value: 'fallback' }] : [])
        ]
      })
      
      switch (action) {
        case 'retry':
          await this.retryWithDelay(error)
          break
        case 'fallback':
          if (error.recoveryOptions.fallbackAction) {
            await error.recoveryOptions.fallbackAction()
          }
          break
        case 'skip':
          console.log(chalk.yellow('跳过当前操作'))
          break
        case 'exit':
          process.exit(getExitCode(error))
      }
    }
  }
  
  private static async retryWithDelay(error: EnhancedCLIError): Promise<void> {
    const delay = error.recoveryOptions?.retryDelay || 1000
    console.log(chalk.blue(`${delay}ms 后重试...`))
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}
```

#### 2.2 渐进式错误降级

```typescript
// 功能降级策略
export class FeatureDegradation {
  private static fallbackStrategies = new Map<string, () => Promise<void>>()
  
  static register(feature: string, fallback: () => Promise<void>): void {
    this.fallbackStrategies.set(feature, fallback)
  }
  
  static async tryWithFallback<T>(
    feature: string,
    primaryAction: () => Promise<T>,
    fallbackAction?: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryAction()
    } catch (error) {
      logger.warn(`功能 ${feature} 失败，尝试降级处理`)
      
      if (fallbackAction) {
        return await fallbackAction()
      }
      
      const registeredFallback = this.fallbackStrategies.get(feature)
      if (registeredFallback) {
        await registeredFallback()
      }
      
      throw error
    }
  }
}
```

### 3. 为你的项目量身定制的错误处理

#### 3.1 网络下载错误处理优化

```typescript
// 基于你现有的 downloadFile 函数优化
export async function downloadFileWithRecovery(
  url: string,
  targetPath: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<void> {
  const maxRetries = 3
  let attempt = 0
  
  while (attempt < maxRetries) {
    try {
      attempt++
      await downloadFile(url, targetPath, onProgress, signal)
      return
      
    } catch (error) {
      const cliError = handleNetworkError(error as Error, url)
      
      if (attempt === maxRetries) {
        // 最后一次尝试失败，提供更多选项
        const enhancedError: EnhancedCLIError = {
          ...cliError,
          recoveryOptions: {
            canRetry: true,
            retryDelay: 2000,
            maxRetries: 3
          },
          actionSuggestions: {
            primary: '检查网络连接',
            secondary: [
              '尝试使用代理',
              '检查防火墙设置',
              '稍后重试'
            ],
            documentation: 'https://github.com/your-repo/docs/network-issues'
          }
        }
        
        await InteractiveErrorRecovery.handleError(enhancedError)
        return
      }
      
      // 中间尝试失败，显示简单的重试信息
      console.log(chalk.yellow(`下载失败 (${attempt}/${maxRetries})，2秒后重试...`))
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}
```

#### 3.2 环境检测错误处理

```typescript
// 优化你的环境检测错误处理
export async function detectEnvironmentWithRecovery(): Promise<Environment> {
  try {
    return await detectEnvironment()
  } catch (error) {
    const cliError = createCLIError(
      ErrorCategory.SYSTEM_RESOURCE,
      ErrorSeverity.HIGH,
      '环境检测失败',
      '无法检测系统环境',
      {
        suggestion: '请确保系统命令可用，或手动指定环境配置',
        code: 'ENV_DETECTION_FAILED',
        originalError: error as Error
      }
    )
    
    // 提供手动配置选项
    const { useManualConfig } = await enquirer.prompt({
      type: 'confirm',
      name: 'useManualConfig',
      message: '是否手动配置环境信息？',
      initial: true
    })
    
    if (useManualConfig) {
      return await promptManualEnvironmentConfig()
    }
    
    safeExit(cliError)
  }
}
```

### 4. CLI 用户体验增强

#### 4.1 错误上下文展示

```typescript
// 增强错误显示，包含操作上下文
export function displayErrorWithContext(
  error: EnhancedCLIError, 
  context: {
    command?: string
    step?: string
    progress?: number
    totalSteps?: number
  },
  options?: { verbose?: boolean }
): void {
  const { verbose = false } = options || {}
  
  console.log()
  
  // 显示当前操作上下文
  if (context.command) {
    console.log(chalk.gray(`命令: ${context.command}`))
  }
  
  if (context.step) {
    console.log(chalk.gray(`步骤: ${context.step}`))
  }
  
  if (context.progress && context.totalSteps) {
    const progressBar = '█'.repeat(Math.floor(context.progress / context.totalSteps * 20))
    const emptyBar = '░'.repeat(20 - progressBar.length)
    console.log(chalk.gray(`进度: [${progressBar}${emptyBar}] ${context.progress}/${context.totalSteps}`))
  }
  
  // 显示错误信息
  displayError(error, options)
  
  // 显示操作建议
  if (error.actionSuggestions) {
    console.log(chalk.cyan(`💡 建议操作: ${error.actionSuggestions.primary}`))
    
    if (error.actionSuggestions.secondary) {
      console.log(chalk.gray('其他选项:'))
      error.actionSuggestions.secondary.forEach((suggestion, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${suggestion}`))
      })
    }
    
    if (error.actionSuggestions.documentation) {
      console.log(chalk.blue(`📚 查看文档: ${error.actionSuggestions.documentation}`))
    }
  }
}
```

#### 4.2 错误报告和反馈

```typescript
// 错误报告系统
export class ErrorReporter {
  static async reportError(error: EnhancedCLIError, context?: any): Promise<void> {
    const { shouldReport } = await enquirer.prompt({
      type: 'confirm',
      name: 'shouldReport',
      message: '是否发送错误报告以帮助改进程序？',
      initial: false
    })
    
    if (!shouldReport) return
    
    const report = {
      error: {
        category: error.category,
        severity: error.severity,
        message: error.message,
        code: error.code
      },
      system: getSystemInfo(),
      context,
      timestamp: Date.now()
    }
    
    try {
      // 发送到错误收集服务
      await this.sendReport(report)
      console.log(chalk.green('✅ 错误报告已发送，感谢您的反馈！'))
    } catch (reportError) {
      console.log(chalk.yellow('⚠️ 错误报告发送失败，但已保存到本地'))
      this.saveReportLocally(report)
    }
  }
  
  private static async sendReport(report: any): Promise<void> {
    // 实现错误报告发送逻辑
    logger.debug('发送错误报告', report)
  }
  
  private static saveReportLocally(report: any): void {
    // 保存错误报告到本地文件
    const reportPath = path.join(os.homedir(), '.voiceflow-cli', 'error-reports')
    try {
      if (!existsSync(reportPath)) {
        mkdirSync(reportPath, { recursive: true })
      }
      
      const filename = `error-${Date.now()}.json`
      writeFileSync(
        path.join(reportPath, filename),
        JSON.stringify(report, null, 2)
      )
    } catch (error) {
      logger.error('保存错误报告失败', error)
    }
  }
}
```

### 5. 实际应用示例

#### 5.1 重构安装命令

```typescript
// 使用新的错误处理系统重构安装命令
export class InstallCommand {
  @cliCommand({ name: 'install', category: ErrorCategory.DEPENDENCY, allowRetry: true })
  async execute(): Promise<void> {
    const steps = [
      { name: '检测环境', action: () => this.detectEnvironment() },
      { name: '下载依赖', action: () => this.downloadDependencies() },
      { name: '安装程序', action: () => this.installProgram() },
      { name: '验证安装', action: () => this.validateInstallation() }
    ]
    
    let currentStep = 0
    
    for (const step of steps) {
      currentStep++
      
      try {
        console.log(chalk.blue(`[${currentStep}/${steps.length}] ${step.name}...`))
        await step.action()
        console.log(chalk.green(`✅ ${step.name}完成`))
        
      } catch (error) {
        const cliError = this.mapStepError(error as Error, step.name)
        
        await displayErrorWithContext(cliError, {
          command: 'install',
          step: step.name,
          progress: currentStep,
          totalSteps: steps.length
        })
        
        // 某些步骤失败可以继续，某些必须停止
        if (this.isCriticalStep(step.name)) {
          await InteractiveErrorRecovery.handleError(cliError)
        } else {
          console.log(chalk.yellow(`⚠️ ${step.name}失败，但可以继续`))
        }
      }
    }
  }
  
  private mapStepError(error: Error, step: string): EnhancedCLIError {
    // 根据步骤和错误类型映射到具体的错误处理
    switch (step) {
      case '检测环境':
        return this.createEnvironmentError(error)
      case '下载依赖':
        return this.createDownloadError(error)
      case '安装程序':
        return this.createInstallError(error)
      case '验证安装':
        return this.createValidationError(error)
      default:
        return createCLIError(
          ErrorCategory.UNKNOWN,
          ErrorSeverity.MEDIUM,
          error.message,
          `${step}失败`
        )
    }
  }
  
  private isCriticalStep(step: string): boolean {
    return ['检测环境', '下载依赖'].includes(step)
  }
}
```

### 6. 配置和最佳实践

#### 6.1 错误处理配置

```typescript
// 创建错误处理配置
export interface ErrorHandlingConfig {
  enableInteractiveRecovery: boolean
  enableErrorReporting: boolean
  maxRetries: number
  retryDelay: number
  verboseErrors: boolean
  logLevel: LogLevel
}

export const DEFAULT_ERROR_CONFIG: ErrorHandlingConfig = {
  enableInteractiveRecovery: true,
  enableErrorReporting: false,
  maxRetries: 3,
  retryDelay: 1000,
  verboseErrors: process.env.DEBUG === 'true',
  logLevel: process.env.DEBUG ? LogLevel.DEBUG : LogLevel.INFO
}
```

#### 6.2 CLI 特定的退出码

```typescript
// 扩展退出码，更符合 CLI 应用规范
export const CLI_EXIT_CODES = {
  ...EXIT_CODES,
  PARTIAL_SUCCESS: 10,      // 部分成功
  SKIPPED: 11,              // 跳过操作
  RETRY_LIMIT_EXCEEDED: 12, // 重试次数超限
  USER_ABORT: 13,           // 用户主动中止
  CONFIGURATION_ERROR: 14,  // 配置错误
  VALIDATION_FAILED: 15,    // 验证失败
} as const
```

## 总结

基于你的项目特点，我推荐：

1. **保持现有架构**：你的错误处理基础很好，在此基础上增强
2. **添加交互式恢复**：让用户可以选择如何处理错误
3. **实现渐进式降级**：部分功能失败时提供备选方案
4. **增强用户体验**：更好的错误显示和操作建议
5. **添加错误报告**：帮助改进程序质量

这套方案既保持了你现有代码的架构，又大幅提升了错误处理的用户体验和程序健壮性。从关键的下载和安装功能开始逐步应用这些改进。