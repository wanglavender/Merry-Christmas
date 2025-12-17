import React, { useRef, useState } from 'react';
import PinkParticleTreeScene, { SceneHandle } from './components/PinkParticleTreeScene';
import MusicPlayer from './components/MusicPlayer';
import HandTracker from './components/HandTracker';

const App: React.FC = () => {
  const sceneRef = useRef<SceneHandle>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [wishText, setWishText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Hand Tracking State
  const [handState, setHandState] = useState({
    detected: false,
    isOpen: false,
    x: 0.5,
    y: 0.5
  });

  const handleSendWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishText.trim()) return;
    sceneRef.current?.sendWish(wishText);
    setWishText('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newPhotos: string[] = [];
      Array.from(files).forEach(file => {
        newPhotos.push(URL.createObjectURL(file));
      });
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const triggerPhotoUpload = () => {
    photoInputRef.current?.click();
  };

  return (
    <div className="relative w-full h-full bg-black font-['Space_Mono']">
      {/* Hand Tracker Logic (Invisible Video) */}
      <HandTracker onHandUpdate={setHandState} />

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <PinkParticleTreeScene ref={sceneRef} photos={photos} handState={handState} />
      </div>

      {/* Top Right Controls (Music + Photo) */}
      <div className="absolute top-0 right-0 z-50 p-6 flex flex-col items-end gap-4 pointer-events-none">
        
        {/* Container for interactive elements */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
            <MusicPlayer />
            
            <input 
                type="file" 
                ref={photoInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                multiple 
                className="hidden" 
            />
            <button 
                onClick={triggerPhotoUpload}
                className="group relative px-4 py-2 bg-black/20 backdrop-blur-sm border border-pink-500/30 hover:border-pink-300 transition-all duration-300 mt-2"
            >
                <div className="absolute inset-0 bg-pink-500/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                <span className="relative flex items-center gap-2 text-pink-200 text-xs tracking-[0.2em] uppercase">
                Add Photos <span className="text-sm">📷</span>
                </span>
            </button>
            
            {photos.length > 0 && (
                <div className="text-[10px] text-pink-500/60 uppercase tracking-widest text-right">
                    {photos.length} Photo{photos.length > 1 ? 's' : ''} on Tree
                </div>
            )}
        </div>
      </div>

      {/* Title Overlay */}
      <div className="absolute inset-x-0 top-10 z-10 pointer-events-none flex flex-col items-center select-none">
        <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-t from-pink-300 via-pink-100 to-white drop-shadow-[0_0_15px_rgba(255,192,203,0.8)] animate-pulse text-center">
          MERRY CHRISTMAS
        </h1>
        <p className="mt-2 text-pink-200/60 text-xs md:text-sm tracking-widest uppercase">
          Pink Gold Energy Edition
        </p>
      </div>

      {/* Wish Input Overlay - Hide if hand is detected to focus on interaction */}
      <div className={`absolute inset-x-0 bottom-10 z-20 flex justify-center px-4 transition-opacity duration-500 ${handState.detected ? 'opacity-30' : 'opacity-100'}`}>
        <form onSubmit={handleSendWish} className="w-full max-w-md flex items-end gap-2 group pointer-events-auto">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              placeholder="Make a wish..." 
              className="w-full bg-transparent border-b border-pink-500/30 text-pink-100 placeholder-pink-500/40 py-2 px-1 outline-none focus:border-pink-300 transition-colors font-mono text-sm md:text-base"
            />
            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-pink-300 transition-all duration-500 group-focus-within:w-full box-shadow-[0_0_10px_#ff69b4]" />
          </div>
          
          <button 
            type="submit"
            className="text-pink-400 hover:text-white font-bold uppercase tracking-widest text-sm py-2 px-4 transition-all duration-300 hover:tracking-[0.2em] hover:drop-shadow-[0_0_8px_rgba(255,105,180,0.8)]"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;