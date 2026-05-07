export function normalizePhone(value?: string): string {
  if (!value) return "";
  const digits = value.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}
