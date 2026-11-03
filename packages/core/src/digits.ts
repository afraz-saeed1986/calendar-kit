/** Replaces Persian (۰-۹) and Arabic-Indic (٠-٩) digits with Latin digits. */
export function normalizeDigits(text: string): string {
  return text.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}
