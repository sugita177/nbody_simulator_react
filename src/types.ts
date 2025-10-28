// 天体一つ分のデータ型
export type Body = {
  id: number;
  mass: number;
  radius: number;
  position: { x: number; y: number; };
  velocity: { vx: number; vy: number; };
  color: string;
};