"use client";

import React from "react";

interface FreeScrollSliderProps {
  children: React.ReactNode;
  gap?: number;
  className?: string;
}

const FreeScrollSlider: React.FC<FreeScrollSliderProps> = ({
  children,
  gap = 8,
  className,
}) => {
  const gapPx = typeof gap === "number" ? `${gap}px` : `${gap}`;
  return (
    <div
      className={`w-full overflow-x-auto scrollbar-none hide-native-scrollbar ${
        className ?? ""
      }`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex items-center" style={{ columnGap: gapPx }}>
        {children}
      </div>
      <style jsx global>{`
        .hide-native-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-native-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default FreeScrollSlider;
