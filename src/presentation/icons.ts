/** Original UI line icons. Decorative; the adjacent visible label supplies the accessible name. */
export function icon(
  name: "resonance" | "research" | "journal" | "planet" | "crew" | "pause",
) {
  const paths = {
    resonance:
      '<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z"/><circle cx="12" cy="12" r="3"/>',
    research:
      '<path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m3 7 9 5 9-5M12 12v10M7 4.8l10 5.5v5.5"/>',
    journal:
      '<path d="M5 3h12l3 3v15H5zM8 7h5M8 11h9M8 15h9M8 18h5M17 3v4h3"/>',
    planet:
      '<circle cx="12" cy="12" r="7"/><ellipse cx="12" cy="12" rx="12" ry="3.5" transform="rotate(-30 12 12)"/>',
    crew: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3M4 5l-2 5 3 3M20 5l2 5-3 3"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
  };
  return `<span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg></span>`;
}
