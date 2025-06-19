import { describe, expect, it } from 'vitest'
import {
  detectHardware,
  getWhisperRecommendations,
} from '../src/installer/detectHardware'

describe('Whisper 推荐配置', () => {
  it('应该基于实际硬件生成合适的推荐配置', async () => {
    const hardware = await detectHardware()
    const recommendations = getWhisperRecommendations(hardware)


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
