export const DIAGNOSTICS_PREFERENCE_KEY = "slabberjaws.diagnostics.enabled";
const preferenceChangedEvent = "slabberjaws:diagnostics-preference-changed";

function readDiagnosticsPreference(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("diagnostics") === "1") return true;
  try {
    return window.localStorage.getItem(DIAGNOSTICS_PREFERENCE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribeToDiagnosticsPreference(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(preferenceChangedEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(preferenceChangedEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getDiagnosticsSnapshot(): boolean {
  return readDiagnosticsPreference();
}

export function getDiagnosticsServerSnapshot(): boolean {
  return false;
}

export function subscribeDiagnosticsPreference(onChange: () => void): () => void {
  return subscribeToDiagnosticsPreference(onChange);
}

export function setDiagnosticsPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DIAGNOSTICS_PREFERENCE_KEY, String(enabled));
  } catch {
    // Keep this session usable if browser storage is blocked or unavailable.
  }
  if (!enabled && new URLSearchParams(window.location.search).has("diagnostics")) {
    const url = new URL(window.location.href);
    url.searchParams.delete("diagnostics");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
  window.dispatchEvent(new Event(preferenceChangedEvent));
}

export function persistDiagnosticsUrlActivation(): void {
  if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("diagnostics") !== "1") return;
  setDiagnosticsPreference(true);
}

