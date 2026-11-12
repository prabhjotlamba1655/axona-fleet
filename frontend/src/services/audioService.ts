/**
 * Web Audio Emergency Siren Synthesizer for AIS-140 Panic Alerts
 */

class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeOscillator: OscillatorNode | null = null;
  private activeGain: GainNode | null = null;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.activeOscillator) {
      this.stopAlarm();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play pulsing emergency siren tone
   */
  public playPanicSiren(durationMs: number = 3000) {
    if (this.isMuted) return;

    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      
      // Frequency modulation for siren warble
      const now = this.audioCtx.currentTime;
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.linearRampToValueAtTime(1250, now + 0.3);
      osc.frequency.linearRampToValueAtTime(850, now + 0.6);
      osc.frequency.linearRampToValueAtTime(1250, now + 0.9);
      osc.frequency.linearRampToValueAtTime(850, now + 1.2);
      osc.frequency.linearRampToValueAtTime(1250, now + 1.5);
      osc.frequency.linearRampToValueAtTime(850, now + 1.8);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + (durationMs / 1000));

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + (durationMs / 1000));

      this.activeOscillator = osc;
      this.activeGain = gain;
    } catch (e) {
      console.warn('Audio playback not permitted yet (requires user gesture):', e);
    }
  }

  public stopAlarm() {
    if (this.activeOscillator) {
      try {
        this.activeOscillator.stop();
        this.activeOscillator.disconnect();
      } catch (e) {
        // ignore
      }
      this.activeOscillator = null;
    }
  }
}

export const audioAlert = new AudioAlertService();
export default audioAlert;
