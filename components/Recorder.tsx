"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TranscriberController } from "./recorder/transcriber";
import { AudioCapture } from "./recorder/capture";
import { resample, rms, WHISPER_SAMPLE_RATE } from "@/lib/audio";
import NotesPanel from "./recorder/NotesPanel";

type ModelState = "idle" | "loading" | "ready";
const CHUNK_MS = 20000; // transcribe every 20s of speech for a live feel

export default function Recorder() {
  const [model, setModel] = useState<ModelState>("idle");
  const [device, setDevice] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [working, setWorking] = useState(false);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const trans = useRef<TranscriberController | null>(null);
  const cap = useRef<AudioCapture | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const busy = useRef(false);

  const getTranscriber = useCallback(() => {
    if (!trans.current) {
      trans.current = new TranscriberController({
        onDevice: (d) => setDevice(d),
        onProgress: (_f, p) => setProgress(p),
        onReady: () => setModel("ready"),
      });
    }
    return trans.current;
  }, []);

  useEffect(() => () => { trans.current?.dispose(); cap.current?.stop(); if (timer.current) clearInterval(timer.current); }, []);

  const loadModel = useCallback(() => {
    if (model !== "idle") return;
    setModel("loading");
    setError(null);
    getTranscriber().preload();
  }, [model, getTranscriber]);

  const transcribeBuffer = useCallback(async (audio: Float32Array, rate: number) => {
    const pcm = resample(audio, rate, WHISPER_SAMPLE_RATE);
    return getTranscriber().transcribe(pcm);
  }, [getTranscriber]);

  const tick = useCallback(async () => {
    const c = cap.current;
    if (!c || busy.current) return;
    const fresh = c.drainNew();
    if (fresh.length < c.sampleRate * 2 || rms(fresh) < 0.008) return; // skip <2s / silence
    busy.current = true;
    try {
      const text = await transcribeBuffer(fresh, c.sampleRate);
      if (text) setTranscript((t) => (t ? t + " " : "") + text);
    } catch (e) { setError(String((e as Error).message)); }
    finally { busy.current = false; }
  }, [transcribeBuffer]);

  const start = useCallback(async (mic: boolean, tab: boolean) => {
    setError(null);
    if (model === "idle") loadModel();
    const c = new AudioCapture();
    c.onLevel = (r) => setLevel(r);
    try {
      await c.start({ mic, tab });
    } catch (e) { setError((e as Error).message); return; }
    cap.current = c;
    setRecording(true);
    setElapsed(0);
    let last = 0;
    timer.current = setInterval(() => {
      setElapsed(Math.floor(c.totalSeconds()));
      const now = c.totalSeconds() * 1000;
      if (now - last >= CHUNK_MS) { last = now; void tick(); }
    }, 1000);
  }, [model, loadModel, tick]);

  const stop = useCallback(async () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setRecording(false);
    const c = cap.current;
    if (!c) return;
    setWorking(true);
    try {
      const fresh = c.drainNew();
      if (fresh.length > c.sampleRate && rms(fresh) > 0.006) {
        const text = await transcribeBuffer(fresh, c.sampleRate);
        if (text) setTranscript((t) => (t ? t + " " : "") + text);
      }
    } catch (e) { setError(String((e as Error).message)); }
    await c.stop();
    cap.current = null;
    setLevel(0);
    setWorking(false);
  }, [transcribeBuffer]);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    if (model === "idle") loadModel();
    setWorking(true);
    setTranscript("");
    try {
      const { audio, sampleRate } = await AudioCapture.decodeFile(file);
      const text = await transcribeBuffer(audio, sampleRate);
      setTranscript(text);
    } catch (e) { setError((e as Error).message || "Could not read that audio file."); }
    setWorking(false);
  }, [model, loadModel, transcribeBuffer]);

  const mins = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Record or upload</h2>
          {model === "ready" && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Model ready{device ? ` · ${device}` : ""}</span>}
          {model === "loading" && <span className="text-xs text-stone-500">Loading model… {progress}%</span>}
        </div>

        {!recording ? (
          <div className="mt-4 grid gap-2">
            <button onClick={() => start(true, true)} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500">
              ● Record meeting (mic + meeting tab audio)
            </button>
            <button onClick={() => start(true, false)} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium hover:bg-stone-50">
              Record microphone only
            </button>
            <label className="mt-1 cursor-pointer rounded-xl border border-dashed border-stone-300 px-4 py-3 text-center text-sm text-stone-600 hover:bg-stone-50">
              ⬆ Upload an audio file (MP3, WAV, M4A)
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <span className="rec-dot text-rose-500">●</span>
              <span className="font-mono text-lg tabular-nums">{mins}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full bg-emerald-500 transition-[width] duration-150" style={{ width: `${Math.min(100, Math.round(level * 400))}%` }} />
              </div>
            </div>
            <button onClick={stop} className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-700">
              ■ Stop & finish
            </button>
          </div>
        )}

        {working && <p className="mt-3 text-sm text-stone-500">Transcribing on your device…</p>}
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <p className="mt-4 text-xs text-stone-400">
          Tip: when sharing your meeting tab, tick <b>“Share tab audio”</b> so the other participants are captured.
          Audio never leaves your browser.
        </p>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-stone-700">Transcript</h3>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your transcript will appear here as you record…"
            className="mt-2 h-56 w-full resize-y rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm leading-relaxed outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      <NotesPanel transcript={transcript} durationSec={elapsed} />
    </div>
  );
}
