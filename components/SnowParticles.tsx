import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../constants';

const vertexShader = `
  uniform float uTime;
  uniform float uHeight;
  attribute float aSize;
  attribute float aSpeed;
  attribute vec3 aRandom;
  
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    
    // Falling Logic
    // Start with initial Y, subtract time * speed
    float fallOffset = uTime * aSpeed * 2.0;
    
    // Modulo to loop within a box
    pos.y = mod(pos.y - fallOffset, uHeight);
    
    // Center the box around origin Y roughly, but we want snow everywhere
    // The mod result is 0..uHeight. Let's shift it to range [top, bottom]
    pos.y -= uHeight * 0.5;

    // Slight wind sway
    pos.x += sin(uTime * 0.5 + aRandom.y) * 0.5;
    pos.z += cos(uTime * 0.3 + aRandom.z) * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Attenuation
    gl_PointSize = aSize * (150.0 / -mvPosition.z);
    
    // Fade out near edges of the loop to prevent popping?
    // Simplified: brightness variation
    vAlpha = 0.5 + 0.5 * sin(uTime + aRandom.x * 10.0);
  }
`;

const fragmentShader = `
  varying float vAlpha;
  uniform vec3 uColor;

  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float d = length(xy);
    if(d > 0.5) discard;
    
    // Simple soft circle
    float strength = pow(1.0 - d * 2.0, 2.0);
    
    gl_FragColor = vec4(uColor, strength * vAlpha * 0.8);
  }
`;

interface SnowParticlesProps {
  count?: number;
}

const SnowParticles: React.FC<SnowParticlesProps> = ({ count = 1000 }) => {
  const meshRef = useRef<THREE.Points>(null);
  const boxHeight = 40;
  const boxWidth = 30;

  const { positions, sizes, speeds, randomness } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const spd = new Float32Array(count);
    const rnd = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * boxWidth;
      pos[i3 + 1] = Math.random() * boxHeight;
      pos[i3 + 2] = (Math.random() - 0.5) * boxWidth;

      siz[i] = Math.random() * 0.5 + 0.2;
      spd[i] = Math.random() * 0.5 + 0.2;
      
      rnd[i3] = Math.random();
      rnd[i3+1] = Math.random();
      rnd[i3+2] = Math.random();
    }

    return { positions: pos, sizes: siz, speeds: spd, randomness: rnd };
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHeight: { value: boxHeight },
    uColor: { value: new THREE.Color(SCENE_CONFIG.colors.snow) },
  }), []);

  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aSpeed" count={count} array={speeds} itemSize={1} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={randomness} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default SnowParticles;