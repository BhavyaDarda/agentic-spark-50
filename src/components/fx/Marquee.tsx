import type { ReactNode } from "react";

/** CSS-only infinite marquee — duplicates content once so translate(-50%) loops seamlessly. */
export function Marquee({
  children,
  speed = 40,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  return (
    <div
      className={"relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)] " + (className ?? "")}
    >
      <div
        className="flex w-max gap-8 will-change-transform"
        style={{ animation: `marquee-x ${speed}s linear infinite` }}
      >
        <div className="flex gap-8">{children}</div>
        <div className="flex gap-8" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
