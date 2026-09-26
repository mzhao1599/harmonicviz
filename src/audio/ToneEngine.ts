// One AudioContext for the life of the page. Each sound is a "voice": a bank of
// sine oscillators (one per partial) summed into a voice gain that ramps in and
// out, so starting, stopping and switching notes never click.

export interface TonePartial {
  freq: number;
  amp: number;
}

interface Voice {
  gain: GainNode;
  oscillators: OscillatorNode[];
}

const FADE_IN = 0.03;
const FADE_OUT = 0.06;
const MASTER_LEVEL = 0.3;

export class ToneEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voice: Voice | null = null;

  private context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_LEVEL;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Create or resume the AudioContext. Call from a click handler so mobile browsers allow audio. */
  unlock() {
    this.context();
  }

  /** Crossfade to a new sound. Partials above the Nyquist frequency are dropped. */
  play(partials: TonePartial[]) {
    const ctx = this.context();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + FADE_IN);
    gain.connect(this.master!);

    const oscillators = partials
      .filter(p => p.freq > 0 && p.freq < ctx.sampleRate / 2 && p.amp > 0)
      .map(p => {
        const osc = ctx.createOscillator();
        const partialGain = ctx.createGain();
        osc.frequency.value = p.freq;
        partialGain.gain.value = p.amp;
        osc.connect(partialGain).connect(gain);
        osc.start(now);
        return osc;
      });

    this.release(this.voice);
    this.voice = { gain, oscillators };
  }

  stop() {
    this.release(this.voice);
    this.voice = null;
  }

  /** Close the AudioContext; the engine can still be used again afterwards. */
  dispose() {
    this.voice = null;
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }

  private release(voice: Voice | null) {
    if (!voice || !this.ctx) return;
    const now = this.ctx.currentTime;
    const g = voice.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + FADE_OUT);
    for (const osc of voice.oscillators) {
      osc.onended = () => osc.disconnect();
      osc.stop(now + FADE_OUT + 0.01);
    }
    setTimeout(() => voice.gain.disconnect(), (FADE_OUT + 0.1) * 1000);
  }
}
