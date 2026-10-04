import { useEffect, useMemo, useRef } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { audio } from '../audio/engine';
import { clamp, damp, lerp } from '../motion/math';
import { MASS } from '../motion/physics';

/** Interpolate the physics presets continuously, so weight is a dial, not a switch. */
function physicsAt(m: number) {
  const f = clamp(m) * (MASS.length - 1);
  const i = Math.min(MASS.length - 2, Math.floor(f));
  const t = f - i;
  const a = MASS[i];
  const b = MASS[i + 1];
  const mix = (k: 'gravity' | 'stiffness' | 'damping' | 'restitution' | 'friction' | 'drag' | 'shake' | 'mass') => lerp(a[k], b[k], t);
  return {
    gravity: mix('gravity') / 240,
    stiffness: mix('stiffness'),
    damping: mix('damping'),
    restitution: mix('restitution'),
    friction: mix('friction'),
    drag: mix('drag'),
    shake: mix('shake') / 140,
    mass: mix('mass'),
  };
}

const SIZE = 0.92;
const GLASS = new THREE.Color('#e9eef2');
const SMOKE = new THREE.Color('#5a5a5a');
const INK = new THREE.Color('#141414');
const ORANGE = new THREE.Color('#ff4d12');

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function Cube({ massRef, dropRef }: { massRef: React.MutableRefObject<number>; dropRef: React.MutableRefObject<number> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const { viewport, camera, gl } = useThree();
  const tex = useMemo(shadowTexture, []);
  const s = useRef({ x: 0, y: 0.6, vx: 0, vy: 0, rot: 0, w: 0, drag: false, tx: 0, ty: 0, shake: 0, lastDrop: 0, squash: 0, sv: 0, acted: false });
  const floor = -1.25;

  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      if (!s.current.drag) return;
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      s.current.tx = (nx * viewport.width) / 2;
      s.current.ty = Math.min(viewport.height / 2 - SIZE * 0.8, Math.max(floor + SIZE / 2, (ny * viewport.height) / 2));
    };
    const up = () => {
      s.current.drag = false;
      el.style.cursor = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl, viewport]);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    s.current.drag = true;
    s.current.acted = true;
    s.current.tx = e.point.x;
    s.current.ty = e.point.y;
    gl.domElement.style.cursor = 'grabbing';
    audio.click(lerp(3000, 500, massRef.current), 0.08);
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    const st = s.current;
    const p = physicsAt(massRef.current);
    const wall = viewport.width / 2 - SIZE * 0.8;

    if (dropRef.current !== st.lastDrop) {
      st.lastDrop = dropRef.current;
      st.acted = true;
      st.drag = false;
      st.x = lerp(-wall * 0.4, wall * 0.4, Math.random());
      st.y = viewport.height / 2 - SIZE * 0.6;
      st.vx = 0;
      st.vy = 0;
      st.w = (Math.random() - 0.5) * 4;
    }

    const steps = 2;
    const h = dt / steps;
    for (let k = 0; k < steps; k++) {
      if (st.drag) {
        st.vx += ((st.tx - st.x) * p.stiffness - st.vx * p.damping) * h;
        st.vy += ((st.ty - st.y) * p.stiffness - st.vy * p.damping) * h;
        st.w = damp(st.w, -st.vx * 0.6, 4, h);
      } else {
        st.vy -= p.gravity * h;
        if (p.gravity < 0.5) {
          st.vy += Math.sin(performance.now() / 900) * 0.15 * h;
        }
        const air = Math.exp(-p.drag * h);
        st.vx *= air;
        st.vy *= air;
      }
      st.x += st.vx * h;
      st.y += st.vy * h;
      const bottom = floor + SIZE / 2;
      if (st.y < bottom) {
        st.y = bottom;
        if (st.vy < 0) {
          const impact = -st.vy;
          const strength = clamp(impact / 11);
          if (impact > 0.6) {
            // the first settle on arrival is silent; sound answers the visitor's actions
            if (st.acted) audio.impact(p.mass, strength, { pan: clamp(st.x / wall, -1, 1) * 0.8 });
            st.shake = Math.max(st.shake, strength * p.shake);
            st.sv -= strength * lerp(5, 0.6, p.mass);
          }
          st.vy = impact * p.restitution;
          if (st.vy < 0.3) st.vy = 0;
        }
        st.vx *= Math.exp(-p.friction * h);
      }
      const top = viewport.height / 2 - SIZE * 0.8;
      if (st.y > top) {
        st.y = top;
        st.vy = -Math.abs(st.vy) * p.restitution;
      }
      if (Math.abs(st.x) > wall) {
        const impact = Math.abs(st.vx);
        st.x = Math.sign(st.x) * wall;
        if (impact > 1 && st.acted) audio.impact(p.mass, clamp(impact / 14) * 0.8, { pan: Math.sign(st.x) * 0.9 });
        st.vx = -st.vx * p.restitution;
        st.w = -st.w * 0.5;
      }
    }

    // rotation: spins in the air, settles flat on the floor (heavier = slower, heavier settle)
    const onFloor = st.y <= floor + SIZE / 2 + 0.01;
    if (onFloor && !st.drag) {
      const target = Math.round(st.rot / (Math.PI / 2)) * (Math.PI / 2);
      st.w += ((target - st.rot) * lerp(90, 25, p.mass) - st.w * lerp(10, 6, p.mass)) * dt;
    } else if (!st.drag) {
      st.w *= Math.exp(-p.drag * 0.5 * dt);
    }
    st.rot += st.w * dt;

    st.sv += (-st.squash * 260 - st.sv * 14) * dt;
    st.squash += st.sv * dt;
    st.shake = damp(st.shake, 0, 6, dt);

    const m = mesh.current!;
    m.position.set(st.x, st.y, 0);
    m.rotation.set(0.42, 0.62, st.rot);
    const sq = clamp(st.squash, -0.3, 0.3);
    m.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);

    camera.position.x = (Math.random() - 0.5) * st.shake;
    camera.position.y = (Math.random() - 0.5) * st.shake;

    // material tells the weight before you even touch it
    const mm = massRef.current;
    const mt = mat.current!;
    const col = new THREE.Color();
    if (mm < 0.33) col.copy(GLASS).lerp(SMOKE, mm / 0.33);
    else if (mm < 0.66) col.copy(SMOKE).lerp(INK, (mm - 0.33) / 0.33);
    else col.copy(INK).lerp(ORANGE, (mm - 0.66) / 0.34);
    mt.color.lerp(col, 0.15);
    mt.opacity = damp(mt.opacity, lerp(0.38, 1, clamp(mm * 1.8)), 6, dt);
    mt.roughness = lerp(0.08, 0.35, mm);
    mt.emissive.copy(ORANGE);
    mt.emissiveIntensity = damp(mt.emissiveIntensity, clamp((mm - 0.7) / 0.3) * 0.35, 6, dt);

    const sh = shadow.current!;
    const height = clamp((st.y - (floor + SIZE / 2)) / 3);
    sh.position.x = st.x;
    sh.scale.setScalar(lerp(2.1, 1.1, height));
    (sh.material as THREE.MeshBasicMaterial).opacity = lerp(0.55, 0.12, height);
  });

  return (
    <>
      <RoundedBox ref={mesh} args={[SIZE, SIZE, SIZE]} radius={0.06} smoothness={3} onPointerDown={onDown}>
        <meshPhysicalMaterial ref={mat} transparent opacity={0.4} color={GLASS} roughness={0.1} metalness={0.05} clearcoat={1} clearcoatRoughness={0.15} />
      </RoundedBox>
      <mesh ref={shadow} position={[0, floor + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 1.0]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, floor, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 0.006]} />
        <meshBasicMaterial color="#141414" transparent opacity={0.35} />
      </mesh>
    </>
  );
}

export default function Weight3D({ active, massRef, dropRef }: { active: boolean; massRef: React.MutableRefObject<number>; dropRef: React.MutableRefObject<number> }) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.35, 7], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 5, 4]} intensity={1.6} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1, 3]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffb08a" position={[5, 0, 2]} scale={[3, 5, 1]} />
      </Environment>
      <Cube massRef={massRef} dropRef={dropRef} />
    </Canvas>
  );
}
