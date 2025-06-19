import { describe, expect, it } from 'vitest'
import {
  detectHardware,
  getWhisperRecommendations,
} from '../src/installer/detectHardware'

describe('Whisper 推荐配置', () => {
  it('应该基于实际硬件生成合适的推荐配置', async () => {
    const hardware = await detectHardware()
    const recommendations = getWhisperRecommendations(hardware)

    console.log('🖥️  硬件信息:')
    console.log(`CPU: ${hardware.cpu.model} (${hardware.cpu.cores} 核心)`)
    console.log(`内存: ${hardware.memory.total}GB`)
    console.log(
      `GPU: ${hardware.gpu ? `${hardware.gpu.vendor} ${hardware.gpu.model}` : '无'}`
    )
    console.log(
      `磁盘: ${hardware.disk.total}GB 总容量，${hardware.disk.available}GB 可用`
    )

    console.log('\n🎯 Whisper.cpp 推荐配置:')
    console.log(`模型: ${recommendations.model}`)
    console.log(`线程数: ${recommendations.threads}`)
    console.log(`使用 GPU: ${recommendations.useGPU ? '是' : '否'}`)
    console.log(`后端: ${recommendations.backend}`)

    // 验证推荐配置的合理性
    expect(recommendations.threads).toBeGreaterThan(0)
    expect(recommendations.threads).toBeLessThanOrEqual(hardware.cpu.cores)
    expect(['base', 'small', 'medium', 'large']).toContain(
      recommendations.model
    )
    expect(['cpu', 'cuda', 'opencl', 'metal']).toContain(
      recommendations.backend
    )

    // 如果有 GPU，应该推荐使用 GPU
    if (hardware.gpu?.available) {
      expect(recommendations.useGPU).toBe(true)
      expect(recommendations.backend).not.toBe('cpu')
    } else {
      expect(recommendations.useGPU).toBe(false)
      expect(recommendations.backend).toBe('cpu')
    }
  }, 15000)
})
