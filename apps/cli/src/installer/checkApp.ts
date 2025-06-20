import path from 'node:path'
import chalk from 'chalk'
import { WHISPER_CPP_INSTALL_DIR, YTDLP_INSTALL_DIR } from "@/config"
import type { Environment } from '@/installer/environment'
import { quickError } from "@/utils/error"
import { checkFileExists } from "@/utils/file"


/**
 * 检查应用是否已安装
 * @param environment 环境
 * @returns 是否已安装
 */
export async function checkAppInstalled(environment: Environment) {
  const ytDlpExecutableName = getYtDlpExecutableName(environment)
  const whisperCppExecutableName = '123'


  // 检查 yt-dlp 和 whisper.cpp 是否已安装
  const [isYtDlpExists, isWhisperCppExists] = await Promise.all([
    checkYtDlpInstalled(ytDlpExecutableName),
    checkWhisperCppInstalled(whisperCppExecutableName)
  ])

  console.log()

  if (!isYtDlpExists) {
    console.log(chalk.yellow(`🟡 未安装 yt-dlp`))
  }

  if (!isWhisperCppExists) {
    console.log(chalk.yellow(`🟡 未安装 whisper.cpp`))
  }

  console.log()


  return [isYtDlpExists, isWhisperCppExists]
}

/**
 * 获取 yt-dlp 可执行文件名
 * @param environment 环境
 * @returns 可执行文件名
 */
export function getYtDlpExecutableName(environment: Environment) {
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
 * 检查 yt-dlp 是否已安装
 * @param fileName 可执行文件名
 * @returns 是否已安装
 */
export async function checkYtDlpInstalled(fileName: string) {
  const targetPath = path.join(YTDLP_INSTALL_DIR, fileName)
  const isExists = await checkFileExists(targetPath)
  return isExists
}

/**
 * 检查 whisper.cpp 是否已安装
 * @param fileName 可执行文件名
 * @returns 是否已安装
 */
export async function checkWhisperCppInstalled(fileName: string) {
  const targetPath = path.join(WHISPER_CPP_INSTALL_DIR, fileName)
  const isExists = await checkFileExists(targetPath)
  return isExists
}