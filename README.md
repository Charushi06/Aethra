# Aethra: Local AI Interior Design Advisor

Aethra is a premium web application that brings **on-device AI** to interior design. Using the [`@runanywhere/web`](https://www.npmjs.com/package/@runanywhere/web) SDK, Aethra analyzes your space via camera or photo uploads and provides professional design recommendations—all running locally in your browser.

## Key Features

- **🏠 AI Design Advisor (VLM):** Analyze your room's architectural style and furniture in real-time. Choose from aesthetics like *Minimalist*, *Bohemian*, or *Industrial* to get tailored improvement tips.
- **💬 Local Design Consultant (LLM):** Chat with a specialized AI interior designer to plan your space, choose color palettes, and solve layout challenges.
- **🎙️ Voice Interaction:** Talk naturally to Aethra. Local STT, LLM, and TTS pipelines enable a hands-free design experience.
- **🔒 100% Private:** Zero server uploads. Your home photos and conversations stay in your browser.

## Powered By RunAnywhere

- **Vision:** LFM2-VL 450M (GGUF)
- **Language:** LFM2 350M (GGUF)
- **Voice Pipeline:** Whisper (STT), Piper (TTS), Silero (VAD) via ONNX Runtime.

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Launch Development Server:**
   ```bash
   npm run dev
   ```

3. **Open:** [http://localhost:5173](http://localhost:5173)

Models are automatically downloaded on first use and cached locally. Performance is best with **WebGPU** (Chrome/Edge 120+).

## Tech Stack

- **Framework:** React + TypeScript + Vite
- **AI Engine:** @runanywhere/web (Wasm/WebGPU)
- **Styling:** Premium Vanilla CSS Design System
- **Icons:** Lucide-React

## License

MIT
