"use client";

/**
 * The wind-direction dial.
 *
 * The arrow points the way the wind is *going* (meteorological direction is
 * where it comes from, so the needle sits at `direction + 180`), which is what
 * you want when you're reading it off a dock. It animates to new headings by
 * the short way around rather than unwinding through 360°.
 */

import { useEffect, useRef, useState } from "react";
import { cardinal } from "@/lib/units";

type Props = {
  /** Degrees the wind is blowing from. */
  direction: number;
  /** Shown in the middle of the dial. */
  label?: string;
  sublabel?: string;
  size?: number;
};

export function Compass({ direction, label, sublabel, size = 132 }: Props) {
  // Kept as an unbounded angle so the CSS transition takes the shortest path.
  const [angle, setAngle] = useState(() => direction + 180);
  const previous = useRef(direction + 180);

  useEffect(() => {
    const target = direction + 180;
    let delta = (target - previous.current) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    previous.current += delta;
    setAngle(previous.current);
  }, [direction]);

  const radius = size / 2;
  const ticks = Array.from({ length: 36 }, (_, index) => index * 10);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Wind from the ${cardinal(direction)}, ${Math.round(direction)} degrees`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <linearGradient id="trident-needle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.86 0.13 196)" />
            <stop offset="100%" stopColor="oklch(0.60 0.11 202)" />
          </linearGradient>
        </defs>

        {/* Bezel */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - 1}
          fill="oklch(0.185 0.036 250 / 0.55)"
          stroke="oklch(0.972 0.008 240 / 0.12)"
          strokeWidth="1"
        />
        <circle
          cx={radius}
          cy={radius}
          r={radius - 12}
          fill="none"
          stroke="oklch(0.972 0.008 240 / 0.06)"
          strokeWidth="1"
        />

        {/* Degree ticks, longer every 90° */}
        {ticks.map((tick) => {
          const isCardinal = tick % 90 === 0;
          const length = isCardinal ? 8 : tick % 30 === 0 ? 5 : 3;
          const radians = ((tick - 90) * Math.PI) / 180;
          const outer = radius - 4;
          const inner = outer - length;
          return (
            <line
              key={tick}
              x1={radius + Math.cos(radians) * inner}
              y1={radius + Math.sin(radians) * inner}
              x2={radius + Math.cos(radians) * outer}
              y2={radius + Math.sin(radians) * outer}
              stroke={
                isCardinal
                  ? "oklch(0.815 0.108 78 / 0.75)"
                  : "oklch(0.972 0.008 240 / 0.22)"
              }
              strokeWidth={isCardinal ? 1.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Cardinal letters */}
        {(
          [
            ["N", radius, 20],
            ["E", size - 18, radius + 4],
            ["S", radius, size - 13],
            ["W", 18, radius + 4],
          ] as const
        ).map(([letter, x, y]) => (
          <text
            key={letter}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.08em"
            fill={
              letter === "N" ? "oklch(0.815 0.108 78)" : "oklch(0.605 0.024 245)"
            }
          >
            {letter}
          </text>
        ))}

        {/*
          Two nested groups on purpose. A CSS animation replaces `transform`
          outright, so putting the sway keyframes and the heading on the same
          element would leave the needle swaying around north instead of around
          the actual wind direction. The outer group holds the heading, the
          inner one does the drift.
        */}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${radius}px ${radius}px`,
            transition: "transform 900ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <g className="sway" style={{ transformOrigin: `${radius}px ${radius}px` }}>
            <path
              d={`M ${radius} ${radius - 40} L ${radius + 7.5} ${radius + 8} L ${radius} ${radius + 2} L ${radius - 7.5} ${radius + 8} Z`}
              fill="url(#trident-needle)"
            />
            <circle cx={radius} cy={radius} r="3.5" fill="oklch(0.86 0.13 196)" />
          </g>
        </g>
      </svg>

      {label ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-14">
          <span className="readout text-lg font-semibold text-foam">{label}</span>
          {sublabel ? (
            <span className="text-[10px] tracking-wide text-fathom">{sublabel}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
