import React, { useState, useEffect } from 'react';
import './App.css';
import ImageUpload from './components/ImageUpload';
import ResultsGallery from './components/ResultsGallery';
import { Client } from "@gradio/client";
import { initSDK, VLMWorkerBridge } from './runanywhere';

function App() {
  const [image, setImage] = useState(null);
  const [aesthetic, setAesthetic] = useState('');
  const [items, setItems] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vlmStatus, setVlmStatus] = useState('idle');

  useEffect(() => {
    // Preload the SDK core (does not download models yet)
    initSDK().catch(console.error);
  }, []);

  const handleAutoAnalyze = async () => {
    if (!image) {
      alert("Please upload a room photo first!");
      return;
    }
    try {
      setVlmStatus('loading_model');
      await initSDK();
      
      if (!VLMWorkerBridge.shared.isInitialized) {
        await VLMWorkerBridge.shared.init();
      }
      
      if (!VLMWorkerBridge.shared.isModelLoaded) {
        console.log("Loading VLM model (might take a minute on first run)...");
        await VLMWorkerBridge.shared.loadModel('lfm2-vl-450m-q4_0');
      }

      setVlmStatus('analyzing');
      const img = new Image();
      img.src = image.previewUrl;
      await new Promise(r => img.onload = r);

      let w = img.width;
      let h = img.height;
      const MAX_DIM = 400; // Resize to ensure fast VLM inference
      if (Math.max(w, h) > MAX_DIM) {
        const scale = MAX_DIM / Math.max(w, h);
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get 2d canvas context");
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);

      // Convert RGBA to RGB for LlamaCPP
      const rgba = imgData.data;
      const rgb = new Uint8Array((rgba.length / 4) * 3);
      let j = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        rgb[j++] = rgba[i];
        rgb[j++] = rgba[i+1];
        rgb[j++] = rgba[i+2];
      }

      console.log("Running VLM inference...");
      const prompt = "Describe the interior design style and the visible furniture/items in comma-separated format.";
      const res = await VLMWorkerBridge.shared.process(rgb, w, h, prompt, { maxTokens: 80, temperature: 0.6 });
      
      // Update UI with the VLM result
      setItems(res.text.trim());
    } catch (err) {
      console.error(err);
      alert("VLM Error: " + (err.message || String(err)));
    } finally {
      setVlmStatus('idle');
    }
  };

  const handleGenerate = async () => {
    if (!image) {
      alert("Please upload a room photo first.");
      return;
    }
    
    setLoading(true);
    try {
      // Connected to User's Local Gradio endpoint via the background python script
      const HF_SPACE_URL = "http://127.0.0.1:7860/"; 
        let result;
        try {
          console.log("Connecting to Gradio App:", HF_SPACE_URL);
          const app = await Client.connect(HF_SPACE_URL);
          console.log("Connected successfully. App instance:", app);
          
          console.log("Searching for correct endpoint...");
          let fnIndex = 0;
          if (app.config && app.config.dependencies) {
            const endpoints = app.config.dependencies;
            for (let i = 0; i < endpoints.length; i++) {
              if (endpoints[i].inputs.length === 5) {
                fnIndex = i;
                break;
              }
            }
            console.log(`Resolved target fn_index to ${fnIndex}`);
          }

          console.log("Sending prediction request...");
          const predefinedStyles = ['Minimalist', 'Bohemian', 'Industrial', 'Cottagecore', 'Japandi'];
          const isPredefined = predefinedStyles.includes(aesthetic);
          const styleToSend = isPredefined ? aesthetic : 'Minimalist';
          const promptToSend = isPredefined ? "" : aesthetic;

          result = await app.predict(fnIndex, [
            image.file,
            promptToSend,
            items,
            styleToSend,
            "blurry, distorted, ugly, watermark, text, bad anatomy",
          ]);
          console.log("Prediction result received:", result);
          
        } catch (gradioError) {
          console.warn("Gradio connection failed. Using mock API for frontend testing.", gradioError);
          // MOCK FALLBACK: Simulate backend processing delay and return a random nice room
          await new Promise(r => setTimeout(r, 2500));
          
          const mockRooms = [
            "https://images.unsplash.com/photo-1540518614846-7eded433c457",
            "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92",
            "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
            "https://images.unsplash.com/photo-1598928506311-c55d40f92711",
            "https://images.unsplash.com/photo-1555041469-a586c61ea9bc"
          ];
          const randomUrl = mockRooms[Math.floor(Math.random() * mockRooms.length)] + "?w=800&q=80&t=" + Date.now();
          
          result = { data: [{ url: randomUrl }] };
          
          // Show a subtle toast so the user knows they are using mock data
          alert("The local Python Gradio Backend is offline or still downloading models! Using a simulated image...");
        }
        
        // Gradio returns an object with url property for images
        if (result && result.data && result.data[0]) {
          const generatedImgUrl = result.data[0].url || result.data[0];
          console.log("Extracted image URL:", generatedImgUrl);
          setResults([generatedImgUrl]);
        } else {
          console.warn("Unexpected result format from Gradio:", result.data);
          alert("Received unexpected format from backend.");
        }
      } catch (err) {
        console.error("General error in handleGenerate:", err);
        alert("Failed to connect: " + err.message);
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <header className="w-full max-w-4xl flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-orange-600">Aethra</h1>
          <p className="text-stone-500 font-medium tracking-wide">Make It Your Way</p>
        </div>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="flex flex-col gap-6 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-xl font-semibold mb-2">Design Your Space</h2>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="font-medium text-stone-700">1. Upload Room Photo</label>
              {image && (
                <button 
                  onClick={handleAutoAnalyze}
                  disabled={vlmStatus !== 'idle'}
                  className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-1 px-3 rounded-full transition-colors"
                >
                  {vlmStatus === 'loading_model' ? 'Loading Model...' 
                   : vlmStatus === 'analyzing' ? 'Analyzing...' 
                   : '✨ Auto-Analyze'}
                </button>
              )}
            </div>
            <ImageUpload image={image} setImage={setImage} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-medium text-stone-700">2. Choose Aesthetic</label>
            <div className="flex flex-wrap gap-2">
              {['Minimalist', 'Bohemian', 'Industrial', 'Cottagecore', 'Japandi'].map((style) => (
                <button 
                  key={style}
                  onClick={() => setAesthetic(style)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${aesthetic === style ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  {style}
                </button>
              ))}
            </div>
            <textarea 
              placeholder="Or describe it yourself (e.g. cozy bohemian with warm lights)"
              className="w-full mt-2 p-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-stone-400"
              rows={2}
              value={aesthetic}
              onChange={(e) => setAesthetic(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-medium text-stone-700">3. Items You Own <span className="text-stone-400 font-normal">(Optional)</span></label>
            <textarea 
              placeholder="e.g. blue fairy lights, wooden shelf, ceramic vases"
              className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-stone-400"
              rows={2}
              value={items}
              onChange={(e) => setItems(e.target.value)}
            />
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading}
            className={`mt-4 w-full text-white font-semibold py-3 rounded-xl transition-colors shadow-sm ${loading ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {loading ? 'Generating...' : 'Generate Ideas'}
          </button>
        </section>

        <section className="flex flex-col">
          <ResultsGallery loading={loading} results={results} originalImage={image?.previewUrl} />
        </section>
      </main>
    </div>
  );
}

export default App;
