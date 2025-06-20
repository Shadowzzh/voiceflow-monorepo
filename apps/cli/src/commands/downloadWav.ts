import { promises as fs } from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import ora from 'ora'

// 样式常量
const PROGRESS_COLOR = chalk.cyan

import { CLI_NAME, DOWNLOAD_DIR } from '@/config'
import {
  checkYtDlpInstalled,
  getYtDlpExecutablePath,
} from '@/installer/checkApp'
import { quickError, quickSuccess } from '@/utils/error'
import { execCommand } from '@/utils/exec'

/**
 * 下载 WAV 文件
 * @param url 文件 URL（支持 YouTube 等视频网站）
 * @param outputPath 输出路径（可选，默认为当前目录）
 * @returns 下载的文件路径
 */
export async function downloadWav(
  url: string,
  outputPath?: string
): Promise<string> {
  // 检查 yt-dlp 是否已安装并获取路径
  const isYtDlpInstalled = await checkYtDlpInstalled()

  // 获取 yt-dlp 可执行文件路径
  const ytDlpPath = getYtDlpExecutablePath()

  if (!isYtDlpInstalled) {
    quickError('yt-dlp 未安装', `请先运行 "${CLI_NAME} setup" 安装必要的依赖`)
  }

  // 设置输出目录
  const outputDir = outputPath || DOWNLOAD_DIR

  // 确保输出目录存在
  await fs.mkdir(outputDir, { recursive: true })

  // 创建进度指示器
  const spinner = ora('正在下载音频...').start()
  spinner.color = 'cyan'

  // 用于存储下载的文件路径
  let downloadedFilePath: string | null = null

  try {
    // 构建命令参数
    const args = buildYtDlpArgs(url, outputDir)

    // 创建进度和文件路径解析回调
    const { stdoutCallback, stderrCallback } = createYtDlpCallbacks(
      (progress) => updateProgress(spinner, progress),
      (filePath) => { downloadedFilePath = filePath }
    )

    // 执行下载命令
    await execCommand(ytDlpPath, args, {
      cwd: process.cwd(),
      stdoutCallback,
      stderrCallback,
      noLog: true,
    })

    spinner.succeed('下载完成！')

    console.log()

    if (!downloadedFilePath) {
      throw new Error('未找到下载的文件')
    }

    const finalFilePath = downloadedFilePath
    quickSuccess(`文件已保存到: ${finalFilePath}`)
    return finalFilePath
  } catch (error) {
    spinner.fail('下载失败')
    handleDownloadError(error)
  }
}

/**
 * 构建 yt-dlp 命令参数
 */
function buildYtDlpArgs(url: string, outputDir: string): string[] {
  return [
    '-x', // 仅提取音频
    '--audio-format',
    'wav', // 转换为 WAV 格式
    '--audio-quality',
    '0', // 最高质量
    '-o',
    path.join(outputDir, '%(title)s.%(ext)s'), // 输出文件名模板
    '--no-playlist', // 不下载播放列表
    '--progress', // 显示进度
    url,
  ]
}

/**
 * 更新进度显示
 */
function updateProgress(spinner: ReturnType<typeof ora>, progress: ProgressInfo): void {
  switch (progress.type) {
    case 'download':
      spinner.text = PROGRESS_COLOR(`下载进度: ${progress.percent}%`)
      break
    case 'convert':
      spinner.text = PROGRESS_COLOR('正在转换为 WAV 格式...')
      break
    case 'save':
      spinner.text = PROGRESS_COLOR(`保存到: ${progress.path}`)
      break
  }
}

/**
 * 进度信息类型
 */
type ProgressInfo =
  | { type: 'download'; percent: number }
  | { type: 'convert' }
  | { type: 'save'; path: string }

/**
 * 解析 yt-dlp 输出中的文件路径
 */
function parseFilePath(line: string): string | null {
  // 尝试各种模式匹配文件路径
  const patterns = [
    /\[download\] Destination: (.+)/,
    /\[ffmpeg\] Destination: (.+)/,
    /Destination: (.+)/
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * 解析 yt-dlp 输出中的进度信息
 */
function parseProgress(line: string): ProgressInfo | null {
  // 下载进度
  if (line.includes('[download]') && line.includes('%')) {
    const match = line.match(/(\d+\.?\d*)%/)
    if (match) {
      return { type: 'download', percent: parseFloat(match[1]) }
    }
  }

  // 音频转换
  if (line.includes('[ExtractAudio]')) {
    return { type: 'convert' }
  }

  // 文件保存
  if (line.includes('Destination:')) {
    const match = line.match(/Destination: (.+)/)
    if (match) {
      return { type: 'save', path: match[1].trim() }
    }
  }

  return null
}

/**
 * 创建 yt-dlp 输出处理回调
 */
function createYtDlpCallbacks(
  onProgress: (progress: ProgressInfo) => void,
  onFileDetected: (filePath: string) => void
): {
  stdoutCallback: (data: { line: string }) => void
  stderrCallback: (data: { line: string }) => void
} {
  const handleLine = (line: string) => {
    // 处理进度信息
    const progress = parseProgress(line)
    if (progress) {
      onProgress(progress)
    }

    // 处理文件路径
    const filePath = parseFilePath(line)
    if (filePath) {
      onFileDetected(filePath)
    }
  }

  return {
    stdoutCallback: ({ line }) => handleLine(line),
    stderrCallback: ({ line }) => handleLine(line),
  }
}

/**
 * 处理下载错误
 */
function handleDownloadError(error: unknown): never {
  if (error instanceof Error) {
    // 处理特定错误
    if (error.message.includes('Unable to extract')) {
      quickError('无法提取音频', '请检查 URL 是否有效，或该视频是否受保护')
    } else if (
      error.message.includes('ffmpeg') ||
      error.message.includes('ffprobe')
    ) {
      quickError(
        '缺少 ffmpeg',
        'yt-dlp 需要 ffmpeg 来转换音频格式。请安装 ffmpeg 后重试'
      )
    } else {
      quickError(`下载失败: ${error.message}`)
    }
  } else {
    quickError('下载过程中发生未知错误')
  }
}
