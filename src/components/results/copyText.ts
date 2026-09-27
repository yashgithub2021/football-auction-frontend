/**
 * Copies text to the clipboard. Uses the async Clipboard API where the page
 * allows it (HTTPS or localhost), and falls back to a hidden textarea for
 * plain-HTTP LAN addresses, where `navigator.clipboard` doesn't exist.
 * Resolves to false if neither works, so the UI can say so.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText !== undefined) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not focused: try the fallback below.
  }
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
