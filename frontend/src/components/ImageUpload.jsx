import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

export default function ImageUpload({ image, setImage }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        setImage({
          file: file,
          previewUrl: e.target.result
        });
      };
      
      reader.readAsDataURL(file);
    }
  }, [setImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    maxSize: 10485760 // 10MB
  });

  if (image) {
    return (
      <div className="relative border-2 border-stone-200 rounded-xl overflow-hidden group">
        <img 
          src={image.previewUrl} 
          alt="Room to style" 
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button 
            onClick={() => setImage(null)}
            className="bg-white text-stone-900 px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-stone-100 transition-colors"
          >
            Replace Image
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-orange-500 bg-orange-50' : 'border-stone-300 hover:bg-stone-50 bg-stone-50/50'}`}
    >
      <input {...getInputProps()} />
      
      <div className={`p-4 rounded-full mb-3 ${isDragActive ? 'bg-orange-100 text-orange-600' : 'bg-stone-200 text-stone-500'}`}>
        <UploadCloud size={28} />
      </div>
      
      <p className="text-stone-700 font-medium whitespace-pre-line">
        {isDragActive ? "Drop your room photo here" : "Click to upload room photo\nOr drag and drop"}
      </p>
      <p className="text-xs text-stone-400 mt-2 font-medium">JPEG or PNG, up to 10MB</p>
    </div>
  );
}
