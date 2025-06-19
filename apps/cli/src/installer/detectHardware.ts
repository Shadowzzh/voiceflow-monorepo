import os from 'node:os'
import { safeExec } from '@/utils/exec'
import { safeParseInt } from '@/utils/parse'

/**
 * 硬件检测模块
 *
 * 设计原则：
 * - 使用纯函数：所有检测函数不修改传入的参数，而是返回新的对象或更新信息
 * - 避免副作用：函数的行为是可预测的，便于测试和调试
 * - 组合式设计：通过对象合并来组装最终的硬件信息
 */

/** 配置常量 */
const CONFIG = {
  /** 命令执行超时时间（毫秒） */
  COMMAND_TIMEOUT: 5000,
  /** 最大线程数 */
  MAX_THREADS: 8,
  /** 内存阈值（字节） */
  MEMORY_THRESHOLDS: {
    LARGE_MODEL: 8 * 1024 * 1024 * 1024, // 8GB
    MEDIUM_MODEL: 4 * 1024 * 1024 * 1024, // 4GB
    SMALL_MODEL: 2 * 1024 * 1024 * 1024, // 2GB
  },
} as const

/**
 * 获取默认 CPU 信息
 */
function getDefaultCPU(): CPUInfo {
  return {
    model: '未知',
    cores: 1,
    threads: 1,
    architecture: os.arch(),
    frequency: undefined,
  }
}

/**
 * 获取默认内存信息
 */
function getDefaultMemory(): MemoryInfo {
  return {
    total: 0,
    available: 0,
    usage: 0,
  }
}

/**
 * 获取默认磁盘信息
 */
function getDefaultDisk(): DiskInfo {
  return {
    available: 0,
    total: 0,
    usage: 0,
  }
}

/**
 * 获取默认平台信息
 */
function getDefaultPlatform(): PlatformInfo {
  return {
    os: os.platform(),
    version: os.release(),
    architecture: os.arch(),
  }
}

/**
 * 检测系统硬件信息
 * @returns 硬件信息对象
 */
export async function detectHardware(): Promise<HardwareInfo> {
  // 并行执行所有检测
  const [cpu, memory, gpu, disk, platform] = await Promise.allSettled([
    // 并行执行所有检测
    detectCPU(),
    // 检测内存
    detectMemory(),
    // 检测 GPU
    detectGPU(),
    // 检测磁盘
    detectDisk(),
    // 检测平台
    detectPlatform(),
  ])

  const hardware: HardwareInfo = {
    cpu: cpu.status === 'fulfilled' ? cpu.value : getDefaultCPU(),
    memory: memory.status === 'fulfilled' ? memory.value : getDefaultMemory(),
    gpu: gpu.status === 'fulfilled' ? gpu.value : undefined,
    disk: disk.status === 'fulfilled' ? disk.value : getDefaultDisk(),
    platform:
      platform.status === 'fulfilled' ? platform.value : getDefaultPlatform(),
  }

  return hardware
}

/**
 * 检测 CPU 信息
 */
async function detectCPU(): Promise<CPUInfo> {
  const cpus = os.cpus()
  let cpu: CPUInfo = {
    model: cpus[0]?.model || '未知',
    cores: os.cpus().length,
    threads: os.cpus().length, // Node.js 默认返回逻辑核心数
    architecture: os.arch(),
    frequency: cpus[0]?.speed, // MHz
  }

  // 尝试获取更详细的 CPU 信息
  try {
    const platform = os.platform()
    if (platform === 'darwin') {
      const macOSCPUInfo = await detectMacOSCPU()
      cpu = { ...cpu, ...macOSCPUInfo }
    } else if (platform === 'linux') {
      const linuxCPUInfo = await detectLinuxCPU()
      cpu = { ...cpu, ...linuxCPUInfo }
    }
  } catch {
    // 如果获取详细信息失败，使用默认值
  }

  return cpu
}

/**
 * 检测 macOS CPU 信息
 */
