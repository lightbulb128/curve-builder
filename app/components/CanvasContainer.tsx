"use client";

import { JSX, useEffect, useRef, useState } from "react";
import CanvasSetting from "../type/CanvasSetting";
import { SequencedMover, SimpleMover } from "../type/Mover";
import { SegmentedPath, Vector2 } from "../type/Path";
import { LegendToggleRounded } from "@mui/icons-material";
import { Path, LineSegment, Arc, ApproxBezier } from "../type/Path";

type Props = {
  settings: CanvasSetting;
  mover: SequencedMover;
};

function drawGrid(
  settings: CanvasSetting,
  mover: SequencedMover,
  setSVGlements: (elements: JSX.Element[]) => void
) {
  const { width, height, horizontalLines, verticalLines, scale } = settings;
  const canvasWidth = width * scale;
  const canvasHeight = height * scale;

  const elements = [];

  // Horizontal lines
  for (const y of horizontalLines) {
    const { px: _px, py } = settings.worldToCanvas(0, y);
    const newElement = (<line
      key={`hline-${y}`}
      x1={0}
      y1={py}
      x2={canvasWidth}
      y2={py}
      stroke="#9e9e9e"
      strokeWidth={1}
      strokeDasharray="6,6"
    />);
    elements.push(newElement);
  }

  // Vertical lines
  for (const x of verticalLines) {
    const { px, py: _py } = settings.worldToCanvas(x, 0);
    const newElement = (<line
      key={`vline-${x}`}
      x1={px}
      y1={0}
      x2={px}
      y2={canvasHeight}
      stroke="#9e9e9e"
      strokeWidth={1}
      strokeDasharray="6,6"
    />);
    elements.push(newElement);
  }

  // Draw mover paths
  {
    const drawStyle = { stroke: "#000", strokeWidth: 2, fill: "none" };
    const keyPointStyle = { stroke: "#f00", strokeWidth: 1, fill: "#f99", r: 4 };
    const assistLineStyle = { stroke: "#aaa", strokeWidth: 2, strokeDasharray: "12,12" };
    const circleCenterStyle = { stroke: "#00f", strokeWidth: 1, fill: "#99f", r: 3 };
    const bezierControlStyle = { stroke: "#0a0", strokeWidth: 1, fill: "#9a9", r: 3 };

    let lastPosition = new Vector2(0, 0);
    let lastDirection = new Vector2(1, 0);
    let counter = 0;
    for (const m of mover.movers) {
      counter++;
      if (m instanceof SimpleMover) {
        const moverPath = m.path;
        if (moverPath instanceof SegmentedPath) {
          for (const path of moverPath.curves) {
            if (path instanceof LineSegment) {
              const start = path.start;
              const end = path.end;
              const { px: x1, py: y1 } = settings.worldToCanvas(start.x, start.y);
              const { px: x2, py: y2 } = settings.worldToCanvas(end.x, end.y);
              const newElement = (
                <line
                  key={`line-${counter}-${x1}-${y1}-${x2}-${y2}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  {...drawStyle}
                />
              );
              elements.push(newElement);
            } 
            else if (path instanceof Arc) {
              const center = path.center;
              const radius = path.radius;
              const startAngle = path.startAngle;
              const endAngle = path.endAngle;
              const start = new Vector2(
                center.x + radius * Math.cos(startAngle),
                center.y + radius * Math.sin(startAngle)
              );
              const end = new Vector2(
                center.x + radius * Math.cos(endAngle),
                center.y + radius * Math.sin(endAngle)
              );
              const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
              const sweepFlag = endAngle > startAngle ? 0 : 1;
              const { px: x1, py: y1 } = settings.worldToCanvas(start.x, start.y);
              const { px: x2, py: y2 } = settings.worldToCanvas(end.x, end.y);
              const { px: cx, py: cy } = settings.worldToCanvas(center.x, center.y);
              // console.log("Arc draw:", start.x, start.y, end.x, end.y, cx, cy, radius, largeArcFlag, sweepFlag);
              if (Math.abs(endAngle - startAngle) > Math.PI * 2) {
                // Full circle
                const circleElement = (
                  <circle
                    key={`arc-${counter}-${x1}-${y1}-${x2}-${y2}`}
                    cx={cx}
                    cy={cy}
                    r={radius * settings.scale * settings.unitPixels}
                    {...drawStyle}
                  />
                );
                elements.push(circleElement);
              } else {
                const newElement = (
                  <path
                    key={`arc-${counter}-${x1}-${y1}-${x2}-${y2}`}
                    d={`M ${x1} ${y1} A ${radius * settings.scale * settings.unitPixels} ${radius * settings.scale * settings.unitPixels} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`}
                    {...drawStyle}
                  />
                );
                elements.push(newElement);
              }
              {
                const radiusElement1 = (
                  <line
                    key={`arc-radius-start-${counter}-${x1}-${y1}-${cx}-${cy}`}
                    x1={cx}
                    y1={cy}
                    x2={x1}
                    y2={y1}
                    {...assistLineStyle}
                  />
                );
                elements.push(radiusElement1);
                const radiusElement2 = (
                  <line
                    key={`arc-radius-end-${counter}-${x2}-${y2}-${cx}-${cy}`}
                    x1={cx}
                    y1={cy}
                    x2={x2}
                    y2={y2}
                    {...assistLineStyle}
                  />
                );
                elements.push(radiusElement2);
                const centerCircleElement = (
                  <circle
                    key={`arc-center-circle-${counter}-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    {...circleCenterStyle}
                  />
                );
                elements.push(centerCircleElement);
              }
            }
            else if (path instanceof ApproxBezier) {
              const bezier = path.inner;
              for (const segment of bezier.curves) {
                if (segment instanceof LineSegment) {
                  const start = segment.start;
                  const end = segment.end;
                  const { px: x1, py: y1 } = settings.worldToCanvas(start.x, start.y);
                  const { px: x2, py: y2 } = settings.worldToCanvas(end.x, end.y);
                  const newElement = (
                    <line
                      key={`bezier-line-${counter}-${x1}-${y1}-${x2}-${y2}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      {...drawStyle}
                    />
                  );
                  elements.push(newElement);
                }
              }
              // Draw control points and lines
              const points = path.bezier.v;
              const c1 = settings.worldToCanvas(points[1].x, points[1].y);
              const c2 = settings.worldToCanvas(points[2].x, points[2].y);
              const start = settings.worldToCanvas(points[0].x, points[0].y);
              const end = settings.worldToCanvas(points[3].x, points[3].y);
              {
                const controlLine1 = (
                  <line
                    key={`bezier-control-line1-${counter}-${start.px}-${start.py}-${c1.px}-${c1.py}`}
                    x1={start.px}
                    y1={start.py}
                    x2={c1.px}
                    y2={c1.py}
                    {...assistLineStyle}
                  />
                );
                elements.push(controlLine1);
                const controlLine2 = (
                  <line
                    key={`bezier-control-line2-${counter}-${end.px}-${end.py}-${c2.px}-${c2.py}`}
                    x1={end.px}
                    y1={end.py}
                    x2={c2.px}
                    y2={c2.py}
                    {...assistLineStyle}
                  />
                );
                elements.push(controlLine2);
                const controlPoint1 = (
                  <circle
                    key={`bezier-control-point1-${counter}-${c1.px}-${c1.py}`}
                    cx={c1.px}
                    cy={c1.py}
                    {...bezierControlStyle}
                  />
                );
                elements.push(controlPoint1);
                const controlPoint2 = (
                  <circle
                    key={`bezier-control-point2-${counter}-${c2.px}-${c2.py}`}
                    cx={c2.px}
                    cy={c2.py}
                    {...bezierControlStyle}
                  />
                );
                elements.push(controlPoint2);
              }
            }
            const ce = path.atEnd();
            lastPosition = ce.position;
            lastDirection = ce.direction;
            // draw a circle at last position
            const { px, py } = settings.worldToCanvas(lastPosition.x, lastPosition.y);
            const circleElement = (
              <circle
                key={`end-circle-${counter}-${px}-${py}`}
                cx={px}
                cy={py}
                {...keyPointStyle}
              />
            );
            elements.push(circleElement);
          }
        } else {
          console.log("Unsupported path type in CanvasContainer");
        }
      } else {
        console.log("Unsupported mover type in CanvasContainer");
      }
    }
  }

  setSVGlements(elements);
}

export default function CanvasContainer({ settings, mover }: Props) {
  const rafRef = useRef<number | null>(null);
  const [svgElements, setSvgElements] = useState<JSX.Element[]>([]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let lastTime = 0;
    const frame = (time: number) => {
      // Aim for ~60fps
      if (time - lastTime >= 1000 / 60) {
        lastTime = time;
        const s = settingsRef.current;
        drawGrid(s, mover, setSvgElements);
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [settings, mover]);

  return (
    <div style={{ overflow: "auto" }}>
      <svg
        style={{
          border: "2px solid #000",
          width: settings.width * settings.scale,
          height: settings.height * settings.scale,
        }}
      >
        {svgElements}
      </svg>
    </div>
  );
}
