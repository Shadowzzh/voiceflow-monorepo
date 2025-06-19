import { Command } from 'commander'
import { createSetupCommand, runInteractiveSetup } from './commands/setup'



// const program = new Command()

// program
//   .name('whisper-cli')
//   .description('Whisper.cpp CLI 工具')
//   .version('1.0.0')

// // 添加子命令
// program.addCommand(createSetupCommand())

// program.parse(process.argv)

runInteractiveSetup()