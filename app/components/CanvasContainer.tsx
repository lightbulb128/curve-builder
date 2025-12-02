"use client";

import { JSX, useEffect, useRef, useState } from "react";
import CanvasSetting from "../type/CanvasSetting";
import { SequencedMover, SimpleMover } from "../type/Mover";
import { SegmentedPath, Vector2 } from "../type/Path";
import { LegendToggleRounded } from "@mui/icons-material";
import { Path, LineSegment, Arc, ApproxBezier } from "../type/Path";
import { ControlPoint, Parser, Program } from "../type/Parser";

type Props = {
  settings: CanvasSetting;
  program: Program,
  setProgram: (program: Program) => void;
};

function drawPath(
  settings: CanvasSetting,
  mover: SequencedMover,
  controlPoints: Array<ControlPoint>,
): JSX.Element[] {
  const { width, height, horizontalLines, verticalLines, scale } = settings;
  const canvasWidth = width * scale;
  const canvasHeight = height * scale;
  const elements = [];
  
  const lineStyle = { stroke: "#000", strokeWidth: 2, fill: "none" };
  const arcStyle = { stroke: "#08f", strokeWidth: 2, fill: "none" };
  const bezierStyle = { stroke: "#80f", strokeWidth: 2, fill: "none" };
  const keyPointStyle = { stroke: "#aaa", strokeWidth: 1, fill: "#ccc", r: 4 };
  const startPointStyle = { stroke: "#aaa", strokeWidth: 1, fill: "#ccc", r: 4 };
  const arcAssistLineStyle = { stroke: "#9df", strokeWidth: 2, strokeDasharray: "8,8" };
  const circleCenterStyle = { stroke: "#08f", strokeWidth: 1, fill: "#9df", r: 3 };
  const bezierControlStyle = { stroke: "#80f", strokeWidth: 1, fill: "#d9f", r: 3 };
  const bezierAssistLineStyle = { stroke: "#d9f", strokeWidth: 2, strokeDasharray: "8,8" };

  for (const cp of controlPoints) {
    const style = cp.renderType === 'Start' ? startPointStyle : 
      (cp.renderType === 'KeyPoint' ? keyPointStyle :
      (cp.renderType === 'Arc' ? circleCenterStyle :
      (cp.renderType === 'Bezier' ? bezierControlStyle : keyPointStyle)));
    let r = Parser.getControlPointPosition(cp);
    const { px, py } = settings.worldToCanvas(r.x, r.y);
    const newElement = (
      <circle
        key={`control-point-free-${px}-${py}`}
        cx={px}
        cy={py}
        {...style}
      />
    );
    elements.push(newElement);
  }

  // Horizontal lines
  const dashLineStyle = { stroke: "#ccc", strokeWidth: 1, strokeDasharray: "6,6" };
  const solidLineStyle = { stroke: "#999", strokeWidth: 1 };
  for (let i = 0; i < horizontalLines.length; i++) {
    const y = horizontalLines[i];
    const { px: _px, py } = settings.worldToCanvas(0, y);
    const lineStyle = (i == 0 || i == horizontalLines.length - 1) ? solidLineStyle : dashLineStyle;
    const newElement = (<line
      key={`hline-${y}`}
      x1={0}
      y1={py}
      x2={canvasWidth}
      y2={py}
      {...lineStyle}
    />);
    elements.push(newElement);
  }

  // Vertical lines
  for (let i = 0; i < verticalLines.length; i++) {
    const x = verticalLines[i];
    const { px, py: _py } = settings.worldToCanvas(x, 0);
    const lineStyle = (i == 0 || i == verticalLines.length - 1) ? solidLineStyle : dashLineStyle;
    const newElement = (<line
      key={`vline-${x}`}
      x1={px}
      y1={0}
      x2={px}
      y2={canvasHeight}
      {...lineStyle}
    />);
    elements.push(newElement);
  }

  // Draw mover paths
  {
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
                  {...lineStyle}
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
                    {...arcStyle}
                  />
                );
                elements.push(circleElement);
              } else {
                const newElement = (
                  <path
                    key={`arc-${counter}-${x1}-${y1}-${x2}-${y2}`}
                    d={`M ${x1} ${y1} A ${radius * settings.scale * settings.unitPixels} ${radius * settings.scale * settings.unitPixels} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`}
                    {...arcStyle}
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
                    {...arcAssistLineStyle}
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
                    {...arcAssistLineStyle}
                  />
                );
                elements.push(radiusElement2);
                // const centerCircleElement = (
                //   <circle
                //     key={`arc-center-circle-${counter}-${cx}-${cy}`}
                //     cx={cx}
                //     cy={cy}
                //     {...circleCenterStyle}
                //   />
                // );
                // elements.push(centerCircleElement);
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
                      {...bezierStyle}
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
                    {...bezierAssistLineStyle}
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
                    {...bezierAssistLineStyle}
                  />
                );
                elements.push(controlLine2);
                // const controlPoint1 = (
                //   <circle
                //     key={`bezier-control-point1-${counter}-${c1.px}-${c1.py}`}
                //     cx={c1.px}
                //     cy={c1.py}
                //     {...bezierControlStyle}
                //   />
                // );
                // elements.push(controlPoint1);
                // const controlPoint2 = (
                //   <circle
                //     key={`bezier-control-point2-${counter}-${c2.px}-${c2.py}`}
                //     cx={c2.px}
                //     cy={c2.py}
                //     {...bezierControlStyle}
                //   />
                // );
                // elements.push(controlPoint2);
              }
            }
            const ce = path.atEnd();
            lastPosition = ce.position;
            lastDirection = ce.direction;
            // draw a circle at last position
            // const { px, py } = settings.worldToCanvas(lastPosition.x, lastPosition.y);
            // const circleElement = (
            //   <circle
            //     key={`end-circle-${counter}-${px}-${py}`}
            //     cx={px}
            //     cy={py}
            //     {...keyPointStyle}
            //   />
            // );
            // elements.push(circleElement);
          }
        } else {
          console.log("Unsupported path type in CanvasContainer");
        }
      } else {
        console.log("Unsupported mover type in CanvasContainer");
      }
    }
  }

  return elements;
}

