/**
 * Process an image to RGB pixels for VLM inference.
 */
export async function getImagePixels(
  url: string,
  dim: number
): Promise<{ rgbPixels: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Calculate scaled dimensions (maintain aspect ratio)
      let w = img.width;
      let h = img.height;
      if (w > h) {
        h = Math.round((h / w) * dim);
        w = dim;
      } else {
        w = Math.round((w / h) * dim);
        h = dim;
      }
      
      canvas.width = w;
      canvas.height = h;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No canvas context');
      
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      
      // RGBA to RGB
      const rgb = new Uint8Array(w * h * 3);
      for (let i = 0; i < w * h; i++) {
        rgb[i * 3] = data[i * 4];
        rgb[i * 3 + 1] = data[i * 4 + 1];
        rgb[i * 3 + 2] = data[i * 4 + 2];
      }
      
      resolve({ rgbPixels: rgb, width: w, height: h });
    };
    img.onerror = reject;
    img.src = url;
  });
}
