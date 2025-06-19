import os from 'node:os'
import chalk from 'chalk'
import ora from 'ora'
import {
  checkDependencies,
  type SystemDependencies,
} from '@/installer/checkDependencies'
import { detectHardware, type HardwareInfo, } from '@/installer/detectHardware'
import { formatBytes } from '@/utils/unit'

export interface Environment {
  platform: NodeJS.Platform
  arch: string
  nodeVersion: string
  memory: number
  dependencies: SystemDependencies
  hardware: HardwareInfo
}

/**
 * 检测环境
 */
export async function detectEnvironment(): Promise<Environment> {
  const spinner = ora('正在检测您的系统...').start()

  const hardware = await detectHardware()

  const environment: Environment = {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    memory: hardware.memory.total,
    dependencies: await checkDependencies(),
    hardware,
  }

  spinner.stop()
  return environment
}

/**
 * 显示环境信息摘要
 */
export function displayEnvironmentSummary(env: Environment): void {
  const output = generateEnvironmentSummary(env)
  console.log(output)
}

/**
 * 生成环境信息摘要（纯函数）
 */
function generateEnvironmentSummary(env: Environment): string {
  const sections = [
    `\n${chalk.cyan('🖥️  系统环境信息')}`,
    chalk.gray('─'.repeat(50)),
    generateBasicSystemInfo(env),
    generateHardwareInfo(env),
    generateDependenciesInfo(env),
    generateWarningsAndSuggestions(env),
    `\n${chalk.gray('─'.repeat(50))}`
  ]

  return sections.join('\n')
}

/**
 * 生成基本系统信息（纯函数）
 */
function generateBasicSystemInfo(env: Environment): string {
  const lines = [
    `${chalk.blue('操作系统:')} ${getPlatformName(env.platform)} (${env.arch})`,
    `${chalk.blue('Node.js:')} ${env.nodeVersion}`,
    `${chalk.blue('内存:')} ${formatBytes(env.memory)}`
  ]

  return lines.join('\n')
}

/**
 * 生成硬件信息（纯函数）
 */
function generateHardwareInfo(env: Environment): string {
  const lines = [
    `\n${chalk.cyan('🔧 硬件信息')}`,
    `${chalk.blue('CPU:')} ${env.hardware.cpu.model} (${env.hardware.cpu.cores} 核心)`,
    `${chalk.blue('内存:')} ${formatBytes(env.hardware.memory.total)} 总容量，${formatBytes(env.hardware.memory.available)} 可用`,
    generateGpuInfo(env.hardware.gpu),
    `${chalk.blue('磁盘:')} ${formatBytes(env.hardware.disk.total)} 总容量，${formatBytes(env.hardware.disk.available)} 可用`
  ]

  return lines.join('\n')
}

/**
 * 生成GPU信息（纯函数）
 */
function generateGpuInfo(gpu: HardwareInfo['gpu']): string {
  if (!gpu) {
    return `${chalk.blue('GPU:')} ${chalk.gray('未检测到独立显卡')}`
  }

  const gpuFeatures = getGpuFeatures(gpu)
  const featuresText = gpuFeatures.length > 0 ? ` (${gpuFeatures.join(', ')})` : ''
  const gpuLine = `${chalk.blue('GPU:')} ${gpu.vendor} ${gpu.model}${featuresText}`

  if (gpu.memory) {
    return `${gpuLine}\n${chalk.blue('显存:')} ${gpu.memory}MB`
  }

  return gpuLine
}

/**
 * 获取GPU特性列表（纯函数）
 */
function getGpuFeatures(gpu: NonNullable<HardwareInfo['gpu']>): string[] {
  const features: string[] = []
  if (gpu.cuda) features.push('CUDA')
  if (gpu.opencl) features.push('OpenCL')
  if (gpu.metal) features.push('Metal')
  return features
}

/**
 * 生成依赖项信息（纯函数）
 */
function generateDependenciesInfo(env: Environment): string {
  const deps = env.dependencies
  const lines = [
    `\n${chalk.cyan('📦 系统依赖')}`,
    `${chalk.blue('Git:')} ${getStatusText(deps.git.available)} ${deps.git.version || ''}`,
    `${chalk.blue('CMake:')} ${getStatusText(deps.cmake.available)} ${deps.cmake.version || ''}`,
    `${chalk.blue('编译器:')} ${getStatusText(deps.compiler.available)} ${deps.compiler.version || ''}`
  ]

  if (deps.python) {
    lines.push(
      `${chalk.blue('Python:')} ${getStatusText(deps.python.available)} ${deps.python.version || ''}`
    )
  }

  return lines.join('\n')
}

/**
 * 生成警告和建议（纯函数）
 */
