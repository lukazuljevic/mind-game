import { useEffect } from 'react';

const NAME_KEY = 'mind-player-name';

/** Haptic feedback where supported (Android). A no-op elsewhere. */
export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported
  }
}

/** Keeps the screen awake while `active`, so the phone doesn't lock during quiet moments. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          sentinel.release().catch(() => {});
        } else {
          lock = sentinel;
        }
      } catch {
        // Denied (e.g. low battery mode) or page hidden
      }
    };

    // The lock is dropped whenever the page is hidden, so take it again on return
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

export function loadPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Storage unavailable (private mode)
  }
}

/** Opens the native share sheet, falling back to the clipboard. Returns what happened. */
export async function shareInvite(code: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = `${window.location.origin}/?room=${code}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'The Mind', text: `Join my game of The Mind! Room ${code}`, url });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
