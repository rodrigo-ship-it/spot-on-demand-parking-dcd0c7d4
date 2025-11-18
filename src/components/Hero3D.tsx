import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Sphere } from '@react-three/drei';
import { Suspense } from 'react';

function FloatingCar() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group position={[2, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.5, 0.8, 3]} />
          <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.4, 0.5, 0.8]}>
          <boxGeometry args={[0.8, 0.6, 1.2]} />
          <meshStandardMaterial color="#fb923c" metalness={0.6} roughness={0.3} transparent opacity={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

function FloatingSphere({ position, color, speed }: { position: [number, number, number], color: string, speed: number }) {
  return (
    <Float speed={speed} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh position={position}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <MeshDistortMaterial color={color} speed={2} distort={0.3} />
      </mesh>
    </Float>
  );
}

export const Hero3D = () => {
  return (
    <div className="absolute inset-0 -z-10 opacity-60">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
          
          <FloatingCar />
          <FloatingSphere position={[-3, 2, -2]} color="#f97316" speed={1.5} />
          <FloatingSphere position={[-2, -2, -1]} color="#3b82f6" speed={2} />
          <FloatingSphere position={[3, -1, -3]} color="#fb923c" speed={1.8} />
          
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
