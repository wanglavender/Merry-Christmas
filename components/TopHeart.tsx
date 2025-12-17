import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../constants';

const TopHeart: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const heartShape = useMemo(() => {
    const x = 0, y = 0;
    const shape = new THREE.Shape();
    // Standard Heart Curve
    shape.moveTo(x + 0.25, y + 0.25);
    shape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.20, y, x, y);
    shape.bezierCurveTo(x - 0.30, y, x - 0.30, y + 0.35, x - 0.30, y + 0.35);
    shape.bezierCurveTo(x - 0.30, y + 0.55, x - 0.10, y + 0.77, x + 0.25, y + 0.95);
    shape.bezierCurveTo(x + 0.60, y + 0.77, x + 0.80, y + 0.55, x + 0.80, y + 0.35);
    shape.bezierCurveTo(x + 0.80, y + 0.35, x + 0.80, y, x + 0.50, y);
    shape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);
    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 2,
    bevelSize: 0.05,
    bevelThickness: 0.05,
  }), []);

  // Center the geometry
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    geo.center();
    return geo;
  }, [heartShape, extrudeSettings]);

  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      const time = state.clock.getElapsedTime();
      
      // Rotation
      const rot = time * 0.8;
      meshRef.current.rotation.y = rot;
      glowRef.current.rotation.y = rot;

      // Bobbing
      const bob = Math.sin(time * 2) * 0.1;
      meshRef.current.position.y = SCENE_CONFIG.treeHeight + 0.5 + bob;
      glowRef.current.position.y = SCENE_CONFIG.treeHeight + 0.5 + bob;

      // Pulse Scale
      const scale = 1 + Math.sin(time * 3) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
      glowRef.current.scale.set(scale * 1.2, scale * 1.2, scale * 1.2);
    }
  });

  return (
    <>
      {/* Solid Core Heart */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial 
            color={SCENE_CONFIG.colors.core} 
            emissive={SCENE_CONFIG.colors.core}
            emissiveIntensity={2}
            roughness={0.1}
            metalness={0.5}
        />
      </mesh>

      {/* Outer Glow Halo (Mesh with transparent fresnel-ish look) */}
      <mesh ref={glowRef} geometry={geometry}>
         <meshBasicMaterial 
            color={SCENE_CONFIG.colors.mid}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
         />
      </mesh>
    </>
  );
};

export default TopHeart;