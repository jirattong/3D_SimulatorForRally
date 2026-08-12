import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

// ==========================================
// 🌟 Particle Effect (เมื่อยิงเข้าห่วง)
// ==========================================
function ScoreEffect({ position, onComplete }) {
  const groupRef = useRef()
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map(() => ({
      position: [0, 0, 0],
      velocity: [
        (Math.random() - 0.5) * 0.4,
        (Math.random() * 0.4) + 0.2,
        (Math.random() - 0.5) * 0.4
      ],
      scale: Math.random() * 0.3 + 0.1
    }))
  }, [])

  useFrame((_, delta) => {
    let allDead = true
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const p = particles[i]
        p.velocity[1] -= 0.8 * delta // Gravity
        child.position.x += p.velocity[0]
        child.position.y += p.velocity[1]
        child.position.z += p.velocity[2]
        child.material.opacity -= 1.5 * delta
        child.scale.setScalar(Math.max(0, child.scale.x - 0.5 * delta))
        if (child.material.opacity > 0) allDead = false
      })
    }
    if (allDead) onComplete()
  })

  return (
    <group ref={groupRef} position={position}>
      {particles.map((p, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={1} />
        </mesh>
      ))}
    </group>
  )
}

function ShuttlecockItem({ position, rotation }) {
  const { scene } = useGLTF('/shuttlecock.glb')
  const clonedScene = useMemo(() => scene.clone(), [scene])

  return (
    <group position={position} rotation={rotation} scale={1}>
      <primitive object={clonedScene} />
    </group>
  )
}

function Projectiles({ projectiles }) {
  return (
    <>
      {projectiles.map((p) => (
        <ShuttlecockItem key={p.id} position={p.position} rotation={p.rotation} />
      ))}
    </>
  )
}

// ==========================================
// 🏀 โมเดลห่วงบาส 
// ==========================================
function BasketballHoopA({ position, rotation }) {
  const { scene } = useGLTF('/basketball_hoop.glb')
  const clonedScene = useMemo(() => scene.clone(), [scene])
  return (
    <group position={position} rotation={rotation} scale={1.5}>
      <primitive object={clonedScene} />
    </group>
  )
}
function BasketballHoopB({ position, rotation }) {
  const { scene } = useGLTF('/basketball_hoop.glb')
  const clonedScene = useMemo(() => scene.clone(), [scene])
  return (
    <group position={position} rotation={rotation} scale={1.25}>
      <primitive object={clonedScene} />
    </group>
  )
}
function BasketballHoopC({ position, rotation }) {
  const { scene } = useGLTF('/basketball_hoop.glb')
  const clonedScene = useMemo(() => scene.clone(), [scene])
  return (
    <group position={position} rotation={rotation} scale={1}>
      <primitive object={clonedScene} />
    </group>
  )
}

