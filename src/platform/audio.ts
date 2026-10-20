import type { Pack } from "../content/schema";
export class AudioMixer {
  context: AudioContext | null = null;
  enabled = localStorage.getItem("stella:muted") !== "true";
  volume = Number(localStorage.getItem("stella:volume") ?? 0.55);
  last = new Map<string, number>();
  constructor(readonly pack: Pack) {}
  async unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      /* Browsers without audio may still play the game. */
    }
  }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("stella:muted", String(!this.enabled));
    if (this.enabled) void this.unlock();
    else void this.context?.suspend();
  }
  setVolume(n: number) {
    this.volume = Math.max(0, Math.min(1, n));
    localStorage.setItem("stella:volume", String(this.volume));
  }
  cue(category: string) {
    const ctx = this.context,
      c = this.pack.audio.find(
        (c) => c.category === category && c.status === "active",
      );
    if (!this.enabled || !ctx || ctx.state !== "running" || !c) return;
    const now = ctx.currentTime;
    const interval =
      category === "shot" ? 0.11 : category === "hit" ? 0.09 : 0.05;
    if (now - (this.last.get(category) ?? -10) < interval) return;
    this.last.set(category, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, c.gain * this.volume),
      now + 0.008,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + c.seconds);
    gain.connect(ctx.destination);
    const tone = ctx.createOscillator();
    tone.type = c.waveform;
    tone.frequency.setValueAtTime(c.startHz, now);
    tone.frequency.exponentialRampToValueAtTime(c.endHz, now + c.seconds);
    tone.connect(gain);
    tone.start(now);
    tone.stop(now + c.seconds + 0.01);
    if (c.noise) {
      const count = Math.floor(ctx.sampleRate * c.seconds),
        buffer = ctx.createBuffer(1, count, ctx.sampleRate),
        data = buffer.getChannelData(0);
      let seed = 42317;
      for (let i = 0; i < count; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] = ((seed / 4294967296) * 2 - 1) * c.noise;
      }
      const noise = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      noise.buffer = buffer;
      noise.connect(filter);
      filter.connect(gain);
      noise.start(now);
    }
  }
  background(hidden: boolean) {
    if (hidden) void this.context?.suspend();
    else if (this.enabled) void this.context?.resume();
  }
  destroy() {
    void this.context?.close();
    this.context = null;
  }
}
