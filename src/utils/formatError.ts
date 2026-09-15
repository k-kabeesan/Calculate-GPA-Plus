/**
 * Central Error Formatter Utility
 * Converts unknown errors, Error objects, Supabase error objects, API responses,
 * and network failures into clean, human-readable string error messages.
 * Prevents [object Object] from ever being rendered in the UI.
 */

export function formatErrorMessage(err: unknown, fallbackMessage = 'Unable to complete request. Please try again.'): string {
  if (!err) return fallbackMessage;

  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (trimmed && trimmed !== '[object Object]' && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return trimmed;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return formatErrorMessage(parsed, fallbackMessage);
      }
    } catch {}
  }

  if (err instanceof Error) {
    if (err.message && typeof err.message === 'string') {
      const msg = err.message.trim();
      if (msg && msg !== '[object Object]' && !msg.startsWith('{') && !msg.startsWith('[')) {
        return msg;
      }
      try {
        const parsed = JSON.parse(msg);
        if (parsed && typeof parsed === 'object') {
          return formatErrorMessage(parsed, fallbackMessage);
        }
      } catch {}
    }
  }

  if (typeof err === 'object') {
    const anyErr = err as Record<string, any>;

    // Handle Supabase / PostgREST error objects
    if (anyErr.message && typeof anyErr.message === 'string' && anyErr.message.trim() && anyErr.message !== '[object Object]') {
      const msg = anyErr.message.trim();
      if (anyErr.details && typeof anyErr.details === 'string' && anyErr.details.trim()) {
        return `${msg} (${anyErr.details.trim()})`;
      }
      if (anyErr.hint && typeof anyErr.hint === 'string' && anyErr.hint.trim()) {
        return `${msg} - Hint: ${anyErr.hint.trim()}`;
      }
      return msg;
    }

    if (anyErr.error) {
      if (typeof anyErr.error === 'string' && anyErr.error.trim() && anyErr.error !== '[object Object]') {
        return anyErr.error.trim();
      }
      if (typeof anyErr.error === 'object') {
        return formatErrorMessage(anyErr.error, fallbackMessage);
      }
    }

    if (anyErr.details && typeof anyErr.details === 'string' && anyErr.details.trim() && anyErr.details !== '[object Object]') {
      return anyErr.details.trim();
    }

    if (anyErr.statusText && typeof anyErr.statusText === 'string' && anyErr.statusText.trim()) {
      return `HTTP ${anyErr.status || ''}: ${anyErr.statusText.trim()}`.trim();
    }

    if (anyErr.status && typeof anyErr.status === 'number') {
      return `Server returned error status ${anyErr.status}.`;
    }
  }

  return fallbackMessage;
}

