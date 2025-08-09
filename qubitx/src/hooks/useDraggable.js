import { useEffect, useRef, useState } from "react";

export default function useDraggable(boundsRef, initial = { x: 20, y: 20 }) {
  const [pos, setPos] = useState(initial);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const origin = useRef(initial);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      const parent = boundsRef.current;
      if (!parent) return;

      const maxW = 340;    // approx open sheet width
      const maxH = 280;    // approx open sheet height
      const minX = 8, minY = 8;
      const maxX = Math.max(minX, parent.clientWidth - maxW - 8);
      const maxY = Math.max(minY, parent.clientHeight - maxH - 8);

      setPos({
        x: Math.min(Math.max(origin.current.x + dx, minX), maxX),
        y: Math.min(Math.max(origin.current.y + dy, minY), maxY),
      });
    };
    const onUp = () => { dragging.current = false; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [boundsRef]);

  const startDrag = (e) => {
    dragging.current = true;
    start.current = { x: e.clientX, y: e.clientY };
    origin.current = { ...pos };
  };

  return { pos, startDrag, setPos };
}
