// src/SimulationCanvas.tsx

"use client";

import React, { useRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../consts';
import { useSimulation } from '../hooks/useSimulation';
import SimulationControls from './SimulationControls';

const SimulationCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // カスタムフックからすべての状態とロジックを取得
    const {
        numBodies,
        isRunning,
        isTracing,
        editableBodies,
        inputStrings,
        handleInputChange,
        resetSimulation,
        setIsRunning,
        setIsTracing,
        handleNumBodiesChange,
    } = useSimulation(canvasRef);


    return (
        <div 
            style={{
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                padding: '10px', 
                maxWidth: '1200px',
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#1E1E1E',
                fontFamily: 'Inter, sans-serif',
                minHeight: '100vh'
            }}
        >
            
            <h1 style={{ color: '#fff', marginTop: '10px', marginBottom: '10px' }}>
                🌌 N体問題 重力シミュレーション
            </h1>
            
            {/* キャンバスとコントロールパネルを並べるコンテナ (水平Flex) */}
            <div style={{ 
                display: 'flex', 
                gap: '30px', 
                alignItems: 'flex-start', 
                flexWrap: 'wrap', 
                maxWidth: '100%', 
                justifyContent: 'center' 
            }}> 
                
                {/* A. キャンバスエリア (左側) */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    flexShrink: 0 
                }}>
                    <canvas 
                        ref={canvasRef} 
                        width={CANVAS_WIDTH} 
                        height={CANVAS_HEIGHT} 
                        style={{ 
                            border: '2px solid #555', 
                            backgroundColor: 'black',
                            borderRadius: '8px',
                            boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)' 
                        }} 
                    />
                    <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px' }}>中心座標 (0, 0) はキャンバスの中心です。</p>
                </div>

                {/* B. コントロールパネル (右側) - 分離したコンポーネントを使用 */}
                <SimulationControls
                    numBodies={numBodies}
                    isRunning={isRunning}
                    isTracing={isTracing}
                    handleNumBodiesChange={handleNumBodiesChange}
                    setIsRunning={setIsRunning}
                    setIsTracing={setIsTracing}
                    resetSimulation={resetSimulation}
                    editableBodies={editableBodies}
                    inputStrings={inputStrings}
                    handleInputChange={handleInputChange}
                />
            </div> 
        </div>
    );
};

export default SimulationCanvas;