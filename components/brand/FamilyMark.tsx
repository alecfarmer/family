type FamilyMarkProps = {
  size?: number;
  color?: string;
  glow?: boolean;
};

export function FamilyMark({
  size = 28,
  color = "currentColor",
  glow = false,
}: FamilyMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={
        glow
          ? { filter: "drop-shadow(0 0 8px rgba(200, 121, 65, 0.15))" }
          : undefined
      }
    >
      {/* house body with key-notch roof */}
      <path
        d="M5 14.5 L16 4 L17.5 5.4 L17.5 2.5 L20 2.5 L20 7.8 L27 14.5 L27 27 L20 27 L20 19 L12 19 L12 27 L5 27 Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* keyhole dot inside the notch */}
      <circle cx="18.75" cy="4.4" r="0.9" fill={color} />
    </svg>
  );
}
