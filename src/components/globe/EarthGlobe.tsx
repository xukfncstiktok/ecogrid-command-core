import { useEffect, useRef } from "react";
import type { InterventionId } from "@/lib/eco/regions";
import type { RegionState } from "@/lib/eco/mission";
import { statusOf } from "@/lib/eco/mission";

interface Props {
  regions: RegionState[];
  selected: string;
  onSelect: (id: string) => void;
  /** increments on every deployment — triggers a glowing vector strike */
  strike?: { id: string; intervention: InterventionId; seq: number } | null;
}

interface MarkerHandle {
  id: string;
  core: any;
  ring: any;
  group: any;
}

interface DeploymentHandle {
  line: any;
  halo: any;
  model: any;
  born: number;
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

export function EarthGlobe({ regions, selected, onSelect, strike = null }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef({ regions, selected, onSelect, strike });
  dataRef.current = { regions, selected, onSelect, strike };

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

      // --- deployment vector strikes ---------------------------------------
      const strikes: DeploymentHandle[] = [];
      let lastStrikeSeq = dataRef.current.strike?.seq ?? 0;

      const createDeploymentModel = (intervention: InterventionId) => {
        const model = new THREE.Group();
        const bright = new THREE.MeshBasicMaterial({ color: 0x8ef0ff });
        const green = new THREE.MeshBasicMaterial({ color: 0x63e6a8 });
        const amber = new THREE.MeshBasicMaterial({ color: 0xf2b544 });
        const pale = new THREE.MeshBasicMaterial({ color: 0xdaf7ff, transparent: true, opacity: 0.86 });
        const dark = new THREE.MeshBasicMaterial({ color: 0x21465b });
        const add = (geometry: any, material: any, x: number, y: number, z: number) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(x, y, z);
          model.add(mesh);
          return mesh;
        };
        const forest = () => {
          for (let i = -2; i <= 2; i++) {
            add(new THREE.CylinderGeometry(0.012, 0.018, 0.1, 6), amber, i * 0.075, 0, -0.08);
            add(new THREE.ConeGeometry(0.045, 0.11, 7), green, i * 0.075, 0, -0.16);
          }
        };
        const array = (material = bright) => {
          for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
              const tile = add(new THREE.BoxGeometry(0.07, 0.045, 0.012), material, x * 0.085, y * 0.06, -0.08);
              tile.rotation.x = 0.25;
            }
          }
        };
        const towers = (blades = false) => {
          for (let i = -1; i <= 1; i++) {
            add(new THREE.CylinderGeometry(0.009, 0.014, 0.18, 6), pale, i * 0.12, 0, -0.12);
            if (blades) {
              const hub = add(new THREE.SphereGeometry(0.018, 8, 8), bright, i * 0.12, 0, -0.23);
              for (let b = 0; b < 3; b++) {
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.085, 0.008), pale);
                blade.position.y = 0.045;
                blade.rotation.z = (b * Math.PI * 2) / 3;
                hub.add(blade);
              }
            }
          }
        };
        const fleet = () => {
          for (let i = 0; i < 7; i++) {
            const angle = (i / 7) * Math.PI * 2;
            const craft = add(
              new THREE.OctahedronGeometry(0.028, 0),
              i % 2 ? bright : green,
              Math.cos(angle) * 0.17,
              Math.sin(angle) * 0.17,
              -0.12,
            );
            craft.rotation.z = angle;
          }
        };
        const water = () => {
          for (let i = -2; i <= 2; i++) {
            const drop = add(new THREE.SphereGeometry(0.026, 8, 8), bright, i * 0.065, 0.1, -0.1);
            drop.scale.set(0.7, 1.5, 0.7);
          }
          model.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 8, 40), pale));
        };
        const marine = () => {
          const reef = add(new THREE.TorusGeometry(0.17, 0.025, 8, 28), green, 0, 0, -0.08);
          reef.scale.y = 0.65;
          for (let i = -2; i <= 2; i++) {
            const stem = add(new THREE.CylinderGeometry(0.009, 0.014, 0.13, 6), bright, i * 0.06, 0, -0.13);
            stem.rotation.z = i * 0.08;
          }
        };
        const industrial = () => {
          towers(false);
          add(new THREE.TorusGeometry(0.13, 0.025, 8, 30), bright, 0, 0, -0.08);
          add(new THREE.BoxGeometry(0.19, 0.08, 0.07), dark, 0, -0.09, -0.11);
        };

        switch (intervention) {
          case "drone":
          case "rewild":
            fleet();
            forest();
            break;
          case "corridor":
          case "firebreak":
            model.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 48), bright));
            forest();
            break;
          case "biochar":
          case "capture":
          case "methane":
            industrial();
            break;
          case "mangrove":
          case "wetland":
            water();
            forest();
            break;
          case "grid":
          case "storage":
            array(amber);
            model.add(new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.01, 8, 48), bright));
            break;
          case "solar":
          case "reflector":
            array(intervention === "solar" ? bright : pale);
            break;
          case "wind":
          case "thermosyphon":
            towers(intervention === "wind");
            break;
          case "cloud":
            for (let i = -2; i <= 2; i++)
              add(new THREE.SphereGeometry(0.065, 10, 8), pale, i * 0.07, Math.abs(i) * -0.014, -0.12);
            water();
            break;
          case "aquifer":
          case "desal":
          case "irrigation":
            water();
            array(green);
            break;
          case "shade":
          case "nursery":
          case "kelp":
          case "alkalinity":
            marine();
            if (intervention === "shade") array(pale);
            break;
          case "satellite": {
            add(new THREE.BoxGeometry(0.11, 0.07, 0.06), pale, 0, 0, -0.26);
            add(new THREE.BoxGeometry(0.25, 0.055, 0.012), bright, 0.18, 0, -0.26);
            add(new THREE.BoxGeometry(0.25, 0.055, 0.012), bright, -0.18, 0, -0.26);
            model.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.009, 8, 40), green));
            break;
          }
        }
        return model;
      };

      const disposeObject = (object: any) => {
        object.traverse((child: any) => {
          child.geometry?.dispose?.();
          if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose?.());
          else child.material?.dispose?.();
        });
      };

      const spawnStrike = (id: string, intervention: InterventionId) => {
        const r = dataRef.current.regions.find((x) => x.id === id);
        if (!r) return;
        const surface = toVec(r.lat, r.lon, R * 1.02, THREE);
        const sky = surface.clone().multiplyScalar(2.6);
        const geo = new THREE.BufferGeometry().setFromPoints([sky, surface]);
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: 0x8ef0ff,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        const halo = new THREE.Mesh(
          new THREE.RingGeometry(0.06, 0.12, 48),
          new THREE.MeshBasicMaterial({
            color: 0x8ef0ff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        halo.position.copy(surface);
        halo.lookAt(new THREE.Vector3(0, 0, 0));
        const model = createDeploymentModel(intervention);
        model.position.copy(surface.clone().multiplyScalar(1.025));
        model.lookAt(new THREE.Vector3(0, 0, 0));
        model.scale.setScalar(0.01);
        world.add(line, halo, model);
        strikes.push({ line, halo, model, born: performance.now() });
        while (strikes.length > 4) {
          const oldest = strikes.shift();
          if (!oldest) break;
          world.remove(oldest.line, oldest.halo, oldest.model);
          oldest.line.geometry.dispose();
          oldest.line.material.dispose();
          oldest.halo.geometry.dispose();
          oldest.halo.material.dispose();
          disposeObject(oldest.model);
        }
      };

      let raf = 0;
      let t = 0;
      let previousFrame = performance.now();
      const render = () => {
        raf = requestAnimationFrame(render);
        const frameNow = performance.now();
        const delta = Math.min((frameNow - previousFrame) / 1000, 0.05);
        previousFrame = frameNow;
        t += delta;
        if (!dragging) rotY += spin * delta * 60;
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

        // spawn + animate deployment vector flashes
        const seq = dataRef.current.strike?.seq ?? 0;
        if (seq > lastStrikeSeq) {
          lastStrikeSeq = seq;
          const latest = dataRef.current.strike;
          if (latest) spawnStrike(latest.id, latest.intervention);
        }
        const now = performance.now();
        for (let i = strikes.length - 1; i >= 0; i--) {
          const s = strikes[i]!;
          const k = (now - s.born) / 3600;
          if (k >= 1) {
            world.remove(s.line, s.halo, s.model);
            s.line.geometry.dispose();
            s.line.material.dispose();
            s.halo.geometry.dispose();
            s.halo.material.dispose();
            disposeObject(s.model);
            strikes.splice(i, 1);
            continue;
          }
          const arrive = Math.min(1, k * 5);
          const fade = k < 0.72 ? 1 : 1 - (k - 0.72) / 0.28;
          s.line.material.opacity = Math.max(0, 1 - k * 1.5) * (0.6 + 0.4 * Math.sin(k * 40));
          s.halo.scale.setScalar(1 + k * 4.2);
          s.halo.material.opacity = Math.max(0, 0.9 * (1 - k * 1.4));
          s.model.scale.setScalar((0.15 + arrive * 0.85) * Math.max(0, fade));
          s.model.rotation.z = Math.sin(k * Math.PI * 5) * 0.08;
        }

        renderer.render(scene, camera);
      };
      render();

      cleanup = () => {
        cancelAnimationFrame(raf);
        for (const s of strikes) {
          world.remove(s.line, s.halo, s.model);
          disposeObject(s.model);
        }
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
