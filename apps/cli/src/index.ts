import chalk from 'chalk'
import { Command } from 'commander'
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'
import { downloadWav } from '@/commands/downloadWav'
import { runInteractiveSetup } from '@/commands/setup'
import { displayEnvironmentSummary } from '@/installer/environment'
import { quickError } from '@/utils/error'

// 设置全局代理
const envHttpProxyAgent = new EnvHttpProxyAgent()
setGlobalDispatcher(envHttpProxyAgent)

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
  const program = new Command()

  program
    .name('voiceflow-cli')
    .description('Voiceflow CLI 工具')
    .version('0.0.0')

  // 设置命令
  program
    .command('env')
    .description('显示环境信息')
    .action(async () => {
      // 显示环境信息
      await displayEnvironmentSummary()
    })

  // 设置命令
  program
    .command('setup')
    .description('安装设置 Whisper.cpp 和 yt-dlp 环境')
    .action(async () => {
      await runInteractiveSetup()
    })

  // 下载音频命令
  program
    .command('download <url>')
    .description('从 YouTube URL 下载音频文件并转换为 WAV 格式')
    .option('-o, --output <path>', '指定输出目录（默认为当前目录）')
    .action(async (url: string, options: { output?: string }) => {
      try {
        await downloadWav(url, options.output)
      } catch (error) {
        console.error(
          '下载失败:',
          error instanceof Error ? error.message : String(error)
        )
        process.exit(1)
      }
    })

  await program.parseAsync(process.argv)
}

// 特殊处理用户取消
main().catch((error) => {
  if (error.message.includes('取消') || error.name === 'AbortError') {
    console.log(chalk.yellow('\n操作已取消'))
    process.exit(0)
  }
  throw error
})
