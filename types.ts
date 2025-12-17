import React from 'react';

export interface SceneConfig {
  particleCount: number;
  treeHeight: number;
  treeRadius: number;
  colors: {
    core: string;
    mid: string;
    edge: string;
    snow: string;
    ring: string;
  };
  bloomStrength: number;
}

export type Axis = 'x' | 'y' | 'z';

// Define the three.js elements used in the scene
type ThreeElements = {
  ambientLight: any;
  pointLight: any;
  color: any;
  group: any;
  points: any;
  bufferGeometry: any;
  bufferAttribute: any;
  shaderMaterial: any;
  mesh: any;
  meshStandardMaterial: any;
  meshBasicMaterial: any;
  pointsMaterial: any;
  sphereGeometry: any;
  primitive: any;
  [elemName: string]: any;
};

// Augment global JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// Augment React's JSX namespace
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
