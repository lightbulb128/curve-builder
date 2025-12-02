import { Mover, SimpleMover, SequencedMover } from "./Mover";
import { LineSegment, Path, Vector2, Arc, BezierCurve, ApproxBezier, SegmentedPath } from "./Path";
import { Curve, SmoothStepCurve, UniformCurve, SineCurve, CosineCurve, InverseSmoothStepCurve } from "./Curve";


class PathBuilder {

    startPosition: Vector2;
    startDirection: Vector2;
    lastDirection: Vector2;
    lastPosition: Vector2;
    paths: Array<Path>;

    constructor(lastPosition: Vector2 = new Vector2(0, 0), lastDirection: Vector2 = new Vector2(1, 0)) {
        this.startPosition = lastPosition;
        this.startDirection = lastDirection;
        this.lastDirection = lastDirection;
        this.lastPosition = lastPosition;
        this.paths = [];
    }

    Start(start: Vector2) {
        this.lastPosition = start;
        return this;
    }

    Line(end: Vector2) {
        const line = new LineSegment(this.lastPosition, end);
        this.paths.push(line);
        const newDirection = end.subtract(this.lastPosition).normalized();
        this.lastPosition = end;
        this.lastDirection = newDirection;
        return this;
    }

    LineContinue(length: number) {
        const end = this.lastPosition.add(this.lastDirection.multiply(length));
        return this.Line(end);
    }

    Arc(center: Vector2, angleRadian: number) {
        const startAngle = Math.atan2(this.lastPosition.y - center.y, this.lastPosition.x - center.x);
        const radius = this.lastPosition.subtract(center).length();
        const endAngle = startAngle + angleRadian;
        const arc = new Arc(center, radius, startAngle, endAngle);
        // console.log("Arc:", center, radius, startAngle, endAngle);
        this.paths.push(arc);
        const endPosition = new Vector2(
            center.x + radius * Math.cos(endAngle),
            center.y + radius * Math.sin(endAngle)
        );
        const tangentAngle = endAngle + (angleRadian > 0 ? Math.PI / 2 : -Math.PI / 2);
        const newDirection = new Vector2(Math.cos(tangentAngle), Math.sin(tangentAngle)).normalized();
        this.lastPosition = endPosition;
        this.lastDirection = newDirection;
        return this;
    }

    ArcContinue(radius: number, angleRadian: number) {
        if (angleRadian > 0) {
            const center = this.lastPosition.add(
                new Vector2(-this.lastDirection.y, this.lastDirection.x).multiply(radius)
            );
            return this.Arc(center, angleRadian);
        } else {
            const center = this.lastPosition.add(
                new Vector2(this.lastDirection.y, -this.lastDirection.x).multiply(radius)
            );
            return this.Arc(center, angleRadian);
        }
    }

    Bezier(c1: Vector2, c2: Vector2, end: Vector2, segments: number = 100) {
        const bezier = new BezierCurve([this.lastPosition, c1, c2, end]);
        const approx = new ApproxBezier(bezier, segments);
        this.paths.push(approx);
        const newDirection = approx.atEnd().direction;
        this.lastPosition = end;
        this.lastDirection = newDirection;
        return this;
    }

    BezierContinue(c1Offset: number, c2: Vector2, end: Vector2, segments: number = 100) {
        const c1 = this.lastPosition.add(this.lastDirection.multiply(c1Offset));
        return this.Bezier(c1, c2, end, segments);
    }

    Build(): Path {
        return new SegmentedPath(this.startPosition, this.startDirection, this.paths);
    }

}

class SequencedMoverBuilder {

    lastDirection: Vector2;
    lastPosition: Vector2;
    movers: Array<Mover>;

    constructor() {
        this.lastDirection = new Vector2(1, 0);
        this.lastPosition = new Vector2(0, 0);
        this.movers = [];
    }


    Unified(duration: number, curve: Curve, pathBuilder: (pb: PathBuilder) => PathBuilder) {
        const pb = pathBuilder(new PathBuilder(this.lastPosition, this.lastDirection));
        this.lastPosition = pb.lastPosition;
        this.lastDirection = pb.lastDirection;
        const path = pb.Build();
        const mover = new SimpleMover(path, duration, curve);
        this.movers.push(mover);
        return this;
    }

    Uniform(duration: number, pathBuilder: (pb: PathBuilder) => PathBuilder) {
        return this.Unified(duration, new UniformCurve(), pathBuilder);
    }
    Sine(duration: number, pathBuilder: (pb: PathBuilder) => PathBuilder) {
        return this.Unified(duration, new SineCurve(), pathBuilder);
    }
    Cosine(duration: number, pathBuilder: (pb: PathBuilder) => PathBuilder) {
        return this.Unified(duration, new CosineCurve(), pathBuilder);
    }
    SmoothStep(duration: number, pathBuilder: (pb: PathBuilder) => PathBuilder) {
        return this.Unified(duration, new SmoothStepCurve(), pathBuilder);
    }
    InverseSmoothStep(duration: number, pathBuilder: (pb: PathBuilder) => PathBuilder) {
        return this.Unified(duration, new InverseSmoothStepCurve(), pathBuilder);
    }

    Build(): SequencedMover {
        return new SequencedMover(this.movers);
    }

}

export { PathBuilder, SequencedMoverBuilder };