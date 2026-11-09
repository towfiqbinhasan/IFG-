"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, type HTMLMotionProps, type Variants } from "framer-motion";

/** Container that staggers its <StaggerItem> children in. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

export function StaggerList({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" {...props}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={staggerItem} layout="position" {...props}>
      {children}
    </motion.div>
  );
}

/** Card wrapper with a gentle lift on hover / press. */
export function HoverCard({ children, className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Number that counts up from 0 when it scrolls into view. */
export function AnimatedCounter({ value, duration = 1.1, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        node.textContent = Math.round(v).toLocaleString();
      },
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}
