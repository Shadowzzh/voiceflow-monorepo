# 错误处理方案指南

## 概述

本文档介绍了 Node.js/TypeScript 项目中的主流错误处理方案，帮助开发者选择最适合的错误处理策略。

## 主流错误处理方案对比

| 方案 | 类型安全 | 学习成本 | 代码量 | 维护性 | 适用场景 | 推荐度 |
|------|----------|----------|--------|--------|----------|--------|
| **Result/Either** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | 新项目、高可靠性 | ⭐⭐⭐⭐⭐ |
| **自定义错误类** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 现有项目改进 | ⭐⭐⭐⭐ |
| **错误处理器** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 大型应用 | ⭐⭐⭐ |
| **安全包装器** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 函数式风格 | ⭐⭐⭐ |

## 1. Result/Either 模式 ⭐⭐⭐⭐⭐

**特点：**
- 函数式编程风格
- 类型安全，编译时错误检查
- 强制错误处理，不会有遗漏

**推荐库：** `neverthrow`

```bash
npm install neverthrow
```

### 基础用法

```typescript
import { Result, ok, err } from 'neverthrow'

type DownloadError =
  | { type: 'NETWORK_ERROR'; message: string }
  | { type: 'FILE_NOT_FOUND'; url: string }
  | { type: 'USER_CANCELLED' }

async function downloadFile(url: string): Promise<Result<string, DownloadError>> {
  try {
    if (url.includes('invalid')) {
      return err({ type: 'FILE_NOT_FOUND', url })
    }
    return ok('下载成功')
  } catch (error) {
    return err({ type: 'NETWORK_ERROR', message: '网络错误' })
  }
}

// 使用时必须处理错误
const result = await downloadFile('http://example.com')
if (result.isOk()) {
  console.log(result.value)
} else {
  console.error(result.error)
}
```

**优点：**
- 类型安全，编译器强制处理所有错误
- 无异常抛出，程序流程清晰
- 函数式编程风格，易于组合

**缺点：**
- 学习曲线较陡峭
- 需要改变现有编程习惯

## 2. 自定义错误类模式 ⭐⭐⭐⭐

**特点：**
- 结构化错误信息
- 保持传统异常模式
- 易于分类和处理

### 基础实现

```typescript
abstract class AppError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

class NetworkError extends AppError {
  readonly code = 'NETWORK_ERROR'
  readonly statusCode = 500
}

class UserCancelledError extends AppError {
  readonly code = 'USER_CANCELLED'
  readonly statusCode = 0
}

// 使用示例
try {
  throw new NetworkError('连接超时', { url: 'https://example.com' })
} catch (error) {
  if (error instanceof AppError) {
    console.error(`[${error.code}] ${error.message}`)
    if (error.context) {
      console.error('上下文:', error.context)
    }
  }
}
```

## 3. 统一错误处理器 ⭐⭐⭐

**特点：**
- 集中式错误处理
- 统一错误格式和日志
- 全局错误拦截

```typescript
class ErrorHandler {
  static handle(error: unknown, operation?: string) {
    if (error instanceof Error) {
      // 用户取消
      if (error.message.includes('取消') || error.name === 'AbortError') {
        console.log('👋 操作已取消')
        process.exit(0)
      }

      // 网络错误
      if (error.message.includes('fetch') || error.message.includes('网络')) {
        console.error('🌐 网络连接失败')
        console.error('💡 请检查网络连接后重试')
        process.exit(1)
      }

      // 权限错误
      if (error.message.includes('permission') || error.message.includes('权限')) {
        console.error('🔒 权限不足')
        console.error('💡 请检查文件夹写入权限')
        process.exit(1)
      }

      // 通用错误
      console.error(`❌ ${operation || '操作失败'}: ${error.message}`)
      process.exit(1)
    }
  }
}
```

## 推荐方案

### 对于 CLI 应用
**推荐：自定义错误类 + 统一错误处理器**
- 用户友好的错误提示
- 分类错误处理
- 优雅的程序退出

### 对于 Web 应用
**推荐：Result 模式 + Zod 验证**
- 类型安全的错误处理
- 运行时数据验证
- 详细的错误信息

### 对于库开发
**推荐：Result 模式 + 详细错误类型**
- 强制用户处理错误
- 清晰的错误类型定义
- 易于测试和调试

## 现代化库推荐

### Result/Either 模式
- **neverthrow** - 轻量级 Result 模式实现
- **fp-ts** - 完整的函数式编程库
- **effect** - 现代化的函数式框架

### 验证和错误处理
- **zod** - 运行时类型验证
- **yup** - 对象模式验证
- **joi** - 数据验证库

### 监控和日志
- **winston** - 强大的日志库
- **pino** - 高性能日志库
- **sentry** - 错误监控服务

## 最佳实践

### 1. 错误分层
- **系统错误**：网络、文件系统、数据库等
- **业务错误**：验证失败、权限不足等
- **用户错误**：输入错误、操作取消等

### 2. 错误信息设计
- **对用户友好**：提供清晰的错误消息和解决建议
- **对开发者友好**：包含调试信息和错误上下文
- **国际化支持**：支持多语言错误消息

### 3. 错误恢复策略
- **自动重试**：网络请求失败时的重试机制
- **降级处理**：核心功能不可用时的备选方案
- **优雅退出**：程序终止时的资源清理

### 4. 日志和监控
- **结构化日志**：使用 JSON 格式记录错误信息
- **错误聚合**：将相似错误归类分析
- **实时告警**：关键错误的即时通知

## 结论

选择错误处理方案时应考虑：

1. **项目规模和复杂度**
2. **团队技术背景**
3. **维护成本**
4. **用户体验要求**
5. **类型安全需求**

对于大多数项目，建议从 **自定义错误类 + 统一错误处理器** 开始，随着项目发展逐步引入更高级的模式如 Result/Either。
