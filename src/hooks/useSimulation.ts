// src/hooks/useSimulation.ts

import React, { useRef, useEffect, useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { type Body, type InputStrings, type FieldName, type HistoryRecord } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, colorMap } from '../consts'; // import元の変更
import { updateSimulation, getInitialState } from '../utils/physics';

// useSimulationフックから返される値の型定義
type UseSimulationReturn = {
    numBodies: number;
    setNumBodies: (count: number) => void;
    isRunning: boolean;
    setIsRunning: Dispatch<SetStateAction<boolean>>; 
    isTracing: boolean;
    setIsTracing: Dispatch<SetStateAction<boolean>>;
    editableBodies: Body[];
    inputStrings: InputStrings;
    handleInputChange: (id: number, field: FieldName, valueString: string) => void;
    resetSimulation: () => void;
    handleNumBodiesChange: (count: number) => void;
};

export const useSimulation = (canvasRef: React.RefObject<HTMLCanvasElement | null>): UseSimulationReturn => {
    const animationRef = useRef<number | null>(null);

    // シミュレーションの状態管理
    const [numBodies, setNumBodies] = useState(3);
    const [isRunning, setIsRunning] = useState(true);
    const [isTracing, setIsTracing] = useState(false);
    
    // UIで編集される初期設定としての天体データ
    const [editableBodies, setEditableBodies] = useState<Body[]>(getInitialState(3));
    
    // UI入力フォームの文字列を保持する状態
    const [inputStrings, setInputStrings] = useState<InputStrings>({});

    // シミュレーション実行中のリアルタイム天体データ (Refで保持し、アニメーションループで更新)
    const bodiesRef = useRef<Body[]>([]);
    
    // 軌跡 (トレーサー) データ
    const historyRef = useRef<HistoryRecord>({});

    // UI入力の状態を初期化するヘルパー関数
    const initializeInputStrings = useCallback((bodies: Body[]) => {
        const initialStrings: InputStrings = {};
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

    // 選択された天体数に基づいて状態をリセットする関数
    const resetBodyNumber = useCallback(() => {
        const newInitialState = getInitialState(numBodies);
        setEditableBodies(newInitialState);
        initializeInputStrings(newInitialState);
        
        bodiesRef.current = newInitialState.map(body => ({
            ...body,
            position: { x: body.position.x, y: body.position.y },
            velocity: { vx: body.velocity.vx, vy: body.velocity.vy },
        }));
        
        historyRef.current = {};
        if (!isRunning) setIsRunning(true);
    }, [numBodies, isRunning, initializeInputStrings]);

    // 編集された設定値 (editableBodies) に基づいてシミュレーションを初期化する関数
    const resetSimulation = useCallback(() => {
        if (!isRunning) setIsRunning(true);
        
        // editableBodiesを元に、新しいシミュレーション開始状態を作成
        const newInitialState = editableBodies.map(body => ({
            ...body,
            position: { x: body.position.x, y: body.position.y },
            velocity: { vx: body.velocity.vx, vy: body.velocity.vy },
        }));
        
        bodiesRef.current = newInitialState;
        historyRef.current = {}; // 履歴をクリア
    }, [editableBodies, isRunning]);

    // UI入力文字列を処理し、editableBodiesを更新する関数
    const updateBodyValue = useCallback((id: number, field: FieldName, value: number) => {
        setEditableBodies(prevBodies => 
            prevBodies.map(body => {
                if (body.id !== id) return body;

                const newBody = { ...body };

                if (field === 'mass') {
                    newBody.mass = value;
                } else if (field === 'x' || field === 'y') {
                    newBody.position = { ...newBody.position, [field]: value };
                } else if (field === 'vx' || field === 'vy') {
                    // TypeScriptでは 'vx' | 'vy' のキーは Velocity に含まれるため、型キャストを伴いながら更新
                    newBody.velocity = { ...newBody.velocity, [field as keyof typeof newBody.velocity]: value };
                }

                return newBody;
            })
        );
    }, []);

    // 入力変更ハンドラ (文字列として受け取り、解析後にeditableBodiesを更新)
    const handleInputChange = useCallback((id: number, field: FieldName, valueString: string) => {
        setInputStrings(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: valueString }
        }));

        const value = parseFloat(valueString);

        // 数字でない、または'-'のみの場合は処理をスキップ (リアルタイムで入力を受け付けるため)
        if (isNaN(value) || valueString === '-' || valueString === '') return;

        let finalValue = value;
        // 質量は非負
        if (field === 'mass' && value < 0) {
            finalValue = 0;
        }

        updateBodyValue(id, field, finalValue);
    }, [updateBodyValue]);


    // 描画処理とアニメーションループ (Canvas Drawing Logic)
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        // --- 1. 物理演算の実行と履歴の更新 ---
        const newBodies = updateSimulation(bodiesRef.current);
        bodiesRef.current = newBodies;

        newBodies.forEach(body => {
            if (!historyRef.current[body.id]) {
                historyRef.current[body.id] = [];
            }
            historyRef.current[body.id].push({ 
                x: body.position.x, 
                y: body.position.y 
            });
            // 軌跡の最大長を制限
            if (historyRef.current[body.id].length > 500) {
                historyRef.current[body.id].shift();
            }
        });

        // --- 2. 画面の描画 ---
        
        // 背景クリア (isTracingの状態によってクリア方法を変える)
        if (isTracing) {
            ctx.fillStyle = 'black'; 
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); 
        } else {
            // 透明度を持たせて描画することで、薄い残像を残す
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        
        // 軌跡の描画 (永続軌道モード)
        if (isTracing) {
            Object.keys(historyRef.current).forEach(id => {
                const bodyId = parseInt(id);
                const history = historyRef.current[bodyId];
                const body = bodiesRef.current.find(b => b.id === bodyId);
                if (!body || history.length < 2) return;

                ctx.lineWidth = 1.5;
                const rgb = colorMap[body.color] || '255, 255, 255'; 

                for (let i = 1; i < history.length; i++) {
                    const startPoint = history[i - 1];
                    const endPoint = history[i];

                    const opacity = i / history.length;
                    ctx.strokeStyle = `rgba(${rgb}, ${opacity.toFixed(2)})`;
                    
                    ctx.beginPath();
                    
                    // 座標変換 (中心を原点(0,0)とし、Y軸は反転させる)
                    const startX = CANVAS_WIDTH / 2 + startPoint.x;
                    const startY = CANVAS_HEIGHT / 2 - startPoint.y;
                    ctx.moveTo(startX, startY);

                    const endX = CANVAS_WIDTH / 2 + endPoint.x;
                    const endY = CANVAS_HEIGHT / 2 - endPoint.y;
                    ctx.lineTo(endX, endY);
                    
                    ctx.stroke();
                }
            });
        }

        // 天体の描画
        bodiesRef.current.forEach((body: Body) => {
            ctx.beginPath();
            const screenX = CANVAS_WIDTH / 2 + body.position.x;
            const screenY = CANVAS_HEIGHT / 2 - body.position.y;
            
            ctx.arc(screenX, screenY, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.fill();
            ctx.closePath();
        });
        
        // --- 3. 次のフレームを要求 ---
        animationRef.current = requestAnimationFrame(animate);
    }, [isTracing, canvasRef]); // isTracingとcanvasRefのみ依存

    // useEffect: 初期化とアニメーションループの管理
    useEffect(() => {
        // 初回マウント時または天体数変更時の初期化
        if (numBodies !== editableBodies.length) {
            resetBodyNumber();
        } else if (bodiesRef.current.length === 0) {
            // editableBodiesが設定されているが、シミュレーションがまだ開始されていない場合
            resetSimulation();
        }
        
        // isRunningの状態に基づいてループを開始/停止
        if (isRunning) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        }
        
        // クリーンアップ関数
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isRunning, numBodies, animate, resetSimulation, resetBodyNumber, editableBodies.length]);

    // 初回マウント時に inputStrings を初期化
    useEffect(() => {
        if (editableBodies.length > 0 && Object.keys(inputStrings).length === 0) {
            initializeInputStrings(editableBodies);
        }
    }, [editableBodies, inputStrings, initializeInputStrings]);
    
    // 天体数変更ハンドラ (isRunningをfalseにしてから天体数を変更)
    const handleNumBodiesChange = (count: number) => {
        if (isRunning) setIsRunning(false);
        setNumBodies(count);
    };

    return {
        numBodies,
        setNumBodies,
        isRunning,
        setIsRunning,
        isTracing,
        setIsTracing,
        editableBodies,
        inputStrings,
        handleInputChange,
        resetSimulation,
        handleNumBodiesChange,
    };
};