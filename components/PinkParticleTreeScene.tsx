import React, { Suspense, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import PinkTreeParticles, { PinkTreeParticlesHandle } from './PinkTreeParticles';
import SnowParticles from './SnowParticles';
import BaseRings from './BaseRings';
import TopHeart from './TopHeart';
import SceneEffects from './SceneEffects';
import WishSystem, { WishSystemHandle } from './WishParticles';
import PhotoOrnaments from './PhotoOrnaments';
import { SCENE_CONFIG } from '../constants';

interface TreeSceneContentProps {
  photos?: string[];
  handState?: {
    detected: boolean;
    isOpen: boolean;
    x: number;
    y: number;
  };
}

// Camera Controller component to handle hand tracking overrides
const CameraRig: React.FC<{ handState: TreeSceneContentProps['handState'] }> = ({ handState }) => {
  const { camera } = useThree();
  const vec = new THREE.Vector3();
  
  useFrame((state, delta) => {
    if (handState && handState.detected) {
      // Map hand x/y to camera angles
      // Hand X (0..1) -> Azimuth (Horizontal) -PI/2 to PI/2
      // Hand Y (0..1) -> Polar (Vertical) 2 to 10 height?
      
      const targetAzimuth = (handState.x - 0.5) * Math.PI * 1.5; // Rotate around
      const targetHeight = 2 + (handState.y * 14); // 2 to 16 height
      const radius = 18;

      const targetX = Math.sin(targetAzimuth) * radius;
      const targetZ = Math.cos(targetAzimuth) * radius;
      const targetY = targetHeight;

      // Smoothly interpolate current camera position to target
      vec.set(targetX, targetY, targetZ);
      camera.position.lerp(vec, delta * 2.0);
      camera.lookAt(0, 4, 0); // Look at center of tree
    }
  });

  return null;
};

// Internal Scene Content
const TreeSceneContent = forwardRef<WishSystemHandle, TreeSceneContentProps>(({ photos = [], handState }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const scaleFactor = useRef(1);
  const treeParticlesRef = useRef<PinkTreeParticlesHandle>(null);
  const wishSystemRef = useRef<WishSystemHandle>(null);

  // Expose the wish system add method to the parent (App)
  useImperativeHandle(ref, () => ({
    addWish: (text: string) => {
      wishSystemRef.current?.addWish(text);
    }
  }));

  useFrame(() => {
    const targetScale = 1;
    scaleFactor.current += (targetScale - scaleFactor.current) * 0.1;
    if (groupRef.current) {
      groupRef.current.scale.set(scaleFactor.current, scaleFactor.current, scaleFactor.current);
    }
  });

  const handleWishImpact = () => {
    treeParticlesRef.current?.triggerFlash();
  };

  const isUnleashed = handState?.detected && handState.isOpen;

  return (
    <>
      <CameraRig handState={handState} />

      <group ref={groupRef} position={[0, -SCENE_CONFIG.treeHeight / 2 + 1, 0]}>
        <PinkTreeParticles ref={treeParticlesRef} isUnleashed={isUnleashed} />
        {/* Render uploaded photos as ornaments - Hide them when unleashed to reduce clutter? Or Keep? Let's keep. */}
        <PhotoOrnaments photos={photos} />
        <BaseRings />
        <TopHeart />
      </group>
      
      <WishSystem ref={wishSystemRef} onImpact={handleWishImpact} />
      
      <SnowParticles count={2000} />
      <SceneEffects />
      
      {/* Disable OrbitControls when hand is detected so our CameraRig takes over */}
      <OrbitControls 
        enabled={!handState?.detected}
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={30}
        autoRotate={!handState?.detected}
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0, 0]}
      />
    </>
  );
});

export interface SceneHandle {
  sendWish: (text: string) => void;
}

interface PinkParticleTreeSceneProps {
  photos?: string[];
  handState?: {
    detected: boolean;
    isOpen: boolean;
    x: number;
    y: number;
  };
}

// Wrapper to bridge Canvas boundary
const PinkParticleTreeScene = forwardRef<SceneHandle, PinkParticleTreeSceneProps>((props, ref) => {
  const contentRef = useRef<WishSystemHandle>(null);

  useImperativeHandle(ref, () => ({
    sendWish: (text: string) => {
      contentRef.current?.addWish(text);
    }
  }));

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 6, 18], fov: 45 }}
      gl={{ 
        antialias: false,
        alpha: false,
        stencil: false,
        depth: true
      }}
    >
      <color attach="background" args={['#080408']} />
      
      <Suspense fallback={null}>
        <TreeSceneContent ref={contentRef} photos={props.photos} handState={props.handState} />
      </Suspense>
    </Canvas>
  );
});

export default PinkParticleTreeScene;