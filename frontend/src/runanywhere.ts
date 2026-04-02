/**
 * RunAnywhere SDK initialization and model catalog.
 *
 * This module:
 * 1. Initializes the core SDK (TypeScript-only, no WASM)
 * 2. Registers the LlamaCPP backend (loads LLM/VLM WASM)
 * 3. Registers the ONNX backend (sherpa-onnx — STT/TTS/VAD)
 * 4. Registers the model catalog and wires up VLM worker
 *
 * Import this module once at app startup.
 */

import {
  RunAnywhere,
  SDKEnvironment,
  ModelManager,
  ModelCategory,
  LLMFramework,
} from '@runanywhere/web';

import { LlamaCPP, VLMWorkerBridge } from '@runanywhere/web-llamacpp';
import { ONNX } from '@runanywhere/web-onnx';

// Vite bundles the worker as a standalone JS chunk and returns its URL.
// @ts-ignore — Vite-specific ?worker&url query
import vlmWorkerUrl from './workers/vlm-worker?worker&url';

// ---------------------------------------------------------------------------
// Model catalog
// ---------------------------------------------------------------------------

const MODELS = [
  // VLM — Liquid AI LFM2-VL 450M (vision + language)
  {
    id: 'lfm2-vl-450m-q4_0',
    name: 'LFM2-VL 450M Q4_0',
    repo: 'runanywhere/LFM2-VL-450M-GGUF',
    files: ['LFM2-VL-450M-Q4_0.gguf', 'mmproj-LFM2-VL-450M-Q8_0.gguf'],
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Multimodal,
    memoryRequirement: 500_000_000,
  }
];

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let _initPromise: Promise<void> | null = null;

/** Initialize the RunAnywhere SDK. Safe to call multiple times. */
export async function initSDK() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    // Step 1: Initialize core SDK (TypeScript-only, no WASM)
    await RunAnywhere.initialize({
      environment: SDKEnvironment.Development,
      debug: false,
    });

    // Step 2: Register backends (loads WASM automatically)
    await LlamaCPP.register();
    await ONNX.register();

    // Step 3: Register model catalog
    RunAnywhere.registerModels(MODELS);

    // Step 4: Wire up VLM worker
    VLMWorkerBridge.shared.workerUrl = vlmWorkerUrl;
    RunAnywhere.setVLMLoader({
      get isInitialized() { return VLMWorkerBridge.shared.isInitialized; },
      init: () => VLMWorkerBridge.shared.init(),
      loadModel: (params) => VLMWorkerBridge.shared.loadModel(params),
      unloadModel: () => VLMWorkerBridge.shared.unloadModel(),
    });
  })();

  return _initPromise;
}

export { RunAnywhere, ModelManager, ModelCategory, VLMWorkerBridge };
