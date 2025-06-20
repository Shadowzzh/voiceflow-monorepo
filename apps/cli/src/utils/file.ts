import { promises as fs } from 'node:fs'
import { chmod } from 'node:fs/promises'
import { platform } from 'node:os'
import { safeRun } from './error'

export interface DownloadProgress {
  /** 进度百分比 */
  progress: number
  /** 总文件大小 */
  totalSize: number
  /** 当前已下载大小 */
  currentSize: number
}

/**
 * 检查文件是否存在
 * @param path 文件路径
 * @returns 是否存在
 */
export async function checkFileExists(path: string) {
  return fs
    .access(path)
    .then(() => true)
    .catch(() => false)
}

/**
 * 设置文件权限
 * @param filepath 文件路径
 */
export async function makeExecutable(filepath: string) {
  if (platform() === 'win32') {
    // Windows 不需要处理
    return
  }

  // 设置文件权限
  await safeRun(
    () => chmod(filepath, 0o755),
    '权限设置失败',
    '请检查权限或使用管理员权限运行'
  )
}

/**
 * 下载文件到指定路径，支持进度回调和中断
 * @param url 要下载的文件URL
 * @param targetPath 本地保存路径
 * @param progress 进度回调函数，接收当前进度百分比和总文件大小
 * @param signal AbortSignal 用于中断下载
 */
export async function downloadFile(
  url: string,
  targetPath: string,
  progress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
) {
  // 检查是否已经被中断
  if (signal?.aborted) {
    throw new Error('下载已被取消')
  }

  // 发起HTTP请求获取文件，支持中断信号
  const response = await fetch(url, { signal })

  // 检查HTTP响应状态，如果不是成功状态则抛出错误
  if (!response.ok) {
    throw new Error(`下载 ${url} 失败: ${response.statusText}`)
  }

  // 从响应头中获取文件大小（Content-Length字段）
  const contentLength = response.headers.get('content-length')
  // 将字符串转换为数字，如果没有Content-Length则默认为0
  const totalSize = contentLength ? parseInt(contentLength, 10) : 0

  // 验证文件大小是否有效
  if (totalSize === 0) {
    throw new Error('文件大小为 0')
  }

  // 检查响应体是否存在
  if (!response.body) {
    throw new Error('响应体为空')
  }

  // 获取响应体的可读流读取器，用于分块读取数据
  const reader = response.body.getReader()
  // 创建数组存储所有下载的数据块
  const chunks: Uint8Array[] = []
  // 记录已下载的字节数
  let downloadedSize = 0

  try {
    // 循环读取数据流直到完成
    while (true) {
      // 检查是否被中断
      if (signal?.aborted) {
        throw new Error('下载已被取消')
      }

      // 读取下一个数据块
      const { done, value } = await reader.read()

      // 如果读取完成则退出循环
      if (done) break

      // 将数据块添加到chunks数组中
      chunks.push(value)
      // 累加已下载的字节数
      downloadedSize += value.length

      // 计算并报告下载进度
      if (totalSize > 0) {
        // 计算下载进度百分比（四舍五入到整数）
        const progressPercent = Math.round((downloadedSize / totalSize) * 100)
        // 调用进度回调函数（如果提供了的话）
        progress?.({
          progress: progressPercent,
          totalSize,
          currentSize: downloadedSize,
        })
      }
    }
  } finally {
    // 无论成功失败都要释放读取器锁，避免内存泄漏
    reader.releaseLock()
  }

  // 计算所有数据块的总长度
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  // 创建一个足够大的Uint8Array来存储完整文件
  const fileBuffer = new Uint8Array(totalLength)
  // 用于追踪在fileBuffer中的写入位置
  let offset = 0

  // 将所有数据块合并到fileBuffer中
  for (const chunk of chunks) {
    // 将当前chunk复制到fileBuffer的指定位置
    fileBuffer.set(chunk, offset)
    // 更新下一个chunk的写入位置
    offset += chunk.length
  }

  // 检查最终是否被中断
  if (signal?.aborted) {
    throw new Error('下载已被取消')
  }

  // 将合并后的数据写入到指定的文件路径
  await fs.writeFile(targetPath, Buffer.from(fileBuffer))
}
