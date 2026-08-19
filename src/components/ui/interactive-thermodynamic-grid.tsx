"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ThermodynamicGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Grid density. Lower = chunky, Higher = smooth.
   * Default: 20
   */
  resolution?: number;
  /**
   * Cooling rate (0 to 1). Higher = trails fade faster.
   * Default: 0.975 (Vibrant & long-lasting heat trails)
   */
  coolingFactor?: number;
}

const ThermodynamicGrid = ({
  className,
  resolution = 20,
  coolingFactor = 0.975,
  style,
  ...props
}: ThermodynamicGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Simulation State
    let grid: Float32Array;
    let cols = 0;
    let rows = 0;
    let width = 0;
    let height = 0;
    
    // Global Mouse State
    const mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, active: false };

    // --- ENERGETIC ESPORTS THERMAL PALETTE ---
    // Maps 0.0-1.0 temperature to energetic neon Emerald, Teal, Gold & Crimson
    const getThermalColor = (t: number) => {
      // 0.0 -> Dark Emerald (#042f2e)
      // 0.3 -> Neon Emerald (#10b981)
      // 0.6 -> Vibrant Cyan (#06b6d4)
      // 0.8 -> Glowing Gold (#fbbf24)
      // 1.0 -> High-Intensity Crimson White (#fff1f2)

      const r = Math.min(255, Math.max(0, Math.floor(t * 2.8 * 255)));
      const g = Math.min(255, Math.max(0, Math.floor((1 - Math.abs(t - 0.5) * 2) * 255 + t * 200)));
      const b = Math.min(255, Math.max(0, Math.floor((0.8 - t) * 220 + t * 255)));

      return `rgb(${r}, ${g}, ${b})`;
    };

    const resize = () => {
      width = container.offsetWidth || window.innerWidth;
      height = container.offsetHeight || window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      cols = Math.ceil(width / resolution);
      rows = Math.ceil(height / resolution);
      grid = new Float32Array(cols * rows).fill(0);
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleWindowMouseLeave = () => {
      mouse.active = false;
    };

    // --- PHYSICS LOOP ---
    const update = () => {
      if (mouse.active) {
        const dx = mouse.x - mouse.prevX;
        const dy = mouse.y - mouse.prevY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(dist / (resolution / 2));
        
        for (let s = 0; s <= steps; s++) {
            const t = steps > 0 ? s / steps : 0;
            const x = mouse.prevX + dx * t;
            const y = mouse.prevY + dy * t;
            
            const col = Math.floor(x / resolution);
            const row = Math.floor(y / resolution);
            
            const radius = 3; // Broader brush radius for energetic trails
            for (let i = -radius; i <= radius; i++) {
                for (let j = -radius; j <= radius; j++) {
                    const c = col + i;
                    const r = row + j;
                    if (c >= 0 && c < cols && r >= 0 && r < rows) {
                        const idx = c + r * cols;
                        const d = Math.sqrt(i * i + j * j);
                        if (d <= radius) {
                            grid[idx] = Math.min(1.0, grid[idx] + 0.45 * (1 - d / radius));
                        }
                    }
                }
            }
        }
      }
      
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      ctx.clearRect(0, 0, width, height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = c + r * cols;
          let temp = grid[idx];

          // Cooling
          grid[idx] *= coolingFactor;

          if (temp > 0.04) {
             const x = c * resolution;
             const y = r * resolution;
             
             ctx.fillStyle = getThermalColor(temp);
             
             const size = resolution * (0.85 + temp * 0.4);
             const offset = (resolution - size) / 2;
             
             ctx.beginPath();
             ctx.rect(x + offset, y + offset, size, size);
             ctx.fill();
          } else {
             // Subtle grid dot indicator for structure
             if (c % 2 === 0 && r % 2 === 0) {
                 const x = c * resolution;
                 const y = r * resolution;
                 ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
                 ctx.fillRect(x + resolution / 2 - 1, y + resolution / 2 - 1, 2, 2);
             }
          }
        }
      }

      requestAnimationFrame(update);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseleave", handleWindowMouseLeave);
    
    resize();
    update();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseleave", handleWindowMouseLeave);
    };
  }, [resolution, coolingFactor]);

  return (
    <div
      ref={containerRef}
      className={cn("fixed inset-0 z-0 overflow-hidden pointer-events-none bg-black", className)}
      style={style}
      {...props}
    >
      <canvas ref={canvasRef} className="block w-full h-full opacity-90" />
    </div>
  );
};

export default ThermodynamicGrid;
