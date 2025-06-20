import os from 'node:os'
import path from 'node:path'
import { WHISPER_CPP_EXECUTABLE_PATH, YTDLP_INSTALL_DIR } from '@/config'
import { quickError } from '@/utils/error'
import { safeExec } from '@/utils/exec'
import { checkFileExists } from '@/utils/file'

/**
 * 检查应用是否已安装
 * @param environment 环境
 * @returns 是否已安装
 */
export async function checkAppInstalled() {
  const ytDlpExecutableName = getYtDlpExecutableName()

  // 检查 yt-dlp 和 whisper.cpp 是否已安装
  const [isYtDlpExists, isWhisperCppExists] = await Promise.all([
    checkYtDlpInstalled(),
    checkWhisperCppInstalled(),
  ])

  let ytdlpVersion = null
  let whisperCppVersion = null

  if (isYtDlpExists) {
    ytdlpVersion = await getYtDlpVersion(ytDlpExecutableName)
  }

  if (isWhisperCppExists) {
    whisperCppVersion = await getWhisperCppVersion()
  }

  return {
    isYtDlpExists,
    isWhisperCppExists,
    ytdlpVersion,
    whisperCppVersion,
  }
}

/**
 * 获取 yt-dlp 可执行文件名
 * @param environment 环境
 * @returns 可执行文件名
 */
export function getYtDlpExecutableName() {
  const platform = os.platform()
  const arch = os.arch()

  // TODO 使用 platform 入参
  switch (platform) {
    case 'win32':
      return 'yt-dlp.exe'
    case 'darwin':
      return 'yt-dlp_macos'
    case 'linux':
      return arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux'
    default:
      quickError(`不支持的系统平台: ${platform}`, '请检查系统平台')
  }
}

/**
 * 获取 yt-dlp 可执行文件路径
 * @returns 可执行文件路径
 */
export function getYtDlpExecutablePath() {
  return path.join(YTDLP_INSTALL_DIR, getYtDlpExecutableName())
}

/**
 * 获取 yt-dlp 版本
 * @param environment 环境
 * @returns yt-dlp 版本
 */
export async function getYtDlpVersion(executableName: string) {
  const ytdlpVersion = await safeExec(`./${executableName} --version `, {
    cwd: YTDLP_INSTALL_DIR,
  })
  return ytdlpVersion
}

/**
 * 检查 yt-dlp 是否已安装
 * @param fileName 可执行文件名
 * @returns 是否已安装
 */
export async function checkYtDlpInstalled(isVersionCheck: boolean = false) {
  const executableName = getYtDlpExecutableName()

  const targetPath = path.join(YTDLP_INSTALL_DIR, executableName)
  const isExists = await checkFileExists(targetPath)

  if (isVersionCheck) {
    const version = await getYtDlpVersion(executableName)
    return version
  }

  return isExists
}

/**
 * 获取 whisper.cpp 可执行文件名
 * @returns 可执行文件名
 */
export function getWhisperCppExecutableName() {
  const platform = os.platform()

  switch (platform) {
    case 'win32':
      return 'whisper-cli.exe'
    case 'darwin':
    case 'linux':
      return 'whisper-cli'
    default:
      quickError(`不支持的系统平台: ${platform}`, '请检查系统平台')
  }
}

/**
 * 获取 whisper.cpp 版本
 * @returns whisper.cpp 版本
 */
export async function getWhisperCppVersion() {
  const version = await safeExec(`"${WHISPER_CPP_EXECUTABLE_PATH}" --version`)
  return version
}

/**
 * 检查 whisper.cpp 是否已安装
 * @returns 是否已安装
 */
export async function checkWhisperCppInstalled() {
  const isExists = await checkFileExists(WHISPER_CPP_EXECUTABLE_PATH)
  return isExists
}
