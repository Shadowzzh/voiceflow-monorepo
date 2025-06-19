import chalk from 'chalk'
import { runInteractiveSetup } from './commands/setup'
import { quickError, safeRun } from './utils/error'

// 全局错误处理
process.on('uncaughtException', () => {
  quickError('程序遇到意外错误', '请重新运行，如问题持续请报告此错误')
})

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  quickError(`未处理的错误: ${message}`, '请重新运行程序')
})


// 主函数
async function main() {
  await safeRun(
    () => runInteractiveSetup(),
    '设置失败',
    '请检查系统环境和网络连接后重试'
  )
}

// 特殊处理用户取消
main().catch((error) => {
  if (error.message.includes('取消') || error.name === 'AbortError') {
    console.log(chalk.yellow('\n安装已取消'))
    process.exit(0)
  }
  throw error
})