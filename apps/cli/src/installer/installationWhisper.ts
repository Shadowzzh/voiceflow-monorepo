import { promises as fs } from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import ora, { type Ora } from 'ora'
import {
  MODEL_NAME,
  WHISPER_CPP_EXECUTABLE_PATH,
  WHISPER_CPP_INSTALL_DIR,
  WHISPER_CPP_REPO_URL,
  WHISPER_CPP_VERSION,
} from '@/config'
import { checkWhisperCppInstalled } from '@/installer/checkApp'
import { quickError, quickExit, safeRun } from '@/utils/error'
import { execCommand, safeExec } from '@/utils/exec'
import { checkFileExists } from '@/utils/file'

/**
 * 执行 whisper.cpp 安装
 * @param environment 环境
 * @param abortController 中断控制器
 */
export const executeWhisperInstallation = async (
  abortController?: AbortController
) => {
  // 检查是否已安装
  const isInstalled = await checkWhisperCppInstalled()
  if (isInstalled) {
    return
  }

  const spinner = ora('正在安装 whisper.cpp...').start()
  console.log()

  try {
    // 创建安装目录
    await safeRun(
      () => fs.mkdir(WHISPER_CPP_INSTALL_DIR, { recursive: true }),
      '无法创建安装目录',
      '请检查权限或使用管理员权限运行'
    )

    // 检查构建工具
    await checkBuildTools(spinner)

    // 克隆仓库
    await cloneWhisperRepo(spinner, abortController)

    // 构建项目
    await buildWhisperCpp(spinner, abortController)

    // 下载基础模型
    await downloadBaseModel(spinner, abortController)

    spinner.succeed('whisper.cpp 安装成功')
  } catch (error) {
    spinner.fail('whisper.cpp 安装失败')

    if (!(error instanceof Error)) {
      quickError('安装失败')
    }

    // 用户取消
    if (error.name === 'AbortError') {
      quickExit('安装已被用户取消')
    } else {
      quickError('安装失败', error.message || '请检查网络连接或稍后重试')
    }
  }
}

/**
 * 检查构建工具
 */
async function checkBuildTools(spinner: Ora) {
  spinner.text = chalk.cyan('检查构建工具...')

  // 检查 git
  const gitVersion = await safeExec('git --version')
  if (!gitVersion) {
    quickError('Git 未安装', '请先安装 Git')
  }

  // 检查 cmake
  const cmakeVersion = await safeExec('cmake --version')
  if (!cmakeVersion) {
    quickError('CMake 未安装', '请先安装 CMake')
  }

  // 检查编译器
  const platform = process.platform
  if (platform === 'win32') {
    // Windows: 检查 Visual Studio 或 MinGW
    const vcVersion = await safeExec('cl.exe 2>&1 | findstr "Version"')
    const gccVersion = await safeExec('gcc --version')
    if (!vcVersion && !gccVersion) {
      quickError('编译器未安装', '请安装 Visual Studio 或 MinGW')
    }
  } else {
    // macOS/Linux: 检查 gcc/clang
    const gccVersion =
      (await safeExec('gcc --version')) || (await safeExec('clang --version'))
    if (!gccVersion) {
      quickError('编译器未安装', '请安装 GCC 或 Clang')
    }
  }
}

/**
 * 克隆 whisper.cpp 仓库
 */
async function cloneWhisperRepo(
  spinner: Ora,
  abortController?: AbortController
) {
  spinner.text = chalk.cyan('克隆 whisper.cpp 仓库...')

  const repoPath = path.join(WHISPER_CPP_INSTALL_DIR, 'whisper.cpp')

  // 检查仓库是否已存在
  const repoExists = await checkFileExists(repoPath)
  if (!repoExists) {
    const args = [
      'clone',
      '--progress',
      '--depth',
      '1',
      '--branch',
      WHISPER_CPP_VERSION,
      WHISPER_CPP_REPO_URL,
      'whisper.cpp',
    ]

    // 克隆新仓库
    await execCommand('git', args, {
      cwd: WHISPER_CPP_INSTALL_DIR,
      abortController,
      stdoutCallback: ({ line }) => {
        if (
          line.includes('Receiving objects:') ||
          line.includes('Resolving deltas:')
        ) {
          const match = line.match(/(\d+)%/)
          const sizeMatch = line.match(/(\d+(?:\.\d+)?)\s*([KMGT]?B)/)
          if (match) {
            let text = `克隆 whisper.cpp 仓库... ${match[1]}%`
            if (sizeMatch) {
              text += ` (${sizeMatch[1]}${sizeMatch[2]})`
            }
            spinner.text = chalk.cyan(text)
          }
        }
      },
    })
  }

  // 检查克隆是否成功
  if (abortController?.signal.aborted) {
    throw new Error('AbortError')
  }
}

