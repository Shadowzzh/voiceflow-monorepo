import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 命令行名称 */
export const CLI_NAME = 'voiceflow-cli'

/** yt-dlp 安装目录 */
export const YTDLP_INSTALL_DIR = path.join(__dirname, './bin/yt-dlp') // 例如 ~/.yt-dlp-cli

/** whipser.cpp 安装目录 */
export const WHISPER_CPP_INSTALL_DIR = path.join(__dirname, './bin/whisper') // 例如 ~/.whisper.cpp-cli
/** whisper.cpp 可执行文件路径 */
export const WHISPER_CPP_EXECUTABLE_PATH = path.join(
  WHISPER_CPP_INSTALL_DIR,
  'whisper.cpp',
  'build',
  'bin',
  'whisper-cli'
)

/** yt-dlp 下载地址 */
export const YTDLP_DOWNLOAD_URL_DIR =
  'https://github.com/yt-dlp/yt-dlp/releases/download/2025.06.09'

/** whisper.cpp 仓库地址 */
export const WHISPER_CPP_REPO_URL =
  'https://github.com/ggml-org/whisper.cpp.git'

/** whisper.cpp 版本 */
export const WHISPER_CPP_VERSION = 'v1.7.5'

/** 下载目录 */
export const DOWNLOAD_DIR = path.join(__dirname, './downloads')
/** 模型名称枚举 */
export const MODEL_NAME = {
  /** 微型模型 */
  TINY: 'tiny',
  /** 微型模型（英文） */
  TINY_EN: 'tiny.en',
  /** 基础模型 */
  BASE: 'base',
  BASE_EN: 'base.en',
  /** 小型模型 */
  SMALL: 'small',
  /** 小型模型（英文） */
  SMALL_EN: 'small.en',
  /** 小型模型（英文）（TDRZ） */
  SMALL_EN_TDRZ: 'small.en-tdrz',
  /** 中型模型 */
  MEDIUM: 'medium',
  /** 中型模型（英文） */
  MEDIUM_EN: 'medium.en',
  /** 大型模型（V1） */
  LARGE_V1: 'large-v1',
  /** 大型模型（V2） */
  LARGE_V2: 'large-v2',
  /** 大型模型（V2）（Q5_0） */
  LARGE_V2_Q5_0: 'large-v2-q5_0',
  /** 大型模型（V3） */
  LARGE_V3: 'large-v3',
  /** 大型模型（V3）（Q5_0） */
  LARGE_V3_Q5_0: 'large-v3-q5_0',
  /** 大型模型（V3）（Turbo） */
  LARGE_V3_TURBO: 'large-v3-turbo',
  /** 大型模型（V3）（Turbo）（Q5_0） */
  LARGE_V3_TURBO_Q5_0: 'large-v3-turbo-q5_0',
}
