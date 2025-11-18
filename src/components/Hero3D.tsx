import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Sphere } from '@react-three/drei';
import { Suspense } from 'react';

function FloatingCar() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh position={[2, 0, 0]}>
        <boxGeometry args={[1.5, 0.8, 3]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[2.4, 0.5, 0.8]}>
        <boxGeometry args={[0.8, 0.6, 1.2]} />
        <meshStandardMaterial color="#60a5fa" metalness={0.6} roughness={0.3} transparent opacity={0.8} />
      </mesh>
    </Float>
  );
}

function FloatingSphere({ position, color, speed }: { position: [number, number, number], color: string, speed: number }) {
  return (
    <Float speed={speed} rotationIntensity={0.3} floatIntensity={0.8}>
      <Sphere args={[0.8, 32, 32]} position={position}>
        <MeshDistortMaterial color={color} speed={2} distort={0.3} radius={1} />
      </Sphere>
    </Float>
  );
}

export const Hero3D = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
          
          <FloatingCar />
          <FloatingSphere position={[-3, 2, -2]} color="#8b5cf6" speed={1.5} />
          <FloatingSphere position={[-2, -2, -1]} color="#3b82f6" speed={2} />
          <FloatingSphere position={[3, -1, -3]} color="#06b6d4" speed={1.8} />
          
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