/**
 * 构建 whisper.cpp
 */
async function buildWhisperCpp(
  spinner: Ora,
  abortController?: AbortController
) {
  spinner.text = chalk.cyan('编译 whisper.cpp...')

  const repoPath = path.join(WHISPER_CPP_INSTALL_DIR, 'whisper.cpp')
  const buildPath = path.join(repoPath, 'build')

  // 创建构建目录
  await safeRun(
    () => fs.mkdir(buildPath, { recursive: true }),
    '无法创建构建目录',
    '请检查权限'
  )

  // 执行 CMake 配置
  spinner.text = chalk.cyan('配置构建环境...')
  const result = await safeExec('cmake -B build', {
    cwd: repoPath,
    abortController,
  })

  console.log()
  console.log('执行结果：')
  console.log(result)

  // 执行构建
  spinner.text = chalk.cyan('正在编译，请稍候...')
  await safeExec('cmake --build build --config Release', {
    cwd: repoPath,
    timeout: 10 * 60 * 1000, // 10分钟超时
    abortController,
  })

  console.log()
  console.log('执行结果：')
  console.log(result)

  // 检查是否被取消
  if (abortController?.signal.aborted) {
    throw new Error('AbortError')
  }

  // 验证构建结果
  const buildSuccess = await checkFileExists(WHISPER_CPP_EXECUTABLE_PATH)

  if (!buildSuccess) {
    throw new Error('构建失败，未找到可执行文件')
  }
}
/**
 * 创建下载进度回调
 */
function createDownloadCallbacks(spinner: Ora) {
  const stdoutCallback = ({ line }: { line: string }) => {
    if (line.includes('%') || line.includes('downloading')) {
      const progressMatch = line.match(/(\d+\.?\d*)%/)
      const sizeMatch = line.match(/(\d+(?:\.\d+)?)\s*([KMGT]?B)/i)

      if (progressMatch) {
        let text = `下载基础语音模型... ${progressMatch[1]}%`
        if (sizeMatch) {
          text += ` (${sizeMatch[1]}${sizeMatch[2]})`
        }
        spinner.text = chalk.cyan(text)
      } else {
        const truncatedLine =
          line.length > 50 ? `${line.substring(0, 50)}...` : line
        spinner.text = chalk.cyan(`下载基础语音模型... ${truncatedLine}`)
      }
    }
  }

  const stderrCallback = ({ line }: { line: string }) => {
    if (line.includes('Error') || line.includes('error')) {
      const truncatedLine =
        line.length > 50 ? `${line.substring(0, 50)}...` : line
      spinner.text = chalk.red(`下载错误: ${truncatedLine}`)
    }
  }

  return { stdoutCallback, stderrCallback }
}

/**
 * 执行模型下载脚本
 */
async function executeDownloadScript(
  platform: NodeJS.Platform,
  scriptPath: string,
  modelsPath: string,
  spinner: Ora,
  abortController?: AbortController
) {
  const { stdoutCallback, stderrCallback } = createDownloadCallbacks(spinner)
  const commonOptions = {
    cwd: modelsPath,
    timeout: 5 * 60 * 1000, // 5分钟超时
    stdoutCallback,
    stderrCallback,
    abortController,
  }

  if (platform === 'win32') {
    await execCommand(scriptPath, [MODEL_NAME.TINY], commonOptions)
  } else {
    await execCommand('bash', [scriptPath, MODEL_NAME.TINY_EN], commonOptions)
  }
}

/**
 * 下载基础模型
 */
async function downloadBaseModel(
  spinner: Ora,
  abortController?: AbortController
) {
  spinner.text = chalk.cyan('下载基础语音模型...')

  const repoPath = path.join(WHISPER_CPP_INSTALL_DIR, 'whisper.cpp')
  const modelsPath = path.join(repoPath, 'models')

  // 检查模型是否已存在
  const baseModelPath = path.join(modelsPath, 'ggml-base.en.bin')
  const modelExists = await checkFileExists(baseModelPath)

  if (!modelExists) {
    // 下载基础英文模型
    const platform = process.platform
    const downloadScript =
      platform === 'win32'
        ? 'download-ggml-model.cmd'
        : 'download-ggml-model.sh'

    const scriptPath = path.join(modelsPath, downloadScript)

    if (platform !== 'win32') {
      // Unix 系统需要设置执行权限
      await safeExec(`chmod +x "${scriptPath}"`, { abortController })
    }

    // 执行下载脚本
    await executeDownloadScript(
      platform,
      scriptPath,
      modelsPath,
      spinner,
      abortController
    )
  }

  if (abortController?.signal.aborted) {
    throw new Error('AbortError')
  }
}
