function stepDownSample(img, targetWidth, targetHeight) {
  let curWidth = img.naturalWidth || img.width;
  let curHeight = img.naturalHeight || img.height;
  let source = img;

  while (curWidth * 0.5 > targetWidth * 1.15 && curHeight * 0.5 > targetHeight * 1.15) {
    const nextWidth = Math.max(targetWidth, Math.round(curWidth * 0.5));
    const nextHeight = Math.max(targetHeight, Math.round(curHeight * 0.5));
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextWidth;
    stepCanvas.height = nextHeight;
    const stepCtx = stepCanvas.getContext('2d');
    if (stepCtx) {
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(source, 0, 0, nextWidth, nextHeight);
    }
    source = stepCanvas;
    curWidth = nextWidth;
    curHeight = nextHeight;
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetWidth;
  outCanvas.height = targetHeight;
  const outCtx = outCanvas.getContext('2d');
  if (outCtx) {
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(source, 0, 0, targetWidth, targetHeight);
  }
  return outCanvas;
}

export function compressImageFile(file, maxSize = 1440, quality = 0.92) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        const maxDim = Math.max(srcW, srcH);

        // Preserve original pixels only when already small and lightweight (<140 KB)
        if (maxDim <= maxSize && file.size <= 140 * 1024) {
          resolve(dataUrl);
          return;
        }

        const scale = Math.min(1, maxSize / maxDim);
        const w = Math.max(1, Math.round(srcW * scale));
        const h = Math.max(1, Math.round(srcH * scale));
        const canvas = stepDownSample(img, w, h);

        // Prefer WebP (supports transparency & shrinks 10x vs uncompressed PNG), fallback to JPEG
        const webpData = canvas.toDataURL('image/webp', Math.min(quality, 0.86));
        if (webpData.startsWith('data:image/webp')) {
          resolve(webpData);
          return;
        }
        resolve(canvas.toDataURL('image/jpeg', Math.min(quality, 0.86)));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
