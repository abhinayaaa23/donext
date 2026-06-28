import React from "react";

interface NudgeIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export const NudgeIcon: React.FC<NudgeIconProps> = ({ className = "h-5 w-5", style }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Guiding Spark concept from the design direction */}
      {/* Elegantly curved four-pointed star */}
      <path 
        d="M12 3C12 6.5 9.5 9 6 9C9.5 9 12 11.5 12 15C12 11.5 14.5 9 18 9C14.5 9 12 6.5 12 3Z" 
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      {/* Curved horizon/path marker below the star */}
      <path 
        d="M4 19.5Q12 14.5 20 19.5" 
      />
    </svg>
  );
};
