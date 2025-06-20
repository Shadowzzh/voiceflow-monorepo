import path from 'node:path'
import chalk from 'chalk'
import { WHISPER_CPP_INSTALL_DIR, YTDLP_INSTALL_DIR } from "@/config"
import type { Environment } from '@/installer/environment'
import { quickError, safeRun } from "@/utils/error"
import { safeExec } from '@/utils/exec'
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
    checkWhisperCppInstalled(whisperCppExecutableName),
  ])

  let ytdlpVersion = null

  if (isYtDlpExists) {
    ytdlpVersion = await getYtDlpVersion(ytDlpExecutableName)
  }

  return {
    isYtDlpExists,
    isWhisperCppExists,
    ytdlpVersion,
  }
}

/**
 * 获取 yt-dlp 可执行文件名
 * @param environment 环境
 * @returns 可执行文件名
 */
export function getYtDlpExecutableName(environment: Environment) {
  // TODO 使用 platform 入参
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
 * 获取 yt-dlp 版本
 * @param environment 环境
 * @returns yt-dlp 版本
 */
export async function getYtDlpVersion(executableName: string) {
  const ytdlpVersion = await safeExec(`./${executableName} --version `, { cwd: YTDLP_INSTALL_DIR })
  return ytdlpVersion
}

/**
 * 检查 yt-dlp 是否已安装
 * @param fileName 可执行文件名
 * @returns 是否已安装
 */
export async function checkYtDlpInstalled(executableName: string, isVersionCheck: boolean = false) {
  const targetPath = path.join(YTDLP_INSTALL_DIR, executableName)
  const isExists = await checkFileExists(targetPath)

  if (isVersionCheck) {
    const version = await getYtDlpVersion(executableName)
    return version
  }


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