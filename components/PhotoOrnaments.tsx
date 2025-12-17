import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../constants';

interface PhotoOrnamentsProps {
  photos: string[];
}

const PhotoFrame: React.FC<{ url: string; position: THREE.Vector3 }> = ({ url, position }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Random slight offset for animation
  const randomPhase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      // Gentle bobbing
      groupRef.current.position.y = position.y + Math.sin(t + randomPhase) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      <Billboard>
        {/* The Photo */}
        <Image 
          url={url} 
          scale={[1.5, 1.5]} 
          transparent 
          opacity={0.9} 
          toneMapped={false}
        />
        
        {/* Golden Frame Ring */}
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[0.76, 0.8, 32]} />
          <meshBasicMaterial color={SCENE_CONFIG.colors.edge} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </mesh>
        
        {/* Glow backing */}
        <mesh position={[0, 0, -0.02]}>
          <circleGeometry args={[0.8, 32]} />
          <meshBasicMaterial color={SCENE_CONFIG.colors.core} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>
      </Billboard>
    </group>
  );
};

const PhotoOrnaments: React.FC<PhotoOrnamentsProps> = ({ photos }) => {
  // Memoize positions so they don't jump around when new photos are added
  const items = useMemo(() => {
    return photos.map((url) => {
      // Distribute randomly within the cone of the tree
      const height = Math.random() * (SCENE_CONFIG.treeHeight - 2) + 1; // 1 to 11
      const heightNormalized = height / SCENE_CONFIG.treeHeight;
      
      // Radius at this height
      const maxRadius = SCENE_CONFIG.treeRadius * (1 - heightNormalized);
      
      // Place slightly on the outer edge for visibility (0.7 to 1.1 of radius)
      const r = maxRadius * (0.8 + Math.random() * 0.3); 
      const theta = Math.random() * Math.PI * 2;

      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      
      return {
        url,
        position: new THREE.Vector3(x, height, z)
      };
    });
  }, [photos]);

  return (
    <group>
      {items.map((item, index) => (
        <PhotoFrame key={`${item.url}-${index}`} url={item.url} position={item.position} />
      ))}
    </group>
  );
};

export default PhotoOrnaments;