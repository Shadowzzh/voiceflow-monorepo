import chalk from 'chalk'

/**
 * 快速退出 - 显示退出信息
 * @param message 退出信息
 * @param suggestion 建议
 */
export function quickExit(message: string, suggestion?: string): never {
  console.log()
  console.log(chalk.yellow(`🔚 ${message}`)) // 使用蓝色和结束图标
  if (suggestion) {
    console.log(chalk.cyan(`💡 ${suggestion}`)) // 使用洋红色和提示图标
  }
  console.log()
  process.exit(0)
}

/**
 * 快速错误 - 显示错误并退出程序
 * @param message 错误信息
 * @param suggestion 建议
 */
export function quickError(message: string, suggestion?: string): never {
  console.log()
  console.error(chalk.red(`❌ ${message}`))
  if (suggestion) {
    console.log(chalk.cyan(`💡 ${suggestion}`))
  }
  console.log()
  process.exit(0)
}

/**
 * 快速警告 - 显示警告信息
 * @param message 警告信息
 * @param suggestion 建议
 */
export function quickWarn(message: string, suggestion?: string): void {
  console.log(chalk.yellow(`⚠️ ${message}`))
  if (suggestion) {
    console.log(chalk.gray(`提示: ${suggestion}`))
  }
}

/**
 * 快速成功 - 显示成功信息
 * @param message 成功信息
 */
export function quickSuccess(message: string): void {
  console.log(chalk.green(`✅ ${message}`))
}

/**
 * 安全执行 - 失败直接退出
 * @param operation 操作
 * @param errorMessage 错误信息
 * @param suggestion 建议
 */
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

/**
 * 安全执行 - 失败返回默认值
 * @param operation 操作
 * @param defaultValue 默认值
 * @param warningMessage 警告信息
 */
export async function safeRunWithDefault<T>(
  operation: () => Promise<T>,
  defaultValue: T,
  warningMessage?: string
): Promise<T> {
  try {
    return await operation()
  } catch {
    if (warningMessage) {
      quickWarn(warningMessage)
    }
    return defaultValue
  }
}

/** 检查条件 - 失败直接退出
 * @param condition 条件
 * @param message 错误信息
 * @param suggestion 建议
 */
export function assert(
  condition: boolean,
  message: string,
  suggestion?: string
): asserts condition {
  if (!condition) {
    quickError(message, suggestion)
  }
}

/** 检查值存在 - 为空直接退出
 * @param value 值
 * @param message 错误信息
 * @param suggestion 建议
 */
export function assertExists<T>(
  value: T | null | undefined,
  message: string,
  suggestion?: string
): asserts value is T {
  if (value == null) {
    quickError(message, suggestion)
  }
}
