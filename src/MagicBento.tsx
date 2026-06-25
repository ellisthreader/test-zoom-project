import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import "./MagicBento.css";

export type BentoSize = "default" | "featured" | "tall";

export interface BentoItem {
  /** Small category tag shown at the top of the card. */
  label: string;
  /** Headline shown at the bottom of the card. */
  title: string;
  /** Supporting copy shown under the title. */
  body: string;
  /** Bento footprint. "featured" spans 2×2, "tall" spans 2 rows. */
  size?: BentoSize;
}

export interface MagicBentoProps {
  items: BentoItem[];
  /** RGB triplet (no rgb() wrapper) used for the glow + particles. */
  glowColor?: string;
  /** Radius in px within which a card's border lights up as the cursor nears. */
  proximity?: number;
  /** Floating particles spawned while a "featured" card is hovered. */
  particleCount?: number;
}

const reveal = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function createParticle(x: number, y: number, glowColor: string): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = "magic-bento__particle";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.background = `rgba(${glowColor}, 1)`;
  el.style.boxShadow = `0 0 7px rgba(${glowColor}, 0.8)`;
  return el;
}

interface ParticleCardProps {
  glowColor: string;
  particleCount: number;
  enableParticles: boolean;
  disabled: boolean;
  className: string;
  children: ReactNode;
}

function ParticleCard({ glowColor, particleCount, enableParticles, disabled, className, children }: ParticleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLSpanElement[]>([]);
  const animationsRef = useRef<Animation[]>([]);

  const clearParticles = useCallback(() => {
    animationsRef.current.forEach((anim) => anim.cancel());
    animationsRef.current = [];
    particlesRef.current.forEach((p) => p.remove());
    particlesRef.current = [];
  }, []);

  const spawnParticles = useCallback(() => {
    const card = cardRef.current;
    if (!card || disabled || !enableParticles) return;
    const { width, height } = card.getBoundingClientRect();

    for (let i = 0; i < particleCount; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const particle = createParticle(x, y, glowColor);
      card.appendChild(particle);
      particlesRef.current.push(particle);

      const drift = 28 + Math.random() * 40;
      const angle = Math.random() * Math.PI * 2;
      const anim = particle.animate(
        [
          { transform: "translate(0px, 0px) scale(0.4)", opacity: 0 },
          { opacity: 1, offset: 0.2 },
          {
            transform: `translate(${Math.cos(angle) * drift}px, ${Math.sin(angle) * drift}px) scale(1)`,
            opacity: 0,
          },
        ],
        {
          duration: 1800 + Math.random() * 1600,
          delay: i * 80,
          iterations: Infinity,
          easing: "ease-in-out",
        },
      );
      animationsRef.current.push(anim);
    }
  }, [disabled, enableParticles, glowColor, particleCount]);

  useEffect(() => clearParticles, [clearParticles]);

  const handleEnter = useCallback(() => spawnParticles(), [spawnParticles]);
  const handleLeave = useCallback(() => clearParticles(), [clearParticles]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card || disabled) return;
      const rect = card.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "magic-bento__ripple";
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      ripple.style.background = `radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, transparent 70%)`;
      card.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    },
    [disabled, glowColor],
  );

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

export default function MagicBento({
  items,
  glowColor = "37, 99, 235",
  proximity = 340,
  particleCount = 12,
}: MagicBentoProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (reduceMotion) return;
    const grid = gridRef.current;
    if (!grid) return;

    const handleMove = (event: MouseEvent) => {
      const cards = grid.querySelectorAll<HTMLElement>(".magic-bento__card");
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const relX = event.clientX - rect.left;
        const relY = event.clientY - rect.top;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const distance = Math.hypot(event.clientX - cx, event.clientY - cy);
        const intensity = Math.max(0, 1 - distance / proximity);
        card.style.setProperty("--glow-x", `${relX}px`);
        card.style.setProperty("--glow-y", `${relY}px`);
        card.style.setProperty("--glow-intensity", intensity.toFixed(3));
      });
    };

    const handleLeave = () => {
      grid
        .querySelectorAll<HTMLElement>(".magic-bento__card")
        .forEach((card) => card.style.setProperty("--glow-intensity", "0"));
    };

    window.addEventListener("mousemove", handleMove);
    grid.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      grid.removeEventListener("mouseleave", handleLeave);
    };
  }, [proximity, reduceMotion]);

  return (
    <motion.div
      ref={gridRef}
      className="magic-bento"
      style={{ "--glow-color": glowColor } as React.CSSProperties}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ staggerChildren: 0.09 }}
    >
      {items.map((item) => {
        const size = item.size ?? "default";
        return (
          <motion.div className={`magic-bento__cell is-${size}`} key={item.title} variants={reveal}>
            <ParticleCard
              className="magic-bento__card"
              glowColor={glowColor}
              particleCount={particleCount}
              enableParticles={size === "featured"}
              disabled={reduceMotion}
            >
              <span className="magic-bento__border-glow" aria-hidden="true" />
              <div className="magic-bento__content">
                <span className="magic-bento__label">{item.label}</span>
                <div className="magic-bento__text">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </div>
            </ParticleCard>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
