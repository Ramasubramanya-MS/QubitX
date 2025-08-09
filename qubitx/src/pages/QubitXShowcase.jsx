import React, { useEffect, useRef } from "react";
import "./QubitXShowcase.css"; // scroll snap + a few fixes
import AppLayout from "../components/Layout/AppLayout"; // your existing layout (Left/Map/Right)

// NOTE: We’re keeping your Tailwind classes for quick styling.
// If tailwind isn’t enabled, you can convert those to CSS easily.

export default function QubitXShowcase() {
  const scrollerRef = useRef(null);

  // Refs for hero orbit bits (kept minimal)
  const heroRef = useRef(null);
  const orbitRef = useRef(null);
  const dotRef = useRef(null);
  const dot2Ref = useRef(null);
  const rectangleRef = useRef(null);
  const circleRef = useRef(null);

  // Refs for the logo mini-orbit
  const logoRef = useRef(null);
  const logoOrbitRef = useRef(null);
  const logoDotRef = useRef(null);
  const logoDot2Ref = useRef(null);
  const logoRectangleRef = useRef(null);
  const logoCircleRef = useRef(null);

  useEffect(() => {
    // Load GSAP + ScrollTrigger from CDN once
    let mounted = true;
    const load = (src) =>
      new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        document.head.appendChild(s);
      });

    (async () => {
      await load("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js");
      await load("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js");
      if (!mounted) return;

      const { gsap } = window;
      const ScrollTrigger = window.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      // Use the snapping scroller div, not window
      const scroller = scrollerRef.current;

      // ---- Initial placements (simple) ----
      gsap.set(dotRef.current, { x: 200, y: -100 });
      gsap.set(dot2Ref.current, { x: -150, y: 200 });
      gsap.set(rectangleRef.current, { x: 300, y: 50 });
      gsap.set(circleRef.current, { x: -200, y: -150 });

      gsap.set(logoDotRef.current, { x: 40, y: -20 });
      gsap.set(logoDot2Ref.current, { x: -30, y: 40 });
      gsap.set(logoRectangleRef.current, { x: 50, y: 10 });
      gsap.set(logoCircleRef.current, { x: -35, y: -25 });

      // ---- Hero orbit rotates while in first screen only ----
      gsap.to(orbitRef.current, {
        rotation: 720,
        ease: "none",
        scrollTrigger: {
          scroller,
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      // ---- Logo orbit fades in at end of hero, then continues slow ----
      gsap.to(logoRef.current, {
        opacity: 1,
        duration: 0.6,
        scrollTrigger: {
          scroller,
          trigger: "#hero",
          start: "center center",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(logoOrbitRef.current, {
        rotation: 1440,
        ease: "none",
        scrollTrigger: {
          scroller,
          trigger: "#challenge",
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
        },
      });

      // ---- Parallax circles in hero only ----
      gsap.to(".bg-circle-1", {
        y: -120,
        rotation: 120,
        scrollTrigger: {
          scroller,
          trigger: "#hero",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });
      gsap.to(".bg-circle-2", {
        y: 160,
        rotation: -90,
        scrollTrigger: {
          scroller,
          trigger: "#hero",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
      });
      gsap.to(".bg-circle-3", {
        y: -100,
        x: 60,
        rotation: 200,
        scrollTrigger: {
          scroller,
          trigger: "#hero",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.4,
        },
      });

      // ---- Challenge section has its own timeline, pinned within its own screen ----
      const mapSection = document.querySelector("#challenge .map-section");
      const tl = gsap.timeline({
        scrollTrigger: {
          scroller,
          trigger: "#challenge",
          start: "top top",
          end: "bottom top",
          pin: true,          // pin inside the section only
          pinSpacing: true,   // space accounted so next section doesn't overlap
          scrub: 1,
        },
      });

      // Reveal medium, then city, while hiding small/medium respectively
      tl.to("#challenge .small-region", { opacity: 0, scale: 0.6, duration: 0.8 })
        .to("#challenge .medium-region", { opacity: 1, scale: 1, duration: 0.8 }, "<")
        .to("#challenge .medium-region", { opacity: 0, scale: 0.6, duration: 0.8 })
        .to("#challenge .city-region", { opacity: 1, scale: 1, duration: 0.8 }, "<");

      // Little ambient motion
      gsap.to("#challenge .truck", {
        x: "+=20",
        repeat: -1,
        yoyo: true,
        duration: 3,
        ease: "power1.inOut",
        stagger: 0.5,
        scrollTrigger: { scroller, trigger: "#challenge", start: "top top", end: "bottom top" },
      });

      gsap.to("#challenge .truck-path", {
        opacity: 0.8,
        repeat: -1,
        yoyo: true,
        duration: 2,
        ease: "power2.inOut",
        stagger: 0.3,
        scrollTrigger: { scroller, trigger: "#challenge", start: "top top", end: "bottom top" },
      });
    })();

    return () => {
      mounted = false;
      // optional: you can kill ScrollTriggers if you remount this page
      if (window.ScrollTrigger) {
        window.ScrollTrigger.getAll().forEach((st) => st.kill());
      }
    };
  }, []);

  return (
    <div ref={scrollerRef} className="qx-root">
      {/* SECTION 1: HERO */}
      <section id="hero" className="screen relative bg-slate-900 overflow-hidden">
        {/* Background parallax rings */}
        <div className="bg-circle-1 fixed top-20 left-20 w-96 h-96 border border-slate-700 rounded-full opacity-20 pointer-events-none"></div>
        <div className="bg-circle-2 fixed top-1/2 right-20 w-64 h-64 border border-slate-600 rounded-full opacity-15 pointer-events-none"></div>
        <div className="bg-circle-3 fixed bottom-40 left-1/3 w-80 h-80 border border-slate-700 rounded-full opacity-25 pointer-events-none"></div>

        {/* Fixed mini logo that fades in */}
        <div
          ref={logoRef}
          className="fixed top-8 left-8 z-20 opacity-0 scale-90"
          style={{ transformOrigin: "center" }}
        >
          <div className="relative">
            <h1 className="text-2xl font-light text-white tracking-wider">
              Qubit<span className="font-normal">X</span>
            </h1>
            <div ref={logoOrbitRef} className="absolute inset-0 flex items-center justify-center">
              <div ref={logoDotRef} className="absolute w-2 h-2 bg-emerald-400 rounded-full"></div>
              <div ref={logoDot2Ref} className="absolute w-1.5 h-1.5 bg-emerald-300 rounded-full"></div>
              <div ref={logoRectangleRef} className="absolute w-6 h-4 border border-emerald-400 rounded-sm opacity-80"></div>
              <div ref={logoCircleRef} className="absolute w-4 h-4 border border-emerald-400 rounded-full opacity-80"></div>
            </div>
          </div>
        </div>

        {/* Center hero */}
        <div className="h-full flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div ref={heroRef} className="relative z-10">
            <h1 className="text-8xl font-light text-white tracking-wider">
              Qubit<span className="font-normal">X</span>
            </h1>
          </div>

          {/* Orbiting shapes */}
          <div ref={orbitRef} className="absolute inset-0 flex items-center justify-center">
            <div ref={dotRef} className="absolute w-4 h-4 bg-emerald-400 rounded-full shadow-lg" />
            <div ref={dot2Ref} className="absolute w-3 h-3 bg-emerald-300 rounded-full shadow-md" />
            <div
              ref={rectangleRef}
              className="absolute w-32 h-20 border-2 border-emerald-400 rounded-sm flex items-center justify-center"
            />
            <div ref={circleRef} className="absolute w-16 h-16 border-2 border-emerald-400 rounded-full" />
          </div>

          {/* Faint orbit rings */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="w-96 h-96 border border-slate-600 rounded-full" />
            <div className="absolute w-80 h-80 border border-slate-600 rounded-full" />
          </div>
        </div>
      </section>

      {/* SECTION 2: ROUTE OPTIMIZATION CHALLENGE */}
      <section id="challenge" className="screen relative bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="h-full flex items-center justify-center px-8 relative overflow-hidden">
          <div className="text-center text-white max-w-4xl mx-auto relative z-10">
            <h2 className="text-6xl font-light mb-8 bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Route Optimization Challenge
            </h2>
            <p className="text-2xl text-slate-300 leading-relaxed">
              Watch complexity explode as we scale from local deliveries to citywide logistics.
            </p>
          </div>

          {/* Pinned map-like visual within this section only */}
          <div className="map-section absolute inset-0 flex items-center justify-center">
            <div className="map-viewport relative w-full h-full bg-gray-800 overflow-hidden">
              {/* Small Region */}
              <div className="map-layer small-region absolute inset-0 flex items-center justify-center">
                <div className="relative w-96 h-96 bg-gray-700 rounded-lg border-2 border-gray-600">
                  {/* simple roads */}
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-blue-400 -translate-y-1/2"></div>
                  <div className="absolute top-0 left-1/2 w-1 h-full bg-blue-400 -translate-x-1/2"></div>
                  {/* 3 trucks */}
                  <div className="truck absolute w-3 h-6 bg-orange-500 rounded-sm top-1/2 left-8 -translate-y-1/2">
                    <div className="truck-path absolute w-32 h-0.5 bg-orange-400 opacity-60 left-0 top-1/2"></div>
                  </div>
                  <div className="truck absolute w-3 h-6 bg-orange-500 rounded-sm top-1/4 right-12 rotate-90">
                    <div className="truck-path absolute w-24 h-0.5 bg-orange-400 opacity-60 left-0 top-1/2 -rotate-90"></div>
                  </div>
                  <div className="truck absolute w-3 h-6 bg-orange-500 rounded-sm bottom-16 left-1/3">
                    <div className="truck-path absolute w-20 h-0.5 bg-orange-400 opacity-60 left-0 top-1/2"></div>
                  </div>
                </div>
              </div>

              {/* Medium Region */}
              <div className="map-layer medium-region absolute inset-0 flex items-center justify-center opacity-0 scale-75">
                <div className="relative w-full h-full bg-gray-800">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-400"></div>
                  <div className="absolute top-0 left-1/3 w-0.5 h-full bg-blue-400"></div>
                  <div className="absolute top-0 left-2/3 w-0.5 h-full bg-blue-400"></div>
                  {/* 8 trucks (ambient) */}
                  <div className="truck absolute w-2 h-3 bg-orange-500 top-1/2 left-12">
                    <div className="truck-path absolute w-24 h-0.5 bg-orange-400 opacity-50"></div>
                  </div>
                  <div className="truck absolute w-2 h-3 bg-orange-500 top-1/4 left-1/4">
                    <div className="truck-path absolute w-32 h-0.5 bg-orange-400 opacity-50 rotate-45"></div>
                  </div>
                  <div className="truck absolute w-2 h-3 bg-orange-500 top-3/4 right-1/4">
                    <div className="truck-path absolute w-28 h-0.5 bg-orange-400 opacity-50"></div>
                  </div>
                  <div className="truck absolute w-2 h-3 bg-orange-500 top-12 right-12">
                    <div className="truck-path absolute w-20 h-0.5 bg-orange-400 opacity-50 -rotate-45"></div>
                  </div>
                </div>
              </div>

              {/* City Region */}
              <div className="map-layer city-region absolute inset-0 flex items-center justify-center opacity-0 scale-75">
                <div className="relative w-full h-full bg-gray-900 overflow-hidden">
                  <div className="highway absolute top-1/2 left-0 w-full h-1 bg-blue-500"></div>
                  <div className="highway absolute top-0 left-1/2 w-1 h-full bg-blue-500"></div>
                  {/* lots of little “trucks” */}
                  <div className="truck absolute w-1.5 h-2 bg-red-500 top-8 left-8">
                    <div className="truck-path absolute w-40 h-px bg-red-400 opacity-40"></div>
                  </div>
                  <div className="truck absolute w-1.5 h-2 bg-red-500 top-24 right-16">
                    <div className="truck-path absolute w-44 h-px bg-red-400 opacity-40 -rotate-45"></div>
                  </div>
                  {/* add as needed */}
                </div>
              </div>
            </div>
          </div>

          {/* Simple progress dots just for visuals */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
            <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* SECTION 3: YOUR CURRENT APP */}
      <section id="app" className="screen bg-[#0b0e17]">
        <div className="h-full w-full">
          <AppLayout />
        </div>
      </section>
    </div>
  );
}
