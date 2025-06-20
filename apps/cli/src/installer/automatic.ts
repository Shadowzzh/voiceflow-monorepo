import { select } from '@inquirer/prompts'
import chalk from 'chalk'
import { checkAppInstalled } from '@/installer/checkApp'
import type { Environment } from '@/installer/environment'
import { executeYtDlpInstallation } from '@/installer/installationYtDlp'


const ytDlpChoice = { name: 'yt-dlp', description: '功能丰富的命令行音/视频下载器', value: 'yt-dlp' }
// const whisperCppChoice = { name: 'whisper.cpp', description: 'OpenAI Whisper 模型的 C/C++ 移植版本', value: 'whisper' }

/**
 * 选择要安装的应用
 * @param choices 选择项
 * @returns 选择的应用名称
 */
async function promptInstallation(choices: { name: string, description: string, value: string }[]) {
  return select({
    message: '请选择要安装的应用',
    choices: choices,
  })
}

/**
 * 自动安装 yt-dlp
 * @param environment 环境
 * @param abortController 中断控制器
 */
export async function runAutomaticInstallation(environment: Environment, abortController?: AbortController) {
  const [isYtDlpExists] = await checkAppInstalled(environment)

  if (!isYtDlpExists) {

    const choices = []

    if (!isYtDlpExists) {
      choices.push(ytDlpChoice)
    }

    // if (!isWhisperCppExists) {
    //   choices.push(whisperCppChoice)
    // }

    const appName = await promptInstallation(choices)

    if (appName === 'yt-dlp') {
      // 安装 yt-dlp
      await executeYtDlpInstallation(environment, abortController)
      // 安装完成后，重新运行自动安装
      await runAutomaticInstallation(environment, abortController)
    } else if (appName === 'whisper.cpp') {
    }
  } else {
    console.log(chalk.green('所有应用已安装'))
  }


}
