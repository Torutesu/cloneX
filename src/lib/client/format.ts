/** Amount is stored as whole currency units (see pipeline/octolane/build-notes.md #1). */
export function formatAmount(amount: number | null | undefined, currency = "USD"): string {
  if (amount === null || amount === undefined) return "未設定";
  const symbol = currency === "USD" ? "$" : currency === "JPY" ? "¥" : "";
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function isOverdue(dueAt: string | Date | null | undefined): boolean {
  if (!dueAt) return false;
  const d = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  return d.getTime() < Date.now();
}

const ACTIVITY_ICON: Record<string, string> = {
  EMAIL: "✉️",
  NOTE: "📝",
  TASK: "✅",
  SYSTEM: "⚙️",
  CHAT_ACTION: "🤖",
};

export function activityIcon(type: string): string {
  return ACTIVITY_ICON[type] ?? "•";
}
