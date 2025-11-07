// src/utils/physics.ts

import { type Body } from '../types';
import { G, TIME_STEP } from '../consts'; // インポートパスを修正

/**
 * 任意の数の天体を生成するヘルパー関数
 */
const createBody = (id: number, initialMass: number, initialX: number, initialY: number, initialVx: number, initialVy: number, radius: number = 5): Body => ({
    id: id,
    position: { x: initialX, y: initialY },
    velocity: { vx: initialVx, vy: initialVy },
    mass: initialMass,
    radius: radius,
    color: id === 1 ? '#FFD700' : (id === 2 ? '#ADD8E6' : (id === 3 ? '#90EE90' : '#FF6347')),
});

/**
 * 天体の数に応じて初期状態を定義する関数 (useSimulationが依存するため維持)
 */
export const getInitialState = (count: number): Body[] => {
    if (count === 2) {
        // 2体問題の例 (太陽系モデル)
        return [
            createBody(1, 1000, 0, 0, 0, 0, 8), 
            createBody(2, 1, 150, 0, 0, 3, 4), 
        ];
    }
    // 3体問題の例 (ラグランジュ点的な配置)
    return [
        createBody(1, 500, 0, 0, 0, 0),
        createBody(2, 500, 100, 0, 0, 2),
        createBody(3, 500, -100, 0, 0, -2), 
    ];
};

// 2つの天体間の距離の2乗を計算
const calculateDistanceSquared = (body1: Body, body2: Body): number => {
    const dx = body2.position.x - body1.position.x;
    const dy = body2.position.y - body1.position.y;
    return dx * dx + dy * dy;
};

/**
 * 特定の天体 (target) にかかる全天体からの重力加速度ベクトルを計算する。
 * ニュートンの万有引力の法則 a = (G * m2 / r^2) * r(ベクトル)/r
 * @param target 加速度を求めたい天体
 * @param allBodies シミュレーション内の全天体リスト
 * @returns { ax: number, ay: number } 加速度ベクトル
 */
export const calculateAcceleration = (target: Body, allBodies: Body[]): { ax: number; ay: number } => {
    let totalAx = 0;
    let totalAy = 0;

    for (const other of allBodies) {
        // 自身に対する重力は計算しない
        if (target.id === other.id) continue;

        const rSquared = calculateDistanceSquared(target, other);
        
        // 距離 r が 0 に近いと計算が不安定になるため、微小な値を加える（ソフトニング）
        const rMin = 0.5; // 半径より少し小さい値を使用
        const safeRSquared = rSquared + rMin * rMin; 

        // r^3 の逆数 (加速度ベクトルの計算に必要なスケーリング係数)
        const r = Math.sqrt(safeRSquared);
        const inverseR3 = 1.0 / (r * r * r);
        
        // 力の方向ベクトル (ターゲットから相手へ)
        const dx = other.position.x - target.position.x;
        const dy = other.position.y - target.position.y;

        // 加速度の大きさ (G * m2 / r^2) を r で割って r^3 にして、dx, dy に掛ける
        // magnitude = G * m2 / r^3
        const magnitude = G * other.mass * inverseR3;

        totalAx += dx * magnitude;
        totalAy += dy * magnitude;
    }

    return { ax: totalAx, ay: totalAy };
};

/**
 * シミュレーション全体を次のタイムステップへ進める（オイラー法を使用）。
 * @param currentBodies 現在の全天体の状態リスト
 * @returns 次のタイムステップの天体の状態リスト
 */
export const updateSimulation = (currentBodies: Body[]): Body[] => {
    const newBodies: Body[] = [];
    
    for (const body of currentBodies) {
        // 1. 現在の加速度を計算
        const { ax, ay } = calculateAcceleration(body, currentBodies);

        // 2. 速度の更新 (v_new = v_old + a * Δt)
        const newVx = body.velocity.vx + ax * TIME_STEP;
        const newVy = body.velocity.vy + ay * TIME_STEP;

        // 3. 位置の更新 (p_new = p_old + v_new * Δt)
        // p_new = p_old + v_new * Δt の形で、より安定した積分を行う
        const newX = body.position.x + newVx * TIME_STEP;
        const newY = body.position.y + newVy * TIME_STEP;

        // 4. 新しい状態をリストに追加
        newBodies.push({
            ...body,
            position: { x: newX, y: newY },
            velocity: { vx: newVx, vy: newVy },
        });
    }

    return newBodies;
};