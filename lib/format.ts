export function fmtNgn(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m >= 100 ? m.toFixed(0) + "M" : m.toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export function fmtNgnFull(n: number): string {
  return n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export function escHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
