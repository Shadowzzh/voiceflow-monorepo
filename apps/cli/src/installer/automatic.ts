import { select } from '@inquirer/prompts'
import chalk from 'chalk'
import ora from 'ora'
import { checkAppInstalled } from '@/installer/checkApp'
import type { Environment } from '@/installer/environment'
import { executeYtDlpInstallation } from '@/installer/installationYtDlp'
import { executeWhisperInstallation } from './installationWhisper'

const ytDlpChoice = {
  name: 'yt-dlp',
  description: '功能丰富的命令行音/视频下载器',
  value: 'yt-dlp' as const,
}

const whisperCppChoice = {
  name: 'whisper.cpp',
  description: 'OpenAI Whisper 模型的 C/C++ 移植版本',
  value: 'whisper' as const,
}

/**
 * 选择要安装的应用
 * @param choices 选择项
 * @returns 选择的应用名称
 */
async function promptInstallation(
  choices: { name: string; description: string; value: 'yt-dlp' | 'whisper' }[]
) {
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
export async function runAutomaticInstallation(
  environment: Environment,
  abortController?: AbortController
) {
  const spinner = ora('正在检查应用安装情况...').start()
  const { isYtDlpExists, ytdlpVersion, isWhisperCppExists, whisperCppVersion } =
    await checkAppInstalled()
  spinner.succeed('检查完成')

  displayInstallationStatus(
    !!isYtDlpExists,
    ytdlpVersion,
    !!isWhisperCppExists,
    whisperCppVersion
  )

  if (!isYtDlpExists || !isWhisperCppExists) {
    const choices = buildInstallationChoices(
      !!isYtDlpExists,
      !!isWhisperCppExists
    )

    console.log(chalk.green('开始安装'))
    console.log()

    const appName = await promptInstallation(choices)
    await executeAppInstallation(appName, abortController)

    // 安装完成后，重新运行自动安装
    await runAutomaticInstallation(environment, abortController)
  } else {
    console.log(chalk.green('所有应用已安装'))
  }
}

/**
 * 构建安装选项
 */
function buildInstallationChoices(
  isYtDlpExists: boolean,
  isWhisperCppExists: boolean
) {
  const choices = []
  if (!isYtDlpExists) {
    choices.push(ytDlpChoice)
  }
  if (!isWhisperCppExists) {
    choices.push(whisperCppChoice)
  }
  return choices
}

/**
 * 执行应用安装
 */
async function executeAppInstallation(
  appName: 'yt-dlp' | 'whisper',
  abortController?: AbortController
) {
  if (appName === 'yt-dlp') {
    await executeYtDlpInstallation(abortController)
  } else if (appName === 'whisper') {
    await executeWhisperInstallation(abortController)
  }
}

/**
 * 显示应用安装状态
 */
function displayInstallationStatus(
  isYtDlpExists: boolean,
  ytdlpVersion: string | null,
  isWhisperCppExists: boolean,
  whisperCppVersion: string | null
) {
  console.log()
  if (!isYtDlpExists) {
    console.log(chalk.yellow(`未安装 yt-dlp`))
  } else if (ytdlpVersion === null) {
    console.log(chalk.yellow(`yt-dlp 版本检查失败, 请重新安装`))
  }

  if (!isWhisperCppExists) {
    console.log(chalk.yellow(`未安装 whisper.cpp`))
  } else if (whisperCppVersion === null) {
    console.log(chalk.yellow(`whisper.cpp 版本检查失败, 请重新安装`))
  }
  console.log()
}
