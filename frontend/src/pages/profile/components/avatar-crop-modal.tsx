import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedAreaPixels: any) => void;
  isProcessing: boolean;
}

export default function AvatarCropModal({ isOpen, imageSrc, onClose, onConfirm, isProcessing }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-[600px] rounded-2xl p-6 shadow-2xl border border-border">
        <h2 className="text-xl font-bold mb-4 text-foreground">Edit Avatar</h2>
        
        {/* Khu vực Crop */}
        <div className="relative w-full h-[400px] bg-black/10 rounded-xl overflow-hidden mb-6">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1} // Ép tỷ lệ 1:1 (Hình vuông)
            cropShape="round" // Preview hình tròn như Facebook
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Thanh trượt Zoom */}
        <div className="flex items-center gap-4 mb-6 px-2">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path></svg>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.02}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-0.5 bg-gray-300 rounded-lg appearance-none cursor-pointer"
          />
          <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
        </div>

        {/* Nút bấm */}
        <div className="flex justify-end gap-3 w-full">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-lg hover:opacity-80 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(croppedAreaPixels)}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? 'Processing...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}