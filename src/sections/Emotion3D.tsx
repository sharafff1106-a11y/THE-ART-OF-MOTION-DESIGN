import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { damp } from '../motion/math';
import { EMOTIONS, EmotionId } from './emotions';

/**
 * One soft form. Only its behaviour changes: speed, amplitude, frequency,
 * colour, scale, rhythm. The geometry never does.
 */
const noise = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const vertex = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uFreq;
varying vec3 vNormal; varying vec3 vView; varying float vD;
${noise}
void main(){
  float d = snoise(position * uFreq + vec3(uTime)) * 0.7 + snoise(position * uFreq * 2.1 - vec3(uTime * 0.6)) * 0.3;
  vD = d;
  vec3 p = position + normal * d * uAmp;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = normalize(-mv.xyz);
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uGloss;
varying vec3 vNormal; varying vec3 vView; varying float vD;
void main(){
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);
  vec3 col = mix(uA, uB, smoothstep(-0.6, 0.7, vNormal.x + vD * 0.8));
  col = mix(col, uC, smoothstep(0.1, 0.9, vNormal.y * 0.6 - vD * 0.5 + 0.3));
  col += fres * 0.35;
  float spec = pow(max(dot(reflect(-normalize(vec3(-0.4, 0.8, 0.6)), vNormal), vView), 0.0), 24.0) * uGloss;
  col += spec;
  gl_FragColor = vec4(col, 1.0);
}`;

function Blob({ emotionRef }: { emotionRef: React.MutableRefObject<EmotionId> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => {
    const e = EMOTIONS.calm;
    return {
      uTime: { value: 0 },
      uAmp: { value: e.amp },
      uFreq: { value: e.freq },
      uGloss: { value: e.gloss },
      uA: { value: new THREE.Color(e.colors[0]) },
      uB: { value: new THREE.Color(e.colors[1]) },
      uC: { value: new THREE.Color(e.colors[2]) },
    };
  }, []);
  const st = useRef({ speed: 0.3, scale: 1, rot: 0.2, y: 0, beat: 0, t: 0 });
  const targets = useMemo(() => ({ a: new THREE.Color(), b: new THREE.Color(), c: new THREE.Color() }), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    const e = EMOTIONS[emotionRef.current];
    const s = st.current;
    s.t += dt;
    s.speed = damp(s.speed, e.speed, 3, dt);
    s.rot = damp(s.rot, e.rot, 3, dt);
    s.scale = damp(s.scale, e.scale, 3, dt);
    s.y = damp(s.y, e.y, 2, dt);
    uniforms.uTime.value += dt * s.speed;
    uniforms.uAmp.value = damp(uniforms.uAmp.value, e.amp, 3, dt);
    uniforms.uFreq.value = damp(uniforms.uFreq.value, e.freq, 3, dt);
    uniforms.uGloss.value = damp(uniforms.uGloss.value, e.gloss, 3, dt);
    targets.a.set(e.colors[0]);
    targets.b.set(e.colors[1]);
    targets.c.set(e.colors[2]);
    const k = 1 - Math.exp(-3 * dt);
    uniforms.uA.value.lerp(targets.a, k);
    uniforms.uB.value.lerp(targets.b, k);
    uniforms.uC.value.lerp(targets.c, k);

    const m = mesh.current!;
    m.rotation.y += dt * s.rot;
    m.rotation.x = Math.sin(s.t * 0.3) * 0.2;
    let sc = s.scale;
    if (e.pulse) sc *= 1 + Math.pow(Math.max(0, Math.sin(s.t * Math.PI * e.pulse)), 12) * 0.08;
    let jx = 0;
    let jy = 0;
    if (e.jitter) {
      jx = (Math.random() - 0.5) * e.jitter;
      jy = (Math.random() - 0.5) * e.jitter;
    }
    const bounce = e.bounce ? Math.abs(Math.sin(s.t * 3)) * e.bounce : 0;
    m.scale.setScalar(sc);
    m.position.set(jx, s.y + jy + bounce + Math.sin(s.t * 0.8) * 0.05, 0);
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[0.95, 48]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  );
}

export default function Emotion3D({ active, emotionRef }: { active: boolean; emotionRef: React.MutableRefObject<EmotionId> }) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <Blob emotionRef={emotionRef} />
    </Canvas>
  );
}
