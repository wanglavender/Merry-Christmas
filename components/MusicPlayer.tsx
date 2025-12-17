import React, { useRef, useState } from 'react';

const MusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFile, setHasFile] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && audioRef.current) {
      const url = URL.createObjectURL(file);
      audioRef.current.src = url;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((error) => console.error("Playback failed:", error));
      }
      setHasFile(true);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-end gap-2 font-['Space_Mono'] select-none">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="audio/*" 
        className="hidden" 
      />
      <audio ref={audioRef} />

      {!hasFile ? (
        <button 
          onClick={triggerUpload}
          className="group relative px-4 py-2 bg-black/20 backdrop-blur-sm border border-pink-500/30 hover:border-pink-300 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-pink-500/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
          <span className="relative flex items-center gap-2 text-pink-200 text-xs tracking-[0.2em] uppercase">
            Upload BGM <span className="text-sm animate-pulse">♪</span>
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
           <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-pink-500/30 rounded-full px-3 py-1">
             <button 
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center text-pink-200 hover:text-white hover:scale-110 transition-transform"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            
            <div className="w-[1px] h-4 bg-pink-500/30 mx-1" />
            
            <button 
              onClick={triggerUpload}
              className="text-[10px] text-pink-400/80 hover:text-pink-200 uppercase tracking-widest px-2"
            >
              Change
            </button>
           </div>
           
           {/* Visualizer bars animation purely for decoration */}
           {isPlaying && (
             <div className="flex gap-[2px] h-4 items-end">
                <div className="w-[2px] bg-pink-400 animate-[bounce_1s_infinite]" />
                <div className="w-[2px] bg-pink-400 animate-[bounce_1.2s_infinite]" />
                <div className="w-[2px] bg-pink-400 animate-[bounce_0.8s_infinite]" />
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;