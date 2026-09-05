"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeDLoopProps {
  variant?: "knot" | "traveler";
}

export default function ThreeDLoop({ variant = "knot" }: ThreeDLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const shouldAnimate = !mediaQuery.matches;

    const container = containerRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    // Create scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6366F1, 2.5, 100);
    pointLight1.position.set(6, 6, 6);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xF59E0B, 2, 100);
    pointLight2.position.set(-6, -6, 4);
    scene.add(pointLight2);

    let animationId: number;
    let mainLoopMesh: THREE.Mesh | null = null;
    const symbolGroup: THREE.Group = new THREE.Group();
    scene.add(symbolGroup);

    // 1. Dollar ($) / Gold Coin Mesh (Cylinder)
    const dollarCoinGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 32);
    const dollarCoinMat = new THREE.MeshPhongMaterial({
      color: 0xF59E0B,
      emissive: 0xD97706,
      emissiveIntensity: 0.35,
      shininess: 100,
    });
    const dollarCoinMesh = new THREE.Mesh(dollarCoinGeo, dollarCoinMat);

    // 2. Rupee (₹) Silver/Gold Dual-Tone Currency Disc (Cylinder + Ring)
    const rupeeCoinGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 32);
    const rupeeCoinMat = new THREE.MeshPhongMaterial({
      color: 0xEC4899,
      emissive: 0xDB2777,
      emissiveIntensity: 0.35,
      shininess: 90,
    });
    const rupeeCoinMesh = new THREE.Mesh(rupeeCoinGeo, rupeeCoinMat);

    // 3. 3D Banknote / Money Bill Note (Box)
    const billGeo = new THREE.BoxGeometry(0.44, 0.24, 0.02);
    const billMat = new THREE.MeshPhongMaterial({
      color: 0x10B981,
      emissive: 0x059669,
      emissiveIntensity: 0.4,
      shininess: 80,
    });
    const billMesh = new THREE.Mesh(billGeo, billMat);

    // 4. Payment Credit Card Mesh (Box)
    const cardGeo = new THREE.BoxGeometry(0.36, 0.22, 0.04);
    const cardMat = new THREE.MeshPhongMaterial({
      color: 0x6366F1,
      emissive: 0x4F46E5,
      emissiveIntensity: 0.4,
      shininess: 80,
    });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);

    // 5. Financial Protection Shield Mesh (Octahedron)
    const shieldGeo = new THREE.OctahedronGeometry(0.22, 0);
    const shieldMat = new THREE.MeshPhongMaterial({
      color: 0x38BDF8,
      emissive: 0x0284C7,
      emissiveIntensity: 0.4,
      shininess: 90,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);

    const domainSymbols = [dollarCoinMesh, rupeeCoinMesh, billMesh, cardMesh, shieldMesh];
    domainSymbols.forEach((sym) => symbolGroup.add(sym));

    if (variant === "knot") {
      // Main 3D Continuous Loop
      const geometry = new THREE.TorusKnotGeometry(1.35, 0.32, 140, 18);
      const material = new THREE.MeshPhongMaterial({
        color: 0x6366F1,
        shininess: 100,
        transparent: true,
        opacity: 0.65,
        wireframe: true,
      });
      mainLoopMesh = new THREE.Mesh(geometry, material);
      scene.add(mainLoopMesh);

      camera.position.z = 4.4;
    } else {
      const geometry = new THREE.TorusGeometry(1.6, 0.25, 30, 100);
      const material = new THREE.MeshPhongMaterial({
        color: 0x4F46E5,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      mainLoopMesh = new THREE.Mesh(geometry, material);
      scene.add(mainLoopMesh);

      camera.position.z = 5.0;
    }

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (shouldAnimate) {
        // Controlled, elegant slow spin rate (0.0003 speed factor)
        const time = Date.now() * 0.0003;

        if (mainLoopMesh) {
          mainLoopMesh.rotation.x = time * 0.35;
          mainLoopMesh.rotation.y = time * 0.45;
          mainLoopMesh.rotation.z = time * 0.15;
        }

        // Orbit the currency money objects (Dollar coin, Rupee coin, Money note, Card, Shield)
        domainSymbols.forEach((sym, i) => {
          const offset = i * ((Math.PI * 2) / domainSymbols.length);
          const angle = time * 0.7 + offset;
          const radiusX = 2.2;
          const radiusY = 1.3;

          sym.position.x = Math.sin(angle) * radiusX;
          sym.position.y = Math.cos(angle) * radiusY;
          sym.position.z = Math.sin(angle * 2) * 0.8;

          sym.rotation.x += 0.015;
          sym.rotation.y += 0.02;
        });

        scene.rotation.y = time * 0.04;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  return <div ref={containerRef} className="w-full h-full min-h-[320px] bg-transparent" />;
}
