import React from "react";

interface MonogramDNProps {
  className?: string;
}

export const MonogramDN: React.FC<MonogramDNProps> = ({ className = "h-5 w-5" }) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background-safe premium path-based monogram */}
      <path
        d="M32 25h12v3.5h-3.5v43h3.5v3.5H32v-3.5h3.5v-43H32V25zm16 3.5c11 0 19.5 7.5 19.5 21.5S59 71.5 48 71.5h-4.5v-43H48z M48 68c8 0 11.5-6.5 11.5-18S56 32 48 32h-4.5v36H48z"
        fill="currentColor"
      />
      <path
        d="M48 40l18.5 31.5H72V75h-9v-3.5h1.5l-14-24L48 51v-4h4l-4-7z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M66.5 25H78v3.5h-3.5V56l-3.5-5.5V28.5h-4.5V25z"
        fill="currentColor"
      />
    </svg>
  );
};
