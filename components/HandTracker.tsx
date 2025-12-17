import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from 'https://esm.sh/@mediapipe/tasks-vision@0.10.8';

interface HandTrackerProps {
  onHandUpdate: (data: { 
    detected: boolean; 
    isOpen: boolean; 
    x: number; 
    y: number 
  }) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  // Initialize MediaPipe
  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setIsLoading(false);
        startWebcam();
      } catch (error) {
        console.error("Error initializing hand landmarker:", error);
      }
    };

    initLandmarker();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
      }
    } catch (err) {
      console.error("Webcam access denied", err);
      setPermissionError(true);
    }
  };

  const predictWebcam = () => {
    if (!landmarkerRef.current || !videoRef.current) return;

    const nowInMs = Date.now();
    const results = landmarkerRef.current.detectForVideo(videoRef.current, nowInMs);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0]; // First hand

      // 1. Calculate Gesture (Open vs Closed)
      // We check the distance of finger tips to the wrist (landmark 0)
      const wrist = landmarks[0];
      const tips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
      
      let avgDist = 0;
      tips.forEach(tipIdx => {
        const tip = landmarks[tipIdx];
        const dist = Math.sqrt(
          Math.pow(tip.x - wrist.x, 2) + 
          Math.pow(tip.y - wrist.y, 2) + 
          Math.pow(tip.z - wrist.z, 2)
        );
        avgDist += dist;
      });
      avgDist /= tips.length;

      // Threshold determined experimentally (normalized coords)
      // > 0.3 usually means fingers are extended away from wrist.
      // < 0.2 usually means fist.
      const isOpen = avgDist > 0.25;

      // 2. Calculate Position (0 to 1) for Camera Control
      // Center of palm roughly (landmark 9) or average of all
      // MediaPipe x is 0 (left) to 1 (right). y is 0 (top) to 1 (bottom).
      // We mirror X for intuitive control.
      const handX = 1 - landmarks[9].x; 
      const handY = landmarks[9].y;

      onHandUpdate({
        detected: true,
        isOpen: isOpen,
        x: handX,
        y: handY
      });
    } else {
      onHandUpdate({
        detected: false,
        isOpen: false,
        x: 0.5,
        y: 0.5
      });
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  if (permissionError) return null;

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
       {/* Hidden processing video */}
       <video ref={videoRef} autoPlay playsInline muted className="hidden" />
       
       {/* Debug Preview - Small visual cue that camera is working */}
       {!isLoading && (
        <div className="flex flex-col gap-1 items-center">
            <div className="w-24 h-16 border border-pink-500/30 bg-black/50 rounded overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center text-[8px] text-pink-300 text-center px-1">
                    Gesture Control Active<br/>
                    Open: Unleash<br/>
                    Move: Rotate
                </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
       )}
    </div>
  );
};

export default HandTracker;