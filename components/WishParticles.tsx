import React, { useRef, useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../constants';

// --- Types ---
interface Wish {
  id: number;
  text: string;
}

interface Explosion {
  id: number;
  position: THREE.Vector3;
  color: THREE.Color;
}

// --- Utils ---
// Cubic Ease In Out
const easeCubicInOut = (t: number) => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

// --- Single Flying Wish Particle ---
const FlyingWish: React.FC<{ 
  onComplete: () => void; 
  targetHeight: number 
}> = ({ onComplete, targetHeight }) => {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  // State for animation
  const progress = useRef(0);
  const startPos = useMemo(() => new THREE.Vector3(0, -5, 8), []); // Start near bottom camera
  const endPos = useMemo(() => new THREE.Vector3(0, targetHeight, 0), [targetHeight]);
  // Control point for curve (spiral out slightly)
  const controlPoint = useMemo(() => {
    const angle = Math.random() * Math.PI * 2;
    const r = 8;
    return new THREE.Vector3(Math.cos(angle) * r, targetHeight * 0.4, Math.sin(angle) * r);
  }, [targetHeight]);

  // Trail buffer
  const trailRef = useRef<THREE.Points>(null);
  const trailPositions = useMemo(() => new Float32Array(50 * 3), []); // 50 trail points
  const trailAlpha = useMemo(() => new Float32Array(50).fill(0), []);
  const trailIdx = useRef(0);

  // Particle Cluster Geometry (The wish ball itself)
  const { geometry: ballGeo } = useMemo(() => {
    const count = 60;
    const pos = new Float32Array(count * 3);
    for(let i=0; i<count; i++) {
       // Sphere distribution
       const u = Math.random();
       const v = Math.random();
       const theta = 2 * Math.PI * u;
       const phi = Math.acos(2 * v - 1);
       const r = 0.3 * Math.cbrt(Math.random()); // Random radius inside sphere
       pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
       pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
       pos[i*3+2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geometry: geo };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // 1. Update Progress
    // Speed of flight
    progress.current += delta * 0.4; 

    if (progress.current >= 1) {
      onComplete();
      return;
    }

    const t = easeCubicInOut(progress.current);

    // Quadratic Bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const p0 = startPos;
    const p1 = controlPoint;
    const p2 = endPos;

    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    const z = (1 - t) * (1 - t) * p0.z + 2 * (1 - t) * t * p1.z + t * t * p2.z;

    groupRef.current.position.set(x, y, z);
    
    // Rotate the ball
    groupRef.current.rotation.z += delta * 2;
    groupRef.current.rotation.y += delta * 2;

    // 2. Update Trail
    if (trailRef.current) {
        const idx = trailIdx.current;
        trailPositions[idx * 3] = x;
        trailPositions[idx * 3 + 1] = y;
        trailPositions[idx * 3 + 2] = z;
        trailAlpha[idx] = 1.0; // Fresh trail point
        
        trailIdx.current = (trailIdx.current + 1) % 50;

        // Fade all trail points
        for(let i=0; i<50; i++) {
            trailAlpha[i] *= 0.92;
        }

        trailRef.current.geometry.attributes.position.needsUpdate = true;
        trailRef.current.geometry.attributes.alpha.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={groupRef}>
         <points geometry={ballGeo}>
            <pointsMaterial 
                size={0.15} 
                color="#ffeb3b" 
                blending={THREE.AdditiveBlending} 
                depthWrite={false}
                transparent
                opacity={0.9}
            />
         </points>
         {/* Glow Sprite Center */}
         <mesh>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
         </mesh>
      </group>

      {/* Trail Points */}
      <points ref={trailRef}>
          <bufferGeometry>
             <bufferAttribute attach="attributes-position" count={50} array={trailPositions} itemSize={3} />
             <bufferAttribute attach="attributes-alpha" count={50} array={trailAlpha} itemSize={1} />
          </bufferGeometry>
          <shaderMaterial 
             transparent
             depthWrite={false}
             blending={THREE.AdditiveBlending}
             vertexShader={`
                attribute float alpha;
                varying float vAlpha;
                void main() {
                    vAlpha = alpha;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = 8.0 * alpha;
                }
             `}
             fragmentShader={`
                varying float vAlpha;
                void main() {
                    if (length(gl_PointCoord - 0.5) > 0.5) discard;
                    gl_FragColor = vec4(1.0, 0.5, 0.6, vAlpha); // Pinkish trail
                }
             `}
          />
      </points>
    </>
  );
};

// --- Explosion Particle System ---
const ExplosionEffect: React.FC<{ position: THREE.Vector3, onComplete: () => void }> = ({ position, onComplete }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const timeRef = useRef(0);
    
    const { positions, velocities, colors } = useMemo(() => {
        const count = 150;
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        
        const c1 = new THREE.Color("#ff1493"); // Pink
        const c2 = new THREE.Color("#ffd700"); // Gold

        for(let i=0; i<count; i++) {
            pos[i*3] = position.x;
            pos[i*3+1] = position.y;
            pos[i*3+2] = position.z;

            // Explosion burst velocity
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const speed = 2.0 + Math.random() * 4.0;
            
            vel[i*3] = speed * Math.sin(phi) * Math.cos(theta);
            vel[i*3+1] = speed * Math.sin(phi) * Math.sin(theta);
            vel[i*3+2] = speed * Math.cos(phi);

            const mixed = c1.clone().lerp(c2, Math.random());
            col[i*3] = mixed.r;
            col[i*3+1] = mixed.g;
            col[i*3+2] = mixed.b;
        }
        return { positions: pos, velocities: vel, colors: col };
    }, [position]);

    useFrame((state, delta) => {
        if (!pointsRef.current) return;
        timeRef.current += delta;
        
        if (timeRef.current > 1.2) {
            onComplete();
            return;
        }

        const positionsAttr = pointsRef.current.geometry.attributes.position;
        const currentPos = positionsAttr.array as Float32Array;

        for(let i=0; i<150; i++) {
            // Apply velocity
            currentPos[i*3] += velocities[i*3] * delta;
            currentPos[i*3+1] += velocities[i*3+1] * delta;
            currentPos[i*3+2] += velocities[i*3+2] * delta;

            // Gravity/Drag
            velocities[i*3+1] -= 2.0 * delta; // Gravity
            velocities[i*3] *= 0.98;
            velocities[i*3+1] *= 0.98;
            velocities[i*3+2] *= 0.98;
        }
        
        positionsAttr.needsUpdate = true;
        (pointsRef.current.material as THREE.PointsMaterial).opacity = 1.0 - (timeRef.current / 1.2);
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={150} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={150} array={colors} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial 
                size={0.2} 
                vertexColors 
                transparent 
                blending={THREE.AdditiveBlending} 
                depthWrite={false}
            />
        </points>
    );
};

// --- Manager ---

export interface WishSystemHandle {
    addWish: (text: string) => void;
}

interface WishSystemProps {
    onImpact: () => void;
}

const WishSystem = forwardRef<WishSystemHandle, WishSystemProps>(({ onImpact }, ref) => {
    const [wishes, setWishes] = useState<Wish[]>([]);
    const [explosions, setExplosions] = useState<Explosion[]>([]);
    const wishIdCounter = useRef(0);
    const explIdCounter = useRef(0);

    useImperativeHandle(ref, () => ({
        addWish: (text: string) => {
            const id = wishIdCounter.current++;
            setWishes(prev => [...prev, { id, text }]);
        }
    }));

    const handleWishComplete = (id: number) => {
        // Remove wish
        setWishes(prev => prev.filter(w => w.id !== id));
        
        // Spawn explosion at top
        const explId = explIdCounter.current++;
        setExplosions(prev => [...prev, { 
            id: explId, 
            position: new THREE.Vector3(0, SCENE_CONFIG.treeHeight + 1, 0), // Top of tree
            color: new THREE.Color('#ff1493')
        }]);

        // Trigger tree reaction
        onImpact();
    };

    const handleExplosionComplete = (id: number) => {
        setExplosions(prev => prev.filter(e => e.id !== id));
    };

    return (
        <>
            {wishes.map(wish => (
                <FlyingWish 
                    key={wish.id} 
                    targetHeight={SCENE_CONFIG.treeHeight + 1}
                    onComplete={() => handleWishComplete(wish.id)} 
                />
            ))}
            {explosions.map(expl => (
                <ExplosionEffect 
                    key={expl.id} 
                    position={expl.position} 
                    onComplete={() => handleExplosionComplete(expl.id)} 
                />
            ))}
        </>
    );
});

export default WishSystem;