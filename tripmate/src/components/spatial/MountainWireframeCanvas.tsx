'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MountainWireframeCanvasProps {
  className?: string;
}

export function MountainWireframeCanvas({ className = '' }: MountainWireframeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060709, 0.038);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
    // Initial camera position looking across the low-poly peak
    camera.position.set(0, 7.5, 26);
    camera.lookAt(0, 2.5, 0);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060709, 1);
    container.appendChild(renderer.domElement);

    // =========================================================================
    // 1. TERRAIN SYNTHESIS: Low-Poly Mountain Peak & Ridges
    // =========================================================================
    const gridX = 48;
    const gridZ = 48;
    const planeSize = 58;

    const baseGeometry = new THREE.PlaneGeometry(planeSize, planeSize, gridX, gridZ);
    baseGeometry.rotateX(-Math.PI / 2);

    const posAttr = baseGeometry.attributes.position;
    const vertexCount = posAttr.count;
    const originalHeights = new Float32Array(vertexCount);

    // Pseudo Perlin / Multi-octave mountain peak formula
    for (let i = 0; i < vertexCount; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      // Distance from mountain center
      const d = Math.sqrt(vx * vx + vz * vz);
      const distFromRidge = Math.abs(vz - vx * 0.25);

      // Main pyramid mountain peak
      const peak = Math.max(0, 9.5 - d * 0.42);
      // Secondary crags and ridges
      const ridge1 = Math.sin(vx * 0.35) * Math.cos(vz * 0.35) * 2.2;
      const ridge2 = Math.sin(vx * 0.7 + vz * 0.5) * 1.2;
      const sharpCrest = Math.exp(-distFromRidge * 0.3) * 3.2;

      // Steep drop-off towards camera in foreground
      const frontFade = vz > 10 ? Math.max(0, 1 - (vz - 10) / 12) : 1;

      let h = (peak + ridge1 + ridge2 + sharpCrest) * frontFade;
      if (h < 0) h = 0;

      posAttr.setY(i, h);
      originalHeights[i] = h;
    }
    baseGeometry.computeVertexNormals();

    // Base Charcoal Matte Solid Facets (Dark Underneath)
    const facetMaterial = new THREE.MeshStandardMaterial({
      color: 0x07090c,
      roughness: 0.88,
      metalness: 0.12,
      flatShading: true,
      transparent: true,
      opacity: 0.94,
    });
    const mountainMesh = new THREE.Mesh(baseGeometry, facetMaterial);
    scene.add(mountainMesh);

    // =========================================================================
    // 2. CHROMATIC ABERRATION WIREFRAME RIDGES (Cyan, White & Orange/Red)
    // =========================================================================
    // Main Crisp Warm-White Wireframe
    const mainWireMat = new THREE.MeshBasicMaterial({
      color: 0xeae6dc,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const mainWireMesh = new THREE.Mesh(baseGeometry, mainWireMat);
    scene.add(mainWireMesh);

    // Cyan chromatic aberration fringe (offset slightly left/down)
    const cyanWireMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.42,
    });
    const cyanWireMesh = new THREE.Mesh(baseGeometry, cyanWireMat);
    cyanWireMesh.position.set(-0.045, 0.02, 0.02);
    scene.add(cyanWireMesh);

    // Red/Orange chromatic aberration fringe (offset slightly right/up)
    const orangeWireMat = new THREE.MeshBasicMaterial({
      color: 0xff3b14,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const orangeWireMesh = new THREE.Mesh(baseGeometry, orangeWireMat);
    orangeWireMesh.position.set(0.045, -0.02, -0.02);
    scene.add(orangeWireMesh);

    // =========================================================================
    // 3. LIGHTING (Rim light on ridges + ambient glow)
    // =========================================================================
    const ambientLight = new THREE.AmbientLight(0x1a1d24, 1.2);
    scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
    rimLight.position.set(0, 18, -12);
    scene.add(rimLight);

    const blueRimLight = new THREE.DirectionalLight(0x00d4ff, 1.4);
    blueRimLight.position.set(-15, 10, -5);
    scene.add(blueRimLight);

    // =========================================================================
    // 4. MOUSE TRACKING & PARALLAX LERP
    // =========================================================================
    const mouse = { x: 0, y: 0 };
    const targetCamera = { x: 0, y: 7.5, z: 26 };
    const curCamera = { x: 0, y: 7.5, z: 26 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      mouse.x = Math.max(-1, Math.min(1, normX));
      mouse.y = Math.max(-1, Math.min(1, normY));

      // Parallax camera orbit target
      targetCamera.x = mouse.x * 6.5;
      targetCamera.y = 7.5 + mouse.y * 3.2;
      // Slight zoom forward on hover near center
      targetCamera.z = 26 - Math.abs(mouse.y) * 1.8;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // =========================================================================
    // 5. ANIMATION LOOP (LERPED CAMERA & VERTEX DISPLACEMENT RIPPLE)
    // =========================================================================
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Fluid damped camera interpolation (lerp)
      curCamera.x += (targetCamera.x - curCamera.x) * 0.05;
      curCamera.y += (targetCamera.y - curCamera.y) * 0.05;
      curCamera.z += (targetCamera.z - curCamera.z) * 0.05;

      camera.position.set(curCamera.x, curCamera.y, curCamera.z);
      camera.lookAt(0, 2.6 + mouse.y * 0.8, 0);

      // Map normalized cursor (-1 to 1) into terrain space (X: -18 to 18, Z: -12 to 12)
      const cursorTerrainX = mouse.x * 18;
      const cursorTerrainZ = -mouse.y * 14;

      // Real-time vertex ripple & organic elevation lift near cursor
      const pos = baseGeometry.attributes.position;
      const radius = 9.0;

      for (let i = 0; i < vertexCount; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        const baseH = originalHeights[i];

        const dx = vx - cursorTerrainX;
        const dz = vz - cursorTerrainZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        let dynamicLift = 0;
        if (dist < radius) {
          const factor = 1 - dist / radius;
          // Smooth bell curve elevation lift
          const lift = factor * factor * 2.2;
          // Organic shockwave / harmonic ripple wave radiating outwards
          const wave = Math.sin(dist * 1.8 - elapsed * 3.5) * factor * 0.8;
          dynamicLift = lift + wave;
        }

        // Ambient low-frequency breathing breeze
        const ambientBreath = Math.sin(vx * 0.25 + vz * 0.25 + elapsed * 1.2) * 0.14;

        pos.setY(i, baseH + dynamicLift + ambientBreath);
      }

      pos.needsUpdate = true;
      baseGeometry.computeVertexNormals();

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      baseGeometry.dispose();
      facetMaterial.dispose();
      mainWireMat.dispose();
      cyanWireMat.dispose();
      orangeWireMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
    >
      {/* Cinematic Horizon Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050607] via-transparent to-transparent pointer-events-none opacity-80" />
      <div className="absolute inset-0 cinematic-vignette pointer-events-none" />
      <div className="film-grain" />
    </div>
  );
}
