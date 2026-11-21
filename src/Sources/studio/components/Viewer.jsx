import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

function Fit({ box, trigger }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    if (!box || !controls) return;
    const size = box.getSize(new THREE.Vector3());
    const aspect = Math.min(1.4, camera.aspect || 1);
    const r = Math.max(size.x / aspect, size.y, size.z * 2, 20);
    const dist = r * (aspect < 1 ? 2.1 : 1.6);
    controls.target.set(0, 0, size.z / 2);
    camera.position.set(0, -dist * 0.82, dist * 0.78);
    camera.near = 0.1;
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, controls, !!box]);
  return null;
}

export default function Viewer({ parts, fitKey }) {
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
    return { offset: [-c.x, -c.y, -b.min.z], box: new THREE.Box3(new THREE.Vector3(), size) };
  }, [parts]);

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
      <Fit box={box} trigger={fitKey} />
    </Canvas>
  );
}
