// src/consts.ts

// Physics Constants (物理定数)
export const TIME_STEP = 0.1;
export const G = 1.0;

// Canvas Drawing Dimensions (描画のキャンバスサイズ)
export const CANVAS_WIDTH = 700;
export const CANVAS_HEIGHT = 420;

// Color Mapping for Trails (座標と履歴の色マッピング)
export const colorMap: Record<string, string> = {
    '#FFD700': '255, 215, 0',    // Gold
    '#ADD8E6': '173, 216, 230',  // LightBlue
    '#90EE90': '144, 238, 144',  // LightGreen
    '#FF6347': '255, 99, 71',    // Tomato
};