// ==========================================
// ⚙️ เมนหลัก: Turret3D
// ==========================================
export default function Turret3D({ commandEvent, onScore }) {
  const { nodes, materials } = useGLTF('/turret.glb')
  const { scene: courtScene } = useGLTF('/tennis-court_2.glb')
  
  const yawRef = useRef()
  const pitchRef = useRef()
  const muzzleRef = useRef()
  const controlsRef = useRef() 

  const targetYaw = useRef(0)
  const targetPitch = useRef(0)

  const [projectiles, setProjectiles] = useState([])
  const [effects, setEffects] = useState([])

  const hoopsData = [
    { id: 1, pos: new THREE.Vector3(20, 5.0, -12.5), radius: 3.5 }, // A: ซ้ายสุด (Scale 1.5)
    { id: 2, pos: new THREE.Vector3(33, 4.0, 0),     radius: 3.0 }, // B: ตรงกลาง (Scale 1.25)
    { id: 3, pos: new THREE.Vector3(4.6, 2.9, 15.5),   radius: 2.5 }, // C: ขวาสุด (Scale 1)
  ]

  useEffect(() => {
    if (!commandEvent || !commandEvent.cmd || commandEvent.cmd === 'IDLE') return
    const cmd = String(commandEvent.cmd).toUpperCase()

    if (cmd.includes('LEFT') || cmd === 'ROTATE_LEFT') {
      targetYaw.current += 0.25 
    } else if (cmd.includes('RIGHT') || cmd === 'ROTATE_RIGHT') {
      targetYaw.current -= 0.25 
    } else if (cmd.includes('UP') || cmd === 'PITCH_UP') {
      targetPitch.current = Math.min(targetPitch.current + 0.15, 0.6) 
    } else if (cmd.includes('DOWN') || cmd === 'PITCH_DOWN') {
      targetPitch.current = Math.max(targetPitch.current - 0.15, -0.2) 
    } else if (cmd.includes('SHOOT') || cmd.includes('FIRE') || cmd.includes('SWIPE')) {
      fireShuttlecock()
    } else if (cmd === 'RESET_TURRET') {
      targetYaw.current = 0
      targetPitch.current = 0
    } else if (cmd === 'RESET_CAMERA') {
      // ✅ ดึงกล้องกลับไปมุม Default (หลังปืน)
      if (controlsRef.current) {
        controlsRef.current.object.position.set(-45, 15, 0)
        controlsRef.current.target.set(0, 0, 0)
        controlsRef.current.update()
      }
    }
  }, [commandEvent])

  const fireShuttlecock = () => {
    if (!muzzleRef.current) return

    const spawnPosition = new THREE.Vector3()
    muzzleRef.current.getWorldPosition(spawnPosition)

    const direction = new THREE.Vector3(0, 0, 1)
    direction.transformDirection(muzzleRef.current.matrixWorld).normalize()

    const speed = 0.48
    const yaw = targetYaw.current
    const pitch = targetPitch.current

    setProjectiles((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        position: [spawnPosition.x, spawnPosition.y, spawnPosition.z],
        velocity: [direction.x * speed, direction.y * speed, direction.z * speed],
        rotation: [-pitch, yaw, 0],
        life: 0,
        scored: false 
      }
    ])
  }

  useFrame((state, delta) => {
    if (yawRef.current) {
      yawRef.current.rotation.y = THREE.MathUtils.lerp(yawRef.current.rotation.y, targetYaw.current, 0.15)
    }
    if (pitchRef.current) {
      pitchRef.current.rotation.x = THREE.MathUtils.lerp(pitchRef.current.rotation.x, -targetPitch.current, 0.15)
    }

    const gravity = 0.4 
    setProjectiles((prev) =>
      prev
        .map((p) => {
          if (p.scored) return p 

          const newVy = p.velocity[1] - gravity * delta
          const newPos = [
            p.position[0] + p.velocity[0],
            p.position[1] + newVy,
            p.position[2] + p.velocity[2]
          ]
          
          const currentPitch = Math.atan2(newVy, Math.hypot(p.velocity[0], p.velocity[2]))
          const currentVec = new THREE.Vector3(newPos[0], newPos[1], newPos[2])

          let hasScored = false
          hoopsData.forEach(hoop => {
            if (currentVec.distanceTo(hoop.pos) < hoop.radius) {
              hasScored = true
              setEffects(e => [...e, { id: Date.now(), pos: [hoop.pos.x, hoop.pos.y, hoop.pos.z] }])
              // ✅ ส่งสัญญาณกลับไปบอก App ว่ายิงเข้าห่วงไหน
              if (onScore) onScore(hoop.id)
            }
          })

          return {
            ...p,
            position: newPos,
            velocity: [p.velocity[0], newVy, p.velocity[2]],
            rotation: [currentPitch, p.rotation[1], 0],
            life: p.life + delta,
            scored: hasScored
          }
        })
        .filter((p) => p.position[1] > -1.55 && p.life < 8.0 && !p.scored) 
    )
  })

  const removeEffect = (id) => {
    setEffects(prev => prev.filter(e => e.id !== id))
  }

  if (!nodes) return null
  const safeMaterial = materials?.Material || Object.values(materials || {})[0]

  const baseMeshes = []
  const yawMeshes = []
  const pitchMeshes = []

  Object.keys(nodes).forEach((key) => {
    const node = nodes[key]
    if (node.isMesh) {
      if (key === 'Cylinder') baseMeshes.push(node)
      else if (key === 'Cylinder.001') yawMeshes.push(node)
      else pitchMeshes.push(node)
    }
  })

  return (
    <>
      <fog attach="fog" args={['#0f1117', 70, 200]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow />
      <pointLight position={[-10, 8, -5]} intensity={0.5} color="#00aaff" />

      {courtScene && (
        <primitive object={courtScene} position={[0, -1.51, 0]} scale={2} rotation={[0, Math.PI / 2, 0]} />
      )}

      {/* ห่วงบาส */}
      <BasketballHoopA position={[20, -1.25, -12]} rotation={[0,3.4, 0]} /> 
      <BasketballHoopB position={[33, -1.25, 0]}     rotation={[0, -Math.PI, 0]} /> 
      <BasketballHoopC position={[4.6, -1.25, 15.5]}  rotation={[0, -3.55, 0]} /> 
      
      {/* ปืน */}
      <group position={[-25, -1.5, 0]} scale={1.5} rotation={[0, Math.PI / 2, 0]}>
        {baseMeshes.map(node => <mesh key={node.name} geometry={node.geometry} material={safeMaterial} position={node.position} rotation={node.rotation} scale={node.scale} />)}
        <group ref={yawRef}>
          {yawMeshes.map(node => <mesh key={node.name} geometry={node.geometry} material={safeMaterial} position={node.position} rotation={node.rotation} scale={node.scale} />)}
          <group ref={pitchRef} position={[0, 2.4, 0]}>
            <group position={[0, -2.4, 0]}>
              {pitchMeshes.map(node => <mesh key={node.name} geometry={node.geometry} material={safeMaterial} position={node.position} rotation={node.rotation} scale={node.scale} />)}
            </group>
            <group ref={muzzleRef} position={[0, 0, 2.8]} />
          </group>
        </group>
      </group>

      <Projectiles projectiles={projectiles} />
      {effects.map(e => <ScoreEffect key={e.id} position={e.pos} onComplete={() => removeEffect(e.id)} />)}

      <ContactShadows position={[0, -1.49, 0]} opacity={0.6} scale={30} blur={1.5} far={1.5} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.53, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0f1117" roughness={0.9} />
      </mesh>

      <OrbitControls ref={controlsRef} makeDefault minDistance={2} maxDistance={200} maxPolarAngle={Math.PI / 2 - 0.02} />
      <Environment preset="city" />
    </>
  )
}

useGLTF.preload('/turret.glb')
useGLTF.preload('/shuttlecock.glb')
useGLTF.preload('/tennis-court_2.glb')
useGLTF.preload('/basketball_hoop.glb')