async function detectMacOSCPU(): Promise<Partial<CPUInfo>> {
  const updates: Partial<CPUInfo> = {}

  // 使用 sysctl 获取更详细信息
  const brandString = await safeExec('sysctl -n machdep.cpu.brand_string')
  if (brandString) {
    updates.model = brandString
  }

  // 获取物理核心数
  const coreResult = await safeExec('sysctl -n hw.physicalcpu')
  const threadResult = await safeExec('sysctl -n hw.logicalcpu')

  if (coreResult && threadResult) {
    updates.cores = safeParseInt(coreResult)
    updates.threads = safeParseInt(threadResult)
  }

  return updates
}

/**
 * 检测 Linux CPU 信息
 */
async function detectLinuxCPU(): Promise<Partial<CPUInfo>> {
  const updates: Partial<CPUInfo> = {}

  // 使用 lscpu 或 /proc/cpuinfo
  const output = await safeExec('lscpu')
  if (output) {
    // 解析 lscpu 输出
    const modelMatch = output.match(/Model name:\s*(.+)/i)
    if (modelMatch) {
      updates.model = modelMatch[1].trim()
    }

    const coreMatch = output.match(/Core\(s\) per socket:\s*(\d+)/i)
    const socketMatch = output.match(/Socket\(s\):\s*(\d+)/i)
    if (coreMatch && socketMatch) {
      updates.cores = safeParseInt(coreMatch[1]) * safeParseInt(socketMatch[1])
    }
  } else {
    // 如果 lscpu 失败，尝试读取 /proc/cpuinfo
    const procCPUInfo = await detectLinuxCPUFromProc()
    Object.assign(updates, procCPUInfo)
  }

  return updates
}

/**
 * 从 /proc/cpuinfo 检测 Linux CPU 信息
 */
async function detectLinuxCPUFromProc(): Promise<Partial<CPUInfo>> {
  const updates: Partial<CPUInfo> = {}

  const output = await safeExec('cat /proc/cpuinfo')
  if (output) {
    const lines = output.split('\n')
    const modelLine = lines.find((line) => line.includes('model name'))
    if (modelLine) {
      const model = modelLine.split(':')[1]?.trim()
      if (model) {
        updates.model = model
      }
    }
  }

  return updates
}

/**
 * 检测内存信息
 */
async function detectMemory(): Promise<MemoryInfo> {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  return {
    total: Math.round(totalMem),
    available: Math.round(freeMem),
    usage: Math.round((usedMem / totalMem) * 100), // 使用率百分比
  }
}

/**
 * 检测 GPU 信息
 */
async function detectGPU(): Promise<GPUInfo | undefined> {
  const platform = os.platform()
  let gpu: GPUInfo = {
    available: false,
    vendor: undefined,
    model: undefined,
    memory: undefined,
    opencl: false,
    cuda: false,
    metal: false,
  }

  try {
    if (platform === 'darwin') {
      const macOSGPUInfo = await detectMacOSGPU()
      gpu = { ...gpu, ...macOSGPUInfo }
    } else if (platform === 'linux') {
      const linuxGPUInfo = await detectLinuxGPU()
      gpu = { ...gpu, ...linuxGPUInfo }
    } else if (platform === 'win32') {
      const windowsGPUInfo = await detectWindowsGPU()
      gpu = { ...gpu, ...windowsGPUInfo }
    }
  } catch {
    // 检测失败，返回默认值
  }

  return gpu.available ? gpu : undefined
}

/**
 * 检测 macOS GPU 信息
 */
async function detectMacOSGPU(): Promise<Partial<GPUInfo>> {
  const updates: Partial<GPUInfo> = {}

  const output = await safeExec('system_profiler SPDisplaysDataType')
  if (output) {
    // 解析显卡信息
    const chipsetMatch = output.match(/Chipset Model:\s*(.+)/i)
    if (chipsetMatch) {
      updates.available = true
      updates.model = chipsetMatch[1].trim()
      updates.vendor = detectGPUVendor(updates.model)
      updates.metal = true // macOS 支持 Metal
    }

    // 检测显存
    const memoryMatch = output.match(/VRAM \(Total\):\s*(\d+)\s*MB/i)
    if (memoryMatch) {
      updates.memory = safeParseInt(memoryMatch[1])
    }
  } else {
    // 如果获取失败，检查是否有基本的 GPU 支持
    updates.metal = true // macOS 默认支持 Metal
  }

  return updates
}

