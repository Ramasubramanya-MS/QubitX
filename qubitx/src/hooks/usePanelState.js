import { useState, useCallback } from "react";

export default function usePanelState(initial = { left: false, right: false }) {
  const [isLeftOpen, setLeft] = useState(initial.left);
  const [isRightOpen, setRight] = useState(initial.right);

  const toggleLeft = useCallback(() => setLeft(v => !v), []);
  const toggleRight = useCallback(() => setRight(v => !v), []);

  return { isLeftOpen, isRightOpen, toggleLeft, toggleRight };
}
