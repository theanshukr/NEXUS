import { useState, useEffect } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in milliseconds
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export default function AnimatedCounter({
  value,
  duration = 1500,
  prefix = '',
  suffix = '',
  decimals = 0
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let rafId: number;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function (easeOutQuart) for smooth deceleration
      const easeOut = 1 - Math.pow(1 - percentage, 4);

      setCount(value * easeOut);

      if (progress < duration) {
        rafId = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    rafId = requestAnimationFrame(animate);

    // Cleanup: cancel animation frame on unmount or when value/duration changes
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  );
}