function drawMovingObjects(
  settings: CanvasSetting,
  mover: SequencedMover,
  ticks: number,
): JSX.Element[] {
  const elements = [];
  // draw moving object
  const totalDuration = mover.totalDuration;
  const startTick = ticks % 60;
  // console.log("Starttick:", startTick, "TotalDuration:", totalDuration);
  for (let t = startTick; t <= totalDuration; t += 60) {
    // console.log("Drawing moving object at t =", t);
    const {position, direction} = mover.evaluate(t);
    // draw a triangle at position, pointing in the direction of velocity
    const angle = Math.atan2(direction.y, direction.x);
    const size = 0.15;
    const p1 = settings.worldToCanvas(
      position.x + size * Math.cos(angle),
      position.y + size * Math.sin(angle)
    );
    const p2 = settings.worldToCanvas(
      position.x + size * Math.cos(angle + (2 * Math.PI) / 3),
      position.y + size * Math.sin(angle + (2 * Math.PI) / 3)
    );
    const p3 = settings.worldToCanvas(
      position.x,
      position.y
    );
    const p4 = settings.worldToCanvas(
      position.x + size * Math.cos(angle + (4 * Math.PI) / 3),
      position.y + size * Math.sin(angle + (4 * Math.PI) / 3)
    );
    const triangle = (
      <polygon
        key={`moving-object-${t}-${p1.px}-${p1.py}-${p2.px}-${p2.py}-${p3.px}-${p3.py}`}
        points={`${p1.px},${p1.py} ${p2.px},${p2.py} ${p3.px},${p3.py} ${p4.px},${p4.py}`}
        fill="red"
      />
    );
    elements.push(triangle);
  }
  return elements;
}

export default function CanvasContainer({ settings, program, setProgram }: Props) {
  const rafRef = useRef<number | null>(null);
  const [pathElements, setPathElements] = useState<JSX.Element[]>([]);
  const [movingObjectElements, setMovingObjectElements] = useState<JSX.Element[]>([]);
  const [ticks, setTicks] = useState(0);
  const [dragState, setDragState] = useState<null | {
    controlPointIndex: number;
    downWorld: Vector2;
  }>(null);

  const settingsRef = useRef(settings);
  const programRef = useRef(program);
  const ticksRef = useRef(0);
  const controlPoints = program.toControlPoints();

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const controlPointPositions = controlPoints.map(cp => Parser.getControlPointPosition(cp));
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left);
    const mouseY = (e.clientY - rect.top);
    const mouseWorldPos = settings.canvasToWorld(mouseX, mouseY);
    for (let i = 0; i < controlPointPositions.length; i++) {
      const cpPos = controlPointPositions[i];
      const dx = mouseWorldPos.x - cpPos.x;
      const dy = mouseWorldPos.y - cpPos.y;
      const distanceSq = dx * dx + dy * dy;
      const threshold = 0.3;
      if (distanceSq < threshold * threshold) {
        setDragState({
          controlPointIndex: i,
          downWorld: new Vector2(mouseWorldPos.x, mouseWorldPos.y),
        });
        console.log("i=", i, "controlPoint=", controlPoints[i]);
        e.preventDefault();
        return;
      }
    }
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (dragState == null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left);
    const mouseY = (e.clientY - rect.top);
    const mouseWorldPos = settings.canvasToWorld(mouseX, mouseY);
    const newProgram = program.applyChange(
      controlPoints[dragState.controlPointIndex],
      new Vector2(mouseWorldPos.x, mouseWorldPos.y),
    );
    setProgram(newProgram);
    e.preventDefault();
  }

  const onMouseUp = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (dragState == null) return;
    setDragState(null);
    e.preventDefault();
  }
  
  useEffect(() => {
    settingsRef.current = settings;
    programRef.current = program;
    ticksRef.current = ticks;
  }, [settings, program, ticks]);

  // when program changes, update the path elements
  useEffect(() => {
    if (program) {
      const sequencedMover = program.toSequencedMover();
      setPathElements(drawPath(settings, sequencedMover, controlPoints));
    }
  }, [program, settings]);

  // Animation loop, update moving objects
  useEffect(() => {
    let lastTime: number | null = null;
    const frame = (time: number) => {
      if (lastTime === null) {
        lastTime = time;
      }
      const deltaTime = (time - lastTime) / 1000; // seconds
      lastTime = time;
      
      const s = settingsRef.current;
      const p = programRef.current;
      const t = ticksRef.current;
      const sequencedMover = p.toSequencedMover();
      setMovingObjectElements(drawMovingObjects(s, sequencedMover, t));
      setTicks(prev => prev + deltaTime * 60);
      
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <div style={{ overflow: "auto" }}>
      <svg
        style={{
          // create a border of 6-6 dashed line around the canvas
          border: "1px solid #ccc",
          width: settings.width * settings.scale,
          height: settings.height * settings.scale,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {pathElements}
        {movingObjectElements}
      </svg>
    </div>
  );
}
