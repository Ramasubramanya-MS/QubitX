import React, { useEffect, useRef } from "react";
import "./QubitXIntro.css"; // reuses your hero styles

export default function QubitXHero() {
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const orbitRef = useRef(null);
  const dotRef = useRef(null);
  const dot2Ref = useRef(null);
  const rectangleRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    // Load GSAP + ScrollTrigger via CDN (no npm change needed)
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js";
    script.onload = () => {
      const script2 = document.createElement("script");
      script2.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js";
      script2.onload = initAnimations;
      document.head.appendChild(script2);
    };
    document.head.appendChild(script);

    const initAnimations = () => {
      const { gsap } = window;
      gsap.registerPlugin(window.ScrollTrigger);

      // Place the orbiting bits
      gsap.set(dotRef.current, { x: 200, y: -100 });
      gsap.set(dot2Ref.current, { x: -150, y: 200 });
      gsap.set(rectangleRef.current, { x: 300, y: 50 });
      gsap.set(circleRef.current, { x: -200, y: -150 });

      // Rotate the orbit while user scrolls THROUGH the hero (100vh)
      gsap.to(orbitRef.current, {
        rotation: 720,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      // Nice entrance for the main title + elements
      gsap.fromTo(
        heroRef.current,
        { scale: 0.85, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.2, ease: "power2.out" }
      );
      gsap.fromTo(
        [dotRef.current, dot2Ref.current, rectangleRef.current, circleRef.current],
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.9, stagger: 0.15, delay: 0.3, ease: "back.out(1.7)" }
      );
    };

    return () => {
      // Clean up injected scripts if component unmounts
      const scripts = document.querySelectorAll('script[src*="gsap"]');
      scripts.forEach((s) => s.parentNode && s.parentNode.removeChild(s));
    };
  }, []);

  return (
    // Use ONLY the hero section (no map, no extra sections)
    <div ref={containerRef} className="hero-section">
      <div className="hero-bg" />

      <div ref={heroRef} className="hero-content">
        <h1 className="hero-title">
          Qubit<span className="hero-x">X</span>
        </h1>
        <div style={{ marginTop: 24, textAlign: "center", color: "#cbd5e1" }}>
          <span>Scroll to enter</span>
        </div>
      </div>

      {/* Orbiting elements */}
      <div ref={orbitRef} className="orbit-container">
        <div ref={dotRef} className="orbit-dot orbit-dot-1" />
        <div ref={dot2Ref} className="orbit-dot orbit-dot-2" />
        <div ref={rectangleRef} className="orbit-rectangle">
          <div className="rect-dot rect-dot-tl" />
          <div className="rect-dot rect-dot-tr" />
          <div className="rect-dot rect-dot-bl" />
          <div className="rect-dot rect-dot-br" />
        </div>
        <div ref={circleRef} className="orbit-circle" />
      </div>

      {/* Faint orbit rings */}
      <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.1,
          }}
        >
          <div style={{ width: 384, height: 384, border: "1px solid #475569", borderRadius: "9999px" }} />
          <div
            style={{
              position: "absolute",
              width: 320,
              height: 320,
              border: "1px solid #475569",
              borderRadius: "9999px",
            }}
          />
        </div>
      </div>
    </div>
  );
}
