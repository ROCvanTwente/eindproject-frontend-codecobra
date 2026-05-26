import { ReactNode, useEffect, useRef, useState } from "react";

interface Props<T extends { id: number | string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}

const ACTIVATION_DISTANCE = 8;

export function SortableList<
  T extends { id: number | string },
>({
  items,
  onReorder,
  renderItem,
  className = "space-y-3",
}: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(
    new Map(),
  );

  const [dragIndex, setDragIndex] = useState<number | null>(
    null,
  );
  const [overIndex, setOverIndex] = useState<number | null>(
    null,
  );
  const [pointerY, setPointerY] = useState(0);
  const [offset, setOffset] = useState({
    x: 0,
    y: 0,
    h: 0,
    w: 0,
  });

  const pendingRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    pointerId: number;
    rect: DOMRect;
    active: boolean;
  } | null>(null);

  const isInteractive = (el: EventTarget | null) =>
    el instanceof HTMLElement &&
    !!el.closest(
      "button, a, input, textarea, select, [data-no-drag]",
    );

  const onPointerDown = (
    e: React.PointerEvent,
    index: number,
  ) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (isInteractive(e.target)) return;
    const el = itemRefs.current.get(index);
    if (!el) return;
    pendingRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      rect: el.getBoundingClientRect(),
      active: false,
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pendingRef.current;
      if (!p || p.pointerId !== e.pointerId) return;

      if (!p.active) {
        const dx = e.clientX - p.startX;
        const dy = e.clientY - p.startY;
        if (Math.hypot(dx, dy) < ACTIVATION_DISTANCE) return;
        p.active = true;
        setDragIndex(p.index);
        setOverIndex(p.index);
        setOffset({
          x: p.rect.left,
          y: p.rect.top,
          w: p.rect.width,
          h: p.rect.height,
        });
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }

      e.preventDefault();
      setPointerY(e.clientY);

      // Determine hover target from visible item centers.
      let nextOver = p.index;
      let bestDist = Infinity;
      itemRefs.current.forEach((el, idx) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const d = Math.abs(e.clientY - center);
        if (d < bestDist) {
          bestDist = d;
          nextOver = idx;
        }
      });
      setOverIndex(nextOver);

      // Edge-scroll so you can reach items outside the viewport.
      const edge = 80;
      if (e.clientY < edge) window.scrollBy(0, -12);
      else if (e.clientY > window.innerHeight - edge)
        window.scrollBy(0, 12);
    };

    const onUp = (e: PointerEvent) => {
      const p = pendingRef.current;
      if (!p || p.pointerId !== e.pointerId) return;
      if (p.active) {
        const from = p.index;
        const to = overIndex ?? from;
        if (from !== to && to >= 0 && to < items.length) {
          const next = [...items];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          onReorder(next);
        }
      }
      pendingRef.current = null;
      setDragIndex(null);
      setOverIndex(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const onCancel = () => {
      pendingRef.current = null;
      setDragIndex(null);
      setOverIndex(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("pointermove", onMove, {
      passive: false,
    });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [items, onReorder, overIndex]);

  return (
    <div ref={containerRef} className={className}>
      {items.map((item, index) => {
        const isDragging = dragIndex === index;
        const isOver =
          overIndex === index && dragIndex !== index;
        return (
          <div
            key={item.id}
            ref={(el) => {
              if (el) itemRefs.current.set(index, el);
              else itemRefs.current.delete(index);
            }}
            onPointerDown={(e) => onPointerDown(e, index)}
            className={`touch-none select-none cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-30" : ""} ${isOver ? "ring-2 ring-[#0066B3] ring-offset-2 rounded-xl" : ""}`}
          >
            {renderItem(item, index)}
          </div>
        );
      })}

      {/* Floating preview of the dragged card — never leaves the app. */}
      {dragIndex !== null && (
        <div
          className="fixed pointer-events-none z-50 opacity-90 shadow-2xl rounded-xl"
          style={{
            left: offset.x,
            top: pointerY - offset.h / 2,
            width: offset.w,
          }}
        >
          {renderItem(items[dragIndex], dragIndex)}
        </div>
      )}
    </div>
  );
}