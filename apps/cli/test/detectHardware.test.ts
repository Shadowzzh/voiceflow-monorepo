import { describe, expect, it } from 'vitest'
import {
  detectHardware,
  getWhisperRecommendations,
} from '../src/installer/detectHardware'

describe('detectHardware', () => {
  it('应该返回硬件信息', async () => {
    const hardware = await detectHardware()

    // 检查必需的属性
    expect(hardware).toHaveProperty('cpu')
    expect(hardware).toHaveProperty('memory')
    expect(hardware).toHaveProperty('disk')
    expect(hardware).toHaveProperty('platform')

    // 检查 CPU 信息
    expect(hardware.cpu).toHaveProperty('model')
    expect(hardware.cpu).toHaveProperty('cores')
    expect(hardware.cpu).toHaveProperty('threads')
    expect(hardware.cpu).toHaveProperty('architecture')
    expect(typeof hardware.cpu.cores).toBe('number')
    expect(hardware.cpu.cores).toBeGreaterThan(0)

    // 检查内存信息
    expect(hardware.memory).toHaveProperty('total')
    expect(hardware.memory).toHaveProperty('available')
    expect(hardware.memory).toHaveProperty('usage')
    expect(typeof hardware.memory.total).toBe('number')
    expect(hardware.memory.total).toBeGreaterThan(0)

    // 检查磁盘信息
    expect(hardware.disk).toHaveProperty('total')
    expect(hardware.disk).toHaveProperty('available')
    expect(hardware.disk).toHaveProperty('usage')

    // 检查平台信息
    expect(hardware.platform).toHaveProperty('os')
    expect(hardware.platform).toHaveProperty('version')
    expect(hardware.platform).toHaveProperty('architecture')
  }, 10000) // 增加超时时间，因为硬件检测可能需要一些时间

  it('应该正确生成 Whisper 推荐配置', () => {
    const mockHardware = {
      cpu: {
        model: 'Apple M4',
        cores: 10,
        threads: 10,
        architecture: 'arm64',
        frequency: 4000,
      },
      memory: {
        total: 16 * 1024 * 1024 * 1024, // 16GB in bytes
        available: 8 * 1024 * 1024 * 1024, // 8GB in bytes
        usage: 50,
      },
      gpu: {
        available: true,
        vendor: 'Apple',
        model: 'Apple M4',
        metal: true,
        cuda: false,
        opencl: false,
      },
      disk: {
        total: 228 * 1024 * 1024 * 1024, // 228GB in bytes
        available: 150 * 1024 * 1024 * 1024, // 150GB in bytes
        usage: 34,
      },
      platform: {
        os: 'darwin',
        version: '24.5.0',
        architecture: 'arm64',
      },
    }

    const recommendations = getWhisperRecommendations(mockHardware)

    expect(recommendations).toHaveProperty('useGPU')
    expect(recommendations).toHaveProperty('threads')
    expect(recommendations).toHaveProperty('model')
    expect(recommendations).toHaveProperty('backend')

    // 基于 16GB 内存应该推荐 large 模型
    expect(recommendations.model).toBe('large')

    // 有 GPU 应该启用 GPU
    expect(recommendations.useGPU).toBe(true)

    // Apple GPU 应该使用 Metal 后端
    expect(recommendations.backend).toBe('metal')

    // 线程数应该基于 CPU 核心数
    expect(recommendations.threads).toBe(8) // 最多 8 个线程
  })

  it('应该为低配置系统生成合适的推荐', () => {
    const mockHardware = {
      cpu: {
        model: 'Intel Core i3',
        cores: 2,
        threads: 4,
        architecture: 'x64',
        frequency: 2400,
      },
      memory: {
        total: 4 * 1024 * 1024 * 1024, // 4GB in bytes
        available: 2 * 1024 * 1024 * 1024, // 2GB in bytes
        usage: 50,
      },
      gpu: undefined, // 没有 GPU
      disk: {
        total: 256 * 1024 * 1024 * 1024, // 256GB in bytes
        available: 100 * 1024 * 1024 * 1024, // 100GB in bytes
        usage: 60,
      },
      platform: {
        os: 'linux',
        version: '5.15.0',
        architecture: 'x64',
      },
    }

    const recommendations = getWhisperRecommendations(mockHardware)

    // 4GB 内存应该推荐 medium 模型
    expect(recommendations.model).toBe('medium')

    // 没有 GPU 应该禁用 GPU
    expect(recommendations.useGPU).toBe(false)

    // 应该使用 CPU 后端
    expect(recommendations.backend).toBe('cpu')

    // 线程数应该等于 CPU 核心数
    expect(recommendations.threads).toBe(2)
  })
})
