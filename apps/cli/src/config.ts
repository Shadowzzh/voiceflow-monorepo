import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** yt-dlp 安装目录 */
export const YTDLP_INSTALL_DIR = path.join(__dirname, './bin/yt-dlp') // 例如 ~/.yt-dlp-cli
