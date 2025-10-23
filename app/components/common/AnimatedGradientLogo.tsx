"use client";

import React, { CSSProperties } from "react";

interface AnimatedGradientLogoProps {
  text?: string;
  speedInSeconds?: number;
  className?: string;
}

const colors = [
  "#ff6b6b",
  "#f7ce68",
  "#4facfe",
  "#43e97b",
  "#a855f7",
  "#ff6b6b",
];

const gradientDefinition = `linear-gradient(90deg, ${colors.join(", ")})`;
const animationName = "gradient-flow-animation";

const AnimatedGradientLogo: React.FC<AnimatedGradientLogoProps> = ({
  text = "My Task Manager",
  speedInSeconds = 6,
  className,
}) => {
  const animatedStyle: CSSProperties = {
    backgroundImage: gradientDefinition,
    backgroundSize: "300% 300%",
    WebkitBackgroundClip: "text",
    color: "transparent",
    animation: `${animationName} ${speedInSeconds}s linear infinite`,
    display: "inline-block",
  };

  return (
    <>
      <span className={className} style={animatedStyle}>
        {text}
      </span>
      <style jsx>{`
        @keyframes ${animationName} {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </>
  );
};

export default AnimatedGradientLogo;
