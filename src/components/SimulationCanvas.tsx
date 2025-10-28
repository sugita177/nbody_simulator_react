// src/components/SimulationCanvas.tsx
"use client"; // Next.jsに移行する際の準備として付けておくと良い

import React, { useRef, useEffect, useState } from 'react';
import { type Body } from '../types';
import { updateSimulation } from '../utils/physics';

// 描画のキャンバスサイズ
const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 420;

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
  // ⭐ 実行状態 (true: 実行中 / false: 停止中) を管理する状態を追加
  const [isRunning, setIsRunning] = useState(true);
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
    if (isRunning) {
      // 実行中の場合、アニメーションループを開始
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // 停止中の場合、アニメーションループを停止
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    // クリーンアップ関数（コンポーネントがアンマウントされるとき、または状態が変更される直前）
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]); 

  return (
    // 1. 全体を画面中央に配置するコンテナ
    <div 
      style={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', // 水平方向の中央寄せ
        // ⭐ 垂直パディングを最小限に減らし、不要な空白を削除
        //    (上部10px, 左右20px, 下部10px)
        padding: '10px 20px 10px 20px',
        maxWidth: '900px', // ⭐ コンテンツの最大幅を制限 (14インチで見やすい幅)
        width: '100%',     // 親要素（#root）の幅いっぱいに広がる
        minHeight: '100vh', // 画面いっぱいの高さ
        boxSizing: 'border-box',
        backgroundColor: '#1E1E1E', // 背景を暗くしてシミュレーションを見やすく
        // ⭐ 上部マージンを設定（例：画面の高さの2%〜3%）
        //marginTop: '2vh',
      }}
    >
      
      {/* タイトル */}
      <h1 style={{ color: '#fff', marginTop: '10px', marginBottom: '10px' }}>        🌌 重力シミュレーション
      </h1>
      
      {/* 2. コントロールパネル (ボタン) */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setIsRunning(!isRunning)} 
          style={{
            padding: '10px 20px', 
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: isRunning ? '#DC3545' : '#28A745', // 実行状態で色を変更
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            transition: 'background-color 0.3s'
          }}
        >
          {isRunning ? '⏸️ シミュレーションを停止' : '▶️ シミュレーションを再開'}
        </button>
      </div>

      {/* 3. キャンバス本体 */}
      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT} 
        style={{ 
          border: '1px solid #444', 
          backgroundColor: 'black',
          boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)' // キャンバスに影をつけて際立たせる
        }} 
      />
      
      {/* 必要であれば、ここに解説や設定を追加するエリアを設ける */}

    </div>
  );
};

export default SimulationCanvas;