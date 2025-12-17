import React, { useMemo, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../constants';

// --- Shaders ---

const vertexShader = `
  uniform float uTime;
  uniform float uFlash;
  uniform float uUnleash; // 0.0 = Tree, 1.0 = Unleashed
  
  attribute float aScale;
  attribute float aSpeed;
  attribute vec3 aRandom;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAlpha;

  // Simple noise function
  float snoise(vec3 v){ 
    return sin(v.x * 10.0 + uTime) * cos(v.y * 10.0); 
  }

  void main() {
    vColor = aColor;
    vec3 pos = position;

    // --- Standard Breathing (Tree Mode) ---
    float breath = sin(uTime * 1.5 + aRandom.y * 10.0);
    pos += normal * breath * 0.05;
    pos.y += sin(uTime * aSpeed + aRandom.x * 10.0) * 0.08;

    // Twinkling/Twisting
    float twist = sin(uTime * 0.5 + pos.y * 0.2) * 0.1;
    pos.x += cos(uTime + pos.y) * 0.05;
    pos.z += sin(uTime + pos.y) * 0.05;

    // --- Unleash Effect (Explosion) ---
    // Calculate direction away from center (0, H/2, 0) approximately
    vec3 center = vec3(0.0, pos.y, 0.0);
    vec3 dir = normalize(pos - center + vec3(0.001)); // Avoid div by zero
    
    // Swirling explosion pattern
    float unleashFactor = smoothstep(0.0, 1.0, uUnleash);
    
    if (unleashFactor > 0.01) {
        // Spiral outward
        float angle = uTime * 2.0 + pos.y;
        float expansion = unleashFactor * 15.0; // Explosion radius
        
        // Add curl noise
        vec3 noiseOffset = vec3(
            sin(uTime * 3.0 + aRandom.x * 10.0),
            cos(uTime * 2.5 + aRandom.y * 10.0),
            sin(uTime * 3.0 + aRandom.z * 10.0)
        ) * unleashFactor * 2.0;

        pos += dir * expansion + noiseOffset;
        
        // Color shift in shader when unleashed (Make it hotter/whiter)
        vColor = mix(vColor, vec3(1.0, 0.9, 0.8), unleashFactor * 0.5);
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    gl_PointSize = aScale * (200.0 / -mvPosition.z);
    
    // Scale up particles when unleashed
    gl_PointSize *= (1.0 + uUnleash * 2.0);

    // Flash/Pulse brightness
    vAlpha = 0.6 + 0.4 * sin(uTime * 3.0 + aRandom.z * 20.0);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uFlash;
  uniform float uUnleash;

  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float ll = length(xy);
    if(ll > 0.5) discard;

    float strength = pow(1.0 - ll * 2.0, 1.5);

    // Make it much brighter when unleashed
    float extraBrightness = uUnleash * 0.5;
    vec3 finalColor = vColor + vec3(uFlash * 0.8) + vec3(extraBrightness);

    gl_FragColor = vec4(finalColor, strength * (vAlpha + uFlash * 0.5));
  }
`;

export interface PinkTreeParticlesHandle {
  triggerFlash: () => void;
}

interface PinkTreeParticlesProps {
    isUnleashed?: boolean;
}

const PinkTreeParticles = forwardRef<PinkTreeParticlesHandle, PinkTreeParticlesProps>(({ isUnleashed = false }, ref) => {
  const meshRef = useRef<THREE.Points>(null);
  const flashValue = useRef(0);
  const unleashValue = useRef(0);
  
  useImperativeHandle(ref, () => ({
    triggerFlash: () => {
      flashValue.current = 1.0;
    }
  }));

  // Create Geometry
  const { positions, colors, scales, randomness, speeds } = useMemo(() => {
    const particleCount = SCENE_CONFIG.particleCount;
    const pos = new Float32Array(particleCount * 3);
    const cols = new Float32Array(particleCount * 3);
    const scl = new Float32Array(particleCount);
    const rnd = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);

    const colorCore = new THREE.Color(SCENE_CONFIG.colors.core);
    const colorMid = new THREE.Color(SCENE_CONFIG.colors.mid);
    const colorEdge = new THREE.Color(SCENE_CONFIG.colors.edge);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const height = Math.random() * SCENE_CONFIG.treeHeight;
      const heightNormalized = height / SCENE_CONFIG.treeHeight;
      const radiusAtHeight = SCENE_CONFIG.treeRadius * (1 - heightNormalized);
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radiusAtHeight;

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = height;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      const radiusRatio = r / radiusAtHeight;
      const mixedColor = new THREE.Color().copy(colorCore);
      if (radiusRatio < 0.3) {
        mixedColor.lerp(colorMid, radiusRatio * 2); 
      } else {
        mixedColor.copy(colorMid).lerp(colorEdge, (radiusRatio - 0.3) * 1.5);
      }
      mixedColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);

      cols[i3] = mixedColor.r;
      cols[i3 + 1] = mixedColor.g;
      cols[i3 + 2] = mixedColor.b;

      scl[i] = Math.random() * 0.4 + 0.1;

      rnd[i3] = Math.random();
      rnd[i3 + 1] = Math.random();
      rnd[i3 + 2] = Math.random();
      spd[i] = 0.5 + Math.random();
    }

    return {
      positions: pos,
      colors: cols,
      scales: scl,
      randomness: rnd,
      speeds: spd
    };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFlash: { value: 0 },
    uUnleash: { value: 0 },
  }), []);

  useFrame((state, delta) => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Decay flash
      if (flashValue.current > 0) {
        flashValue.current = THREE.MathUtils.lerp(flashValue.current, 0, delta * 2.0);
        if (flashValue.current < 0.01) flashValue.current = 0;
        material.uniforms.uFlash.value = flashValue.current;
      }

      // Smooth transition for Unleash
      const targetUnleash = isUnleashed ? 1.0 : 0.0;
      unleashValue.current = THREE.MathUtils.lerp(unleashValue.current, targetUnleash, delta * 3.0);
      material.uniforms.uUnleash.value = unleashValue.current;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={scales.length}
          array={scales}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randomness.length / 3}
          array={randomness}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          count={speeds.length}
          array={speeds}
          itemSize={1}
        />
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
});

export default PinkTreeParticles;