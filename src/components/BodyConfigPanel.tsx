// src/components/BodyConfigPanel.tsx

import React from 'react';
import { type Body, type InputStrings, type FieldName } from '../types';

type BodyConfigPanelProps = {
    body: Body;
    inputStrings: InputStrings[1]; // 実際には number をキーとする
    isRunning: boolean;
    handleInputChange: (id: number, field: FieldName, valueString: string) => void;
};

const BodyConfigPanel: React.FC<BodyConfigPanelProps> = ({ 
    body, 
    inputStrings, 
    isRunning, 
    handleInputChange 
}) => {

    // 入力フィールドの共通コンポーネント
    const InputField: React.FC<{ label: string, field: FieldName }> = ({ label, field }) => (
        <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
            {label}: 
            <input 
                type="number" 
                // inputStrings[field]はBodyのIDをキーとするInputStringsから取り出されたオブジェクト
                value={inputStrings?.[field] || ''} 
                onChange={e => handleInputChange(body.id, field, e.target.value)} 
                style={{ 
                    width: '60px', 
                    padding: '3px', 
                    border: '1px solid #555', 
                    backgroundColor: isRunning ? '#1A1A1A' : '#333', 
                    color: isRunning ? '#666' : '#fff', 
                    borderRadius: '3px',
                    cursor: isRunning ? 'not-allowed' : 'text'
                }} 
                disabled={isRunning} 
            />
        </label>
    );

    return (
        <div 
            style={{ 
                flex: '1 0 0', 
                padding: '5px', 
                border: `1px solid ${body.color}`, 
                borderRadius: '5px',
                minWidth: '100px',
                boxShadow: `0 0 5px ${body.color}80`
            }}
        >
            <div 
                style={{ 
                    color: body.color, 
                    display: 'flex', 
                    fontWeight: 'bold', 
                    fontSize: '0.9rem', 
                    marginBottom: '5px',
                    justifyContent: 'space-between',
                    whiteSpace: 'nowrap'
                }}
            >
                <span>天体 {body.id}</span> 
                <span style={{ fontWeight: 'normal' }}>({body.color})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {/* 型定義によりフィールドが保証されるため、inputStrings[field]は安全に使用できる */}
                <InputField label="質量 (M)" field="mass" />
                <InputField label="X位置 (X)" field="x" />
                <InputField label="Y位置 (Y)" field="y" />
                <InputField label="X速度 (Vx)" field="vx" />
                <InputField label="Y速度 (Vy)" field="vy" />
            </div>
        </div>
    );
};

export default BodyConfigPanel;