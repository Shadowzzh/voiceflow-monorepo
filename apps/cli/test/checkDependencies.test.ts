import { describe, expect, it } from 'vitest'
import {
  checkDependencies,
  checkDependenciesRequirements,
  getMissingDependencies,
} from '../src/installer/checkDependencies'

describe('checkDependencies', () => {
  it('应该返回依赖项检查结果', async () => {
    const dependencies = await checkDependencies()

    expect(dependencies).toHaveProperty('git')
    expect(dependencies).toHaveProperty('cmake')
    expect(dependencies).toHaveProperty('compiler')
    expect(dependencies).toHaveProperty('python')
    expect(dependencies).toHaveProperty('make')

    // 每个依赖项都应该有 available 属性
    expect(typeof dependencies.git.available).toBe('boolean')
    expect(typeof dependencies.cmake.available).toBe('boolean')
    expect(typeof dependencies.compiler.available).toBe('boolean')
  })

  it('应该正确检查依赖项要求', () => {
    const mockDependencies = {
      git: { available: true, version: '2.34.1' },
      cmake: { available: true, version: '3.22.1' },
      compiler: { available: true, version: 'gcc 11.2.0' },
    }

    expect(checkDependenciesRequirements(mockDependencies)).toBe(true)
  })

  it('应该正确识别缺失的依赖项', () => {
    const mockDependencies = {
      git: { available: false, error: 'not found' },
      cmake: { available: true, version: '3.22.1' },
      compiler: { available: false, error: 'not found' },
    }

    const missing = getMissingDependencies(mockDependencies)
    expect(missing).toContain('git')
    expect(missing).toContain('gcc/clang')
    expect(missing).not.toContain('cmake')
  })
})
