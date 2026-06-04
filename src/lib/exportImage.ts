export interface ExportConfig {
  item: {
    name: string;
    price: number;
    image?: string;
  };
  watermark: {
    enabled: boolean;
    image: string;
    opacity: number;
    badgePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none';
  };
}

export const exportProductImage = async (config: ExportConfig): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!config.item.image) {
      reject(new Error("Item does not have an image to export."));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error("Could not get 2d context"));
      return;
    }

    const productImg = new Image();
    productImg.crossOrigin = 'anonymous'; // Important for CORS if images are hosted externally
    
    productImg.onload = async () => {
      // Set canvas size to match the image
      canvas.width = productImg.width;
      canvas.height = productImg.height;

      // 1. Draw product image
      ctx.drawImage(productImg, 0, 0);

      // 2. Draw watermark if enabled and image exists
      if (config.watermark.enabled && config.watermark.image) {
        try {
          await new Promise<void>((wmResolve, wmReject) => {
            const wmImg = new Image();
            wmImg.crossOrigin = 'anonymous';
            wmImg.onload = () => {
              ctx.save();
              ctx.globalAlpha = config.watermark.opacity;
              
              // Scale watermark to be ~50% of canvas width or max 400px for center display
              const maxWmWidth = Math.min(canvas.width * 0.5, 400);
              const scale = maxWmWidth / wmImg.width;
              const wmWidth = wmImg.width * scale;
              const wmHeight = wmImg.height * scale;

              // Draw at center
              const x = (canvas.width - wmWidth) / 2;
              const y = (canvas.height - wmHeight) / 2;

              ctx.drawImage(wmImg, x, y, wmWidth, wmHeight);
              ctx.restore();
              wmResolve();
            };
            wmImg.onerror = () => wmResolve(); // Don't fail if watermark fails to load
            wmImg.src = config.watermark.image;
          });
        } catch (e) {
          console.error("Watermark overlay failed", e);
        }
      }

      // 3. Draw Price Badge
      const badgePos = config.watermark.badgePosition || 'bottom-right';
      if (badgePos !== 'none') {
        const text = `Rp ${config.item.price.toLocaleString()}`;
        
        // Dynamic sizing based on canvas width
        const baseFontSize = Math.max(16, Math.floor(canvas.width * 0.04));
        ctx.font = `bold ${baseFontSize}px Inter, system-ui, sans-serif`;
        
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        
        const paddingX = baseFontSize;
        const paddingY = baseFontSize * 0.6;
        const pillWidth = textWidth + paddingX * 2;
        const pillHeight = baseFontSize + paddingY * 2;
        const radius = pillHeight / 2;
        const margin = canvas.width * 0.05;

        let badgeX = margin;
        let badgeY = margin;

        if (badgePos === 'top-right') {
          badgeX = canvas.width - pillWidth - margin;
        } else if (badgePos === 'bottom-left') {
          badgeY = canvas.height - pillHeight - margin;
        } else if (badgePos === 'bottom-right') {
          badgeX = canvas.width - pillWidth - margin;
          badgeY = canvas.height - pillHeight - margin;
        }

        ctx.save();
        
        // Draw pill background (glassmorphic dark)
        ctx.fillStyle = 'rgba(13, 27, 46, 0.85)'; // #0D1B2E with opacity
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;

        ctx.beginPath();
        ctx.moveTo(badgeX + radius, badgeY);
        ctx.lineTo(badgeX + pillWidth - radius, badgeY);
        ctx.quadraticCurveTo(badgeX + pillWidth, badgeY, badgeX + pillWidth, badgeY + radius);
        ctx.lineTo(badgeX + pillWidth, badgeY + pillHeight - radius);
        ctx.quadraticCurveTo(badgeX + pillWidth, badgeY + pillHeight, badgeX + pillWidth - radius, badgeY + pillHeight);
        ctx.lineTo(badgeX + radius, badgeY + pillHeight);
        ctx.quadraticCurveTo(badgeX, badgeY + pillHeight, badgeX, badgeY + pillHeight - radius);
        ctx.lineTo(badgeX, badgeY + radius);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
        ctx.closePath();
        ctx.fill();

        // Draw text
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, badgeX + pillWidth / 2, badgeY + pillHeight / 2 + (baseFontSize * 0.05)); // slight vertical optical adjust

        ctx.restore();
      }

      // Convert to data URL (PNG)
      resolve(canvas.toDataURL('image/png'));
    };

    productImg.onerror = () => {
      reject(new Error("Failed to load product image for export."));
    };

    // If image is a local blob/data URL, this works. If external, needs CORS (set above).
    productImg.src = config.item.image;
  });
};
