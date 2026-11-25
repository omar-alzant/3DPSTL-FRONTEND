import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

function Fit({ box, trigger }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    if (!box || !controls) return;
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const aspect = Math.min(1.4, camera.aspect || 1);
    const r = Math.max(size.x / aspect, size.y, size.z * 2, 20);
    const dist = r * (aspect < 1 ? 2.1 : 1.6);
    controls.target.set(c.x, c.y, size.z / 2);
    camera.position.set(c.x, c.y - dist * 0.82, dist * 0.78);
    camera.near = 0.1;
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, controls, !!box]);
  return null;
}

// Things everyone knows the size of, shown next to the design (real sizes, mm)
export const COMPARE = {
  phone: { w: 71.5, d: 7.8, h: 147 }, // a typical smartphone
  card: { w: 85.6, d: 0.8, h: 54 }, // a bank card
};

function Phone({ x }) {
  const { w, d, h } = COMPARE.phone;
  return (
    <group position={[x, 0, h / 2]}>
      <RoundedBox args={[w, d, h]} radius={3.2} smoothness={4}>
        <meshStandardMaterial color="#2b2b36" roughness={0.35} metalness={0.3} />
      </RoundedBox>
      {/* screen on the side facing the camera */}
      <RoundedBox args={[w - 5, 0.4, h - 6]} radius={1.6} smoothness={3} position={[0, -d / 2 - 0.05, 0]}>
        <meshStandardMaterial color="#5a5f86" roughness={0.15} metalness={0.4} emissive="#1d2040" />
      </RoundedBox>
      <mesh position={[0, -d / 2 - 0.3, h / 2 - 8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.4, 20]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

function Card({ x }) {
  const { w, d, h } = COMPARE.card;
  return (
    <group position={[x, 0, h / 2]}>
      <RoundedBox args={[w, d, h]} radius={0.38} smoothness={3}>
        <meshStandardMaterial color="#2f6fd6" roughness={0.4} />
      </RoundedBox>
      <mesh position={[-w / 2 + 16, -d / 2 - 0.05, 6]}>
        <boxGeometry args={[11, 0.2, 9]} />
        <meshStandardMaterial color="#d9b25a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -d / 2 - 0.05, -14]}>
        <boxGeometry args={[60, 0.2, 3]} />
        <meshStandardMaterial color="#cfe0ff" />
      </mesh>
    </group>
  );
}

export default function Viewer({ parts, fitKey, compare = 'none' }) {
  const light = useTheme().theme === 'light';
  // توسيط المجسّم على سطح الطباعة
  const { offset, box } = useMemo(() => {
    if (!parts?.length) return { offset: [0, 0, 0], box: null };
    const b = new THREE.Box3();
    parts.forEach((p) => {
      p.geometry.computeBoundingBox();
      b.union(p.geometry.boundingBox);
    });
    const c = b.getCenter(new THREE.Vector3());
    const size = b.getSize(new THREE.Vector3());
    return { offset: [-c.x, -c.y, -b.min.z], box: new THREE.Box3(new THREE.Vector3(-size.x / 2, -size.y / 2, 0), new THREE.Vector3(size.x / 2, size.y / 2, size.z)) };
  }, [parts]);

  // the size reference stands to the right of the design, 15 mm away
  const ref = COMPARE[compare];
  const refX = box && ref ? box.max.x + 15 + ref.w / 2 : 0;
  const fitBox = useMemo(() => {
    if (!box || !ref) return box;
    const b = box.clone();
    b.union(new THREE.Box3(new THREE.Vector3(refX - ref.w / 2, -ref.d / 2, 0), new THREE.Vector3(refX + ref.w / 2, ref.d / 2, ref.h)));
    return b;
  }, [box, ref, refX]);

  return (
    <Canvas camera={{ up: [0, 0, 1], fov: 35, position: [0, -120, 110] }} dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
      <color attach="background" args={[light ? '#ece9fd' : '#11113f']} />
      <hemisphereLight args={['#ffffff', '#8a84c8', 1.5]} />
      <directionalLight position={[60, -80, 140]} intensity={2.2} />
      <directionalLight position={[-90, 60, 60]} intensity={0.7} />
      <group position={offset}>
        {parts?.map((p, i) => (
          <mesh key={i} geometry={p.geometry}>
            <meshStandardMaterial color={p.color} roughness={0.55} metalness={0.02} />
          </mesh>
        ))}
      </group>
      {box && compare === 'phone' && <Phone x={refX} />}
      {box && compare === 'card' && <Card x={refX} />}
      <Grid
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.01]}
        args={[400, 400]}
        cellSize={5}
        sectionSize={25}
        cellColor={light ? '#d3cdf6' : '#232368'}
        sectionColor={light ? '#a99cf5' : '#3b2f9a'}
        fadeDistance={400}
        infiniteGrid
      />
      <OrbitControls makeDefault enableDamping />
      <Fit box={fitBox} trigger={`${fitKey}|${compare}`} />
    </Canvas>
  );
}
