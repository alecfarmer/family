import { cn } from "@/components/ui/cn";

type WordmarkProps = {
  size?: number;
  className?: string;
};

export function Wordmark({ size = 18, className }: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-display font-semibold text-text leading-none",
        className,
      )}
      style={{ fontSize: size, letterSpacing: "0.08em" }}
    >
      Family
    </span>
  );
}
