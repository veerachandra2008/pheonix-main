"use client"
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const BackgroundParticles = () => {
  const [points, setPoints] = useState<{x: string, y: string}[]>([]);

  useEffect(() => {
    // Generate 20 random points only on client
    const newPoints = [...Array(20)].map(() => ({
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`
    }));
    setPoints(newPoints);
  }, []);

  if (points.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {points.map((point, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/10 rounded-full"
          style={{
            left: point.x,
            top: point.y
          }}
          animate={{
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
};