// robot.jsx
import { useGLTF, useAnimations, OrbitControls, Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect } from 'react'
import React from 'react'

function RobotModel(props) {
  const { scene, animations } = useGLTF('/3d_models/robot.glb')
  const { actions } = useAnimations(animations, scene)

  useEffect(() => {
    if (actions) {
      Object.values(actions).forEach((action) => {
        action.reset().fadeIn(0.5).play()
      })
    }
  }, [actions])

  return <primitive object={scene} {...props} />
}

// Main scene export
export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
      <ambientLight />
      <Environment preset="sunset" />
      <RobotModel />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  )
}
