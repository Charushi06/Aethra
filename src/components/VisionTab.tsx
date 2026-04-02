import { useState, useRef, useEffect, useCallback } from 'react';
import { ModelCategory, VideoCapture } from '@runanywhere/web';
import { VLMWorkerBridge } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';
import { ImageUpload } from './ImageUpload';
import { getImagePixels } from '../utils';
import { getAccelerationMode } from '../runanywhere';

const SINGLE_MAX_TOKENS = 80;   // Reduced output to save context space
const CAPTURE_DIM = 224;        // Keep 224 as the model is likely trained on it

const AESTHETIC_STYLES = [
  'Earthy Minimal', 'Eclectic Boho', 'Soft Modern', 'Vintage Industrial', 'Cottagecore', 'Japandi'
];

export function VisionTab() {
  const loader = useModelLoader(ModelCategory.Multimodal);
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [procStep, setProcStep] = useState<'encoding' | 'generating' | null>(null);
  const [result, setResult] = useState<{ text: string; totalMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [uploadedImage, setUploadedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('Earthy Minimal');
  const [vibePrompt, setVibePrompt] = useState('A cozy minimal theme with plants.');

  const videoMountRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<VideoCapture | null>(null);
  const processingRef = useRef(false);

  processingRef.current = processing;

  useEffect(() => {
    if (loader.state === 'idle') {
      loader.ensure();
    }
  }, [loader]);

  useEffect(() => {
    if (cameraActive && videoMountRef.current && captureRef.current) {
        const el = captureRef.current.videoElement;
        el.style.width = '100%';
        el.style.height = '100%';
        if (!videoMountRef.current.contains(el)) videoMountRef.current.appendChild(el);
    }
  }, [cameraActive]);

  const startCamera = useCallback(async () => {
    setUploadedImage(null);
    setError(null);
    try {
      const cam = new VideoCapture({ facingMode: 'user' });
      await cam.start();
      captureRef.current = cam;
      setCameraActive(true);
    } catch (err) {
      setError('Camera access denied. ' + String(err));
    }
  }, []);

  const stopCamera = useCallback(() => {
    setCameraActive(false);
    captureRef.current?.stop();
    captureRef.current = null;
  }, []);

  const analyzeDesign = useCallback(async (maxTokens: number) => {
    if (processingRef.current) return;
    
    let pix;
    if (uploadedImage) {
      pix = await getImagePixels(uploadedImage.previewUrl, CAPTURE_DIM);
    } else if (captureRef.current?.isCapturing) {
      const frame = captureRef.current.captureFrame(CAPTURE_DIM);
      if (frame) pix = { rgbPixels: frame.rgbPixels, width: frame.width, height: frame.height };
    }

    if (!pix) {
      setError('Provide an image first.');
      return;
    }

    if (loader.state !== 'ready') {
      setError('Model not initialized.');
      return;
    }

    setProcessing(true);
    setProcStep('encoding');
    processingRef.current = true;
    setError(null);
    const t0 = performance.now();

    try {
      // SHORTER PROMPT: Reduces the likelihood of the -234 context limit error
      const prompt = `Assistant: Analyse image. Re-design as "${selectedStyle}". Highlight 3 changes.`;
      
      const res = await VLMWorkerBridge.shared.process(pix.rgbPixels, pix.width, pix.height, prompt, { maxTokens, temperature: 0.1 });
      setResult({ text: res.text, totalMs: performance.now() - t0 });
    } catch (err) {
      setError('Context Limit Error (-234): This usually happens if the engine RAM is low. Try a simpler image or refresh. ' + String(err));
    } finally {
      setProcessing(false);
      setProcStep(null);
      processingRef.current = false;
    }
  }, [loader, selectedStyle, vibePrompt, uploadedImage]);

  return (
    <div className="tab-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 className="section-title serif" style={{ fontSize: '36px' }}>Designer Studio</h2>
          <p className="section-desc">Local visionary intelligence. 100% On-Device.</p>
        </div>
        <ModelBanner state={loader.state} progress={loader.progress} error={loader.error} onLoad={loader.ensure} label="Aethra VLM" />
      </div>

      <div className="designer-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="vision-card">
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>1. Space Vision</h4>
            {cameraActive ? (
              <div className="vision-camera active" ref={videoMountRef}>
                 <button className="btn btn-sm" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }} onClick={stopCamera}>Close</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: uploadedImage ? '1fr' : '1fr 1fr', gap: '10px' }}>
                 {!uploadedImage && <button className="vision-camera" onClick={startCamera}>📷 Live Camera</button>}
                 <ImageUpload image={uploadedImage} setImage={setUploadedImage} />
              </div>
            )}
          </div>

          <div className="vision-card">
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>2. Design Aura</h4>
            <div className="aesthetic-grid">
              {AESTHETIC_STYLES.map(style => (
                <div key={style} className={`aesthetic-item ${selectedStyle === style ? 'active' : ''}`} onClick={() => setSelectedStyle(style)}>
                  {style}
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={() => analyzeDesign(SINGLE_MAX_TOKENS)} disabled={processing || (!uploadedImage && !cameraActive)}>
               {processing ? 'Thinking...' : 'Unveil Insight'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div className="vision-card" style={{ background: 'rgba(156,106,106,0.1)', color: 'var(--error)', fontSize: '12px' }}>{error}</div>}
          {processing && (
            <div className="vision-card" style={{ height: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 20px' }} />
                  <h3 className="serif" style={{ fontSize: '24px' }}>Aethra Imagining...</h3>
                  <p style={{ opacity: 0.6 }}>Local Vision Encoding (Step: {procStep})</p>
               </div>
            </div>
          )}
          {result && !processing && (
            <div className="vision-card" style={{ animation: 'fadeIn 0.6s' }}>
              <h3 className="serif" style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--primary)' }}>Visionary Insight</h3>
              <p style={{ color: '#F1E4D8', lineHeight: 1.8, fontSize: '16px', background: 'rgba(0,0,0,0.1)', padding: '20px', borderRadius: '10px' }}>{result.text}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', alignItems: 'center' }}>
                  <div className="badge">{selectedStyle} Applied</div>
                  <div className="badge" style={{ opacity: 0.8 }}>{getAccelerationMode()?.toUpperCase()} ENGINE</div>
                  <div style={{ fontSize: '10px', opacity: 0.5 }}>{(result.totalMs / 1000).toFixed(1)}s On-Device</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