/**
 * 检测 Linux GPU 信息
 */
async function detectLinuxGPU(): Promise<Partial<GPUInfo>> {
  const updates: Partial<GPUInfo> = {}

  // 检查 NVIDIA GPU
  const nvidiaOutput = await safeExec(
    'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits'
  )
  if (nvidiaOutput) {
    const lines = nvidiaOutput.split('\n')
    if (lines.length > 0 && lines[0]) {
      const [name, memory] = lines[0].split(',').map((s) => s.trim())
      updates.available = true
      updates.vendor = 'NVIDIA'
      updates.model = name
      updates.memory = safeParseInt(memory)
      updates.cuda = true
    }
  } else {
    // 如果没有 NVIDIA GPU，检查其他 GPU
    const otherGPUInfo = await detectLinuxOtherGPU()
    Object.assign(updates, otherGPUInfo)
  }

  // 检查 OpenCL 支持
  const clinfoOutput = await safeExec('clinfo')
  if (clinfoOutput) {
    updates.opencl = true
  }

  return updates
}

/**
 * 检测 Linux 其他 GPU 信息
 */
async function detectLinuxOtherGPU(): Promise<Partial<GPUInfo>> {
  const updates: Partial<GPUInfo> = {}

  const output = await safeExec('lspci | grep -i vga')
  if (output) {
    updates.available = true
    const outputLower = output.toLowerCase()
    if (outputLower.includes('intel')) updates.vendor = 'Intel'
    else if (outputLower.includes('amd')) updates.vendor = 'AMD'
    else if (outputLower.includes('nvidia')) updates.vendor = 'NVIDIA'
  }

  return updates
}

/**
 * 检测 Windows GPU 信息
 */
async function detectWindowsGPU(): Promise<Partial<GPUInfo>> {
  const updates: Partial<GPUInfo> = {}

  const output = await safeExec(
    'wmic path win32_VideoController get name,AdapterRAM /format:csv'
  )
  if (output) {
    const lines = output
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('Node'))
    if (lines.length > 0) {
      const parts = lines[0].split(',')
      if (parts.length >= 2) {
        updates.available = true
        updates.model = parts[1]?.trim()
        updates.vendor = detectGPUVendor(updates.model)

        const memory = safeParseInt(parts[0]?.trim())
        if (memory > 0) {
          updates.memory = Math.round(memory) // 转换为 MB
        }
      }
    }
  }

  return updates
}

/**
 * 根据 GPU 型号检测厂商
 */
function detectGPUVendor(model?: string): string | undefined {
  if (!model) return undefined

  const modelLower = model.toLowerCase()
  if (modelLower.includes('intel')) return 'Intel'
  if (modelLower.includes('amd') || modelLower.includes('radeon')) return 'AMD'
  if (modelLower.includes('nvidia')) return 'NVIDIA'
  if (modelLower.includes('apple')) return 'Apple'

  return undefined
}

/**
 * 检测磁盘信息
 */
async function detectDisk(): Promise<DiskInfo> {
  const platform = os.platform()
  let disk: DiskInfo = {
    available: 0,
    total: 0,
    usage: 0,
  }

  try {
    if (platform === 'darwin' || platform === 'linux') {
      disk = await detectUnixDisk()
    } else if (platform === 'win32') {
      disk = await detectWindowsDisk()
    }
  } catch {
    // 如果检测失败，返回默认值
  }

  return disk
}

/**
 * 检测 Unix-like 系统的磁盘信息
 */
async function detectUnixDisk(): Promise<DiskInfo> {
  const output = await safeExec('df .')

  if (!output) {
    return { available: 0, total: 0, usage: 0 }
  }

  const lines = output.split('\n')
  if (lines.length < 2) {
    return { available: 0, total: 0, usage: 0 }
  }

  const parts = lines[1].split(/\s+/)
  if (parts.length < 4) {
    return { available: 0, total: 0, usage: 0 }
  }

  const total = safeParseInt(parts[1]) * 1024 // KB to bytes
  const used = safeParseInt(parts[2]) * 1024 // KB to bytes
  const available = safeParseInt(parts[3]) * 1024 // KB to bytes

  return {
    total: Math.round(total),
    available: Math.round(available),
    usage: Math.round((used / total) * 100),
  }
}

