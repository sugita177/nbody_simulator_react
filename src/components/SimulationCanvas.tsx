// src/components/SimulationCanvas.tsx
"use client"; // Next.jsに移行する際の準備として付けておくと良い

import React, { useRef, useEffect, useState } from 'react';
import { type Body } from '../types';
import { updateSimulation } from '../utils/physics';

// 描画のキャンバスサイズ
const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 420;


const SimulationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // ⭐ 実行状態 (true: 実行中 / false: 停止中) を管理する状態を追加
  const [isRunning, setIsRunning] = useState(true);
  // ⭐ 軌道モードの状態を追加 (true: 永続軌道 / false: 残像モード)
  const [isTracing, setIsTracing] = useState(false);
  // ⭐ 編集可能な初期状態を useState で管理
  const [editableBodies, setEditableBodies] = useState<Body[]>([
    {
      id: 1, mass: 1000, radius: 15, color: '#FFD700',
      position: { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 },
    },
    {
      id: 2, mass: 1, radius: 5, color: '#ADD8E6',
      position: { x: 200, y: 0 },
      velocity: { vx: 0, vy: 2 },
    },
    // ここに3体目を追加することも可能
  ]);
  // ⭐ 符号の状態を管理する新しい状態
  const [signs, setSigns] = useState<Record<number, {
      x: 1 | -1;
      y: 1 | -1;
      vx: 1 | -1;
      vy: 1 | -1;
  }>>({
      // 初期値設定 (例: 天体1と天体2の初期符号)
      1: { x: 1, y: 1, vx: 1, vy: 1 },
      2: { x: 1, y: 1, vx: 1, vy: 1 },
  });

  // シミュレーションの状態を管理する ref。Reactの再レンダリングを避けるため ref を使用。
  // bodiesRef の初期値を editableBodies に変更
  // ❗ bodiesRef の初期化を useEffect 内に移します（リセット機能のため）
  const bodiesRef = useRef<Body[]>([]);
  const lastTimeRef = useRef(performance.now());

  // ⭐ 天体の過去の位置 (軌跡) を記憶するための履歴データ
  const historyRef = useRef<Record<number, { x: number, y: number }[]>>({});

  // ⭐ リセット関数
  const resetSimulation = () => {
    // 停止中の場合、開始状態に戻す
    if (!isRunning) {
        setIsRunning(true);
    }
    
    // 現在の editableBodies の値を bodiesRef にコピーして再初期化
    // ❗ 参照が同じにならないよう、ディープコピー（新しい配列とオブジェクト）が必要です
    const newInitialState = editableBodies.map(body => {
        const sign = signs[body.id]; // 該当天体の符号を取得
        
        return {
            ...body,
            // ⭐ 符号を適用した値で初期化
            position: { 
                x: body.position.x * sign.x, 
                y: body.position.y * sign.y 
            },
            velocity: { 
                vx: body.velocity.vx * sign.vx, 
                vy: body.velocity.vy * sign.vy 
            },
        };
    });
    
    bodiesRef.current = newInitialState;
    historyRef.current = {}; // 軌跡履歴もクリア

    // 依存配列に editableBodies を追加するため、animateの再定義が必要な場合がある
    // requestAnimationFrame(animate) を呼ぶ必要はない（isRunning=trueであればuseEffectが処理する）
  };

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
    // 最初のマウント時に初期状態を設定
    if (bodiesRef.current.length === 0) {
        resetSimulation(); 
        setIsRunning(true);
    }

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
    // ここではリセット操作の管理は不要だが、isRunningの変更でリセットされないよう注意
  }, [isRunning, isTracing]);

  // 変更ハンドラ関数
  const handleBodyChange = (id: number, field: 'mass' | 'radius' | 'vx' | 'vy' | 'x' | 'y', valueString: string) => {

      // 1. 空文字の場合の処理: 値を 0 に設定する
      if (valueString === '') {
          // 空欄にされた場合、その値を 0 と見なして状態を更新する
          updateBodyValue(id, field, 0);
          return; 
      }

      // 2. マイナス記号 ('-') の場合: 更新をスキップし、ユーザーの入力を一時的に許可する
      if (valueString === '-') {
          return; 
      }

      // 3. 有効な数値表現に変換
      let value = parseFloat(valueString);

      // 4. NaN の場合は無視
      if (isNaN(value)) return; 

      // 5. massは非負の絶対値、その他は絶対値で状態を更新
      if (field === 'mass' && value < 0) {
          value = 0; // 負の値の入力は 0 にする
      }

      // ⭐ 関数を抽出して可読性を高めますが、元のロジックを修正
      updateBodyValue(id, field, Math.abs(value));
  };

  // ⭐ NOTE: 以前の複雑なロジックを置き換えるためのヘルパー関数 (handleBodyChange内に記述するか、外部で定義)
  const updateBodyValue = (id: number, field: 'mass' | 'radius' | 'vx' | 'vy' | 'x' | 'y', value: number) => {
      setEditableBodies(prevBodies => 
          prevBodies.map(body => {
              if (body.id !== id) return body;

              const newBody = { ...body };

              if (field === 'mass' || field === 'radius') {
                  (newBody as any)[field] = value;
              } else if (field === 'x' || field === 'y') {
                  newBody.position = { ...newBody.position, [field]: value };
              } else if (field === 'vx' || field === 'vy') {
                  newBody.velocity = { ...newBody.velocity, [field]: value };
              }

              return newBody;
          })
      );
  };

  // ⭐ 符号変更ハンドラ
  const handleSignChange = (bodyId: number, field: 'x' | 'y' | 'vx' | 'vy', signValue: string) => {
      setSigns(prevSigns => ({
          ...prevSigns,
          [bodyId]: {
              ...prevSigns[bodyId],
              [field]: parseInt(signValue) as 1 | -1 // '1'または'-1'の文字列を数値に変換
          }
      }));
  };

  return (
    <div 
      style={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '10px 20px 10px 20px', 
        maxWidth: '900px',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#1E1E1E',
      }}
    >
      
      {/* 1. タイトル */}
      <h1 style={{ color: '#fff', marginTop: '10px', marginBottom: '20px' }}>
        🌌 重力シミュレーション
      </h1>
      
      {/* 2. メインコントロールボタン群 */}
      <div style={{ marginBottom: '20px' }}>
        {/* 停止・再開ボタン */}
        <button 
          onClick={() => setIsRunning(!isRunning)} 
          style={{
            padding: '10px 20px', 
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: isRunning ? '#DC3545' : '#28A745', 
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            transition: 'background-color 0.3s'
          }}
        >
          {isRunning ? '⏸️ シミュレーションを停止' : '▶️ シミュレーションを再開'}
        </button>
        
        {/* 軌道モード切替ボタン */}
        <button 
          onClick={() => setIsTracing(!isTracing)}
          style={{
            padding: '10px 20px', 
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: isTracing ? '#007BFF' : '#6C757D', 
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            transition: 'background-color 0.3s',
            marginLeft: '10px' 
          }}
        >
          {isTracing ? '🔄 残像モード' : '✏️ 永続軌道'}
        </button>
      </div>

      {/* 3. キャンバスとコントロールパネルを並べるコンテナ (水平Flex) */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', maxWidth: '100%', width: '100%' }}> 
          
          {/* 3-A. キャンバスエリア (左側) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <canvas 
                  ref={canvasRef} 
                  width={CANVAS_WIDTH} 
                  height={CANVAS_HEIGHT} 
                  style={{ 
                      border: '1px solid #444', 
                      backgroundColor: 'black',
                      boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)' 
                  }} 
              />
          </div>
        {/* 3-B. コントロールパネル (右側) */}
        <div 
            style={{ 
                margin: '0',
                border: '1px solid #444', 
                padding: '10px', 
                borderRadius: '5px', 
                width: '100%', 
                // 最大幅を再設定し、キャンバスの横に収まるようにする
                maxWidth: '450px', 
            }}
        >
            <h2 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 8px 0' }}>設定変更</h2>
          
            {/* ⭐ 新しい Flex コンテナ: 天体パネルを水平に並べる */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>

                {editableBodies.map(body => (
                    <div 
                        key={body.id} 
                        // ⭐ flex: 1 0 0 で利用可能なスペースを均等に分割
                        style={{ flex: '1 0 0', 
                            // 以前のボーダーとパディングを維持
                            padding: '5px', 
                            border: `1px solid ${body.color}`, 
                            borderRadius: '5px' 
                        }}
                    >
                        <div style={{ color: body.color, fontWeight: 'bold', width: '100%', fontSize: '0.9rem', marginBottom: '5px' }}>
                            天体 {body.id} ({body.color})
                        </div>

                        {/* 内部の入力フィールドを縦に配置する Flex/Block コンテナ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>

                            {/* 質量 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>M: 
                                <input type="number" value={body.mass === 0 ? '' : body.mass} min="0" onChange={e => handleBodyChange(body.id, 'mass', e.target.value)} style={{ width: '60px', padding: '3px' }} disabled={isRunning} />
                            </label>

                            {/* X位置 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>X : 
                                {/* ⭐ 符号ドロップダウン */}
                                <select value={signs[body.id].x} onChange={e => handleSignChange(body.id, 'x', e.target.value)} style={{ marginRight: '5px', padding: '3px' }} disabled={isRunning}>
                                    <option value={1}>+</option>
                                    <option value={-1}>-</option>
                                </select>
                                {/* 絶対値入力 */}
                                <input type="number" value={body.position.x === 0 ? '' : body.position.x} min="0" onChange={e => handleBodyChange(body.id, 'x', e.target.value)} style={{ width: '60px', padding: '3px' }} disabled={isRunning} />
                            </label>
                      
                            {/* Y位置 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>Y : 
                                <select value={signs[body.id].y} onChange={e => handleSignChange(body.id, 'y', e.target.value)} style={{ marginRight: '5px', padding: '3px' }} disabled={isRunning}>
                                    <option value={1}>+</option>
                                    <option value={-1}>-</option>
                                </select>
                                <input type="number" value={body.position.y === 0 ? '' : body.position.y} min="0" onChange={e => handleBodyChange(body.id, 'y', e.target.value)} style={{ width: '60px', padding: '3px' }} disabled={isRunning} />
                            </label>

                            {/* X速度 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>Vx: 
                                <select value={signs[body.id].vx} onChange={e => handleSignChange(body.id, 'vx', e.target.value)} style={{ marginRight: '5px', padding: '3px' }} disabled={isRunning}>
                                  <option value={1}>+</option>
                                  <option value={-1}>-</option>
                                </select>
                                <input type="number" value={body.velocity.vx === 0 ? '' : body.velocity.vx} min="0" onChange={e => handleBodyChange(body.id, 'vx', e.target.value)} style={{ width: '60px', padding: '3px' }} disabled={isRunning} />
                            </label>
                      
                            {/* Y速度 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>Vy: 
                                <select value={signs[body.id].vy} onChange={e => handleSignChange(body.id, 'vy', e.target.value)} style={{ marginRight: '5px', padding: '3px' }} disabled={isRunning}>
                                    <option value={1}>+</option>
                                    <option value={-1}>-</option>
                                </select>
                                <input type="number" value={body.velocity.vy === 0 ? '' : body.velocity.vy} min="0" onChange={e => handleBodyChange(body.id, 'vy', e.target.value)} style={{ width: '60px', padding: '3px' }} disabled={isRunning} />
                            </label>
                        </div>
                    </div>
                ))}
            </div> {/* 終了タグ: 新しい Flex コンテナ */}
              
            {/* リセットボタンは天体パネルの下に全体幅で配置 */}
            <button 
                onClick={resetSimulation} 
                style={{ marginTop: '10px', padding: '8px 15px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#6C757D', color: 'white', border: 'none', borderRadius: '5px', width: '100%' }}
            >
                🔄 新しい設定でシミュレーション開始
            </button>
        </div>
      </div> 
    </div>
  );
};
export default SimulationCanvas;