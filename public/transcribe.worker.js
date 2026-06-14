// ParleyNotes in-browser transcription worker.
//
// Loads transformers.js straight from the jsDelivr CDN (so the Next.js build
// never has to bundle the onnxruntime ML stack — fast deploys, no OOM) and runs
// OpenAI Whisper entirely on the user's device. Whisper model weights stream
// from the Hugging Face CDN on first use and are then cached by the browser.
//
// Messages in:  { type: "load" } | { type: "transcribe", id, audio: Float32Array }
// Messages out: { status: "device", device } | { status: "progress", file, progress }
//               | { status: "ready" } | { status: "result", id, text }
//               | { status: "error", id?, message }

import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

// We always fetch models from the Hub CDN (no local model files in this app).
env.allowLocalModels = false;

async function pickDevice() {
  try {
    if (typeof navigator !== "undefined" && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch {
    /* fall through to wasm */
  }
  return "wasm";
}

class Transcriber {
  static instance = null;
  static device = null;

  static async get(progress) {
    if (this.instance) return this.instance;
    this.device = await pickDevice();
    self.postMessage({ status: "device", device: this.device });
    // English-first models (our audience records English meetings). WebGPU can
    // run the larger, more accurate base model; WASM uses the fast tiny model.
    const model =
      this.device === "webgpu"
        ? "onnx-community/whisper-base.en"
        : "Xenova/whisper-tiny.en";
    this.instance = await pipeline("automatic-speech-recognition", model, {
      device: this.device,
      progress_callback: progress,
    });
    return this.instance;
  }
}

const onProgress = (x) => {
  if (x.status === "progress") {
    self.postMessage({
      status: "progress",
      file: x.file,
      progress: Math.round(x.progress || 0),
    });
  }
};

self.addEventListener("message", async (event) => {
  const { type, id, audio } = event.data || {};
  try {
    if (type === "load") {
      await Transcriber.get(onProgress);
      self.postMessage({ status: "ready" });
      return;
    }
    if (type === "transcribe") {
      const transcriber = await Transcriber.get(onProgress);
      const output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      const text = (Array.isArray(output) ? output[0]?.text : output?.text) || "";
      self.postMessage({ status: "result", id, text: text.trim() });
      return;
    }
  } catch (err) {
    self.postMessage({
      status: "error",
      id,
      message: err && err.message ? err.message : String(err),
    });
  }
});
