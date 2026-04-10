/** Replace {{key}} with values from vars. Unknown keys stay as {{key}}. */
export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    vars[k] !== undefined && vars[k] !== null ? vars[k] : `{{${k}}}`,
  )
}

/** Subject lines use the same placeholders as body fields (no HTML escaping). */
export function buildEmailSubject(template: string, vars: Record<string, string>): string {
  return interpolateTemplate(template, vars)
}
