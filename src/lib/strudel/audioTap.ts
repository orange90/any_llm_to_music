type Tap = {
  ctx: AudioContext;
  analyser: AnalyserNode;
};

let installed = false;
let tap: Tap | null = null;
const listeners = new Set<(t: Tap) => void>();

function ensureTapForContext(ctx: BaseAudioContext): Tap | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!(ctx instanceof AudioContext)) return null;
  if (tap && tap.ctx === ctx) return tap;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;
  tap = { ctx, analyser };
  listeners.forEach((fn) => {
    try {
      fn(tap as Tap);
    } catch {
      // ignore listener errors
    }
  });
  return tap;
}

export function installAudioTap(): void {
  if (installed) return;
  if (typeof window === 'undefined') return;
  if (typeof AudioNode === 'undefined') return;

  const originalConnect = AudioNode.prototype.connect as (
    this: AudioNode,
    ...args: unknown[]
  ) => AudioNode | void;

  AudioNode.prototype.connect = function patchedConnect(
    this: AudioNode,
    ...args: unknown[]
  ): AudioNode | void {
    const result = originalConnect.apply(this, args as Parameters<AudioNode['connect']>);
    try {
      const target = args[0];
      if (target && typeof target === 'object' && 'context' in (target as object)) {
        const node = target as AudioNode;
        const ctx = node.context;
        if (ctx && node === ctx.destination) {
          const t = ensureTapForContext(ctx);
          if (t && this !== t.analyser) {
            try {
              originalConnect.call(this, t.analyser);
            } catch {
              // node may already be connected; ignore
            }
          }
        }
      }
    } catch {
      // never break the original connect chain
    }
    return result;
  } as typeof AudioNode.prototype.connect;

  installed = true;
}

export function getAudioTap(): Tap | null {
  return tap;
}

export function subscribeAudioTap(fn: (t: Tap) => void): () => void {
  listeners.add(fn);
  if (tap) {
    try {
      fn(tap);
    } catch {
      // ignore
    }
  }
  return () => {
    listeners.delete(fn);
  };
}
