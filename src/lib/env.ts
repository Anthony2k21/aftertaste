export function configuredEnv(
  url: string | undefined,
  key: string | undefined,
): { url: string; key: string } | null {
  const trimmedUrl = url?.trim() ?? ""
  const trimmedKey = key?.trim() ?? ""
  if (!trimmedUrl || !trimmedKey) return null
  try {
    const parsed = new URL(trimmedUrl)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
  } catch {
    return null
  }
  return { url: trimmedUrl, key: trimmedKey }
}
