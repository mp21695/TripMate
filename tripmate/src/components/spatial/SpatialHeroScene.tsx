'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface SpatialHeroSceneProps {
  className?: string;
}

export function SpatialHeroScene({ className = '' }: SpatialHeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect WebGL
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setIsWebGLSupported(false);
        return;
      }
    } catch {
      setIsWebGLSupported(false);
      return;
    }

    // 1. Scene, Camera, Renderer
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08090a, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. 3D Spatial Travel Globe / Coordinate Core
    const globeRadius = 5.2;
    const globeGroup = new THREE.Group();
    globeGroup.position.set(3.8, -0.6, -2); // Positioned slightly to the right to frame typography
    scene.add(globeGroup);

    // Subtle dark wireframe sphere
    const wireframeGeo = new THREE.SphereGeometry(globeRadius, 28, 24);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x181a1f,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const globeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
    globeGroup.add(globeMesh);

    // Inner subtle glow core
    const innerCoreGeo = new THREE.SphereGeometry(globeRadius * 0.96, 24, 20);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x0c0e12,
      transparent: true,
      opacity: 0.9,
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    globeGroup.add(innerCore);

    // Longitude / Latitude Rings (amber accents)
    const ringMat = new THREE.LineBasicMaterial({
      color: 0xffb000,
      transparent: true,
      opacity: 0.25,
    });

    for (let i = -2; i <= 2; i++) {
      const ringGeo = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      const lat = (i * Math.PI) / 6;
      const r = Math.cos(lat) * (globeRadius + 0.02);
      const y = Math.sin(lat) * (globeRadius + 0.02);
      for (let j = 0; j <= 64; j++) {
        const theta = (j / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
      }
      ringGeo.setFromPoints(points);
      const ring = new THREE.Line(ringGeo, ringMat);
      globeGroup.add(ring);
    }

    // 3. Indian & Global Waypoint Coordinates in 3D Space
    // (Lat, Lng converted to spherical coordinates)
    const waypoints = [
      { name: 'DELHI', lat: 28.6139, lng: 77.209 },
      { name: 'JAIPUR', lat: 26.9124, lng: 75.7873 },
      { name: 'GOA', lat: 15.2993, lng: 74.124 },
      { name: 'SPITI', lat: 32.2276, lng: 78.071 },
      { name: 'KERALA', lat: 9.9312, lng: 76.2673 },
      { name: 'MEGHALAYA', lat: 25.5788, lng: 91.8933 },
    ];

    const latLngToVector3 = (lat: number, lng: number, radius: number) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    };

    const nodePositions: THREE.Vector3[] = [];
    const nodeMeshes: THREE.Mesh[] = [];

    const nodeGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffb000 });

    const ringPulseGeo = new THREE.RingGeometry(0.12, 0.22, 24);
    const ringPulseMat = new THREE.MeshBasicMaterial({
      color: 0xffb000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });

    waypoints.forEach((wp) => {
      const pos = latLngToVector3(wp.lat, wp.lng, globeRadius + 0.05);
      nodePositions.push(pos);

      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.copy(pos);
      globeGroup.add(node);
      nodeMeshes.push(node);

      // Pulsing beacon ring
      const ring = new THREE.Mesh(ringPulseGeo, ringPulseMat.clone());
      ring.position.copy(pos);
      ring.lookAt(pos.clone().multiplyScalar(2));
      globeGroup.add(ring);
    });

    // 4. Glowing Amber Travel Route Arcs (Bezier curves connecting cities)
    const routeMat = new THREE.LineBasicMaterial({
      color: 0xffb000,
      transparent: true,
      opacity: 0.75,
      linewidth: 1,
    });

    const createArc = (start: THREE.Vector3, end: THREE.Vector3) => {
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const distance = start.distanceTo(end);
      mid.normalize().multiplyScalar(globeRadius + distance * 0.45);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(40);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return new THREE.Line(geometry, routeMat);
    };

    // Draw Route Connections (Delhi -> Jaipur -> Goa -> Kerala -> Spiti)
    if (nodePositions.length >= 5) {
      globeGroup.add(createArc(nodePositions[0], nodePositions[1])); // Delhi -> Jaipur
      globeGroup.add(createArc(nodePositions[1], nodePositions[2])); // Jaipur -> Goa
      globeGroup.add(createArc(nodePositions[2], nodePositions[4])); // Goa -> Kerala
      globeGroup.add(createArc(nodePositions[0], nodePositions[3])); // Delhi -> Spiti
      globeGroup.add(createArc(nodePositions[0], nodePositions[5])); // Delhi -> Meghalaya
    }

    // 5. Atmospheric Floating Dust / Star Particles
    const particleCount = 260;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      particlePositions[i3] = (Math.random() - 0.5) * 32;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 20;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 24;
      particleScales[i] = Math.random() * 0.8 + 0.2;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xffb000,
      size: 0.045,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Smooth Mouse Parallax Tracking
    let targetX = 0;
    let targetY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 2.5;
      targetY = -y * 2.0;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 7. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth mouse easing (lerp)
      mouseX += (targetX - mouseX) * 0.04;
      mouseY += (targetY - mouseY) * 0.04;

      // Camera parallax
      camera.position.x = mouseX * 2.0;
      camera.position.y = mouseY * 1.5;
      camera.lookAt(0, 0, 0);

      // Globe gentle rotation + mouse tilt
      globeGroup.rotation.y = elapsed * 0.05 + mouseX * 0.4;
      globeGroup.rotation.x = 0.25 + mouseY * 0.25;

      // Atmospheric drift
      particles.rotation.y = elapsed * 0.015;
      particles.rotation.x = elapsed * 0.008;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  if (!isWebGLSupported) {
    return (
      <div className={`absolute inset-0 pointer-events-none ${className}`}>
        <div className="absolute inset-0 bg-[radial-gradient(#ffb000_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}
      style={{ zIndex: 1 }}
    />
  );
}
