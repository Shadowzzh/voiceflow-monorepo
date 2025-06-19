import os from 'node:os'
import chalk from 'chalk'
import ora from 'ora'
import { checkDependencies, type SystemDependencies } from '@/installer/checkDependencies'
import { detectHardware, type HardwareInfo } from '@/installer/detectHardware'

export interface Environment {
  platform: string
  arch: string
  nodeVersion: string
  memory: number
  dependencies: SystemDependencies
  hardware: HardwareInfo
}

export async function detectEnvironment() {
  const spinner = ora('正在检测您的系统...').start()

  const environment: Environment = {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    memory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
    dependencies: await checkDependencies(),
    hardware: await detectHardware()
  }

  spinner.stop()
  return environment
}

/**
 * 显示环境信息摘要
 */
export function displayEnvironmentSummary(env: Environment) {
  console.log(`\n${chalk.cyan('🖥️  系统环境信息')}`)
  console.log(chalk.gray('─'.repeat(50)))

  // 基本系统信息
  console.log(`${chalk.blue('操作系统:')} ${getPlatformName(env.platform)} (${env.arch})`)
  console.log(`${chalk.blue('Node.js:')} ${env.nodeVersion}`)
  console.log(`${chalk.blue('内存:')} ${env.memory}GB`)

  // 硬件信息
  console.log(`\n${chalk.cyan('🔧 硬件信息')}`)
  console.log(`${chalk.blue('CPU:')} ${env.hardware.cpu.model} (${env.hardware.cpu.cores} 核心)`)
  console.log(`${chalk.blue('内存:')} ${env.hardware.memory.total}GB 总容量，${env.hardware.memory.available}GB 可用`)

  if (env.hardware.gpu) {
    const gpuInfo = env.hardware.gpu
    const gpuFeatures = []
    if (gpuInfo.cuda) gpuFeatures.push('CUDA')
    if (gpuInfo.opencl) gpuFeatures.push('OpenCL')
    if (gpuInfo.metal) gpuFeatures.push('Metal')

    const featuresText = gpuFeatures.length > 0 ? ` (${gpuFeatures.join(', ')})` : ''
    console.log(`${chalk.blue('GPU:')} ${gpuInfo.vendor} ${gpuInfo.model}${featuresText}`)

    if (gpuInfo.memory) {
      console.log(`${chalk.blue('显存:')} ${gpuInfo.memory}MB`)
    }
  } else {
    console.log(`${chalk.blue('GPU:')} ${chalk.gray('未检测到独立显卡')}`)
  }

  console.log(`${chalk.blue('磁盘:')} ${env.hardware.disk.total}GB 总容量，${env.hardware.disk.available}GB 可用`)

  // 依赖项检查
  console.log(`\n${chalk.cyan('📦 系统依赖')}`)
  const deps = env.dependencies

  console.log(`${chalk.blue('Git:')} ${getStatusText(deps.git.available)} ${deps.git.version || ''}`)
  console.log(`${chalk.blue('CMake:')} ${getStatusText(deps.cmake.available)} ${deps.cmake.version || ''}`)
  console.log(`${chalk.blue('编译器:')} ${getStatusText(deps.compiler.available)} ${deps.compiler.version || ''}`)

  if (deps.python) {
    console.log(`${chalk.blue('Python:')} ${getStatusText(deps.python.available)} ${deps.python.version || ''}`)
  }

  // 显示警告
  const warnings = getEnvironmentWarnings(env)
  if (warnings.length > 0) {
    console.log(`\n${chalk.yellow('⚠️  警告')}`)
    warnings.forEach(warning => {
      console.log(chalk.yellow(`  • ${warning}`))
    })
  }

  // 显示建议
  const suggestions = getEnvironmentSuggestions(env)
  if (suggestions.length > 0) {
    console.log(`\n${chalk.green('💡 建议')}`)
    suggestions.forEach(suggestion => {
      console.log(chalk.green(`  • ${suggestion}`))
    })
  }

  console.log(`\n${chalk.gray('─'.repeat(50))}`)
}

function getPlatformName(platform: string) {
  if (platform === 'darwin') return 'macOS'
  if (platform === 'linux') return 'Linux'
  if (platform === 'win32') return 'Windows'
  return 'Unknown'
}

function getStatusText(available: boolean): string {
  return available ? chalk.green('✓ 已安装') : chalk.red('✗ 未安装')
}

function getEnvironmentWarnings(env: Environment): string[] {
  const warnings: string[] = []

  // 内存警告
  if (env.hardware.memory.total < 4) {
    warnings.push('系统内存较少，可能影响大型模型的运行')
  }

  // 磁盘空间警告
  if (env.hardware.disk.available < 10) {
    warnings.push('可用磁盘空间不足，建议清理磁盘或选择更小的模型')
  }

  // 依赖项警告
  if (!env.dependencies.git.available) {
    warnings.push('Git 未安装，某些功能可能无法正常使用')
  }

  if (!env.dependencies.cmake.available) {
    warnings.push('CMake 未安装，无法编译本地依赖')
  }

  if (!env.dependencies.compiler.available) {
    warnings.push('编译器未安装，无法编译本地依赖')
  }

  return warnings
}

function getEnvironmentSuggestions(env: Environment): string[] {
  const suggestions: string[] = []

  // GPU 建议
  if (env.hardware.gpu?.available) {
    if (env.hardware.gpu.cuda) {
      suggestions.push('检测到 NVIDIA GPU，建议使用 CUDA 后端以获得更好的性能')
    } else if (env.hardware.gpu.metal) {
      suggestions.push('检测到 Apple GPU，建议使用 Metal 后端以获得更好的性能')
    } else if (env.hardware.gpu.opencl) {
      suggestions.push('检测到 OpenCL 支持，建议使用 OpenCL 后端')
    }
  }

  // 模型建议
  if (env.hardware.memory.total >= 16) {
    suggestions.push('系统内存充足，可以尝试使用更大的模型以获得更好的效果')
  } else if (env.hardware.memory.total >= 8) {
    suggestions.push('建议使用 medium 或 small 模型以平衡性能和质量')
  } else {
    suggestions.push('建议使用 tiny 或 base 模型以确保流畅运行')
  }

  // 线程建议
  if (env.hardware.cpu.cores >= 8) {
    suggestions.push('CPU 核心数较多，可以增加处理线程数以提高速度')
  }

  return suggestions
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