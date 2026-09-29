"use client";

import { useEffect, useRef, useState } from "react";

const TRACKS = [
  "Balming Tiger - Wash Away (Official Audio) ~NHKドラマ 「東京サラダボウル」 OST~.mp3",
  "Sean Paul x INNA - Let It Talk To Me.mp3",
  "Circa Waves - We Made It (Official Video).mp3",
  "Jayda G - 'Feeling Alive' (Official Video).mp3",
  "Miraa May - No Bad Energy (Official Music Video).mp3",
  "The Offspring - Make It All Right (Official Music Video).mp3",
  "NCT 127 엔시티 127 '삐그덕 (Walk)' MV.mp3",
  "Crystal Fighters - Manifest (Official Music Video).mp3",
  "Butcher Brown - MOVE (RIDE) featuring Jay Prince (Official Audio).mp3",
];

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [open, setOpen] = useState(false);
  const currentTrack = TRACKS[track] ?? TRACKS[0] ?? "";

  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!playing || audio === null) return;
    audio.load();
    void audio.play().catch(() => setPlaying(false));
  }, [track, playing]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (audio === null) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    await audio.play();
    setPlaying(true);
  };

  const next = () => {
    setTrack((current) => (current + 1) % TRACKS.length);
  };

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const startHold = () => {
    clearHoldTimer();
    longPressRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      longPressRef.current = true;
      setOpen(true);
    }, 550);
  };

  const finishHold = () => {
    clearHoldTimer();
  };

  const handleFloatingClick = () => {
    if (longPressRef.current) {
      longPressRef.current = false;
      return;
    }
    void toggle();
  };

  return (
    <aside className="fixed right-3 bottom-3 z-50 sm:right-5 sm:bottom-5">
      <audio
        ref={audioRef}
        src={`/audio/${encodeURIComponent(currentTrack)}`}
        onEnded={() => {
          setTrack((current) => (current + 1) % TRACKS.length);
          setPlaying(true);
        }}
        preload="metadata"
      />
      {!open ? (
        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={finishHold}
          onPointerCancel={finishHold}
          onPointerLeave={finishHold}
          onClick={handleFloatingClick}
          className="inline-flex size-14 items-center justify-center rounded-full border-2 border-lime-200/80 bg-lime-300 text-xl font-black text-emerald-950 shadow-xl shadow-black/35 transition hover:scale-105 hover:bg-lime-200 focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
          aria-label={playing ? "Pause music; hold to open controls" : "Play music; hold to open controls"}
          title={playing ? "Pause music · Hold to open controls" : "Play music · Hold to open controls"}
        >
          <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
        </button>
      ) : (
        <div className="w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl border border-white/15 bg-emerald-950/95 p-3 text-sm shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lime-300 uppercase">Background music</p>
              <p className="mt-0.5 truncate font-semibold text-white">{currentTrack.replace(/\.mp3$/i, "")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-lg text-emerald-100/70 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              aria-label="Close music controls"
              title="Close music controls"
            >
              ×
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => void toggle()}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full bg-lime-300 px-3 font-black text-emerald-950 transition hover:bg-lime-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              aria-label={playing ? "Pause music" : "Start music"}
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <button type="button" onClick={next} className="rounded-lg px-2 py-2 font-bold text-emerald-100 hover:bg-white/10" aria-label="Next music track">
              Next
            </button>
            <label className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-xs text-emerald-100/70">Volume</span>
              <input className="min-w-0 flex-1 accent-lime-300" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Music volume" />
            </label>
          </div>
        </div>
      )}
    </aside>
  );
}
