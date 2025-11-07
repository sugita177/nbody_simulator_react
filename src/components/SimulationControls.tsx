// src/components/SimulationControls.tsx

import React from 'react';
import { type Body, type InputStrings, type FieldName } from '../types';

// ControlButtonコンポーネントとInputGroupコンポーネントの定義は省略（前回と同じか、必要最小限の調整）

interface SimulationControlsProps {
    numBodies: number;
    isRunning: boolean;
    isTracing: boolean;
    handleNumBodiesChange: (count: number) => void;
    setIsRunning: (running: (prev: boolean) => boolean) => void;
    setIsTracing: (tracing: (prev: boolean) => boolean) => void;
    resetSimulation: () => void;
    editableBodies: Body[];
    inputStrings: InputStrings;
    handleInputChange: (id: number, field: FieldName, valueString: string) => void;
}

// ControlButtonコンポーネント (前回のものをそのまま使用)
const ControlButton: React.FC<{ 
    label: string; 
    onClick: () => void; 
    isActive: boolean; 
    isPrimary?: boolean; 
    style?: React.CSSProperties; 
}> = ({ label, onClick, isActive, isPrimary = false, style: additionalStyle = {} }) => {
    
    const baseStyle: React.CSSProperties = {
        backgroundColor: isActive ? (isPrimary ? '#28A745' : '#17A2B8') : '#DC3545',
        cursor: 'pointer',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        transition: 'background-color 0.3s ease, boxSshadow 0.3s ease',
        padding: '8px 6px',
        fontSize: '0.85rem',
        boxSizing: 'border-box',
        marginBottom: '0',
        fontWeight: 'bold',
        boxShadow: isActive ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.1)',
        flex: 1,
        minWidth: '0',
    };

    return (
        <button 
            onClick={onClick} 
            style={{ ...baseStyle, ...additionalStyle }}
        >
            {label}
        </button>
    );
};


const SimulationControls: React.FC<SimulationControlsProps> = ({
    numBodies,
    isRunning,
    isTracing,
    handleNumBodiesChange,
    setIsRunning,
    setIsTracing,
    resetSimulation,
    editableBodies,
    inputStrings,
    handleInputChange,
}) => {
    return (
        <div style={{ 
            width: '400px', 
            minWidth: '300px', 
            backgroundColor: '#2A2A2A', 
            padding: '10px', 
            borderRadius: '8px', 
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
            color: '#fff',
            display: 'flex', 
            flexDirection: 'column', 
            maxHeight: '100vh', 
            boxSizing: 'border-box'
        }}>
            {/* 変更: h2のmarginBottomを8pxから4pxに削減 */}
            <h2 style={{ fontSize: '1.0rem', marginTop: '4px', marginBottom: '4px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
                シミュレーション制御 ⚙️
            </h2>

            {/* 1. コントロールボタン群 */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <ControlButton 
                    label={isRunning ? '⏸️ 停止' : '▶️ 実行'}
                    onClick={() => setIsRunning(prev => !prev)}
                    isActive={isRunning}
                    isPrimary={true}
                />
                
                <ControlButton 
                    label="🔄 リセット"
                    onClick={resetSimulation}
                    isActive={true}
                    isPrimary={false}
                />

                <ControlButton 
                    label="🔄 軌跡描画切替"
                    onClick={() => setIsTracing(prev => !prev)}
                    isActive={isTracing}
                    isPrimary={false}
                />
            </div>
            

            {/* 2. 天体数選択 */}
            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>天体数 ({numBodies}体)</label>
                <select 
                    value={numBodies} 
                    onChange={(e) => handleNumBodiesChange(parseInt(e.target.value))}
                    style={{ 
                        width: '100%', 
                        padding: '6px', 
                        borderRadius: '4px', 
                        border: '1px solid #555',
                        backgroundColor: '#3A3A3A',
                        color: '#fff',
                        fontSize: '0.9rem'
                    }}
                >
                    <option value={2}>2体 (Two-Body)</option>
                    <option value={3}>3体 (Three-Body)</option>
                </select>
            </div>

            {/* 3. 各天体の設定入力 (横スクロール可能) */}
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>天体の初期条件（リセット後に適用）</label>
            <div style={{ 
                display: 'flex', 
                flexDirection: 'row',
                gap: '10px', 
                overflowX: 'auto', 
                overflowY: 'hidden', 
                paddingBottom: '10px', 
                flex: 1, 
                minHeight: '0', 
                boxSizing: 'border-box'
            }}>
                {editableBodies.map(body => (
                    <div key={body.id} style={{ 
                        backgroundColor: '#333', 
                        padding: '5px', 
                        borderRadius: '6px', 
                        flexShrink: 0, 
                        width: '120px', 
                        borderLeft: `5px solid ${body.color}`,
                        boxSizing: 'border-box'
                    }}>
                        {/* 変更: h4のmarginBottomを10pxから6pxに削減 */}
                        <h4 style={{ 
                            fontSize: '1rem', 
                            marginTop: '3px',
                            marginBottom: '6px', 
                            color: body.color,
                            textAlign: 'center'
                        }}>
                            天体 ID: {body.id}
                        </h4>
                        
                        {/* 5つの入力を縦に並べる */}
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '8px', 
                        }}>
                            <InputGroup id={body.id} label="位置 X" field="x" value={inputStrings[body.id]?.x || ''} onChange={handleInputChange} />
                            <InputGroup id={body.id} label="位置 Y" field="y" value={inputStrings[body.id]?.y || ''} onChange={handleInputChange} />
                            <InputGroup id={body.id} label="速度 Vx" field="vx" value={inputStrings[body.id]?.vx || ''} onChange={handleInputChange} />
                            <InputGroup id={body.id} label="速度 Vy" field="vy" value={inputStrings[body.id]?.vy || ''} onChange={handleInputChange} />
                            <InputGroup id={body.id} label="質量 M" field="mass" value={inputStrings[body.id]?.mass || ''} onChange={handleInputChange} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// InputGroupコンポーネント (前回のものをそのまま使用)
const InputGroup: React.FC<{
    id: number;
    label: string;
    field: FieldName;
    value: string;
    onChange: (id: number, field: FieldName, valueString: string) => void;
}> = ({ id, label, field, value, onChange }) => (
    <div style={{ marginBottom: '0px' }}>
        <label style={{ display: 'block', marginBottom: '2px', fontSize: '0.75rem' }}>{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(id, field, e.target.value)}
            style={{
                width: '100%',
                padding: '5px',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#444',
                color: '#fff',
                boxSizing: 'border-box',
                fontSize: '0.85rem'
            }}
        />
    </div>
);

export default SimulationControls;