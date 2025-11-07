// src/types.ts

// 座標・速度の型
export type Vector = { x: number; y: number; };
export type Velocity = { vx: number; vy: number; };

// 天体 (Body) の型
export type Body = {
    id: number;
    position: Vector;
    velocity: Velocity;
    mass: number;
    radius: number;
    color: string;
};

// UI入力用の文字列の型 (キーは天体のID)
export type InputStrings = Record<number, { x: string; y: string; vx: string; vy: string; mass: string; }>;

// 設定フィールド名
export type FieldName = 'x' | 'y' | 'vx' | 'vy' | 'mass';

// シミュレーション履歴の型
export type HistoryRecord = Record<number, { x: number, y: number }[]>;