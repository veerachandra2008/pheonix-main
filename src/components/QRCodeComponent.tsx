'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
}

export const QRCodeComponent: React.FC<QRCodeProps> = ({
  value,
  size = 96,
  className = '',
  level = 'M',
  includeMargin = false,
}) => {
  if (!value) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-zinc-800 rounded-xl flex items-center justify-center text-[10px] text-zinc-500 font-mono ${className}`}
      >
        NO CODE
      </div>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        includeMargin={includeMargin}
        bgColor="#FFFFFF"
        fgColor="#000000"
        imageSettings={{
          src: '/favicon.ico',
          x: undefined,
          y: undefined,
          height: Math.floor(size * 0.18),
          width: Math.floor(size * 0.18),
          excavate: true,
        }}
      />
    </div>
  );
};
