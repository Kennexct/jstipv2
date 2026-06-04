import { useMaster } from '../context/MasterContext';

export function WatermarkOverlay() {
  const { tripSettings } = useMaster();
  const wm = tripSettings?.watermark;

  if (!wm?.enabled || !wm?.image) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 z-10">
      <img 
        src={wm.image} 
        alt="watermark" 
        style={{ opacity: wm.opacity !== undefined ? wm.opacity : 0.5 }}
        className="w-1/2 max-w-[200px] h-auto object-contain drop-shadow-lg mix-blend-overlay"
      />
    </div>
  );
}
