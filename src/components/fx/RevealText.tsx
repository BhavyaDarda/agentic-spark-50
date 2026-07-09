import { useEffect, useRef, type ReactNode } from "react";

/**
 * Masked line-by-line reveal. Splits into words to keep it dependency-free
 * (no GSAP SplitText needed), then staggers word Y-translation + opacity via GSAP.
 */
export function RevealText({
  as: Tag = "span",
  children,
  className,
  delay = 0,
  stagger = 0.05,
  duration = 1.05,
}: {
  as?: keyof HTMLElementTagNameMap;
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let killed = false;

    (async () => {
      const { gsap } = await import("gsap");
      if (killed) return;
      const words = el.querySelectorAll<HTMLElement>("[data-w]");
      gsap.set(words, { yPercent: 110, opacity: 0 });
      gsap.to(words, {
        yPercent: 0,
        opacity: 1,
        duration,
        delay,
        stagger,
        ease: "expo.out",
      });
    })();

    return () => {
      killed = true;
    };
  }, [delay, stagger, duration]);

  const text = typeof children === "string" ? children : "";
  const parts = text ? text.split(" ") : [];

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag
      ref={ref as never}
      className={className}
      style={{ display: "inline-block" }}
    >
      {parts.length
        ? parts.map((w, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                overflow: "hidden",
                verticalAlign: "bottom",
                paddingBottom: "0.12em",
                marginBottom: "-0.12em",
              }}
            >
              <span data-w style={{ display: "inline-block", willChange: "transform" }}>
                {w}
                {i < parts.length - 1 ? "\u00A0" : ""}
              </span>
            </span>
          ))
        : children}
    </Tag>
  );
}
