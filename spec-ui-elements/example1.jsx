import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Utility to create a mini Three.js scene
const useMiniScene = (canvasRef, width, height, setupFn) => {
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        camera.position.z = 5;

        const cleanup = setupFn(scene, camera, renderer);

        let animationId;
        const clock = new THREE.Clock();

        const animate = () => {
            animationId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();
            cleanup?.update?.(elapsed);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            cleanup?.dispose?.();
            renderer.dispose();
        };
    }, [width, height]);
};

// Effect 1: Orbital Rings
const OrbitalRings = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;
        const rings = [];
        const colors = [0x00ffff, 0xff00ff, 0x00ff88];

        for (let i = 0; i < 3; i++) {
            const geometry = new THREE.TorusGeometry(1 + i * 0.3, 0.02, 16, 100);
            const material = new THREE.MeshBasicMaterial({
                color: colors[i],
                transparent: true,
                opacity: 0.8
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = Math.random() * Math.PI;
            ring.rotation.y = Math.random() * Math.PI;
            rings.push(ring);
            scene.add(ring);
        }

        // Center glow
        const glowGeo = new THREE.SphereGeometry(0.3, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        scene.add(glow);

        return {
            update: (t) => {
                rings.forEach((ring, i) => {
                    ring.rotation.x += 0.01 * (i + 1);
                    ring.rotation.y += 0.015 * (i + 1);
                });
                glow.scale.setScalar(1 + Math.sin(t * 3) * 0.2);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 2: Sparkle Burst
const SparkleBurst = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 5;
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            velocities.push({
                x: (Math.random() - 0.5) * 0.1,
                y: (Math.random() - 0.5) * 0.1,
                z: (Math.random() - 0.5) * 0.1,
                life: Math.random()
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffff88,
            size: 0.15,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        return {
            update: (t) => {
                const pos = geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    velocities[i].life += 0.02;
                    if (velocities[i].life > 1) {
                        velocities[i].life = 0;
                        pos[i * 3] = 0;
                        pos[i * 3 + 1] = 0;
                        pos[i * 3 + 2] = 0;
                        velocities[i].x = (Math.random() - 0.5) * 0.1;
                        velocities[i].y = (Math.random() - 0.5) * 0.1;
                        velocities[i].z = (Math.random() - 0.5) * 0.1;
                    }
                    pos[i * 3] += velocities[i].x;
                    pos[i * 3 + 1] += velocities[i].y;
                    pos[i * 3 + 2] += velocities[i].z;
                }
                geometry.attributes.position.needsUpdate = true;
                material.opacity = 0.5 + Math.sin(t * 5) * 0.3;
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 3: Neon Diamond
const NeonDiamond = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;

        const geometry = new THREE.OctahedronGeometry(1, 0);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.9
        });
        const wireframe = new THREE.LineSegments(edges, material);
        scene.add(wireframe);

        // Inner glow
        const innerGeo = new THREE.OctahedronGeometry(0.5, 0);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.3
        });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        scene.add(inner);

        return {
            update: (t) => {
                wireframe.rotation.y = t * 0.5;
                wireframe.rotation.x = Math.sin(t * 0.3) * 0.5;
                inner.rotation.y = -t * 0.7;
                inner.scale.setScalar(0.5 + Math.sin(t * 2) * 0.2);
                material.color.setHSL((t * 0.1) % 1, 1, 0.6);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 4: Pulse Rings (ripple)
const PulseRings = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 5;
        const rings = [];

        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.RingGeometry(0.1, 0.15, 64);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.userData.offset = i * 0.2;
            rings.push(ring);
            scene.add(ring);
        }

        return {
            update: (t) => {
                rings.forEach((ring, i) => {
                    const phase = (t + ring.userData.offset) % 1.5;
                    const scale = phase * 2;
                    ring.scale.setScalar(scale);
                    ring.material.opacity = Math.max(0, 1 - phase / 1.5);
                });
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 5: Star Cross
const StarCross = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;

        const createBeam = (rotZ) => {
            const geo = new THREE.PlaneGeometry(0.1, 3);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffaa,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const beam = new THREE.Mesh(geo, mat);
            beam.rotation.z = rotZ;
            return beam;
        };

        const beams = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4].map(createBeam);
        beams.forEach(b => scene.add(b));

        // Center
        const centerGeo = new THREE.CircleGeometry(0.2, 32);
        const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const center = new THREE.Mesh(centerGeo, centerMat);
        scene.add(center);

        return {
            update: (t) => {
                const pulse = 0.8 + Math.sin(t * 4) * 0.3;
                beams.forEach(b => {
                    b.scale.y = pulse;
                    b.material.opacity = 0.4 + Math.sin(t * 3) * 0.3;
                });
                center.scale.setScalar(0.8 + Math.sin(t * 5) * 0.2);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 6: Particle Vortex
const ParticleVortex = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 5;
        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        const angles = [];

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.5 + Math.random() * 1.5;
            angles.push({ angle, radius, speed: 0.02 + Math.random() * 0.03, y: (Math.random() - 0.5) * 2 });
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = angles[i].y;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xff66ff,
            size: 0.08,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        return {
            update: (t) => {
                const pos = geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    angles[i].angle += angles[i].speed;
                    pos[i * 3] = Math.cos(angles[i].angle) * angles[i].radius;
                    pos[i * 3 + 2] = Math.sin(angles[i].angle) * angles[i].radius;
                }
                geometry.attributes.position.needsUpdate = true;
                particles.rotation.y = t * 0.2;
                material.color.setHSL((t * 0.05) % 1, 1, 0.7);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 7: Hex Grid Pulse
const HexPulse = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;

        const shape = new THREE.Shape();
        const sides = 6;
        const radius = 0.8;
        for (let i = 0; i <= sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }

        const geometry = new THREE.ShapeGeometry(shape);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffaa,
            transparent: true,
            opacity: 0.9
        });
        const hex = new THREE.LineSegments(edges, material);
        scene.add(hex);

        // Inner hex
        const innerGeo = new THREE.ShapeGeometry(shape);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0x00ffaa,
            transparent: true,
            opacity: 0.1
        });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        inner.scale.setScalar(0.6);
        scene.add(inner);

        return {
            update: (t) => {
                hex.rotation.z = t * 0.3;
                inner.rotation.z = -t * 0.5;
                const pulse = 0.3 + Math.abs(Math.sin(t * 2)) * 0.4;
                inner.scale.setScalar(pulse);
                innerMat.opacity = 0.3 - pulse * 0.3;
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 8: DNA Helix
const DNAHelix = ({ size = 100, width, height }) => {
    const canvasRef = useRef();
    const w = width || size;
    const h = height || size;

    useMiniScene(canvasRef, w, h, (scene, camera) => {
        camera.position.z = 5;
        const points1 = [];
        const points2 = [];

        for (let i = 0; i < 50; i++) {
            const t = (i / 50) * Math.PI * 4;
            const y = (i / 50) * 4 - 2;
            points1.push(new THREE.Vector3(Math.cos(t) * 0.8, y, Math.sin(t) * 0.8));
            points2.push(new THREE.Vector3(Math.cos(t + Math.PI) * 0.8, y, Math.sin(t + Math.PI) * 0.8));
        }

        const curve1 = new THREE.CatmullRomCurve3(points1);
        const curve2 = new THREE.CatmullRomCurve3(points2);

        const geo1 = new THREE.TubeGeometry(curve1, 64, 0.05, 8, false);
        const geo2 = new THREE.TubeGeometry(curve2, 64, 0.05, 8, false);

        const mat1 = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
        const mat2 = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.8 });

        const helix1 = new THREE.Mesh(geo1, mat1);
        const helix2 = new THREE.Mesh(geo2, mat2);

        const group = new THREE.Group();
        group.add(helix1);
        group.add(helix2);
        scene.add(group);

        return {
            update: (t) => {
                group.rotation.y = t * 0.5;
                group.position.y = Math.sin(t) * 0.3;
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 9: Floating Cubes
const FloatingCubes = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 6;
        const cubes = [];
        const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88];

        for (let i = 0; i < 8; i++) {
            const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const edges = new THREE.EdgesGeometry(geo);
            const mat = new THREE.LineBasicMaterial({
                color: colors[i % 4],
                transparent: true,
                opacity: 0.8
            });
            const cube = new THREE.LineSegments(edges, mat);
            cube.position.set(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 2
            );
            cube.userData.offset = Math.random() * Math.PI * 2;
            cube.userData.speed = 0.5 + Math.random() * 0.5;
            cubes.push(cube);
            scene.add(cube);
        }

        return {
            update: (t) => {
                cubes.forEach(cube => {
                    cube.rotation.x = t * cube.userData.speed;
                    cube.rotation.y = t * cube.userData.speed * 0.7;
                    cube.position.y += Math.sin(t * 2 + cube.userData.offset) * 0.005;
                });
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 10: Energy Sphere
const EnergySphere = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;

        const geo = new THREE.IcosahedronGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        const sphere = new THREE.Mesh(geo, mat);
        scene.add(sphere);

        // Outer shell
        const outerGeo = new THREE.IcosahedronGeometry(1.3, 0);
        const outerMat = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        const outer = new THREE.Mesh(outerGeo, outerMat);
        scene.add(outer);

        return {
            update: (t) => {
                sphere.rotation.x = t * 0.3;
                sphere.rotation.y = t * 0.5;
                outer.rotation.x = -t * 0.2;
                outer.rotation.y = -t * 0.3;
                const pulse = 1 + Math.sin(t * 3) * 0.1;
                sphere.scale.setScalar(pulse);
                mat.color.setHSL((t * 0.1) % 1, 1, 0.6);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 11: Lightning Arc
const LightningArc = ({ size = 100, width, height }) => {
    const canvasRef = useRef();
    const w = width || size;
    const h = height || size;

    useMiniScene(canvasRef, w, h, (scene, camera) => {
        camera.position.z = 4;

        let line;
        const material = new THREE.LineBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.9
        });

        const generateBolt = () => {
            if (line) scene.remove(line);

            const points = [];
            let x = -1.5, y = 0;
            points.push(new THREE.Vector3(x, y, 0));

            while (x < 1.5) {
                x += 0.2 + Math.random() * 0.3;
                y += (Math.random() - 0.5) * 0.8;
                points.push(new THREE.Vector3(Math.min(x, 1.5), y, 0));
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            line = new THREE.Line(geometry, material);
            scene.add(line);
        };

        generateBolt();
        let lastGen = 0;

        return {
            update: (t) => {
                if (t - lastGen > 0.15) {
                    generateBolt();
                    lastGen = t;
                }
                material.opacity = 0.5 + Math.random() * 0.5;
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 12: Morphing Shape
const MorphShape = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;

        const geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        return {
            update: (t) => {
                mesh.rotation.x = t * 0.3;
                mesh.rotation.y = t * 0.5;
                const scale = 1 + Math.sin(t * 2) * 0.15;
                mesh.scale.setScalar(scale);
                material.color.setHSL((t * 0.08) % 1, 1, 0.55);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 13: Data Stream
const DataStream = ({ size = 100, width, height }) => {
    const canvasRef = useRef();
    const w = width || size;
    const h = height || size * 2;

    useMiniScene(canvasRef, w, h, (scene, camera) => {
        camera.position.z = 5;
        const lines = [];

        for (let i = 0; i < 12; i++) {
            const points = [];
            const x = (i / 12) * 4 - 2;
            for (let j = 0; j < 20; j++) {
                points.push(new THREE.Vector3(x, j * 0.3 - 3, 0));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.PointsMaterial({
                color: 0x00ff88,
                size: 0.1,
                transparent: true,
                opacity: 0.8
            });
            const line = new THREE.Points(geo, mat);
            line.userData.offset = Math.random() * 10;
            lines.push(line);
            scene.add(line);
        }

        return {
            update: (t) => {
                lines.forEach(line => {
                    const positions = line.geometry.attributes.position.array;
                    for (let i = 0; i < positions.length; i += 3) {
                        positions[i + 1] -= 0.05;
                        if (positions[i + 1] < -3) positions[i + 1] = 3;
                    }
                    line.geometry.attributes.position.needsUpdate = true;
                    line.material.opacity = 0.5 + Math.sin(t * 3 + line.userData.offset) * 0.3;
                });
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 14: Nebula Cloud
const NebulaCloud = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 3;
        const particles = [];

        for (let i = 0; i < 200; i++) {
            const geo = new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 8, 8);
            const hue = 0.7 + Math.random() * 0.2;
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(hue, 1, 0.6),
                transparent: true,
                opacity: 0.4 + Math.random() * 0.4
            });
            const particle = new THREE.Mesh(geo, mat);

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = 0.5 + Math.random() * 1;

            particle.position.set(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
            particle.userData.originalPos = particle.position.clone();
            particles.push(particle);
            scene.add(particle);
        }

        return {
            update: (t) => {
                particles.forEach((p, i) => {
                    const offset = i * 0.01;
                    p.position.x = p.userData.originalPos.x + Math.sin(t + offset) * 0.05;
                    p.position.y = p.userData.originalPos.y + Math.cos(t * 0.7 + offset) * 0.05;
                });
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Effect 15: Quantum Dot
const QuantumDot = ({ size = 25 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 3;

        const geo = new THREE.SphereGeometry(0.4, 32, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const dot = new THREE.Mesh(geo, mat);
        scene.add(dot);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(0.5, 0.7, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        scene.add(ring);

        return {
            update: (t) => {
                const pulse = 0.8 + Math.sin(t * 4) * 0.2;
                dot.scale.setScalar(pulse);
                ring.scale.setScalar(1 + Math.sin(t * 3) * 0.3);
                ring.material.opacity = 0.3 + Math.sin(t * 5) * 0.2;
                mat.color.setHSL((t * 0.2) % 1, 0.5, 0.9);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Main Gallery Component
export default function NeonEffectsGallery() {
    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <h1 className="text-2xl font-light text-cyan-400 mb-8 tracking-wider">
                NEON EFFECTS
            </h1>

            <div className="flex flex-wrap gap-4">
                {/* 25x25 tiny effects */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-500">25×25</span>
                    <div className="flex gap-2">
                        <QuantumDot size={25} />
                        <QuantumDot size={25} />
                        <QuantumDot size={25} />
                        <QuantumDot size={25} />
                    </div>
                </div>

                {/* 50x50 effects */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-500">50×50</span>
                    <div className="flex flex-wrap gap-2" style={{ maxWidth: 220 }}>
                        <OrbitalRings size={50} />
                        <SparkleBurst size={50} />
                        <NeonDiamond size={50} />
                        <PulseRings size={50} />
                        <StarCross size={50} />
                        <ParticleVortex size={50} />
                        <HexPulse size={50} />
                        <EnergySphere size={50} />
                    </div>
                </div>

                {/* 100x100 effects */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-500">100×100</span>
                    <div className="flex flex-wrap gap-2" style={{ maxWidth: 320 }}>
                        <OrbitalRings size={100} />
                        <SparkleBurst size={100} />
                        <NeonDiamond size={100} />
                        <ParticleVortex size={100} />
                        <MorphShape size={100} />
                        <NebulaCloud size={100} />
                        <FloatingCubes size={100} />
                        <EnergySphere size={100} />
                    </div>
                </div>

                {/* 50x100 tall effects */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-500">50×100</span>
                    <div className="flex gap-2">
                        <DNAHelix width={50} height={100} />
                        <DataStream width={50} height={100} />
                        <LightningArc width={50} height={100} />
                    </div>
                </div>

                {/* 100x50 wide effects */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-500">100×50</span>
                    <div className="flex flex-col gap-2">
                        <LightningArc width={100} height={50} />
                    </div>
                </div>
            </div>

            <div className="mt-8 border-t border-gray-800 pt-8">
                <h2 className="text-lg text-gray-400 mb-4">Featured (200×200)</h2>
                <div className="flex flex-wrap gap-4">
                    <OrbitalRings size={200} />
                    <ParticleVortex size={200} />
                    <NebulaCloud size={200} />
                    <MorphShape size={200} />
                </div>
            </div>
        </div>
    );
}