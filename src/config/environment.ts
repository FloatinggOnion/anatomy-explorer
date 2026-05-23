/**
 * Platform detection for conditional imports
 *
 * IS_TAURI: true when running in Tauri desktop app (window.__TAURI_CORE__ defined)
 * IS_WEB: true when running in web browser (IS_TAURI === false)
 *
 * Usage:
 * ```typescript
 * import { IS_TAURI, IS_WEB } from '@/config/environment';
 *
 * if (IS_TAURI) {
 *   // Tauri-specific code
 * } else if (IS_WEB) {
 *   // Web-specific code
 * }
 * ```
 */

export const IS_TAURI =
  typeof window !== "undefined" && "__TAURI_CORE__" in window;

export const IS_WEB = !IS_TAURI;
