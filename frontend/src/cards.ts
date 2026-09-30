import { SECRETS, type Project } from "./content";
import { S } from "./state";
import { esc } from "./util";

/** The index card that rises from a drawer: a guide card, its tab carrying the category. */
export function indexCard(p: Project, slot: number): string {
  if (p.id === "wip") {
    return `<div class="ic-body ic-wip"><div class="ic-main"><h3 class="ic-title">${esc(p.title)}</h3></div><span class="ic-hole"></span></div>`;
  }
  const tabLeft = [5, 33.3, 61.6][slot % 3];
  return `<span class="ic-tab" style="left:${tabLeft}%">${esc(p.category)}</span>
    <div class="ic-body">
      <span class="ic-cn">${esc(p.callNumber[0])}<br>${esc(p.callNumber[1])}</span>
      <div class="ic-main">
        <h3 class="ic-title">${esc(p.title)}</h3>
        <p class="ic-date">${esc(p.date)}</p>
      </div>
      <span class="ic-hole"></span>
    </div>`;
}

/**
 * The project card, read like a museum label beside its object: the title, one
 * line of facts, the description, the two sections, and the tools and links as
 * the small print.
 */
export function projectCard(p: Project): string {
  const id = `pc-${p.id}`;
  const badge = p.badge ? `<span class="badge ${p.badge.tone}">${esc(p.badge.text)}</span>` : "";
  const links = p.links
    .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener" data-umami-event="outbound" data-umami-event-to="${esc(p.id)}-${esc(l.label.toLowerCase().replace(/\s+/g, "-"))}">${esc(l.label)}<span aria-hidden="true">↗</span></a>`)
    .join("");
  return `<article class="card" aria-labelledby="${id}">
      <h2 class="c-title" id="${id}">${esc(p.title)}</h2>
      <p class="c-meta">${badge}<span>${esc(p.category)} · ${esc(p.date)}</span></p>
      <p class="c-lead">${esc(p.description)}</p>
      <section class="c-sec"><h3 class="c-label">How it works</h3><p>${esc(p.how)}</p></section>
      <section class="c-sec"><h3 class="c-label">What it solves</h3><p>${esc(p.solves)}</p></section>
      <footer class="c-small">
        <ul class="c-tools" aria-label="Built with">${p.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <p class="c-links">${links}</p>
      </footer>
    </article>`;
}

/** The note in the bottle: the hidden things, found or not, and nothing else. */
export function noteHTML(): string {
  const items = SECRETS.map(([key, label]) =>
    S.found.has(key) ? `<li class="got">${label}</li>` : `<li class="not"><span aria-label="not found yet"></span></li>`,
  ).join("");
  return `<p class="n-count" id="n-count"><b>${S.found.size}</b> of ${SECRETS.length} found</p><ul class="n-list">${items}</ul>`;
}
