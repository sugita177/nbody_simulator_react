// src/components/SimulationCanvas.tsx
"use client"; // Next.jsに移行する際の準備として付けておくと良い

import React, { useRef, useEffect } from 'react';
import { type Body } from '../types';
import { updateSimulation } from '../utils/physics';

// 描画のキャンバスサイズ
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// 初期天体データ (2体問題の例)
const initialBodies: Body[] = [
  {
    id: 1, mass: 1000, radius: 15, color: '#FFD700',
    position: { x: 0, y: 0 },
    velocity: { vx: 0, vy: 0 }, // 中心天体は静止
  },
  {
    id: 2, mass: 1, radius: 5, color: '#ADD8E6',
    position: { x: 200, y: 0 },
    velocity: { vx: 0, vy: 2 }, // 初期速度を与えて周回させる
  },
];

const SimulationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  // シミュレーションの状態を管理する ref。Reactの再レンダリングを避けるため ref を使用。
  const bodiesRef = useRef<Body[]>(initialBodies);
  const lastTimeRef = useRef(performance.now());

  // 描画処理とアニメーションループ
  const animate = (currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // --- 1. 物理演算の実行 ---
    // ここでは単純な deltaTime は使わず、固定タイムステップで計算
    bodiesRef.current = updateSimulation(bodiesRef.current);

    // --- 2. 画面の描画 ---
    
    // 軌跡を残すために、半透明な矩形を重ねて過去の描画を薄くする
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 天体の描画
    bodiesRef.current.forEach((body: Body) => {
      ctx.beginPath();
      // Canvasの中心を原点(0, 0)とするように座標変換を行う
      const screenX = CANVAS_WIDTH / 2 + body.position.x;
      const screenY = CANVAS_HEIGHT / 2 - body.position.y; // Y軸は上下反転
      
      ctx.arc(screenX, screenY, body.radius, 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      ctx.fill();
      ctx.closePath();
    });
    
    // --- 3. 次のフレームを要求 ---
    animationRef.current = requestAnimationFrame(animate);
    lastTimeRef.current = currentTime;
  };

  useEffect(() => {
    // コンポーネントマウント時にループを開始
    animationRef.current = requestAnimationFrame(animate);
    
    // アンマウント時にループを停止
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); 

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h1>重力シミュレーション (2体問題)</h1>
      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT} 
        style={{ border: '1px solid #333', backgroundColor: 'black' }} 
      />
    </div>
  );
};

export default SimulationCanvas;