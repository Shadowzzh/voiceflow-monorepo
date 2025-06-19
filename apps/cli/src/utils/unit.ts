/** 字节单位常量 */
const BYTE_UNITS = {
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
} as const

type ByteUnit = keyof typeof BYTE_UNITS

/**
 * 通用字节转换函数
 * @param bytes 字节数
 * @param unit 目标单位
 * @param precision 小数位数，默认2位
 */
export function convertBytes(
  bytes: number,
  unit: ByteUnit,
  precision = 2
): number {
  if (bytes === 0) return 0
  return Number((bytes / BYTE_UNITS[unit]).toFixed(precision))
}

// 便捷函数
export const toKB = (bytes: number, precision = 2) =>
  convertBytes(bytes, 'KB', precision)
export const toMB = (bytes: number, precision = 2) =>
  convertBytes(bytes, 'MB', precision)
export const toGB = (bytes: number, precision = 2) =>
  convertBytes(bytes, 'GB', precision)
export const toTB = (bytes: number, precision = 2) =>
  convertBytes(bytes, 'TB', precision)

/**
 * 自动选择合适的单位并格式化
 * @param bytes 字节数
 * @param precision 小数位数，默认2位
 * @returns 格式化后的字符串，如 "1.5 GB", "512 MB"
 */
export function formatBytes(bytes: number, precision = 2): string {
  if (bytes === 0) return '0 B'

  const units = [
    { unit: 'TB', divisor: BYTE_UNITS.TB },
    { unit: 'GB', divisor: BYTE_UNITS.GB },
    { unit: 'MB', divisor: BYTE_UNITS.MB },
    { unit: 'KB', divisor: BYTE_UNITS.KB },
    { unit: 'B', divisor: 1 },
  ] as const

  for (const { unit, divisor } of units) {
    const value = bytes / divisor
    if (value >= 1) {
      // 对于字节单位，不显示小数
      const formattedValue =
        unit === 'B'
          ? Math.round(value).toString()
          : Number(value.toFixed(precision)).toString()
      return `${formattedValue} ${unit}`
    }
  }

  return '0 B'
}

/**
 * 自动选择合适的单位并返回数值和单位
 * @param bytes 字节数
 * @param precision 小数位数，默认2位
 * @returns { value: number, unit: string }
 */
export function autoConvertBytes(
  bytes: number,
  precision = 2
): { value: number; unit: string } {
  if (bytes === 0) return { value: 0, unit: 'B' }

  const units = [
    { unit: 'TB', divisor: BYTE_UNITS.TB },
    { unit: 'GB', divisor: BYTE_UNITS.GB },
    { unit: 'MB', divisor: BYTE_UNITS.MB },
    { unit: 'KB', divisor: BYTE_UNITS.KB },
    { unit: 'B', divisor: 1 },
  ] as const

  for (const { unit, divisor } of units) {
    const value = bytes / divisor
    if (value >= 1) {
      const formattedValue =
        unit === 'B' ? Math.round(value) : Number(value.toFixed(precision))
      return { value: formattedValue, unit }
    }
  }

  return { value: 0, unit: 'B' }
}
