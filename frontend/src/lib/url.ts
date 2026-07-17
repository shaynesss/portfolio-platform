// TUI-entered URLs sometimes omit the scheme (e.g. "www.linkedin.com/...")
// — as an href that resolves relative to the current page instead of
// navigating out, silently breaking the link. Prepend one defensively.
export function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
