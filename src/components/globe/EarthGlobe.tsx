import { useEffect, useRef } from "react";
import type { RegionState } from "@/lib/eco/mission";
import { statusOf } from "@/lib/eco/mission";

interface Props {
  regions: RegionState[];
  selected: string;
  onSelect: (id: string) => void;
}

interface MarkerHandle {
  id: string;
  core: any;
  ring: any;
  group: any;
}

const toVec = (lat: number, lon: number, r: number, THREE: any) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
};

export function EarthGlobe({ regions, selected, onSelect }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef({ regions, selected, onSelect });
  dataRef.current = { regions, selected, onSelect };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { LAND_DOTS, COASTLINES } = await import("@/lib/eco/geo-data");
      if (disposed || !mount) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 1.3, 6.2);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.cursor = "grab";

      const R = 2;
      const world = new THREE.Group();
      world.rotation.x = 0.28;
      scene.add(world);

      // --- ocean shell -------------------------------------------------
      const ocean = new THREE.Mesh(
        new THREE.SphereGeometry(R * 0.995, 64, 64),
        new THREE.MeshBasicMaterial({ color: 0x0a1626 }),
      );
      world.add(ocean);

      // --- atmosphere (fresnel) ----------------------------------------
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.16, 64, 64),
        new THREE.ShaderMaterial({
          transparent: true,
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { uColor: { value: new THREE.Color(0x4fd8c0) } },
          vertexShader: `varying vec3 vN; varying vec3 vP;
            void main(){ vN = normalize(normalMatrix * normal);
              vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz;
              gl_Position = projectionMatrix * mv; }`,
          fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vP;
            void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 2.6);
              gl_FragColor = vec4(uColor, f * 0.85); }`,
        }),
      );
      world.add(atmosphere);

      // --- graticule ----------------------------------------------------
      const grat = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.001, 24, 16)),
        new THREE.LineBasicMaterial({ color: 0x2c4a63, transparent: true, opacity: 0.22 }),
      );
      world.add(grat);

      // --- land dots -----------------------------------------------------
      const dotPos: number[] = [];
      const dotCol: number[] = [];
      const cA = new THREE.Color(0x63e6a8);
      const cB = new THREE.Color(0x3aa7c9);
      for (let i = 0; i < LAND_DOTS.length; i += 2) {
        const lat = LAND_DOTS[i + 1] ?? 0;
        const lon = LAND_DOTS[i] ?? 0;
        const v = toVec(lat, lon, R * 1.006, THREE);
        dotPos.push(v.x, v.y, v.z);
        const m = cA.clone().lerp(cB, Math.abs(lat) / 80);
        dotCol.push(m.r, m.g, m.b);
      }
      const dotGeo = new THREE.BufferGeometry();
      dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(dotPos, 3));
      dotGeo.setAttribute("color", new THREE.Float32BufferAttribute(dotCol, 3));
      const dots = new THREE.Points(
        dotGeo,
        new THREE.PointsMaterial({
          size: 0.022,
          vertexColors: true,
          transparent: true,
          opacity: 0.85,
          sizeAttenuation: true,
        }),
      );
      world.add(dots);

      // --- coastlines ------------------------------------------------------
      const segs: number[] = [];
      for (const line of COASTLINES) {
        for (let i = 0; i + 3 < line.length; i += 2) {
          const a = toVec(line[i + 1] ?? 0, line[i] ?? 0, R * 1.012, THREE);
          const b = toVec(line[i + 3] ?? 0, line[i + 2] ?? 0, R * 1.012, THREE);
          segs.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
      const coastGeo = new THREE.BufferGeometry();
      coastGeo.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
      world.add(
        new THREE.LineSegments(
          coastGeo,
          new THREE.LineBasicMaterial({ color: 0x8ff0d0, transparent: true, opacity: 0.28 }),
        ),
      );

      // --- stars -------------------------------------------------------------
      const starPos: number[] = [];
      for (let i = 0; i < 900; i++) {
        const v = new THREE.Vector3()
          .randomDirection()
          .multiplyScalar(22 + Math.random() * 16);
        starPos.push(v.x, v.y, v.z);
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
      scene.add(
        new THREE.Points(
          starGeo,
          new THREE.PointsMaterial({ color: 0x9fc3d8, size: 0.09, transparent: true, opacity: 0.6 }),
        ),
      );

      // --- markers -----------------------------------------------------------
      const markers: MarkerHandle[] = [];
      const pickTargets: any[] = [];
      const ringGeo = new THREE.RingGeometry(0.06, 0.075, 40);
      const coreGeo = new THREE.SphereGeometry(0.03, 14, 14);
      const hitGeo = new THREE.SphereGeometry(0.11, 8, 8);

      for (const r of dataRef.current.regions) {
        const pos = toVec(r.lat, r.lon, R * 1.02, THREE);
        const group = new THREE.Group();
        group.position.copy(pos);
        group.lookAt(new THREE.Vector3(0, 0, 0));

        const core = new THREE.Mesh(
          coreGeo,
          new THREE.MeshBasicMaterial({ color: 0x63e6a8 }),
        );
        const ring = new THREE.Mesh(
          ringGeo,
          new THREE.MeshBasicMaterial({
            color: 0x63e6a8,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
          }),
        );
        const hit = new THREE.Mesh(
          hitGeo,
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hit.userData["regionId"] = r.id;

        // stem beam
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6),
          new THREE.MeshBasicMaterial({ color: 0x63e6a8, transparent: true, opacity: 0.35 }),
        );
        beam.rotation.x = Math.PI / 2;
        beam.position.z = -0.11;

        group.add(core, ring, hit, beam);
        world.add(group);
        markers.push({ id: r.id, core, ring, group });
        pickTargets.push(hit);
      }

      // --- interaction ---------------------------------------------------------
      let rotY = 1.2;
      let rotX = 0.28;
      let targetZoom = 6.2;
      // camera fly-to state
      let flyRotY: number | null = null;
      let flyRotX = 0.28;
      let flyUntil = 0;
      let lastSelected = dataRef.current.selected;

      /** rotation that brings a lat/lon to face the camera */
      const facing = (lat: number, lon: number) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -Math.sin(phi) * Math.cos(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(theta);
        const ry = Math.atan2(-x, z);
        const zp = Math.hypot(x, z);
        const rx = Math.max(-0.9, Math.min(1.1, Math.atan2(y, zp)));
        return { ry, rx };
      };

      const flyTo = (id: string) => {
        const r = dataRef.current.regions.find((x) => x.id === id);
        if (!r) return;
        const { ry, rx } = facing(r.lat, r.lon);
        // pick the equivalent angle closest to the current rotation
        let target = ry;
        while (target - rotY > Math.PI) target -= Math.PI * 2;
        while (target - rotY < -Math.PI) target += Math.PI * 2;
        flyRotY = target;
        flyRotX = rx;
        flyUntil = performance.now() + 2600;
        targetZoom = 4.4;
      };

      /** nearest region to a point on the globe surface (great-circle) */
      const nearestRegion = (lat: number, lon: number) => {
        let best: { id: string; d: number } | null = null;
        for (const r of dataRef.current.regions) {
          const dLat = ((r.lat - lat) * Math.PI) / 180;
          const dLon = ((r.lon - lon) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((r.lat * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;
          const d = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
          if (!best || d < best.d) best = { id: r.id, d };
        }
        // only snap when the click lands reasonably close (~25°)
        return best && best.d < 0.44 ? best.id : null;
      };
      let dragging = false;
      let moved = 0;
      let lastX = 0;
      let lastY = 0;
      let spin = 0.0012;
      const pointer = new THREE.Vector2(-2, -2);
      const raycaster = new THREE.Raycaster();

      const onDown = (e: PointerEvent) => {
        dragging = true;
        moved = 0;
        lastX = e.clientX;
        lastY = e.clientY;
        renderer.domElement.style.cursor = "grabbing";
      };
      const onMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        rotY += dx * 0.005;
        rotX = Math.max(-0.9, Math.min(1.1, rotX + dy * 0.004));
        lastX = e.clientX;
        lastY = e.clientY;
      };
      const onUp = (e: PointerEvent) => {
        if (dragging && moved < 5) {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(pickTargets, false);
          const picked = hits[0]?.object.userData["regionId"];
          if (typeof picked === "string") dataRef.current.onSelect(picked);
        }
        dragging = false;
        renderer.domElement.style.cursor = "grab";
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        targetZoom = Math.max(3.6, Math.min(9, targetZoom + e.deltaY * 0.004));
      };

      const el = renderer.domElement;
      el.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      el.addEventListener("wheel", onWheel, { passive: false });

      const resize = () => {
        const w = mount.clientWidth || 1;
        const h = mount.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(mount);

      const colStable = new THREE.Color(0x63e6a8);
      const colStrain = new THREE.Color(0xf2b544);
      const colCrit = new THREE.Color(0xff5c4d);
      const colSel = new THREE.Color(0x8ef0ff);

      let raf = 0;
      let t = 0;
      const render = () => {
        raf = requestAnimationFrame(render);
        t += 0.016;
        if (!dragging) rotY += spin;
        world.rotation.y = rotY;
        world.rotation.x = rotX;
        camera.position.z += (targetZoom - camera.position.z) * 0.08;

        // hover cursor
        raycaster.setFromCamera(pointer, camera);
        const hovering = !dragging && raycaster.intersectObjects(pickTargets, false).length > 0;
        el.style.cursor = dragging ? "grabbing" : hovering ? "pointer" : "grab";
        spin = hovering ? 0.0002 : 0.0012;

        const { regions: rs, selected: sel } = dataRef.current;
        for (const m of markers) {
          const r = rs.find((x) => x.id === m.id);
          if (!r) continue;
          const s = statusOf(r.health);
          const base = s === "stable" ? colStable : s === "strained" ? colStrain : colCrit;
          const isSel = r.id === sel;
          const col = isSel ? colSel : base;
          (m.core.material as any).color.copy(col);
          (m.ring.material as any).color.copy(col);
          const beat = 0.5 + 0.5 * Math.sin(t * (s === "critical" ? 5 : 2.2) + m.group.id);
          const grow = isSel ? 1.5 + beat * 0.8 : 1 + beat * (s === "stable" ? 0.25 : 0.6);
          m.ring.scale.setScalar(grow + (r.flash > 0 ? 0.9 : 0));
          (m.ring.material as any).opacity = (isSel ? 0.95 : 0.55) * (1 - beat * 0.35);
          m.core.scale.setScalar(isSel ? 1.5 : 1);
        }

        renderer.render(scene, camera);
      };
      render();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        el.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        el.removeEventListener("wheel", onWheel);
        renderer.dispose();
        if (el.parentNode) el.parentNode.removeChild(el);
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" aria-hidden="true" />;
}

export default EarthGlobe;
