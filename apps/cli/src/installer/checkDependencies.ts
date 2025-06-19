import { execAsync } from '@/utils/exec'

/** 依赖项信息 */
export interface DependencyInfo {
  /** 是否可用 */
  available: boolean
  /** 版本 */
  version?: string
  /** 错误信息 */
  error?: string
}

/** 系统依赖项 */
export interface SystemDependencies {
  /** git */
  git: DependencyInfo
  /** cmake */
  cmake: DependencyInfo
  /** 编译器 */
  compiler: DependencyInfo
  /** python */
  python?: DependencyInfo
  /** make */
  make?: DependencyInfo
}

/**
 * 检查系统依赖项
 * @returns 系统依赖项检查结果
 */
export async function checkDependencies(): Promise<SystemDependencies> {
  const dependencies: SystemDependencies = {
    git: await checkCommand('git --version'),
    cmake: await checkCommand('cmake --version'),
    compiler: await checkCompiler(),
  }

  // 可选依赖项
  try {
    dependencies.python = await checkCommand('python3 --version')
  } catch {
    dependencies.python = await checkCommand('python --version')
  }

  dependencies.make = await checkCommand('make --version')

  return dependencies
}

/**
 * 检查命令是否可用
 * @param command 要检查的命令
 * @returns 命令检查结果
 */
async function checkCommand(command: string): Promise<DependencyInfo> {
  try {
    const result = await execAsync(command)
    return {
      available: true,
      version: extractVersion(result.stdout),
    }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 检查编译器是否可用
 * @returns 编译器检查结果
 */
async function checkCompiler(): Promise<DependencyInfo> {
  // 优先检查 gcc
  try {
    const gccResult = await execAsync('gcc --version')
    return {
      available: true,
      version: `gcc ${extractVersion(gccResult.stdout)}`,
    }
  } catch {
    // 如果 gcc 不可用，检查 clang
    try {
      const clangResult = await execAsync('clang --version')
      return {
        available: true,
        version: `clang ${extractVersion(clangResult.stdout)}`,
      }
    } catch {
      return {
        available: false,
        error: '未找到 gcc 或 clang 编译器',
      }
    }
  }
}

/**
 * 从命令输出中提取版本信息
 * @param output 命令输出
 * @returns 版本字符串
 */
function extractVersion(output: string): string {
  // 匹配常见的版本格式：x.y.z 或 vx.y.z
  const versionMatch = output.match(/v?(\d+\.\d+(?:\.\d+)?)/i)
  return versionMatch ? versionMatch[1] : '未知版本'
}

/**
 * 检查所有依赖项是否满足要求
 * @param dependencies 依赖项检查结果
 * @returns 是否满足所有要求
 */
export function checkDependenciesRequirements(
  dependencies: SystemDependencies
): boolean {
  const requiredDeps = ['git', 'cmake', 'compiler'] as const

  return requiredDeps.every((dep) => dependencies[dep]?.available === true)
}

/**
 * 获取缺失的依赖项列表
 * @param dependencies 依赖项检查结果
 * @returns 缺失的依赖项名称数组
 */
export function getMissingDependencies(
  dependencies: SystemDependencies
): string[] {
  const missing: string[] = []

  if (!dependencies.git?.available) missing.push('git')
  if (!dependencies.cmake?.available) missing.push('cmake')
  if (!dependencies.compiler?.available) missing.push('gcc/clang')

  return missing
}
