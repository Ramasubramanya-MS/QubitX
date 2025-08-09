// src/components/Layout/MiniQubitX.jsx
import React, { useEffect, useRef } from "react";

export default function MiniQubitX() {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const orbitRef = useRef(null);
  const dotRef = useRef(null);
  const dot2Ref = useRef(null);
  const rectRef = useRef(null);
  const circRef = useRef(null);

  useEffect(() => {
    // Load GSAP + ScrollTrigger via CDN only if not already present
    const ensureGsap = () =>
      new Promise((resolve) => {
        if (window.gsap && window.ScrollTrigger) return resolve();
        const s1 = document.createElement("script");
        s1.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js";
        s1.onload = () => {
          const s2 = document.createElement("script");
          s2.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js";
          s2.onload = resolve;
          document.head.appendChild(s2);
        };
        document.head.appendChild(s1);
      });

    ensureGsap().then(() => {
      const { gsap, ScrollTrigger } = window;
      gsap.registerPlugin(ScrollTrigger);

      // place orbits relative to the small logo
      gsap.set(dotRef.current, { x: 34, y: -12 });
      gsap.set(dot2Ref.current, { x: -26, y: 22 });
      gsap.set(rectRef.current, { x: 44, y: 6 });
      gsap.set(circRef.current, { x: -30, y: -18 });

      // continuous, gentle rotation tied to page scroll
      gsap.to(orbitRef.current, {
        rotation: 720,
        ease: "none",
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top+=20",
          end: "bottom+=400 top",
          scrub: 1,
        },
      });

      // shrink the wordmark slightly as user scrolls in AppLayout
      gsap.fromTo(
        textRef.current,
        { scale: 1, opacity: 1 },
        {
          scale: 0.85,
          opacity: 0.95,
          scrollTrigger: {
            trigger: wrapRef.current,
            start: "top top+=10",
            end: "bottom+=300 top",
            scrub: 1,
          },
        }
      );

      // entrance
      gsap.fromTo(
        [textRef.current, dotRef.current, dot2Ref.current, rectRef.current, circRef.current],
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.6, stagger: 0.05, ease: "power2.out" }
      );
    });
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        height: 48, // header height
      }}
    >
      <h1
        ref={textRef}
        style={{
          fontWeight: 300,
          letterSpacing: "0.08em",
          fontSize: 28,           // smaller than hero
          lineHeight: "28px",
          color: "white",
          display: "inline-block",
          margin: 0,
        }}
      >
        Qubit<span style={{ fontWeight: 500 }}>X</span>
      </h1>

      {/* tiny orbit cluster */}
      <div
        ref={orbitRef}
        style={{
          position: "relative",
          width: 0,
          height: 0,
          marginLeft: 12,
          transformOrigin: "center",
        }}
      >
        <div
          ref={dotRef}
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "rgb(52,211,153)", // emerald-400-ish
            boxShadow: "0 0 8px rgba(52,211,153,0.5)",
          }}
        />
        <div
          ref={dot2Ref}
          style={{
            position: "absolute",
            width: 5,
            height: 5,
            borderRadius: 999,
            background: "rgb(110,231,183)", // emerald-300-ish
          }}
        />
        <div
          ref={rectRef}
          style={{
            position: "absolute",
            width: 24,
            height: 14,
            borderRadius: 4,
            border: "1px solid rgba(52,211,153,0.9)",
            opacity: 0.9,
          }}
        />
        <div
          ref={circRef}
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            borderRadius: 999,
            border: "1px solid rgba(52,211,153,0.9)",
            opacity: 0.9,
          }}
        />
      </div>
    </div>
  );
}
