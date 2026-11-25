// 3D view for the split tool: click to place cut points (on the model, or beside it to go round a whole part),
// drag them to adjust. Clicks are read from the page events so points can also sit off the model.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { useTheme } from '../../context/ThemeContext';
import { loopCurve } from './engine.js';

// fast clicking on models with millions of triangles
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

function Rig({ box, fitKey, apiRef }) {
  const { camera, controls, gl, scene, raycaster } = useThree();
  apiRef.current = {
    camera,
    controls,
    /** what is under the pointer: a point on a part, or (off the model) a point on the plane through the view centre */
    pick(clientX, clientY) {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const meshes = [];
      scene.traverse((o) => { if (o.isMesh && o.userData.partId) meshes.push(o); });
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (hit) return { x: hit.point.x, y: hit.point.y, z: hit.point.z, partId: hit.object.userData.partId };
      const n = camera.getWorldDirection(new THREE.Vector3());
      const target = controls?.target || new THREE.Vector3();
      const p = raycaster.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(n, target), new THREE.Vector3());
      return p ? { x: p.x, y: p.y, z: p.z, partId: null } : null;
    },
  };
  useEffect(() => {
    if (!box || !controls) return;
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z, 20);
    const dist = r * 2.2;
    controls.target.set(0, 0, size.z / 2);
    camera.position.set(0, -dist * 0.9, size.z / 2 + dist * 0.35);
    camera.near = Math.max(0.05, r / 500);
    camera.far = dist * 30;
    camera.updateProjectionMatrix();
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, controls, !!box]);
  return null;
}

function Part({ part, selected, shift }) {
  useEffect(() => {
    if (!part.geometry.boundsTree) part.geometry.computeBoundsTree();
  }, [part.geometry]);
  return (
    <mesh geometry={part.geometry} userData={{ partId: part.id }} position={shift || [0, 0, 0]}>
      <meshStandardMaterial
        color={part.color}
        roughness={0.5}
        metalness={0.05}
        emissive={selected ? '#6a4dff' : '#000000'}
        emissiveIntensity={selected ? 0.12 : 0}
      />
    </mesh>
  );
}

export default function SplitViewer({ parts, points, setPoints, drawing, fitKey, apiRef, selectedId, line = false, explode = false }) {
  const light = useTheme().theme === 'light';
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  dragRef.current = drag;
  const gesture = useRef({ x: 0, y: 0, onPoint: false });

  const box = useMemo(() => {
    if (!parts?.length) return null;
    const b = new THREE.Box3();
    for (const p of parts) { if (!p.hidden) { p.geometry.computeBoundingBox(); b.union(p.geometry.boundingBox); } }
    return b.isEmpty() ? null : b;
  }, [parts]);
  const r = box ? box.getSize(new THREE.Vector3()).length() : 100;

  // "pull apart" view: every part moves away from the middle of the model
  const shifts = useMemo(() => {
    if (!explode || !box) return {};
    const mid = box.getCenter(new THREE.Vector3());
    const out = {};
    for (const p of parts) {
      p.geometry.computeBoundingBox();
      const c = p.geometry.boundingBox.getCenter(new THREE.Vector3());
      const d = c.sub(mid).multiplyScalar(0.55);
      out[p.id] = [d.x, d.y, d.z];
    }
    return out;
  }, [explode, box, parts]);
  const dot = Math.max(0.35, r * 0.007);

  // dragging a point (also off the model) and releasing it anywhere
  useEffect(() => {
    const move = (e) => {
      const i = dragRef.current;
      if (i === null) return;
      const p = apiRef.current?.pick(e.clientX, e.clientY);
      if (p) setPoints((ps) => ps.map((q, k) => (k === i ? p : q)));
    };
    const up = () => {
      if (dragRef.current === null) return;
      setDrag(null);
      if (apiRef.current?.controls) apiRef.current.controls.enabled = true;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [apiRef, setPoints]);

  // a click (not a rotate, not the end of a drag) places a point
  const onDownCapture = (e) => { gesture.current = { x: e.clientX, y: e.clientY, onPoint: false }; };
  const onUp = (e) => {
    const g = gesture.current;
    if (!drawing || g.onPoint || dragRef.current !== null) return;
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) return;
    const p = apiRef.current?.pick(e.clientX, e.clientY);
    if (p) setPoints((ps) => [...ps, p]);
  };

  const curve = useMemo(() => {
    if (points.length < 2) return null;
    if (line) {
      // a straight cut: show the line well past both points, so it reads as a knife across the part
      const a = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
      const b = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
      const d = b.clone().sub(a);
      return [a.clone().addScaledVector(d, -0.6), b.clone().addScaledVector(d, 0.6)].map((p) => [p.x, p.y, p.z]);
    }
    const pts = points.length >= 3 ? loopCurve(points, Math.max(64, points.length * 24)) : points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    return pts.map((p) => [p.x, p.y, p.z]);
  }, [points, line]);

  return (
    <div className="sd-split-view" onPointerDownCapture={onDownCapture} onPointerUp={onUp} style={{ position: 'absolute', inset: 0 }}>
      <Canvas camera={{ up: [0, 0, 1], fov: 35, position: [0, -160, 120] }} dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <color attach="background" args={[light ? '#ece9fd' : '#11113f']} />
        <hemisphereLight args={['#ffffff', '#8a84c8', 1.4]} />
        <directionalLight position={[60, -80, 140]} intensity={2.1} />
        <directionalLight position={[-90, 60, 60]} intensity={0.8} />
        <directionalLight position={[0, 120, -40]} intensity={0.4} />
        {parts.filter((p) => !p.hidden).map((p) => (
          <Part key={p.id} part={p} selected={p.id === selectedId} shift={shifts[p.id]} />
        ))}
        {curve && <Line points={curve} color="#ff3b5c" lineWidth={2.5} depthTest={false} renderOrder={10} transparent />}
        {points.map((p, i) => (
          <mesh
            key={i}
            position={[p.x, p.y, p.z]}
            renderOrder={11}
            onPointerDown={(e) => {
              if (!drawing) return;
              e.stopPropagation();
              gesture.current.onPoint = true;
              setDrag(i);
              if (apiRef.current?.controls) apiRef.current.controls.enabled = false;
            }}
          >
            <sphereGeometry args={[dot * (i === points.length - 1 ? 1.25 : 1), 16, 12]} />
            <meshBasicMaterial color={p.partId ? (i === points.length - 1 ? '#ffd43b' : '#ff3b5c') : '#4dabf7'} depthTest={false} transparent />
          </mesh>
        ))}
        <Grid
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, -0.01]}
          args={[600, 600]}
          cellSize={5}
          sectionSize={25}
          cellColor={light ? '#d3cdf6' : '#232368'}
          sectionColor={light ? '#a99cf5' : '#3b2f9a'}
          fadeDistance={Math.max(400, r * 4)}
          infiniteGrid
        />
        <OrbitControls makeDefault enableDamping />
        <Rig box={box} fitKey={fitKey} apiRef={apiRef} />
      </Canvas>
    </div>
  );
}
