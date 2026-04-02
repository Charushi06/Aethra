import React, { useState } from 'react';
import { Download, BookmarkPlus, Share2, RefreshCw, ArrowLeftRight } from 'lucide-react';

const CompareSlider = ({ original, generated }) => {
  const [position, setPosition] = useState(50);
  
  return (
    <div className="relative w-full h-80 rounded-xl overflow-hidden select-none group">
      <img src={generated} className="absolute inset-0 w-full h-full object-cover" alt="Generated" />
      <img 
        src={original} 
        className="absolute inset-0 w-full h-full object-cover" 
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} 
        alt="Original" 
      />
      
      {/* Slider Center Line */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none" 
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex flex-col justify-center items-center bg-white rounded-full shadow-lg border border-stone-200">
          <ArrowLeftRight size={16} className="text-stone-500" />
        </div>
      </div>
      
      {/* Hidden Range Input */}
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={position} 
        onChange={(e) => setPosition(e.target.value)} 
        className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-30" 
      />
      
      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10 pointer-events-none">Original</div>
      <div className="absolute top-4 right-4 bg-orange-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10 pointer-events-none">Restyled</div>
    </div>
  );
};

export default function ResultsGallery({ loading, results, originalImage }) {
  if (loading) {
    return (
      <div className="flex flex-col bg-white p-6 rounded-2xl border border-stone-200 shadow-sm min-h-[500px] items-center justify-center">
        <div className="text-center p-6 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-stone-100 border-t-orange-500 rounded-full animate-spin mb-6"></div>
          <h3 className="text-xl font-medium text-stone-800">Transforming your object...</h3>
          <p className="text-stone-500 mt-2 max-w-sm">
            Applying your visual style and properties. It takes about 10-15 seconds.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 opacity-50 w-full animate-pulse">
            <div className="bg-stone-200 rounded-xl h-64 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col bg-stone-50/50 p-6 rounded-2xl border border-stone-200 border-dashed min-h-[500px] items-center justify-center">
         <div className="text-center p-6">
           <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner shadow-stone-300/50">
             ✨
           </div>
           <h3 className="text-xl font-semibold text-stone-800 tracking-tight">Your designs will appear here</h3>
           <p className="text-stone-500 mt-3 text-sm">Upload a photo and fill out the details on the left to get started.</p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-800">Stylization Results</h2>
          <p className="text-stone-500 mt-1">Slide to compare the original and the new design.</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        {results.map((generatedImg, idx) => (
          <div key={idx} className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <CompareSlider original={originalImage} generated={generatedImg} />
            
            <div className="flex justify-between items-center px-2">
              <span className="text-sm font-medium text-stone-600">Option {idx + 1}</span>
              <div className="flex gap-2">
                <button className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-2.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-orange-500" title="Download">
                  <Download size={18} />
                </button>
                <button className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-2.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-orange-500" title="Save to Collection">
                  <BookmarkPlus size={18} />
                </button>
                <button className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-2.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-orange-500" title="Share Design">
                   <Share2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-stone-200 text-stone-600 font-medium hover:bg-white hover:text-stone-900 transition-colors mt-2 shadow-sm">
        <RefreshCw size={18} />
        Update Design (Regenerate)
      </button>
    </div>
  );
}
