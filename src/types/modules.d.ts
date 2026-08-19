declare module 'qrcode.react' {
  import React from 'react';
  export const QRCodeSVG: React.FC<{
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    className?: string;
  }>;
  export const QRCodeCanvas: React.FC<any>;
}

declare module 'html2canvas' {
  export default function html2canvas(
    element: HTMLElement,
    options?: any
  ): Promise<HTMLCanvasElement>;
}

declare module 'jspdf' {
  export default class jsPDF {
    constructor(options?: any);
    addImage(
      imageData: string,
      format: string,
      x: number,
      y: number,
      w: number,
      h: number
    ): void;
    save(filename: string): void;
  }
}
