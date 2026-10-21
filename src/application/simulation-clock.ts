/** Fixed steps from elapsed foreground time. Never replay hidden/paused time. */
export class SimulationClock {
  private pending = 0;
  private discardNext = true;
  reset() {
    this.pending = 0;
    this.discardNext = true;
  }
  advance(
    rawMilliseconds: number,
    paused: boolean,
    step: (dt: number) => void,
  ) {
    if (this.discardNext || paused) {
      this.discardNext = false;
      this.pending = 0;
      return 0;
    }
    // Bound a single foreground stall to one second / 60 steps, avoiding an unbounded catch-up loop.
    this.pending = Math.min(
      1,
      this.pending + Math.max(0, Math.min(rawMilliseconds / 1000, 1)),
    );
    let count = 0;
    while (this.pending + 1e-9 >= 1 / 60 && count < 60) {
      step(1 / 60);
      this.pending = Math.max(0, this.pending - 1 / 60);
      count++;
    }
    return count / 60;
  }
}
