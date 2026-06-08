import React, { useRef, useEffect, useState } from 'react';
import PF from 'pathfinding';

type Point = [number, number];

interface DijkstraProps {
  onBack?: () => void;
}

function Dijkstra(_: DijkstraProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [points, setPoints] = useState<{ start: Point | null; end: Point | null }>({ start: null, end: null });
  const [status, setStatus] = useState<string>('Loading map...');
  const [grid, setGrid] = useState<number[][] | null>(null);
  const [gridWithoutPadding, setGridWithoutPadding] = useState<number[][] | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const imageSrcReference = '/PlattegrondGieterijBeganegrondV2.0Clean.png'; // For pathfinding reference
  const imageSrcDisplay = '/PlattegrondGieterijBeganegrondV2.0.png'; // For user display

  useEffect(() => {
    const refImg = new Image();
    refImg.src = imageSrcReference;
    refImg.onload = () => {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) return;
      tempCanvas.width = refImg.width;
      tempCanvas.height = refImg.height;
      tempCtx.drawImage(refImg, 0, 0);

      const imgData = tempCtx.getImageData(0, 0, refImg.width, refImg.height).data;
      const matrix: number[][] = [];

      for (let y = 0; y < refImg.height; y++) {
        const row: number[] = [];
        for (let x = 0; x < refImg.width; x++) {
          const i = (y * refImg.width + x) * 4;
          const isWalkable = imgData[i] === 231 && imgData[i + 1] === 231 && imgData[i + 2] === 233;
          row.push(isWalkable ? 0 : 1);
        }
        matrix.push(row);
      }

      const paddingRadius = 15;
      const paddedMatrix = matrix.map((r) => [...r]);

      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[0].length; x++) {
          if (matrix[y][x] === 1) {
            for (let ny = Math.max(0, y - paddingRadius); ny <= Math.min(matrix.length - 1, y + paddingRadius); ny++) {
              for (let nx = Math.max(0, x - paddingRadius); nx <= Math.min(matrix[0].length - 1, x + paddingRadius); nx++) {
                paddedMatrix[ny][nx] = 1;
              }
            }
          }
        }
      }

      setGrid(paddedMatrix);
      setGridWithoutPadding(matrix);
      setDimensions({ width: refImg.width, height: refImg.height });

      const displayImg = new Image();
      displayImg.src = imageSrcDisplay;
      displayImg.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = displayImg.width;
        canvas.height = displayImg.height;
        ctx.drawImage(displayImg, 0, 0);
        setStatus('Click to set Start Point (A)');
      };
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!grid) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (!points.start) {
      setPoints({ ...points, start: [x, y] });
      setStatus('Click to set End Point (B)');
      drawMarker(x, y, '#22c55e');
    } else if (!points.end) {
      const endPoint: Point = [x, y];
      setPoints({ ...points, end: endPoint });
      drawMarker(x, y, '#ef4444');
      calculatePath(points.start as Point, endPoint);
    }
  };

  const drawMarker = (x: number, y: number, color: string) => {
    const ctx = canvasRef.current!.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  };

  const smoothPath = (path: Point[], gridToUse: number[][] | null) => {
    if (path.length < 3) return path;
    const smoothed: Point[] = [path[0]];
    let current = 0;

    while (current < path.length - 1) {
      let farthest = current + 1;
      for (let next = current + 2; next < path.length; next++) {
        if (isLineWalkable(path[current], path[next], gridToUse)) {
          farthest = next;
        } else {
          break;
        }
      }
      smoothed.push(path[farthest]);
      current = farthest;
    }
    return smoothed;
  };

  const isLineWalkable = (from: Point, to: Point, gridToUse: number[][] | null, radius = 3) => {
    if (!gridToUse) return false;
    const [x0, y0] = from;
    const [x1, y1] = to;
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;

    while (true) {
      for (let ddx = -radius; ddx <= radius; ddx++) {
        for (let ddy = -radius; ddy <= radius; ddy++) {
          const nx = x + ddx;
          const ny = y + ddy;
          if (gridToUse[ny] && gridToUse[ny][nx] === 1) return false;
        }
      }

      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return true;
  };

  const calculatePath = (start: Point, end: Point) => {
    setStatus('Calculating path...');
    if (!gridWithoutPadding) return;
    const pfGrid = new PF.Grid(gridWithoutPadding);
    const finder = new PF.DijkstraFinder({ allowDiagonal: true, dontCrossCorners: true });

    try {
      const path = finder.findPath(start[0], start[1], end[0], end[1], pfGrid);
      if (path.length === 0) {
        setStatus('No path found! Ensure points are on the light-grey walkway.');
      } else {
        drawPath(path as Point[]);
        setStatus('Path calculated!');
      }
    } catch (error) {
      setStatus('Error calculating path.');
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  const drawPath = (path: Point[]) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || path.length === 0) return;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);

    if (path.length === 2) {
      ctx.lineTo(path[1][0], path[1][1]);
      ctx.stroke();
      return;
    }

    for (let i = 1; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      const midX = (current[0] + next[0]) / 2;
      const midY = (current[1] + next[1]) / 2;
      ctx.quadraticCurveTo(current[0], current[1], midX, midY);
    }

    const lastPoint = path[path.length - 1];
    ctx.lineTo(lastPoint[0], lastPoint[1]);
    ctx.stroke();
  };

  const reset = () => {
    setPoints({ start: null, end: null });
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = imageSrcDisplay;
    img.onload = () => ctx.drawImage(img, 0, 0);
    setStatus('Click to set Start Point (A)');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1a1a1a', minHeight: '100vh', padding: '20px', color: 'white' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>{status}</h2>
        <button onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', background: '#444', color: 'white' }}>
          Reset Map
        </button>
      </div>

      <div style={{ position: 'relative', maxWidth: '90vw', overflow: 'hidden', border: '1px solid #444' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        />
      </div>
    </div>
  );
}

export default Dijkstra;
