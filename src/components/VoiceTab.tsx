import { useState, useRef, useCallback, useEffect } from 'react';
import { VoicePipeline, ModelCategory, ModelManager, AudioCapture, AudioPlayback, SpeechActivity } from '@runanywhere/web';
import { VAD } from '@runanywhere/web-onnx';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

type VoiceState = 'idle' | 'loading-models' | 'listening' | 'processing' | 'speaking';

export function VoiceTab() {
  const llmLoader = useModelLoader(ModelCategory.Language, true);
  const sttLoader = useModelLoader(ModelCategory.SpeechRecognition, true);
  const ttsLoader = useModelLoader(ModelCategory.SpeechSynthesis, true);
  const vadLoader = useModelLoader(ModelCategory.Audio, true);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const micRef = useRef<AudioCapture | null>(null);
  const pipelineRef = useRef<VoicePipeline | null>(null);
  const vadUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      micRef.current?.stop();
      vadUnsub.current?.();
    };
  }, []);

  const ensureModels = useCallback(async (): Promise<boolean> => {
    setVoiceState('loading-models');
    setError(null);
    const results = await Promise.all([
      vadLoader.ensure(),
      sttLoader.ensure(),
      llmLoader.ensure(),
      ttsLoader.ensure(),
    ]);
    if (results.every(Boolean)) {
      setVoiceState('idle');
      return true;
    }
    setError('Failed to load voice models');
    setVoiceState('idle');
    return false;
  }, [vadLoader, sttLoader, llmLoader, ttsLoader]);

  const startListening = useCallback(async () => {
    setTranscript('');
    setResponse('');
    setError(null);
    const anyMissing = !ModelManager.getLoadedModel(ModelCategory.Audio)
      || !ModelManager.getLoadedModel(ModelCategory.SpeechRecognition)
      || !ModelManager.getLoadedModel(ModelCategory.Language)
      || !ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis);
    if (anyMissing) {
      const ok = await ensureModels();
      if (!ok) return;
    }
    setVoiceState('listening');
    const mic = new AudioCapture({ sampleRate: 16000 });
    micRef.current = mic;
    if (!pipelineRef.current) pipelineRef.current = new VoicePipeline();
    VAD.reset();
    vadUnsub.current = VAD.onSpeechActivity((activity) => {
      if (activity === SpeechActivity.Ended) {
        const segment = VAD.popSpeechSegment();
        if (segment && segment.samples.length > 1600) processSpeech(segment.samples);
      }
    });
    await mic.start(
      (chunk) => { VAD.processSamples(chunk); },
      (level) => { setAudioLevel(level); },
    );
  }, [ensureModels]);

  const processSpeech = useCallback(async (audioData: Float32Array) => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;
    micRef.current?.stop();
    vadUnsub.current?.();
    setVoiceState('processing');
    try {
      const result = await pipeline.processTurn(audioData, {
        maxTokens: 80,
        temperature: 0.7,
        systemPrompt: 'You are Aethra, a voice design assistant. Give quick, helpful interior design tips. Be warm and encouraging.',
      }, {
        onTranscription: (text) => setTranscript(text),
        onResponseToken: (_token, accumulated) => setResponse(accumulated),
        onResponseComplete: (text) => setResponse(text),
        onSynthesisComplete: async (audio, sampleRate) => {
          setVoiceState('speaking');
          const player = new AudioPlayback({ sampleRate });
          await player.play(audio, sampleRate);
          player.dispose();
        },
        onStateChange: (s) => {
          if (s === 'processingSTT') setVoiceState('processing');
          if (s === 'generatingResponse') setVoiceState('processing');
          if (s === 'playingTTS') setVoiceState('speaking');
        },
      });
      if (result) {
        setTranscript(result.transcription);
        setResponse(result.response);
      }
    } catch (err) {
      setError(String(err));
    }
    setVoiceState('idle');
    setAudioLevel(0);
  }, []);

  const pendingLoaders = [
    { label: 'VAD', loader: vadLoader },
    { label: 'STT', loader: sttLoader },
    { label: 'LLM', loader: llmLoader },
    { label: 'TTS', loader: ttsLoader },
  ].filter((l) => l.loader.state !== 'ready');

  return (
    <div className="tab-panel voice-panel">
      {pendingLoaders.length > 0 && voiceState === 'idle' && (
        <ModelBanner state={pendingLoaders[0].loader.state} progress={pendingLoaders[0].loader.progress} error={pendingLoaders[0].loader.error} onLoad={ensureModels} label={`Voice (${pendingLoaders.map((l) => l.label).join(', ')})`} />
      )}

      {error && <div className="vision-result"><span className="error-text">{error}</span></div>}

      <div className="voice-center">
        <div className="voice-orb" data-state={voiceState} style={{ '--level': audioLevel } as any}>
          <div className="voice-orb-inner" />
        </div>

        <p className="voice-status">
          {voiceState === 'idle' && 'Speak to Aethra'}
          {voiceState === 'loading-models' && 'Preparing voice engine...'}
          {voiceState === 'listening' && 'Listening...'}
          {voiceState === 'processing' && 'Thinking...'}
          {voiceState === 'speaking' && 'Aethra is speaking...'}
        </p>

        {voiceState === 'idle' || voiceState === 'loading-models' ? (
          <button className="btn btn-primary btn-lg" onClick={startListening} disabled={voiceState === 'loading-models'}>
            Talk to Aethra
          </button>
        ) : voiceState === 'listening' ? (
          <button className="btn btn-lg" onClick={() => { micRef.current?.stop(); setVoiceState('idle'); }}>
            Cancel
          </button>
        ) : null}
      </div>

      {transcript && <div className="voice-transcript"><h4>Heard:</h4><p style={{ fontWeight: 500 }}>{transcript}</p></div>}
      {response && <div className="voice-response"><h4>Aethra:</h4><p style={{ fontWeight: 500 }}>{response}</p></div>}
    </div>
  );
}