function generateWarningsAndSuggestions(env: Environment): string {
  const warnings = getEnvironmentWarnings(env)
  const suggestions = getEnvironmentSuggestions(env)
  const sections: string[] = []

  if (warnings.length > 0) {
    sections.push(`\n${chalk.yellow('⚠️  警告')}`)
    warnings.forEach((warning) => {
      sections.push(chalk.yellow(`  • ${warning}`))
    })
  }

  if (suggestions.length > 0) {
    sections.push(`\n${chalk.green('💡 建议')}`)
    suggestions.forEach((suggestion) => {
      sections.push(chalk.green(`  • ${suggestion}`))
    })
  }

  return sections.join('\n')
}

/**
 * 获取平台名称（纯函数）
 */
function getPlatformName(platform: string): string {
  if (platform === 'darwin') return 'macOS'
  if (platform === 'linux') return 'Linux'
  if (platform === 'win32') return 'Windows'
  return 'Unknown'
}

/**
 * 获取状态文本（纯函数）
 */
function getStatusText(available: boolean): string {
  return available ? chalk.green('✓ 已安装') : chalk.red('✗ 未安装')
}

/**
 * 获取环境警告（纯函数）
 */
function getEnvironmentWarnings(env: Environment): string[] {
  const warnings: string[] = []

  const memoryWarnings = getMemoryWarnings(env.hardware.memory.total)
  const diskWarnings = getDiskWarnings(env.hardware.disk.available)
  const dependencyWarnings = getDependencyWarnings(env.dependencies)

  return [...warnings, ...memoryWarnings, ...diskWarnings, ...dependencyWarnings]
}

/**
 * 获取内存相关警告（纯函数）
 */
function getMemoryWarnings(totalMemory: number): string[] {
  if (totalMemory < 4) {
    return ['系统内存较少，可能影响大型模型的运行']
  }
  return []
}

/**
 * 获取磁盘相关警告（纯函数）
 */
function getDiskWarnings(availableDisk: number): string[] {
  if (availableDisk < 10) {
    return ['可用磁盘空间不足，建议清理磁盘或选择更小的模型']
  }
  return []
}

/**
 * 获取依赖项相关警告（纯函数）
 */
function getDependencyWarnings(dependencies: SystemDependencies): string[] {
  const warnings: string[] = []

  if (!dependencies.git.available) {
    warnings.push('Git 未安装，某些功能可能无法正常使用')
  }

  if (!dependencies.cmake.available) {
    warnings.push('CMake 未安装，无法编译本地依赖')
  }

  if (!dependencies.compiler.available) {
    warnings.push('编译器未安装，无法编译本地依赖')
  }

  return warnings
}

/**
 * 获取环境建议（纯函数）
 */
function getEnvironmentSuggestions(env: Environment): string[] {
  const gpuSuggestions = getGpuSuggestions(env.hardware.gpu)
  const memorySuggestions = getMemorySuggestions(env.hardware.memory.total)
  const cpuSuggestions = getCpuSuggestions(env.hardware.cpu.cores)

  return [...gpuSuggestions, ...memorySuggestions, ...cpuSuggestions]
}

/**
 * 获取GPU相关建议（纯函数）
 */
function getGpuSuggestions(gpu: HardwareInfo['gpu']): string[] {
  if (!gpu?.available) return []

  if (gpu.cuda) {
    return ['检测到 NVIDIA GPU，建议使用 CUDA 后端以获得更好的性能']
  } else if (gpu.metal) {
    return ['检测到 Apple GPU，建议使用 Metal 后端以获得更好的性能']
  } else if (gpu.opencl) {
    return ['检测到 OpenCL 支持，建议使用 OpenCL 后端']
  }

  return []
}

/**
 * 获取内存相关建议（纯函数）
 */
function getMemorySuggestions(totalMemory: number): string[] {
  if (totalMemory >= 16) {
    return ['系统内存充足，可以尝试使用更大的模型以获得更好的效果']
  } else if (totalMemory >= 8) {
    return ['建议使用 medium 或 small 模型以平衡性能和质量']
  } else {
    return ['建议使用 tiny 或 base 模型以确保流畅运行']
  }
}

/**
 * 获取CPU相关建议（纯函数）
 */
function getCpuSuggestions(cores: number): string[] {
  if (cores >= 8) {
    return ['CPU 核心数较多，可以增加处理线程数以提高速度']
  }
  return []
}

// async function checkDependencies() {
//   const deps = {
//     git: await checkCommand('git --version'),
//     cmake: await checkCommand('cmake --version'),
//     compiler: await checkCompiler()
//   }

//   return deps
// }

// async function checkCommand(command) {
//   try {
//     const result = await execAsync(command)
//     return {
//       available: true,
//       version: extractVersion(result.stdout)
//     }
//   } catch (error) {
//     return {
//       available: false,
//       error: error.message
//     }
//   }
// }
