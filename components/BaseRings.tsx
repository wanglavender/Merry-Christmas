import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../constants';

const BaseRings: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const particleCount = 600;

  // We create 3 rings
  const ringGeometries = useMemo(() => {
    return [0, 1, 2].map((ringIndex) => {
      const pts = [];
      const cols = [];
      const baseRadius = SCENE_CONFIG.treeRadius * (1.1 + ringIndex * 0.2); // 110%, 130%, 150%
      const count = particleCount - (ringIndex * 100); // Fewer particles on outer rings

      const color = new THREE.Color(SCENE_CONFIG.colors.ring);

      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        // Add some noise to radius for "cloudy ring" effect
        const r = baseRadius + (Math.random() - 0.5) * 0.3; 
        
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = (Math.random() - 0.5) * 0.2; // Slight vertical spread

        pts.push(x, y, z);
        cols.push(color.r, color.g, color.b);
      }
      
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      return geo;
    });
  }, []);

  const texture = useMemo(() => {
    // Create a simple soft circle texture programmatically to avoid external loaders if possible,
    // but using the same ShaderMaterial logic as tree is cleaner. 
    // Let's use PointsMaterial for variety with a custom map or just reuse shader.
    // We will use standard PointsMaterial with a custom map generator (canvas).
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    // Rotate entire group
    groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
    
    // Animate individual rings
    groupRef.current.children.forEach((child, i) => {
       const ring = child as THREE.Points;
       // Counter-rotate or varying speeds
       ring.rotation.y = state.clock.getElapsedTime() * (0.05 * (i % 2 === 0 ? 1 : -1));
       
       // Bobbing
       ring.position.y = Math.sin(state.clock.getElapsedTime() * 0.5 + i) * 0.1;
    });
  });

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {ringGeometries.map((geo, i) => (
        <points key={i} geometry={geo}>
          <pointsMaterial
            size={0.15}
            map={texture}
            transparent
            alphaTest={0.01}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            vertexColors
            opacity={0.8}
          />
        </points>
      ))}
    </group>
  );
};

export default BaseRings;