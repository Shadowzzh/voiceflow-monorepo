import { promises as fs } from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import ora from 'ora'
import { YTDLP_DOWNLOAD_URL_DIR, YTDLP_INSTALL_DIR } from '@/config'
import { checkAppInstalled, checkYtDlpInstalled, getYtDlpExecutableName } from '@/installer/checkApp'
import type { Environment } from '@/installer/environment'
import { quickError, quickExit, safeRun } from '@/utils/error'
import { type DownloadProgress, downloadFile, makeExecutable } from '@/utils/file'
import { formatBytes } from '@/utils/unit'


/**
 * 执行 yt-dlp 安装
 * @param environment 环境
 */
export const executeYtDlpInstallation = async (environment: Environment, abortController?: AbortController) => {
  // 获取可执行文件名
  const executableName = getYtDlpExecutableName(environment)

  // 检查是否已安装
  const isInstalled = await checkYtDlpInstalled(executableName)
  if (isInstalled) {
    return
  }

  const spinner = ora('正在安装 yt-dlp...').start()


  // 创建安装目录
  await safeRun(
    () => fs.mkdir(YTDLP_INSTALL_DIR, { recursive: true }),
    '无法创建安装目录',
    '请检查权限或使用管理员权限运行'
  )

  const downloadUrl = `${YTDLP_DOWNLOAD_URL_DIR}/${executableName}`// yt-dlp 下载地址
  const ytDlpExecutablePath = path.join(YTDLP_INSTALL_DIR, executableName)// yt-dlp 可执行文件路径

  spinner.text = chalk.cyan('下载 yt-dlp 中...')

  await downloadYtDlp(downloadUrl, ytDlpExecutablePath, ({ progress, totalSize, currentSize }) => {
    spinner.text = chalk.cyan(
      `下载 yt-dlp 中... ${progress}% (${formatBytes(currentSize)}/${formatBytes(totalSize)})`
    )
  }, abortController)



  // 设置文件权限
  await makeExecutable(ytDlpExecutablePath)

  spinner.succeed('yt-dlp 安装成功')
}


/**
 * 下载 yt-dlp
 * @param downloadUrl 下载地址
 * @param ytDlpExecutablePath 可执行文件路径
 * @param abortController 中断控制器
 */
async function downloadYtDlp(downloadUrl: string, ytDlpExecutablePath: string, progress?: (progress: DownloadProgress) => void, abortController?: AbortController) {
  // 下载文件
  try {
    await downloadFile(
      downloadUrl,
      ytDlpExecutablePath,
      progress,
      abortController?.signal
    )
  } catch (error) {
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
}




