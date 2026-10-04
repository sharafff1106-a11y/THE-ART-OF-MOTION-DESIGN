import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { damp } from '../motion/math';

/**
 * A stream of particles — scattered, undecided — passes through a single
 * black sphere (the decision) and leaves as a coherent orange wave,
 * through a row of glass frames (time). Idea → motion → impact.
 */
const COUNT = 2600;
const GREY = new THREE.Color('#5d5b57');
const ORANGE = new THREE.Color('#ff5a1f');
const tmp = new THREE.Color();

function Stream() {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 4] = Math.random(); // phase along the stream
      seeds[i * 4 + 1] = (Math.random() - 0.5) * 2; // y spread
      seeds[i * 4 + 2] = (Math.random() - 0.5) * 2; // z spread
      seeds[i * 4 + 3] = 0.6 + Math.random() * 0.8; // speed
    }
    return { positions, colors, seeds };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pts = ref.current;
    if (!pts) return;
    for (let i = 0; i < COUNT; i++) {
      const u = (seeds[i * 4] + t * 0.045 * seeds[i * 4 + 3]) % 1;
      const x = -6.5 + u * 13;
      const sy = seeds[i * 4 + 1];
      const sz = seeds[i * 4 + 2];
      let y: number;
      let z: number;
      if (x < 0) {
        // undecided: wide, noisy, converging on the sphere
        const k = Math.pow(-x / 6.5, 1.15);
        y = sy * 1.9 * k + Math.sin(t * 0.7 + i) * 0.05 * k + k * 0.9;
        z = sz * 1.6 * k;
      } else {
        // decided: one coherent wave
        const k = x / 6.5;
        y = Math.sin(x * 1.05 - t * 1.3) * 0.55 * k - k * 0.7 + sy * 0.32 * k;
        z = sz * 0.5 * k + Math.cos(x * 0.8 - t) * 0.2 * k;
      }
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      tmp.copy(GREY).lerp(ORANGE, THREE.MathUtils.smoothstep(x, -0.3, 2.2));
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    pts.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.028} vertexColors transparent opacity={0.85} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Frames() {
  const group = useRef<THREE.Group>(null);
  const frames = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        x: 0.75 + i * 0.36,
        h: 3.6 - Math.abs(i - 4) * 0.18 + (i % 3) * 0.12,
        dark: i % 4 === 2 || i === 5,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    group.current?.children.forEach((m, i) => {
      m.position.z = Math.sin(t * 1.1 - i * 0.45) * 0.09;
      m.rotation.y = -1.05 + Math.sin(t * 0.6 - i * 0.3) * 0.04;
    });
  });
  return (
    <group ref={group}>
      {frames.map((f, i) => (
        <mesh key={i} position={[f.x, 0, 0]} rotation={[0, -1.05, 0]}>
          <planeGeometry args={[1.25, f.h]} />
          <meshPhysicalMaterial
            color={f.dark ? '#151515' : '#ffffff'}
            transparent
            opacity={f.dark ? 0.55 : 0.22}
            roughness={0.25}
            metalness={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Rig() {
  const group = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.Mesh>(null);
  useFrame(({ pointer, clock }, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = damp(g.rotation.y, pointer.x * 0.18, 3, dt);
    g.rotation.x = damp(g.rotation.x, -pointer.y * 0.08, 3, dt);
    if (sphere.current) sphere.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.04;
  });
  return (
    <group ref={group} position={[0.5, 0, 0]} scale={0.86}>
      <Stream />
      <Frames />
      <mesh ref={sphere}>
        <sphereGeometry args={[0.36, 64, 64]} />
        <meshPhysicalMaterial color="#060606" roughness={0.18} metalness={0.3} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 5.2, 6]} />
        <meshBasicMaterial color="#1b1a17" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export default function Hero3D({ active }: { active: boolean }) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 8.2], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-5, 0, 2]} scale={[2, 6, 1]} />
        <Lightformer form="circle" intensity={2} color="#ff7a40" position={[5, -1, 2]} scale={2} />
      </Environment>
      <Rig />
    </Canvas>
  );
}