/**
 * 检测 Windows 系统的磁盘信息
 */
async function detectWindowsDisk(): Promise<DiskInfo> {
  const output = await safeExec(
    'wmic logicaldisk where size^>0 get size,freespace,caption /format:csv'
  )
  if (!output) {
    return { available: 0, total: 0, usage: 0 }
  }

  const lines = output
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('Node'))
  if (lines.length === 0) {
    return { available: 0, total: 0, usage: 0 }
  }

  let totalSize = 0
  let totalFree = 0

  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length >= 3) {
      const free = safeParseInt(parts[1]?.trim())
      const size = safeParseInt(parts[2]?.trim())
      totalSize += size
      totalFree += free
    }
  }

  if (totalSize === 0) {
    return { available: 0, total: 0, usage: 0 }
  }

  return {
    total: Math.round(totalSize),
    available: Math.round(totalFree),
    usage: Math.round(((totalSize - totalFree) / totalSize) * 100),
  }
}

/**
 * 检测平台信息
 */
async function detectPlatform(): Promise<PlatformInfo> {
  return {
    os: os.platform(),
    version: os.release(),
    architecture: os.arch(),
  }
}


/**
 * 获取推荐的 Whisper.cpp 配置
 */
export function getWhisperRecommendations(hardware: HardwareInfo) {
  const recommendations = {
    useGPU: false,
    threads: 1,
    model: 'base',
    backend: 'cpu' as 'cpu' | 'cuda' | 'opencl' | 'metal',
  }

  // 根据 CPU 核心数设置线程数
  recommendations.threads = Math.max(
    1,
    Math.min(hardware.cpu.cores, CONFIG.MAX_THREADS)
  )

  // 根据内存大小推荐模型
  const { LARGE_MODEL, MEDIUM_MODEL, SMALL_MODEL } = CONFIG.MEMORY_THRESHOLDS
  if (hardware.memory.total >= LARGE_MODEL) {
    recommendations.model = 'large'
  } else if (hardware.memory.total >= MEDIUM_MODEL) {
    recommendations.model = 'medium'
  } else if (hardware.memory.total >= SMALL_MODEL) {
    recommendations.model = 'small'
  }

  // 根据 GPU 情况推荐后端
  if (hardware.gpu?.available) {
    recommendations.useGPU = true

    // 按优先级选择后端
    if (hardware.gpu.cuda) {
      recommendations.backend = 'cuda'
    } else if (hardware.gpu.metal) {
      recommendations.backend = 'metal'
    } else if (hardware.gpu.opencl) {
      recommendations.backend = 'opencl'
    }
  }

  return recommendations
}

// 硬件信息接口定义
export interface HardwareInfo {
  /** cpu */
  cpu: CPUInfo
  /** 内存 */
  memory: MemoryInfo
  /** gpu */
  gpu?: GPUInfo
  /** 磁盘 */
  disk: DiskInfo
  /** 平台 */
  platform: PlatformInfo
}

// CPU 信息接口
interface CPUInfo {
  /** 型号 */
  model: string
  /** 核心数 */
  cores: number
  /** 线程数 */
  threads: number
  /** 架构 */
  architecture: string
  /** 频率 */
  frequency?: number
}

// 内存信息接口
interface MemoryInfo {
  /** 总内存 */
  total: number // 字节
  /** 可用内存 */
  available: number // 字节
  /** 使用率 */
  usage: number // percentage
}

// GPU 信息接口
interface GPUInfo {
  /** 是否可用 */
  available: boolean
  /** 厂商 */
  vendor?: string
  /** 型号 */
  model?: string
  /** 显存 */
  memory?: number
  /** opencl */
  opencl?: boolean
  /** cuda */
  cuda?: boolean
  /** metal */
  metal?: boolean
}

// 磁盘信息接口
interface DiskInfo {
  /** 可用空间 */
  available: number // 字节
  /** 总空间 */
  total: number // 字节
  /** 使用率 */
  usage: number // percentage
}

// 平台信息接口
interface PlatformInfo {
  /** 操作系统 */
  os: NodeJS.Platform
  /** 版本 */
  version: string
  /** 架构 */
  architecture: string
}
