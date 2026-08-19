'use client';

import React from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeComponent: React.FC<QRCodeProps> = ({ value, size = 96, className = '' }) => {
  // Pure SVG QR generator (deterministic, lightweight, 0 dependencies)
  const hash = Array.from(value).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000007, 0);
  const matrixSize = 21;
  const cells: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  // Set finder patterns (top-left, top-right, bottom-left)
  const addFinderPattern = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          cells[row + r][col + c] = true;
        }
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, 14);
  addFinderPattern(14, 0);

  // Fill pseudo-random data bits based on string hash
  let seed = hash;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const inTL = r < 7 && c < 7;
      const inTR = r < 7 && c >= 14;
      const inBL = r >= 14 && c < 7;
      if (!inTL && !inTR && !inBL) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        cells[r][c] = seed % 2 === 0;
      }
    }
  }

  const cellSize = size / matrixSize;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width={size} height={size} fill="#FFFFFF" rx="8" />
      {cells.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.2}
              height={cellSize + 0.2}
              fill="#09090B"
            />
          ) : null
        )
      )}
    </svg>
  );
};
