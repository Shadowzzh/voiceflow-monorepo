/**
 * 安全解析数字
 */
export function safeParseInt(
  value: string | undefined,
  defaultValue = 0
): number {
  if (!value) return defaultValue
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

/**
 * 安全解析浮点数
 */
export function safeParseFloat(
  value: string | undefined,
  defaultValue = 0
): number {
  if (!value) return defaultValue
  const parsed = Number.parseFloat(value.trim())
  return Number.isNaN(parsed) ? defaultValue : parsed
}
