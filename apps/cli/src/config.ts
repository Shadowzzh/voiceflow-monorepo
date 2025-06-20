import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** yt-dlp 安装目录 */
export const YTDLP_INSTALL_DIR = path.join(__dirname, './bin/yt-dlp') // 例如 ~/.yt-dlp-cli
/** whipser.cpp 安装目录 */
export const WHISPER_CPP_INSTALL_DIR = path.join(__dirname, './bin/whisper') // 例如 ~/.whisper.cpp-cli


/** yt-dlp 下载地址 */
export const YTDLP_DOWNLOAD_URL_DIR =
  'https://github.com/yt-dlp/yt-dlp/releases/download/2025.06.09'
