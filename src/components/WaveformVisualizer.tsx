'use client';

import { useEffect, useRef } from 'react';
import { getAudioTap, subscribeAudioTap } from '@/lib/strudel/audioTap';

interface Props {
  active: boolean;
}

export function WaveformVisualizer({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const apply = (t: { analyser: AnalyserNode }) => {
      analyserRef.current = t.analyser;
    };
    const current = getAudioTap();
    if (current) apply(current);
    const unsubscribe = subscribeAudioTap(apply);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    };
    resize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }

    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) {
      return () => {
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', resize);
      };
    }

    const readCssVar = (name: string, fallback: string) => {
      if (typeof window === 'undefined') return fallback;
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      return v || fallback;
    };

    const drawIdleFrame = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      ctx2d.lineWidth = Math.max(1, dpr);
      ctx2d.strokeStyle = readCssVar('--color-muted', '#888888') + '55';
      ctx2d.beginPath();
      ctx2d.moveTo(0, h / 2);
      ctx2d.lineTo(w, h / 2);
      ctx2d.stroke();
    };

    if (!active) {
      drawIdleFrame();
      return () => {
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', resize);
      };
    }

    const buffer = new Uint8Array(2048);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const analyser = analyserRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      if (!analyser) {
        drawIdleFrame();
        return;
      }

      const len = Math.min(buffer.length, analyser.frequencyBinCount);
      const view = len === buffer.length ? buffer : buffer.subarray(0, len);
      analyser.getByteTimeDomainData(view);

      const accent = readCssVar('--color-accent', '#7c3aed');
      const accent2 = readCssVar('--color-accent2', '#22d3ee');

      const gradient = ctx2d.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, accent);
      gradient.addColorStop(1, accent2);

      ctx2d.lineWidth = Math.max(1.5, 1.5 * dpr);
      ctx2d.strokeStyle = gradient;
      ctx2d.lineJoin = 'round';
      ctx2d.beginPath();

      const slice = w / len;
      let x = 0;
      for (let i = 0; i < len; i++) {
        const v = view[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
        x += slice;
      }
      ctx2d.stroke();

      ctx2d.save();
      ctx2d.globalAlpha = 0.25;
      ctx2d.lineWidth = Math.max(3, 3 * dpr);
      ctx2d.stroke();
      ctx2d.restore();
    };

    draw();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-12 rounded-md border border-border bg-codebg"
      aria-hidden
    />
  );
}
