import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface Props {
  image: { file: File; previewUrl: string } | null;
  setImage: (img: { file: File; previewUrl: string } | null) => void;
}

export function ImageUpload({ image, setImage }: Props) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        setImage({
          file: file,
          previewUrl: e.target?.result as string
        });
      };
      
      reader.readAsDataURL(file);
    }
  }, [setImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1,
    maxSize: 10485760 // 10MB
  });

  if (image) {
    return (
      <div className="vision-camera" style={{ position: 'relative', border: 'none', padding: 0 }}>
        <img 
          src={image.previewUrl} 
          alt="Original" 
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
        />
        <div style={{ position: 'absolute', bottom: '16px', right: '16px' }}>
             <button className="btn btn-sm" onClick={() => setImage(null)}>Replace</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      {...getRootProps()} 
      className={`vision-camera ${isDragActive ? 'active' : ''}`}
      style={{ cursor: 'pointer', background: 'rgba(0,0,0,0.1)' }}
    >
      <input {...getInputProps()} />
      <UploadCloud size={48} color="var(--primary)" style={{ opacity: 0.7, marginBottom: '12px' }} />
      <div style={{ textAlign: 'center' }}>
        <p className="serif" style={{ fontSize: '20px', color: 'var(--text)' }}>
          Click to upload or drag and drop
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
          PNG, JPG or WEBP
        </p>
      </div>
    </div>
  );
}
