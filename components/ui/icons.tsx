type IconProps = {
  size?: number;
  c?: string;
};

export function CopyIcon({ size = 14, c = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect
        x="3"
        y="3"
        width="9"
        height="11"
        rx="1.5"
        stroke={c}
        strokeWidth="1.3"
      />
      <path
        d="M5.5 3V2.2A1.2 1.2 0 0 1 6.7 1h5.6A1.2 1.2 0 0 1 13.5 2.2v8.6A1.2 1.2 0 0 1 12.3 12H12"
        stroke={c}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type EyeIconProps = IconProps & {
  open: boolean;
};

export function EyeIcon({ open, size = 16, c = "currentColor" }: EyeIconProps) {
  return open ? (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M2 10S5 4 10 4s8 6 8 6-3 6-8 6-8-6-8-6Z"
        stroke={c}
        strokeWidth="1.4"
      />
      <circle cx="10" cy="10" r="2.5" stroke={c} strokeWidth="1.4" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M3 3l14 14M9 5.5c.3-.04.65-.06 1-.06 5 0 8 4.56 8 4.56s-.78 1.2-2.13 2.46M14.4 14.4C13.16 15.34 11.7 16 10 16c-5 0-8-6-8-6s1.05-1.6 2.83-3.06"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
