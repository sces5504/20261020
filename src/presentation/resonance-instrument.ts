/** Original vector interface ornament; text and resources remain live DOM. */
export function resonanceInstrument() {
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i * Math.PI) / 24,
      major = i % 4 === 0,
      r = major ? 88 : 93;
    return `<path d="M${120 + Math.cos(a) * r} ${120 + Math.sin(a) * r}L${120 + Math.cos(a) * 101} ${120 + Math.sin(a) * 101}" opacity="${major ? 0.8 : 0.35}"/>`;
  }).join("");
  return `<svg viewBox="0 0 240 240" fill="none" aria-hidden="true"><defs><radialGradient id="res-core"><stop stop-color="#b9e6e4" stop-opacity=".3"/><stop offset=".5" stop-color="#608ca3" stop-opacity=".12"/><stop offset="1" stop-color="#13283d" stop-opacity="0"/></radialGradient><linearGradient id="res-gold" x2="1" y2="1"><stop stop-color="#fff1c4"/><stop offset=".5" stop-color="#b99a60"/><stop offset="1" stop-color="#f6e3b6"/></linearGradient></defs><circle cx="120" cy="120" r="112" fill="url(#res-core)"/><g stroke="url(#res-gold)" stroke-width=".7"><circle cx="120" cy="120" r="103"/><circle cx="120" cy="120" r="86"/><circle cx="120" cy="120" r="72" stroke-dasharray="2 7"/>${ticks}<path d="m120 33 75 130H45zM120 207 45 77h150z" opacity=".35"/><path d="m120 64 56 56-56 56-56-56z" opacity=".75"/><circle cx="120" cy="120" r="45" opacity=".35"/></g><path d="m120 86 8 26 26 8-26 8-8 26-8-26-26-8 26-8z" fill="url(#res-gold)"/><g fill="#aee3e3"><circle cx="120" cy="17" r="2.5"/><circle cx="223" cy="120" r="2.5"/><circle cx="120" cy="223" r="2.5"/><circle cx="17" cy="120" r="2.5"/></g></svg>`;
}
