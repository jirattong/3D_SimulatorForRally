import React, { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ref, onValue, update } from 'firebase/database'
import { db } from './firebase'
import Turret3D from './components/Turret3D'
import {
  Activity, Wifi, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  Zap, RotateCcw, ChevronLeft, Menu, Trash2, Clock, Settings, Trophy, Camera, Target, Play, User
} from 'lucide-react'

export default function App() {
  const [commandEvent, setCommandEvent] = useState({ cmd: 'IDLE', timestamp: Date.now() })
  const [status, setStatus] = useState('Connecting...')
  const [logs, setLogs] = useState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('history')

  // 🎮 Mini-Game States
  const [gameState, setGameState] = useState('IDLE') // 'IDLE', 'PLAYING', 'FINISHED'
  const [hitHoops, setHitHoops] = useState([])
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [playerName, setPlayerName] = useState('Guest') // กำหนดชื่อ Default

  const [mapping, setMapping] = useState({
    left: 'L',
    right: 'R',
    up: 'U',
    down: 'D',
    shoot: 'SHOOT',
    reset: 'RESET'
  })

  // โหลด Leaderboard จาก LocalStorage เมื่อเริ่มแอป
  useEffect(() => {
    const savedLb = localStorage.getItem('rally_leaderboard')
    if (savedLb) setLeaderboard(JSON.parse(savedLb))
  }, [])

  // จับเวลาเกม
  useEffect(() => {
    let interval
    if (gameState === 'PLAYING') {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 0.1)
      }, 100)
    }
    return () => clearInterval(interval)
  }, [gameState])

  // รับข้อมูลจาก Firebase
  useEffect(() => {
    const deviceRef = ref(db, 'iot_device')

    const unsubscribe = onValue(deviceRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          const rawCmd = String(data.command || 'IDLE')

          if (rawCmd && rawCmd !== 'IDLE') {
            const uppercaseCmd = rawCmd.trim().toUpperCase()
            
            let mappedCmd = 'IDLE'
            if (uppercaseCmd === mapping.left.toUpperCase() || uppercaseCmd.includes('LEFT')) mappedCmd = 'ROTATE_LEFT'
            else if (uppercaseCmd === mapping.right.toUpperCase() || uppercaseCmd.includes('RIGHT')) mappedCmd = 'ROTATE_RIGHT'
            else if (uppercaseCmd === mapping.up.toUpperCase() || uppercaseCmd.includes('UP')) mappedCmd = 'PITCH_UP'
            else if (uppercaseCmd === mapping.down.toUpperCase() || uppercaseCmd.includes('DOWN')) mappedCmd = 'PITCH_DOWN'
            else if (uppercaseCmd === mapping.shoot.toUpperCase() || uppercaseCmd.includes('SHOOT') || uppercaseCmd.includes('FIRE')) mappedCmd = 'SHOOT'
            else if (uppercaseCmd === mapping.reset.toUpperCase() || uppercaseCmd.includes('RESET')) mappedCmd = 'RESET_TURRET'
            else mappedCmd = uppercaseCmd

            setCommandEvent({ cmd: mappedCmd, timestamp: Date.now(), rand: Math.random() })
            setStatus('Online')
            
            const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            setLogs((prev) => [
              { id: `${Date.now()}-${Math.random()}`, raw: rawCmd, cmd: mappedCmd, time: timeStr },
              ...prev.slice(0, 49)
            ])
          }
        } else {
          setStatus('Ready')
        }
      },
      (error) => {
        console.error('Firebase Error:', error)
        setStatus('Error')
      }
    )
    return () => unsubscribe()
  }, [mapping])

  const sendTestCommand = (cmdText) => {
    update(ref(db, 'iot_device'), {
      command: cmdText,
      last_updated: new Date().toISOString()
    })
  }

  // 🎮 จัดการเมื่อยิงเข้าห่วง
  const handleScore = (hoopId) => {
    if (gameState === 'FINISHED') return

    if (gameState === 'IDLE') setGameState('PLAYING')

    setHitHoops(prev => {
      if (!prev.includes(hoopId)) {
        const newHits = [...prev, hoopId]
        if (newHits.length === 3) {
          setGameState('FINISHED')
        }
        return newHits
      }
      return prev
    })
  }

  const startGame = () => {
    setGameState('PLAYING')
    setHitHoops([])
    setTimeElapsed(0)
    setCommandEvent({ cmd: 'RESET_TURRET', timestamp: Date.now() })
  }

  const saveScore = () => {
    const finalName = playerName.trim() || 'Anonymous'
    const newScore = { name: finalName, time: timeElapsed.toFixed(1), date: new Date().toLocaleString('th-TH') }
    const newLb = [...leaderboard, newScore].sort((a, b) => parseFloat(a.time) - parseFloat(b.time)).slice(0, 5) // เก็บแค่ Top 5
    setLeaderboard(newLb)
    localStorage.setItem('rally_leaderboard', JSON.stringify(newLb))
    
    // Reset
    setGameState('IDLE')
    setHitHoops([])
    setTimeElapsed(0)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundColor: '#0f1117', overflow: 'hidden' }}>
      
      {/* 🔵 3D CANVAS */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <Canvas camera={{ position: [-45, 15, 0], fov: 45 }}>
          <Suspense fallback={null}>
            <Turret3D commandEvent={commandEvent} onScore={handleScore} />
          </Suspense>
        </Canvas>
      </div>

      {/* 🟢 SIDEBAR */}
      <div style={{
          position: 'absolute', top: 0, left: isSidebarOpen ? '0px' : '-340px',
          width: '340px', height: '100%', backgroundColor: 'rgba(15, 17, 23, 0.95)', borderRight: '1px solid #30363d',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column', zIndex: 100,
          boxShadow: isSidebarOpen ? '4px 0 15px rgba(0,0,0,0.5)' : 'none'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #30363d', display: 'flex', gap: 10 }}>
          <button onClick={() => setActiveTab('history')} style={{ ...tabStyle, color: activeTab === 'history' ? '#00d2ff' : '#8b949e', backgroundColor: activeTab === 'history' ? '#21262d' : 'transparent' }}>
            <Clock size={16} /> History
          </button>
          <button onClick={() => setActiveTab('config')} style={{ ...tabStyle, color: activeTab === 'config' ? '#00d2ff' : '#8b949e', backgroundColor: activeTab === 'config' ? '#21262d' : 'transparent' }}>
            <Settings size={16} /> Rally Mapping
          </button>
        </div>

        {activeTab === 'history' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#8b949e' }}>Recent Logs ({logs.length})</span>
              <button onClick={() => setLogs([])} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer' }}><Trash2 size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.length === 0 ? <div style={{ color: '#484f58', textAlign: 'center', marginTop: 40, fontSize: '13px' }}>Waiting for Rally App...</div> : 
                logs.map((item) => (
                  <div key={item.id} style={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#c9d1d9', fontSize: '13px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: item.cmd.includes('SHOOT') ? '#ff3366' : '#00d2ff' }}>{item.cmd}</div>
                      <div style={{ fontSize: '10px', color: '#8b949e' }}>Rally Sent: "{item.raw}"</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#8b949e' }}>{item.time}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: '12px', color: '#8b949e', lineHeight: '1.4' }}>ปรับตัวอักษร/คำสั่งให้ตรงกับที่แอป Rally ส่งมา (กิ่ง iot_device/command):</div>
            {Object.keys(mapping).map((key) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '11px', color: '#00d2ff', textTransform: 'uppercase', fontWeight: 'bold' }}>{key} Command</label>
                <input type="text" value={mapping[key]} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                  style={{ backgroundColor: '#161b22', border: '1px solid #30363d', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{ position: 'absolute', left: isSidebarOpen ? '340px' : '20px', top: '20px', zIndex: 99, backgroundColor: '#21262d', border: '1px solid #30363d', color: '#00d2ff', width: '40px', height: '40px', borderRadius: isSidebarOpen ? '0 8px 8px 0' : '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
      </button>

      <div style={{ position: 'absolute', top: 20, left: isSidebarOpen ? 400 : 80, transition: 'left 0.3s', color: '#fff', pointerEvents: 'none', zIndex: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity color="#00ff88" size={26} />
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>RALLY 3D SIMULATOR</h1>
        </div>
      </div>

      {/* ✅ Mini-Game HUD & Leaderboard (Top Right) */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 90, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', width: '280px' }}>
        
        {/* Score & Time */}
        <div style={{ backgroundColor: 'rgba(22, 27, 34, 0.85)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '16px', border: '1px solid #30363d', display: 'flex', gap: 20, alignItems: 'center', width: '100%', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b949e', fontWeight: 'bold', textTransform: 'uppercase' }}>Targets Hit</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '24px', fontWeight: 'bold', color: hitHoops.length === 3 ? '#00ff88' : '#fff' }}>
              <Target size={20} color={hitHoops.length === 3 ? '#00ff88' : '#c9d1d9'} /> {hitHoops.length} <span style={{ color: '#484f58' }}>/ 3</span>
            </div>
          </div>
          <div style={{ width: '1px', height: '30px', backgroundColor: '#30363d' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b949e', fontWeight: 'bold', textTransform: 'uppercase' }}>Time</span>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d2ff', fontVariantNumeric: 'tabular-nums' }}>
              {timeElapsed.toFixed(1)}<span style={{ fontSize: '14px', color: '#8b949e' }}>s</span>
            </div>
          </div>
        </div>
        
        {/* Firebase Status */}
        <div style={{ backgroundColor: 'rgba(22, 27, 34, 0.85)', padding: '6px 12px', borderRadius: '20px', border: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: '12px', width: '100%', justifyContent: 'center' }}>
          <Wifi size={14} color={status === 'Online' ? '#00ff88' : '#ffaa00'} />
          <span>Path: <strong style={{ color: '#00ff88' }}>iot_device/command</strong></span>
        </div>

        {/* ✅ Leaderboard Panel */}
        {leaderboard.length > 0 && (
          <div style={{ backgroundColor: 'rgba(22, 27, 34, 0.85)', backdropFilter: 'blur(8px)', padding: '12px 16px', borderRadius: '16px', border: '1px solid #30363d', width: '100%' }}>
            <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trophy size={14} color="#ffaa00" /> Leaderboard
            </div>
            {leaderboard.map((lb, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#c9d1d9', padding: '6px 0', borderBottom: idx < leaderboard.length - 1 ? '1px solid #21262d' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <span style={{ color: idx === 0 ? '#ffaa00' : '#8b949e', fontWeight: 'bold', width: '15px' }}>{idx + 1}.</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={lb.name}>{lb.name}</span>
                </div>
                <strong style={{ color: '#00ff88' }}>{lb.time}s</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ ป็อปอัปเวลาชนะเกม (กรอกชื่อได้) */}
      {gameState === 'FINISHED' && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#161b22', padding: '40px', borderRadius: '24px', border: '1px solid #30363d', textAlign: 'center', maxWidth: '400px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <Trophy size={60} color="#ffaa00" style={{ marginBottom: '20px' }} />
            <h2 style={{ color: '#fff', fontSize: '28px', margin: '0 0 10px 0' }}>TARGET SECURED!</h2>
            <p style={{ color: '#8b949e', fontSize: '16px', margin: '0 0 20px 0' }}>You destroyed all 3 targets in</p>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#00ff88', marginBottom: '30px' }}>{timeElapsed.toFixed(1)}s</div>
            
            {/* Input สำหรับกรอกชื่อ */}
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Player Name
              </label>
              <input 
                type="text" 
                value={playerName} 
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #30363d', backgroundColor: '#0f1117', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => { startGame(); setCommandEvent({ cmd: 'RESET_CAMERA', timestamp: Date.now() }) }} style={{ ...popupBtn, backgroundColor: '#21262d', color: '#fff', flex: 1 }}>Play Again</button>
              <button onClick={saveScore} style={{ ...popupBtn, backgroundColor: '#00d2ff', color: '#0f1117', flex: 1 }}>Save Score</button>
            </div>
          </div>
        </div>
      )}

      {/* Current Command Display */}
      <div style={{ position: 'absolute', bottom: 25, left: '50%', transform: 'translateX(-50%)', zIndex: 90, backgroundColor: 'rgba(22, 27, 34, 0.9)', backdropFilter: 'blur(10px)', padding: '14px 28px', borderRadius: '16px', border: '1px solid #30363d', textAlign: 'center', color: '#fff', minWidth: '220px' }}>
        <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Current Command</div>
        <div style={{ fontSize: '26px', fontWeight: 'bold', color: commandEvent.cmd.includes('SHOOT') ? '#ff3366' : '#00d2ff', textShadow: '0 0 12px rgba(0,210,255,0.4)' }}>
          {commandEvent.cmd === 'RESET_TURRET' ? 'RESET PUMP' : commandEvent.cmd === 'RESET_CAMERA' ? 'RESET CAM' : commandEvent.cmd}
        </div>
      </div>

      {/* ปุ่ม Reset Camera (ซ้ายล่าง) */}
      <button 
        onClick={() => setCommandEvent({ cmd: 'RESET_CAMERA', timestamp: Date.now(), rand: Math.random() })}
        style={{ position: 'absolute', bottom: 25, left: 20, zIndex: 90, backgroundColor: 'rgba(22, 27, 34, 0.85)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: '16px', border: '1px solid #30363d', color: '#c9d1d9', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 'bold' }}>
        <Camera size={18} color="#00d2ff" /> Reset Camera
      </button>

      {/* Manual Test Panel */}
      <div style={{ position: 'absolute', bottom: 25, right: 20, zIndex: 90, backgroundColor: 'rgba(22, 27, 34, 0.85)', backdropFilter: 'blur(8px)', padding: '12px', borderRadius: '16px', border: '1px solid #30363d', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ color: '#8b949e', fontSize: '11px', textAlign: 'center' }}>Manual Test Panel</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          <div></div>
          <button onClick={() => sendTestCommand(mapping.up)} style={btnStyle}><ArrowUp size={16} /></button>
          <div></div>
          <button onClick={() => sendTestCommand(mapping.left)} style={btnStyle}><ArrowLeft size={16} /></button>
          <button onClick={() => sendTestCommand(mapping.shoot)} style={{ ...btnStyle, backgroundColor: '#ff0055', color: '#fff' }}><Zap size={16} /></button>
          <button onClick={() => sendTestCommand(mapping.right)} style={btnStyle}><ArrowRight size={16} /></button>
          <div></div>
          <button onClick={() => sendTestCommand(mapping.down)} style={btnStyle}><ArrowDown size={16} /></button>
          <button onClick={() => setCommandEvent({ cmd: 'RESET_TURRET', timestamp: Date.now(), rand: Math.random() })} style={btnStyle} title="Reset Gun Rotation"><RotateCcw size={16} /></button>
        </div>
        {gameState === 'IDLE' && (
          <button onClick={startGame} style={{ ...btnStyle, gridColumn: 'span 3', marginTop: '4px', backgroundColor: '#00d2ff', color: '#0f1117', fontWeight: 'bold' }}>
            <Play size={16} style={{ marginRight: 6 }} /> Start Mini-Game
          </button>
        )}
      </div>
    </div>
  )
}

const tabStyle = { flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 'bold' }
const btnStyle = { backgroundColor: '#21262d', border: '1px solid #30363d', color: '#c9d1d9', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const popupBtn = { padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }