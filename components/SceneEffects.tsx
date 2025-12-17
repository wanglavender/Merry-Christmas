import React from 'react';
import { EffectComposer, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { SCENE_CONFIG } from '../constants';

const SceneEffects: React.FC = () => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} color="#4a0a25" />
      <pointLight position={[5, 10, 5]} intensity={1} color="#ffcccc" distance={20} />
      <pointLight position={[-5, 5, 5]} intensity={0.8} color="#ffd700" distance={20} />
      
      {/* Add a light inside the tree base to illuminate it upwards */}
      <pointLight position={[0, 0, 0]} intensity={2.0} color={SCENE_CONFIG.colors.core} distance={15} decay={2} />

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.2} // Threshold to pick up glow (lower = more glow)
          mipmapBlur 
          intensity={SCENE_CONFIG.bloomStrength} 
          radius={0.6}
        />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

export default SceneEffects;