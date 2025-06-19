import { describe, expect, it, vi } from 'vitest'
import { displayEnvironmentSummary, type Environment } from '@/installer/environment'

describe('Environment', () => {
  it('应该正确显示环境摘要', () => {
    // Mock console.log
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    const mockEnv: Environment = {
      platform: 'darwin',
      arch: 'arm64',
      nodeVersion: 'v18.17.0',
      memory: 16,
      dependencies: {
        git: { available: true, version: '2.39.0' },
        cmake: { available: true, version: '3.25.0' },
        compiler: { available: true, version: 'clang 14.0.0' },
        python: { available: true, version: '3.11.0' }
      },
      hardware: {
        cpu: {
          model: 'Apple M4',
          cores: 10,
          threads: 10,
          architecture: 'arm64',
          frequency: 3200
        },
        memory: {
          total: 16,
          available: 8,
          usage: 50
        },
        gpu: {
          available: true,
          vendor: 'Apple',
          model: 'Apple M4',
          memory: undefined,
          opencl: false,
          cuda: false,
          metal: true
        },
        disk: {
          available: 150,
          total: 250,
          usage: 40
        },
        platform: {
          os: 'darwin',
          version: '23.0.0',
          architecture: 'arm64'
        }
      }
    }

    displayEnvironmentSummary(mockEnv)

    // 验证控制台输出
    expect(consoleSpy).toHaveBeenCalled()

    // 检查是否包含关键信息
    const allCalls = consoleSpy.mock.calls.map(call => call[0]).join(' ')
    expect(allCalls).toContain('系统环境信息')
    expect(allCalls).toContain('macOS')
    expect(allCalls).toContain('Apple M4')
    expect(allCalls).toContain('硬件信息')
    expect(allCalls).toContain('系统依赖')
    expect(allCalls).toContain('建议')

    consoleSpy.mockRestore()
  })

  it('应该正确处理没有 GPU 的情况', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    const mockEnv: Environment = {
      platform: 'linux',
      arch: 'x64',
      nodeVersion: 'v18.17.0',
      memory: 8,
      dependencies: {
        git: { available: false },
        cmake: { available: false },
        compiler: { available: false }
      },
      hardware: {
        cpu: {
          model: 'Intel Core i5',
          cores: 4,
          threads: 8,
          architecture: 'x64'
        },
        memory: {
          total: 8,
          available: 4,
          usage: 50
        },
        gpu: undefined,
        disk: {
          available: 50,
          total: 100,
          usage: 50
        },
        platform: {
          os: 'linux',
          version: '5.4.0',
          architecture: 'x64'
        }
      }
    }

    displayEnvironmentSummary(mockEnv)

    const allCalls = consoleSpy.mock.calls.map(call => call[0]).join(' ')
    expect(allCalls).toContain('未检测到独立显卡')
    expect(allCalls).toContain('警告')

    consoleSpy.mockRestore()
  })
})