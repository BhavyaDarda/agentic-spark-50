import mark from "@/assets/reacher-ai-mark.png";
import { cn } from "@/lib/utils";

export function BrandMark({ className, decorative = true }: { className?: string; decorative?: boolean }) {
  return (
    <img
      src={mark}
      alt={decorative ? "" : "REACHER AI"}
      aria-hidden={decorative || undefined}
      width={256}
      height={256}
      className={cn("block aspect-square object-contain", className)}
    />
  );
}