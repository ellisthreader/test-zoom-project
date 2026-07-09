import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Model: "Robot Head WIP" by Yorick van Meggelen (https://sketchfab.com/79480),
// CC-BY-4.0 — https://sketchfab.com/3d-models/robot-head-wip-9f349d3ec1dc4c3f9c3eefecc013ebb4

const MODEL_URL = "/robot-head.glb";
const MAX_PIXEL_RATIO = 2;

type LookState = {
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
  nextGlanceAt: number;
  pointerActive: boolean;
};

export default function RobotHead({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0, 0.06, 2.35);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(1.6, 1.8, 2.4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x7aa7ff, 0.9);
    rimLight.position.set(-2.2, 0.6, -1.8);
    scene.add(rimLight);

    // Outer group: idle float. Inner group: look-around rotation.
    const floatGroup = new THREE.Group();
    const headGroup = new THREE.Group();
    floatGroup.add(headGroup);
    scene.add(floatGroup);

    const emissiveMaterials: THREE.MeshStandardMaterial[] = [];
    let disposed = false;

    const loader = new GLTFLoader();
    loader.load(MODEL_URL, (gltf) => {
      if (disposed) return;
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 1 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.copy(center).multiplyScalar(-scale);

      // The GLB's face points along +X; turn it toward the camera.
      const pivot = new THREE.Group();
      pivot.add(model);
      pivot.rotation.y = -Math.PI / 2;

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.frustumCulled = false;
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (material?.emissive) {
            material.emissiveIntensity = 1;
            emissiveMaterials.push(material);
          }
        }
      });

      headGroup.add(pivot);
      if (reduceMotion || !running) renderFrame(0);
    });

    const look: LookState = {
      yaw: 0,
      pitch: 0,
      targetYaw: 0.18,
      targetPitch: 0.04,
      nextGlanceAt: 1.6,
      pointerActive: false,
    };

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Normalized offset from the model's center, in viewport halves.
      const nx = (event.clientX - cx) / (window.innerWidth / 2);
      const ny = (event.clientY - cy) / (window.innerHeight / 2);
      pointer.x = THREE.MathUtils.clamp(nx, -1, 1);
      pointer.y = THREE.MathUtils.clamp(ny, -1, 1);
      look.pointerActive = true;
    };
    const onPointerLeave = () => {
      look.pointerActive = false;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    const clock = new THREE.Clock();
    let elapsed = 0;

    const renderFrame = (dt: number) => {
      elapsed += dt;

      if (look.pointerActive) {
        look.targetYaw = pointer.x * 0.6;
        look.targetPitch = pointer.y * 0.32;
      } else if (elapsed >= look.nextGlanceAt) {
        look.targetYaw = THREE.MathUtils.randFloatSpread(1.1);
        look.targetPitch = THREE.MathUtils.randFloat(-0.18, 0.26);
        look.nextGlanceAt = elapsed + THREE.MathUtils.randFloat(1.6, 3.4);
      }

      // Exponential smoothing toward the target — frame-rate independent.
      const ease = 1 - Math.exp(-4.2 * dt);
      look.yaw += (look.targetYaw - look.yaw) * ease;
      look.pitch += (look.targetPitch - look.pitch) * ease;

      headGroup.rotation.y = look.yaw + Math.sin(elapsed * 0.6) * 0.03;
      headGroup.rotation.x = look.pitch + Math.sin(elapsed * 0.9) * 0.015;
      headGroup.rotation.z = Math.sin(elapsed * 0.5) * 0.02;
      floatGroup.position.y = Math.sin(elapsed * 1.15) * 0.022;

      const pulse = 1 + Math.sin(elapsed * 2.1) * 0.18;
      for (const material of emissiveMaterials) material.emissiveIntensity = pulse;

      renderer.render(scene, camera);
    };

    let running = false;
    const startLoop = () => {
      if (running || reduceMotion) return;
      running = true;
      clock.getDelta();
      renderer.setAnimationLoop(() => renderFrame(Math.min(clock.getDelta(), 0.05)));
    };
    const stopLoop = () => {
      running = false;
      renderer.setAnimationLoop(null);
    };

    // Only animate while on screen and the tab is visible.
    let inView = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView && !document.hidden) startLoop();
        else stopLoop();
      },
      { threshold: 0.05 }
    );
    observer.observe(host);
    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else if (inView) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (!running) renderFrame(0);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    return () => {
      disposed = true;
      stopLoop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      envTexture.dispose();
      pmrem.dispose();
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of materials) {
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) value.dispose();
            }
            material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
