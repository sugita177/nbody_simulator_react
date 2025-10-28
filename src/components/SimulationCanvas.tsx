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
  // ⭐ 軌道モードの状態を追加 (true: 永続軌道 / false: 残像モード)
  const [isTracing, setIsTracing] = useState(false);

  // シミュレーションの状態を管理する ref。Reactの再レンダリングを避けるため ref を使用。
  const bodiesRef = useRef<Body[]>(initialBodies);
  const lastTimeRef = useRef(performance.now());

  // ⭐ 天体の過去の位置 (軌跡) を記憶するための履歴データ
  const historyRef = useRef<Record<number, { x: number, y: number }[]>>({});

  // 描画処理とアニメーションループ
  const animate = (currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // --- 1. 物理演算の実行 ---
    // ここでは単純な deltaTime は使わず、固定タイムステップで計算
    const newBodies = updateSimulation(bodiesRef.current);
    bodiesRef.current = newBodies;

    // ⭐ 履歴の更新
    newBodies.forEach(body => {
      if (!historyRef.current[body.id]) {
        historyRef.current[body.id] = [];
      }
      // 履歴に現在の位置を追加
      historyRef.current[body.id].push({ 
          x: body.position.x, 
          y: body.position.y 
      });
      // 履歴が長くなりすぎないように制限 (例: 500点)
      if (historyRef.current[body.id].length > 500) {
        historyRef.current[body.id].shift();
      }
    });

    // --- 2. 画面の描画 ---
    
    // 永続軌道モード: 完全クリア
    if (isTracing) {
      ctx.fillStyle = 'black'; 
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); 
    } else {
      // 残像モード: 半透明クリア
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // ⭐ 永続軌道モードでの軌跡の描画 (線)
    if (isTracing) {
      // 全天体について履歴を描画
      Object.keys(historyRef.current).forEach(id => {
        const bodyId = parseInt(id);
        const history = historyRef.current[bodyId];
        const body = bodiesRef.current.find(b => b.id === bodyId);
        if (!body || history.length < 2) return;

        // 線の太さを設定
        ctx.lineWidth = 1.5; // 少し太くしてグラデーション効果を見やすく

        // 最初の点から最後の点まで、セグメントごとに描画する
        for (let i = 1; i < history.length; i++) {
          const startPoint = history[i - 1];
          const endPoint = history[i];

          // 履歴の長さ (history.length) を使って不透明度を計算
          // i が大きいほど（最新ほど）不透明度が高くなるようにする
          const opacity = i / history.length;
          
          // 天体色をRGBに変換し、不透明度を適用（ここではbody.colorがCSS色コードと仮定）
          // 簡易的な色設定として、ここでは不透明度のみを調整します
          // 複雑な色調整を避けるため、既存の天体色に不透明度を適用するロジックを使用
          
          // 例: 天体色が白っぽい（#ADD8E6）場合、RGBAで表現
          // 注: body.colorがHEXコードの場合、この処理は別途変換関数が必要です。
          // 暫定的に、天体色に合わせた固定の軌道色を使用します。
          
          const pathColor = body.color === '#FFD700' ? '255, 215, 0' : '173, 216, 230'; // 黄色または水色 (R, G, B)

          ctx.strokeStyle = `rgba(${pathColor}, ${opacity.toFixed(2)})`;
          
          // パスの開始
          ctx.beginPath();
          
          // 座標変換 (前の点)
          const startX = CANVAS_WIDTH / 2 + startPoint.x;
          const startY = CANVAS_HEIGHT / 2 - startPoint.y;
          ctx.moveTo(startX, startY);

          // 座標変換 (現在の点)
          const endX = CANVAS_WIDTH / 2 + endPoint.x;
          const endY = CANVAS_HEIGHT / 2 - endPoint.y;
          ctx.lineTo(endX, endY);
          
          // 線を描画
          ctx.stroke();
        }
      });
    }

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
  }, [isRunning, isTracing]); 

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

        {/* ⭐ 軌道モード切替ボタンを追加 */}
        <button 
          onClick={() => setIsTracing(!isTracing)}
          style={{
            padding: '10px 20px', 
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: isTracing ? '#007BFF' : '#6C757D', // 選択状態で色を変更
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            transition: 'background-color 0.3s',
            marginLeft: '10px' // ボタン間にスペース
          }}
        >
          {isTracing ? '🔄 残像モード' : '✏️ 永続軌道'}
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