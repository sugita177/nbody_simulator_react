// src/components/SimulationCanvas.tsx
"use client"; // Next.jsに移行する際の準備として付けておくと良い

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { type Body } from '../types';
import { updateSimulation } from '../utils/physics';

// 描画のキャンバスサイズ
const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 420;

// 任意の数の天体を生成するヘルパー関数
const createBody = (id: number, initialMass: number, initialX: number, initialY: number, initialVx: number, initialVy: number, radius: number = 5): Body => ({
    id: id,
    position: { x: initialX, y: initialY },
    velocity: { vx: initialVx, vy: initialVy },
    mass: initialMass,
    radius: radius,
    color: id === 1 ? '#FFD700' : (id === 2 ? '#ADD8E6' : (id === 3 ? '#90EE90' : '#FF6347')), // 3体目以降の色を追加
});

/**
 * 天体の数に応じて初期状態を定義する関数
 * @param count 
 * @returns 
 */
const getInitialState = (count: number): Body[] => {
    if (count === 2) {
        // 2体問題の例: 中心を周回する安定軌道
        return [
            // 天体 1 (中心の重い星)
            createBody(1, 1000, 0, 0, 0, 0, 8), 
            // 天体 2 (周回する星)
            createBody(2, 1, 150, 0, 0, 3, 4), 
        ];
    }
    // 3体問題の例: (ユーザーが提供した初期設定に近いもの)
    return [
        // 天体 1 
        createBody(1, 500, 0, 0, 0, 0),
        // 天体 2 
        createBody(2, 500, 100, 0, 0, 2),
        // 天体 3 
        createBody(3, 500, -100, 0, 0, -2), 
    ];
};


const SimulationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // 天体の数を選択する状態を追加 (初期値は3)
  const [numBodies, setNumBodies] = useState(3);
  // 実行状態 (true: 実行中 / false: 停止中) を管理する状態を追加
  const [isRunning, setIsRunning] = useState(true);
  // 軌道モードの状態を追加 (true: 永続軌道 / false: 残像モード)
  const [isTracing, setIsTracing] = useState(false);
  // 編集可能な初期状態を useState で管理
  const [editableBodies, setEditableBodies] = useState<Body[]>(getInitialState(3));
  // 入力文字列を一時的に保持する状態 (UI制御用)
  const [inputStrings, setInputStrings] = useState<Record<number, {
      x: string; y: string; vx: string; vy: string; mass: string;
  }>>({});

  // シミュレーションの状態を管理する ref。Reactの再レンダリングを避けるため ref を使用。
  // bodiesRef の初期値を editableBodies に変更
  // ❗ bodiesRef の初期化を useEffect 内に移します（リセット機能のため）
  const bodiesRef = useRef<Body[]>([]);
  const lastTimeRef = useRef(performance.now());

  // 天体の過去の位置 (軌跡) を記憶するための履歴データ
  const historyRef = useRef<Record<number, { x: number, y: number }[]>>({});

  // inputStringsをeditableBodiesに基づいて初期化するヘルパー関数
  const initializeInputStrings = useCallback((bodies: Body[]) => {
      const initialStrings: Record<number, { x: string; y: string; vx: string; vy: string; mass: string; }> = {};
      bodies.forEach(body => {
          initialStrings[body.id] = {
              x: body.position.x.toString(),
              y: body.position.y.toString(),
              vx: body.velocity.vx.toString(),
              vy: body.velocity.vy.toString(),
              mass: body.mass.toString(),
          };
      });
      setInputStrings(initialStrings);
  }, []);

  // リセット関数 (numBodies の変更にも対応)
  const resetBodyNumber = useCallback(() => {
      // 現在選択されている numBodies に基づいて新しい初期状態を生成
      const newInitialState = getInitialState(numBodies);
      // editableBodies を更新
      setEditableBodies(newInitialState);
      
      // inputStrings を更新
      initializeInputStrings(newInitialState);
      // bodiesRef（シミュレーション実行状態）をコピーして再初期化
      bodiesRef.current = newInitialState.map(body => ({
          ...body,
          position: { x: body.position.x, y: body.position.y },
          velocity: { vx: body.velocity.vx, vy: body.velocity.vy },
      }));
      
      historyRef.current = {}; // 軌跡履歴もクリア
      // 停止中の場合、再実行する
      if (!isRunning) {
          setIsRunning(true);
      }
  }, [numBodies, isRunning, initializeInputStrings]); // numBodies を依存配列に追加

  // ⭐ リセット関数
  const resetSimulation = () => {
    // 停止中の場合、開始状態に戻す
    if (!isRunning) {
        setIsRunning(true);
    }
    
    // 現在の editableBodies の値を bodiesRef にコピーして再初期化
    // ❗ 参照が同じにならないよう、ディープコピー（新しい配列とオブジェクト）が必要です
    const newInitialState = editableBodies.map(body => {
        
        return {
            ...body,
            position: { 
                x: body.position.x, 
                y: body.position.y,
            },
            velocity: { 
                vx: body.velocity.vx, 
                vy: body.velocity.vy,
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

  // useEffect: 初期化とアニメーションループの管理
    useEffect(() => {
        
        // numBodiesが変更された場合、editableBodiesをリセット
        if (numBodies !== editableBodies.length) {
            resetBodyNumber();
        } else if (bodiesRef.current.length === 0) {
            // 最初のマウント時に初期状態を設定
            resetSimulation();
        }


        if (isRunning) {
            // 実行中の場合、アニメーションループを開始
            animationRef.current = requestAnimationFrame(animate);
        } else {
            // 停止中の場合、アニメーションループを停止
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null; // nullを設定して次の再開に備える
            }
        }
        
        // クリーンアップ関数
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isRunning, isTracing, numBodies, animate, resetSimulation]);

  // 天体数変更ハンドラ
  const handleNumBodiesChange = (count: number) => {
      // 実行中の場合はシミュレーションを停止
      if (isRunning) {
          setIsRunning(false);
      }
      // 天体数を更新し、リセットをトリガー
      setNumBodies(count);
      // resetSimulation は useEffect に依存しているため、numBodies 変更後に呼ばれるのが理想的。
      // ただし、即時フィードバックのためここで呼ぶか、numBodies を依存配列に加えた useEffect に任せる。
      // 今回は numBodies の変更時に editableBodies を更新するために resetSimulation のロジックを微調整し、
      // resetSimulation を useEffect の依存に加える。
  };

  // 新しい文字列入力ハンドラ
  const handleInputChange = (id: number, field: keyof typeof inputStrings[1], valueString: string) => {

      // 1. UI状態 (inputStrings) をまず更新（空欄や '-' を即座に表示）
      setInputStrings(prev => ({
          ...prev,
          [id]: { ...prev[id], [field]: valueString }
      }));

      // 2. 数値として有効な場合にのみ editableBodies を更新
      const value = parseFloat(valueString);

      // 3. 無効な文字列（NaN、空文字、'-'）の場合、editableBodies の更新をスキップ
      if (isNaN(value) || valueString === '-' || valueString === '') {
          return;
      }

      // 4. mass の負の値チェック
      let finalValue = value;
      if (field === 'mass' && value < 0) {
          finalValue = 0;
      }

      // 5. editableBodies を更新するロジックを呼び出す
      updateBodyValue(id, field as any, finalValue); 
  };

  // updateBodyValue 関数（元の handleBodyChange の実処理部分）
  //    これは既存の editableBodies 更新ロジックを再利用
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


  return (
    <div 
      style={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '10px 20px 10px 20px', 
        maxWidth: '1200px',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#1E1E1E',
      }}
    >
      
      {/* 1. タイトル */}
      <h1 style={{ color: '#fff', marginTop: '20px', marginBottom: '20px' }}>
        🌌 重力シミュレーション
      </h1>
      

      {/* 2. キャンバスとコントロールパネルを並べるコンテナ (水平Flex) */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', maxWidth: '100%', width: '100%' }}> 
          
          {/* 2-A. キャンバスエリア (左側) */}
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
        {/* 2-B. コントロールパネル (右側) */}
        <div 
            style={{ 
                margin: '0',
                border: '1px solid #444', 
                padding: '10px', 
                borderRadius: '5px', 
                width: '100%', 
                // 最大幅を再設定し、キャンバスの横に収まるようにする
                maxWidth: '650px', 
            }}
        >
            {/* 天体数選択ラジオボタン */}
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #333', borderRadius: '5px' }}>
                <p style={{ color: '#ccc', fontSize: '0.9rem', margin: '0 0 8px 0' }}>天体の数を選択:</p>
                <label style={{ color: '#fff', marginRight: '20px', cursor: 'pointer' }}>
                    <input 
                        type="radio" 
                        name="numBodies" 
                        value={2} 
                        checked={numBodies === 2}
                        onChange={() => handleNumBodiesChange(2)}
                        style={{ marginRight: '5px' }}
                    />
                    2体問題
                </label>
                <label style={{ color: '#fff', cursor: 'pointer' }}>
                    <input 
                        type="radio" 
                        name="numBodies" 
                        value={3} 
                        checked={numBodies === 3}
                        onChange={() => handleNumBodiesChange(3)}
                        style={{ marginRight: '5px' }}
                    />
                    3体問題
                </label>
            </div>
            {/* メインコントロールボタン群 */}
            <div 
                style={{ 
                    marginTop: '0px',     // 上部の余白は不要（パネル上端に合わせる）
                    marginBottom: '15px', // 天体設定ヘッダーとの間に適切な隙間を確保
                    display: 'flex', 
                    flexWrap: 'wrap',
                    justifyContent: 'space-between'
                }}
            >
              {/* 停止・再開ボタン */}
              <button 
                onClick={() => setIsRunning(!isRunning)} 
                style={{
                  cursor: 'pointer',
                  backgroundColor: isRunning ? '#DC3545' : '#28A745', 
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  transition: 'background-color 0.3s',
                  flexGrow: 0, 
                  width: 'calc(100% - 5px)', 
                  padding: '8px 12px', 
                  fontSize: '14px',
                  boxSizing: 'border-box', // 幅にパディング等を含める
                }}
              >
                {isRunning ? '⏸️ シミュレーションを停止' : '▶️ シミュレーションを再開'}
              </button>
              
              {/* 軌道モード切替ボタン */}
              <button 
                onClick={() => setIsTracing(!isTracing)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: isTracing ? '#007BFF' : '#6C757D', 
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  transition: 'background-color 0.3s',
                  flexGrow: 0, 
                  width: 'calc(100% - 5px)', 
                  padding: '8px 12px', 
                  fontSize: '14px',
                  boxSizing: 'border-box', // 幅にパディング等を含める
                  marginTop: '10px',
                }}
              >
                {isTracing ? '🔄 残像モード' : '✏️ 永続軌道'}
              </button>
            </div>

            <h2 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 8px 0' }}>設定変更</h2>
            {/* 新しい Flex コンテナ: 天体パネルを水平に並べる */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>

                {editableBodies.map(body => (
                    <div 
                        key={body.id} 
                        // flex: 1 0 0 で利用可能なスペースを均等に分割
                        style={{ flex: '1 0 0', 
                            // 以前のボーダーとパディングを維持
                            padding: '5px', 
                            border: `1px solid ${body.color}`, 
                            borderRadius: '5px' 
                        }}
                    >
                        <div 
                            style={{ 
                                color: body.color, 
                                display: 'flex', 
                                fontWeight: 'bold', 
                                fontSize: '0.9rem', 
                                marginBottom: '5px',
                                // 天体 ID と色コードを両端に寄せるための設定を追加
                                justifyContent: 'space-between' ,
                                // 最小幅を設定し、改行を防ぐ
                                minWidth: '100px', 
                                // テキストが折り返さないように設定
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {/* 1. 天体 ID を span で囲む */}
                            <span>天体 {body.id}</span> 

                            {/* 2. 色コードを別の span で囲む (fontWeight を normal にして目立たなくする) */}
                            <span style={{ fontWeight: 'normal' }}>({body.color})</span>
                        </div>

                        {/* 内部の入力フィールドを縦に配置する Flex/Block コンテナ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>

                            {/* 質量 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>M: 
                            <input 
                                type="number" 
                                // value は inputStrings から取得し、存在しない場合は空文字列
                                value={inputStrings[body.id]?.mass || ''} 
                                // onChange は handleInputChange を呼び出す
                                onChange={e => handleInputChange(body.id, 'mass', e.target.value)} 
                                style={{ width: '60px', padding: '3px' }} 
                                disabled={isRunning} 
                            />
                            </label>

                            {/* X位置 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>X : 
                                <input 
                                    type="number" 
                                    // value は inputStrings から取得し、存在しない場合は空文字列
                                    value={inputStrings[body.id]?.x || ''} 
                                    // onChange は handleInputChange を呼び出す
                                    onChange={e => handleInputChange(body.id, 'x', e.target.value)} 
                                    style={{ width: '60px', padding: '3px' }} 
                                    disabled={isRunning} 
                                />
                            </label>
                      
                            {/* Y位置 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>Y : 
                                <input 
                                    type="number" 
                                    // value は inputStrings から取得し、存在しない場合は空文字列
                                    value={inputStrings[body.id]?.y || ''} 
                                    // onChange は handleInputChange を呼び出す
                                    onChange={e => handleInputChange(body.id, 'y', e.target.value)} 
                                    style={{ width: '60px', padding: '3px' }} 
                                    disabled={isRunning} 
                                />
                            </label>

                            {/* X速度 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>Vx: 
                                <input 
                                    type="number" 
                                    // value は inputStrings から取得し、存在しない場合は空文字列
                                    value={inputStrings[body.id]?.vx || ''} 
                                    // onChange は handleInputChange を呼び出す
                                    onChange={e => handleInputChange(body.id, 'vx', e.target.value)} 
                                    style={{ width: '60px', padding: '3px' }} 
                                    disabled={isRunning} 
                                />
                            </label>
                      
                            {/* Y速度 */}
                            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>Vy: 
                                <input 
                                    type="number" 
                                    // value は inputStrings から取得し、存在しない場合は空文字列
                                    value={inputStrings[body.id]?.vy || ''} 
                                    // onChange は handleInputChange を呼び出す
                                    onChange={e => handleInputChange(body.id, 'vy', e.target.value)} 
                                    style={{ width: '60px', padding: '3px' }} 
                                    disabled={isRunning} 
                                />
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