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
    if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return trimmed;
    }
  }

  if (err instanceof Error) {
    if (err.message && typeof err.message === 'string') {
      const msg = err.message.trim();
      if (msg && !msg.startsWith('{') && !msg.startsWith('[')) {
        return msg;
      }
    }
  }

  if (typeof err === 'object') {
    const anyErr = err as Record<string, any>;

    if (anyErr.error && typeof anyErr.error === 'string') {
      return anyErr.error.trim();
    }
    if (anyErr.message && typeof anyErr.message === 'string') {
      return anyErr.message.trim();
    }
    if (anyErr.details && typeof anyErr.details === 'string') {
      return anyErr.details.trim();
    }
    if (anyErr.statusText && typeof anyErr.statusText === 'string') {
      return anyErr.statusText.trim();
    }
  }

  return fallbackMessage;
}
