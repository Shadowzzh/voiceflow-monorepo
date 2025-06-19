import chalk from 'chalk'
import { Command } from 'commander'
import enquirer from 'enquirer'
import ora from 'ora'
import {
  detectEnvironment,
  displayEnvironmentSummary,
} from '@/installer/environment'

export async function runInteractiveSetup() {
  console.clear()
  // console.log(installationBanner())

  // 检测用户环境
  const environment = await detectEnvironment()
  displayEnvironmentSummary(environment)

  // // 检查是否已安装const existingInstallation = await checkExistingInstallation();
  // if (existingInstallation.found) {
  //   await handleExistingInstallation(existingInstallation)
  //   return
  // }

  // 选择安装方式const installMode = await promptInstallationMode();

  // switch (installMode) {
  //   case 'automatic':
  //     await runAutomaticInstallation(environment)
  //     break
  //   case 'manual':
  //     await runManualGuide(environment)
  //     break
  //   case 'requirements':
  //     await showRequirementsCheck(environment)
  //     break
  //   case 'quit':
  //     console.log(chalk.gray('Setup cancelled. Run "whisper-server setup" when ready.'))
  //     process.exit(0)
  // }
}

export function installationBanner() {
  return chalk.cyan(`
🎤 欢迎使用 Whisper 服务器设置！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

此向导将帮助您安装和配置 Whisper.cpp
以实现高质量的语音转文字转录。

我们将设置：
• 下载并编译 Whisper.cpp
• 安装语言模型
• 为您的系统配置最佳设置
• 验证一切正常工作

预计时间：5-15 分钟
所需空间：约 200MB
`)
}

export function createSetupCommand() {
  const setup = new Command('setup')

  setup
    .description('设置 Whisper.cpp 用于语音转文字转录')
    .option('--auto', '自动安装，无需提示')
    .option('--manual', '显示手动安装指南')
    .option('--check', '仅检查系统要求')
    .action(async (options) => {
      console.log('🚀 ~ .action ~ options:', options)
      // if (options.auto) {
      //   await runAutomaticSetup()
      // } else if (options.manual) {
      //   await showManualGuide()
      // } else if (options.check) {
      //   await checkRequirements()
      // } else {
      //   await runInteractiveSetup()
      // }
    })

  return setup
}
