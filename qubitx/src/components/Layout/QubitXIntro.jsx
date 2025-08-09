// QubitXIntro.jsx
import React, { useEffect, useRef } from 'react';
import './QubitXIntro.css'; // You'll need to create this CSS file

const QubitXIntro = ({ onComplete }) => {
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const logoRef = useRef(null);
  const orbitRef = useRef(null);
  const logoOrbitRef = useRef(null);
  const dotRef = useRef(null);
  const dot2Ref = useRef(null);
  const rectangleRef = useRef(null);
  const circleRef = useRef(null);
  const logoDotRef = useRef(null);
  const logoDot2Ref = useRef(null);
  const logoRectangleRef = useRef(null);
  const logoCircleRef = useRef(null);

  useEffect(() => {
    // Import GSAP from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
    script.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';
      script2.onload = initAnimations;
      document.head.appendChild(script2);
    };
    document.head.appendChild(script);

    const initAnimations = () => {
      const { gsap } = window;
      gsap.registerPlugin(window.ScrollTrigger);

      // Initial setup - position elements in orbit for hero
      gsap.set(dotRef.current, { x: 200, y: -100 });
      gsap.set(dot2Ref.current, { x: -150, y: 200 });
      gsap.set(rectangleRef.current, { x: 300, y: 50 });
      gsap.set(circleRef.current, { x: -200, y: -150 });

      // Initial setup for logo elements (smaller orbit)
      gsap.set(logoDotRef.current, { x: 40, y: -20 });
      gsap.set(logoDot2Ref.current, { x: -30, y: 40 });
      gsap.set(logoRectangleRef.current, { x: 50, y: 10 });
      gsap.set(logoCircleRef.current, { x: -35, y: -25 });

      // Main scroll-based rotation for hero elements
      gsap.to(orbitRef.current, {
        rotation: 720,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        }
      });

      // Logo rotation (continues throughout scroll)
      gsap.to(logoOrbitRef.current, {
        rotation: 1440,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
        }
      });

      // Hero to logo transition
      const heroTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: ".map-section",
          start: "top 80%",
          end: "top 20%",
          scrub: 1,
        }
      });

      heroTimeline
        .to(heroRef.current, { scale: 0.3, y: -300, opacity: 0, duration: 1 })
        .to(logoRef.current, { opacity: 1, scale: 1, duration: 1 }, 0);

      // Map section
      const mapSection = document.querySelector('.map-section');
      const mapTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: mapSection,
          start: "top top",
          end: "bottom top",
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            const progress = self.progress;
            const routeCounter = document.querySelector('.route-counter');
            const indicators = document.querySelectorAll('.zoom-indicator');
            
            if (progress < 0.33) {
              if (routeCounter) routeCounter.textContent = '3';
              indicators.forEach((ind, i) => {
                ind.style.backgroundColor = i === 0 ? '#10b981' : '#4b5563';
              });
            } else if (progress < 0.66) {
              if (routeCounter) routeCounter.textContent = '8';
              indicators.forEach((ind, i) => {
                ind.style.backgroundColor = i === 1 ? '#10b981' : '#4b5563';
              });
            } else {
              if (routeCounter) routeCounter.textContent = '25+';
              indicators.forEach((ind, i) => {
                ind.style.backgroundColor = i === 2 ? '#10b981' : '#4b5563';
              });
            }
            
            // Trigger app load when map animation completes
            if (progress > 0.95) {
              setTimeout(() => onComplete(), 1000);
            }
          }
        }
      });

      // Map transitions
      mapTimeline.to('.small-region', { opacity: 0, scale: 0.5, duration: 1 })
        .to('.medium-region', { opacity: 1, scale: 1, duration: 1 }, 0.5)
        .to('.medium-region', { opacity: 0, scale: 0.3, duration: 1 })
        .to('.city-region', { opacity: 1, scale: 1, duration: 1 }, 1.5);

      // Truck animations
      gsap.to('.truck', {
        x: '+=20', repeat: -1, yoyo: true, duration: 3,
        ease: "power1.inOut", stagger: 0.5
      });
      gsap.to('.truck-path', {
        opacity: 0.8, repeat: -1, yoyo: true, duration: 2,
        ease: "power2.inOut", stagger: 0.3
      });

      // Hero entrance
      gsap.fromTo(heroRef.current, { scale: 0.8, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 1.5, ease: "power2.out" });
      gsap.fromTo([dotRef.current, dot2Ref.current, rectangleRef.current, circleRef.current], 
        { scale: 0, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 1, stagger: 0.2, delay: 0.5, ease: "back.out(1.7)" });
    };

    return () => {
      const scripts = document.querySelectorAll('script[src*="gsap"]');
      scripts.forEach(script => script.remove());
    };
  }, [onComplete]);

  return (
    <div ref={containerRef} className="intro-container">
      {/* Fixed Logo (appears after scrolling) */}
      <div ref={logoRef} className="fixed-logo">
        <div className="logo-wrapper">
          <h1 className="logo-text">
            Qubit<span className="logo-x">X</span>
          </h1>
          <div ref={logoOrbitRef} className="logo-orbit">
            <div ref={logoDotRef} className="logo-dot logo-dot-1"></div>
            <div ref={logoDot2Ref} className="logo-dot logo-dot-2"></div>
            <div ref={logoRectangleRef} className="logo-rectangle"></div>
            <div ref={logoCircleRef} className="logo-circle"></div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-bg"></div>
        
        <div ref={heroRef} className="hero-content">
          <h1 className="hero-title">
            Qubit<span className="hero-x">X</span>
          </h1>
        </div>

        <div ref={orbitRef} className="orbit-container">
          <div ref={dotRef} className="orbit-dot orbit-dot-1"></div>
          <div ref={dot2Ref} className="orbit-dot orbit-dot-2"></div>
          <div ref={rectangleRef} className="orbit-rectangle">
            <div className="rect-dot rect-dot-tl"></div>
            <div className="rect-dot rect-dot-tr"></div>
            <div className="rect-dot rect-dot-bl"></div>
            <div className="rect-dot rect-dot-br"></div>
          </div>
          <div ref={circleRef} className="orbit-circle"></div>
        </div>
      </div>

      {/* Map Section */}
      <div className="map-section">
        <div className="map-content">
          <h2 className="map-title">Route Optimization Challenge</h2>
          <p className="map-subtitle">
            Watch complexity explode as we scale from local to citywide logistics.
          </p>
        </div>

        {/* Map Container */}
        <div className="map-container">
          <div className="map-viewport">
            
            {/* Small Region */}
            <div className="small-region map-layer">
              <div className="region-container small-region-box">
                <div className="building building-1"></div>
                <div className="building building-2"></div>
                <div className="building building-3"></div>
                <div className="road road-h"></div>
                <div className="road road-v"></div>
                <div className="truck truck-1">
                  <div className="truck-path truck-path-1"></div>
                </div>
                <div className="truck truck-2">
                  <div className="truck-path truck-path-2"></div>
                </div>
                <div className="truck truck-3">
                  <div className="truck-path truck-path-3"></div>
                </div>
              </div>
            </div>

            {/* Medium Region */}
            <div className="medium-region map-layer">
              <div className="road road-h-main"></div>
              <div className="road road-v-1"></div>
              <div className="road road-v-2"></div>
              <div className="road road-h-1"></div>
              <div className="road road-h-2"></div>
              
              <div className="truck medium-truck-1"><div className="truck-path"></div></div>
              <div className="truck medium-truck-2"><div className="truck-path"></div></div>
              <div className="truck medium-truck-3"><div className="truck-path"></div></div>
              <div className="truck medium-truck-4"><div className="truck-path"></div></div>
              <div className="truck medium-truck-5"><div className="truck-path"></div></div>
              <div className="truck medium-truck-6"><div className="truck-path"></div></div>
              <div className="truck medium-truck-7"><div className="truck-path"></div></div>
              <div className="truck medium-truck-8"><div className="truck-path"></div></div>
            </div>

            {/* City Region */}
            <div className="city-region map-layer">
              <div className="highway highway-h"></div>
              <div className="highway highway-v"></div>
              <div className="highway highway-h1"></div>
              <div className="highway highway-h2"></div>
              <div className="highway highway-v1"></div>
              <div className="highway highway-v2"></div>
              
              <div className="building-cluster cluster-1"></div>
              <div className="building-cluster cluster-2"></div>
              <div className="building-cluster cluster-3"></div>
              <div className="building-cluster cluster-4"></div>
              
              {[...Array(25)].map((_, i) => (
                <div key={i} className={`truck city-truck city-truck-${i + 1}`}>
                  <div className="truck-path"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="progress-container">
          <div className="zoom-indicator active"></div>
          <div className="zoom-indicator"></div>
          <div className="zoom-indicator"></div>
        </div>

        {/* Complexity Counter */}
        <div className="complexity-counter">
          <div className="counter-label">Active Routes</div>
          <div className="route-counter">3</div>
          <div className="counter-complexity">Complexity: O(n!)</div>
        </div>
      </div>
    </div>
  );
};

export default QubitXIntro;