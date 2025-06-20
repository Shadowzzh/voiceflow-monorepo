import { exec, type SpawnOptionsWithoutStdio, spawn } from 'node:child_process'
import { promisify } from 'node:util'

// 调试模式配置
const DEBUG_MODE = process.env.DEBUG === 'true'

/**
 * 执行命令的通用函数
 * @param command 命令
 * @param args 命令参数
 * @param options 命令选项
 * @returns 命令执行结果
 */
export const execAsync = promisify(exec)

interface CallbackArgs {
  line: string
}

interface SpawnOptions extends SpawnOptionsWithoutStdio {
  stdoutCallback?: (args: CallbackArgs) => void
  stderrCallback?: (args: CallbackArgs) => void
}

/**
 * 安全执行命令的包装函数
 */
export async function safeExec(
  command: string,
  options: { cwd?: string, timeout?: number } = {},

): Promise<string | null> {
  const { cwd, timeout = 10000 } = options

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const result = await execAsync(command, { signal: controller.signal, cwd })
    clearTimeout(timeoutId)

    return result.stdout.trim()
  } catch (error) {
    if (DEBUG_MODE) {
      console.warn(`命令执行失败: ${command}`, error)
    }
    return null
  }
}

/**
 * 执行命令的通用函数
 * @param command 命令
 * @param args 命令参数
 * @param options 命令选项
 * @returns 命令执行结果
 */
export const execCommand = (
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
) => {
  const { timeout = 3 * 60 * 1000, stdoutCallback, stderrCallback } = options

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    console.log(`执行: ${command} ${args.join(' ')}`)

    const process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    })

    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data) => {
      stdout += data.toString()
      stdoutCallback?.({ line: data.toString() })
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
      stderrCallback?.({ line: data.toString() })
    })

    const timer = setTimeout(() => {
      process.kill('SIGKILL')
      reject(new Error('操作超时'))
    }, timeout)

    process.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(stderr || `退出码: ${code}`))
      }
    })

    process.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}
