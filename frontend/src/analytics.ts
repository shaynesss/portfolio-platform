/*
 * Visit counting with Umami Cloud: no cookies and no personal data, so under the
 * UK's 2026 statistics exception it needs a clear notice and an easy opt-out, not a
 * consent banner. Nothing loads until WEBSITE_ID is set, and only on the live host.
 */

/** The website ID from the Umami dashboard (Settings → Websites). Public, not a secret. */
const WEBSITE_ID: string = "9df4f9fb-12e2-4dcd-9a25-6fa2f428bd0d";
const HOST = "shayneyong.vercel.app";
const OPT_OUT_KEY = "umami.disabled";

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | number>) => void };
  }
}

export const enabled = (): boolean => WEBSITE_ID !== "" && location.hostname === HOST;

export function optedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function optOut(): void {
  try {
    localStorage.setItem(OPT_OUT_KEY, "1");
  } catch {
    /* storage blocked: nothing was being counted from here anyway */
  }
}

export function loadAnalytics(): void {
  if (!enabled() || optedOut()) return;
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://cloud.umami.is/script.js";
  s.dataset.websiteId = WEBSITE_ID;
  s.dataset.domains = HOST;
  document.head.appendChild(s);
}

/** Record something a visitor did, such as opening a drawer. A no-op when not loaded. */
export function track(event: string, data?: Record<string, string | number>): void {
  try {
    window.umami?.track(event, data);
  } catch {
    /* analytics must never break the page */
  }
}
