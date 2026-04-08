/** US phone: keep up to 10 digits, format as (###) ###-#### while typing. */

export function digitsOnlyPhone(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10)
}

export function formatUsPhoneAsYouType(input: string): string {
  const d = digitsOnlyPhone(input)
  if (d.length === 0) return ''
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function isCompleteUsPhone(formatted: string): boolean {
  return digitsOnlyPhone(formatted).length === 10
}
