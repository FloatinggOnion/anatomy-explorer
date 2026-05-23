/**
 * Platform utilities for conditional imports and Tauri API access
 *
 * Allows safe importing of @tauri-apps/api without breaking web builds.
 * Tree-shaking removes all Tauri imports from web bundle automatically.
 */

import { IS_TAURI } from "@/config/environment";

/**
 * Execute a function only in Tauri environment
 *
 * Usage:
 * ```typescript
 * const path = await onlyTauri(async () => {
 *   const { path } = await import('@tauri-apps/api');
 *   return path.resolveResource('models');
 * });
 * ```
 */
export async function onlyTauriAsync<T>(
  fn: () => Promise<T>
): Promise<T | null> {
  if (IS_TAURI) {
    return fn();
  }
  return null;
}

/**
 * Execute a synchronous function only in Tauri environment
 *
 * Usage:
 * ```typescript
 * const hasStorage = onlyTauri(() => typeof window !== 'undefined');
 * ```
 */
export function onlyTauri<T>(fn: () => T): T | null {
  if (IS_TAURI) {
    return fn();
  }
  return null;
}

/**
 * Import pattern for conditional module loading
 *
 * Instead of: import { someApi } from '@tauri-apps/api';
 * Do this:     const { someApi } = await onlyTauriAsync(() => import('@tauri-apps/api'));
 *
 * This allows Vite to tree-shake Tauri imports completely in web builds,
 * keeping the bundle size minimal.
 */
