import { promises as fs } from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import ora from 'ora'
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'
import { YTDLP_INSTALL_DIR } from '@/config'
import type { Environment } from '@/installer/environment'
import { quickError, quickExit, safeRun } from '@/utils/error'
import { downloadFile, makeExecutable } from '@/utils/file'
import { formatBytes } from '@/utils/unit'

/** yt-dlp 下载地址 */
const YTDLP_DOWNLOAD_URL_DIR =
  'https://github.com/yt-dlp/yt-dlp/releases/download/2025.06.09'

// 创建 EnvHttpProxyAgent 实例，它将自动读取环境变量
const envHttpProxyAgent = new EnvHttpProxyAgent()
setGlobalDispatcher(envHttpProxyAgent)

export async function runAutomaticInstallation(
  environment: Environment,
  abortController?: AbortController
) {
  // 获取可执行文件名
  const executableName = getYtDlpExecutableName(environment)

  // 检查是否已安装
  const isInstalled = await checkYtDlpInstalled(executableName)
  if (isInstalled) {
    console.log(chalk.green('yt-dlp 已安装 ✅'))
    return
  }

  const spinner = ora('正在安装 yt-dlp...').start()

  // 创建安装目录
  await safeRun(
    () => fs.mkdir(YTDLP_INSTALL_DIR, { recursive: true }),
    '无法创建安装目录',
    '请检查权限或使用管理员权限运行'
  )

  const downloadUrl = `${YTDLP_DOWNLOAD_URL_DIR}/${executableName}`
  // yt-dlp 可执行文件路径
  const ytDlpExecutablePath = path.join(YTDLP_INSTALL_DIR, executableName)

  spinner.text = chalk.cyan('下载 yt-dlp 中...')

  // 下载文件
  try {
    await downloadFile(
      downloadUrl,
      ytDlpExecutablePath,
      ({ progress, totalSize, currentSize }) => {
        spinner.text = chalk.cyan(
          `下载 yt-dlp 中... ${progress}% (${formatBytes(currentSize)}/${formatBytes(totalSize)})`
        )
      },
      abortController?.signal
    )
  } catch (error) {
    spinner.fail()

    if (!(error instanceof Error)) {
      quickError('安装失败')
    }

    // 用户取消
    if (error.name === 'AbortError') {
      quickExit('安装已被用户取消')
    } else {
      quickError('下载失败', '请检查网络连接或稍后重试')
    }
  }

  // 设置文件权限
  await makeExecutable(ytDlpExecutablePath)


  spinner.succeed('yt-dlp 安装成功')
}

/**
 * 获取 yt-dlp 可执行文件名
 * @param environment 环境
 * @returns 可执行文件名
 */
function getYtDlpExecutableName(environment: Environment) {
  switch (environment.platform) {
    case 'win32':
      return 'yt-dlp.exe'
    case 'darwin':
      return 'yt-dlp_macos'
    case 'linux':
      return environment.arch === 'arm64'
        ? 'yt-dlp_linux_aarch64'
        : 'yt-dlp_linux'
    default:
      quickError(`不支持的系统平台: ${environment.platform}`, '请检查系统平台')
  }
}

/**
 * 检查文件是否存在
 * @param path 文件路径
 * @returns 是否存在
 */
async function checkFileExists(path: string) {
  return fs
    .access(path)
    .then(() => true)
    .catch(() => false)
}

/**
 * 检查 yt-dlp 是否已安装
 * @param fileName 可执行文件名
 * @returns 是否已安装
 */
async function checkYtDlpInstalled(fileName: string) {
  const targetPath = path.join(YTDLP_INSTALL_DIR, fileName)
  const isExists = await checkFileExists(targetPath)
  return isExists
}
