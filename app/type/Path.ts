class Vector2 {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    add(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y);
    }
    subtract(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }
    multiply(scalar: number): Vector2 {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    length(): number {
        return Math.hypot(this.x, this.y);
    }
    normalized(): Vector2 {
        const len = this.length();
        if (len === 0) return new Vector2(0, 0);
        return new Vector2(this.x / len, this.y / len);
    }
    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }
    angle(): number {
        return Math.atan2(this.y, this.x);
    }
    rotate(angleRadian: number): Vector2 {
        const cosA = Math.cos(angleRadian);
        const sinA = Math.sin(angleRadian);
        return new Vector2(
            this.x * cosA - this.y * sinA,
            this.x * sinA + this.y * cosA
        );
    }
}

type CEval = {
    position: Vector2;
    direction: Vector2;
}

interface Path {
    length(): number;
    at(t: number): CEval;
    atStart(): CEval;
    atEnd(): CEval;
}

abstract class PathBase implements Path {
    abstract length(): number;
    abstract at(t: number): CEval;
    atStart(): CEval {
        return this.at(0);
    }
    atEnd(): CEval {
        return this.at(this.length());
    }
}

class LineSegment extends PathBase {
    start: Vector2;
    end: Vector2;

    constructor(start: Vector2, end: Vector2) {
        super();
        this.start = start;
        this.end = end;
    }

    length(): number {
        return this.end.subtract(this.start).length();
    }

    at(t: number): CEval {
        const clamped = Math.max(0, Math.min(this.length(), t));
        const position = this.start.add(this.end.subtract(this.start).normalized().multiply(clamped));
        const direction = this.end.subtract(this.start).normalized();
        return { position, direction };
    }
}

class Arc extends PathBase {
    center: Vector2;
    radius: number;
    startAngle: number;
    endAngle: number;

    constructor(center: Vector2, radius: number, startAngle: number, endAngle: number) {
        super();
        this.center = center;
        this.radius = radius;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
    }

    length(): number {
        return Math.abs(this.endAngle - this.startAngle) * this.radius;
    }

    at(t: number): CEval {
        const clamped = Math.max(0, Math.min(this.length(), t));
        const angle = this.startAngle + (this.endAngle - this.startAngle) * (clamped / this.length());
        const position = new Vector2(
            this.center.x + this.radius * Math.cos(angle),
            this.center.y + this.radius * Math.sin(angle)
        );
        const direction = this.endAngle > this.startAngle ? new Vector2(
            -Math.sin(angle),
            Math.cos(angle)
        ).normalized() : new Vector2(
            Math.sin(angle),
            -Math.cos(angle)
        ).normalized();
        return { position, direction };
    }
}

class BezierCurve {
    v: Array<Vector2>;

    constructor(v: Array<Vector2>) {
        this.v = v;
    }

    evaluate(t: number): Vector2 {
        let points = this.v.slice();
        const n = points.length;
        for (let r = 1; r < n; r++) {
            for (let i = 0; i < n - r; i++) {
                points[i] = points[i].multiply(1 - t).add(points[i + 1].multiply(t));
            }
        }
        return points[0];
    }

    derivative(t: number): Vector2 {
        const n = this.v.length - 1;
        let derivativePoints: Array<Vector2> = [];
        for (let i = 0; i < n; i++) {
            derivativePoints.push(this.v[i + 1].subtract(this.v[i]).multiply(n));
        }
        const derivativeCurve = new BezierCurve(derivativePoints);
        return derivativeCurve.evaluate(t);
    }
}

class SegmentedPath extends PathBase {
    startPosition: Vector2;
    startDirection: Vector2;
    curves: Array<Path>;
    cumulativeLengths: Array<number>;
    totalLength: number;
    constructor(startPosition: Vector2, startDirection: Vector2, curves: Array<Path>) {
        super();
        this.startPosition = startPosition;
        this.startDirection = startDirection;
        this.curves = curves;
        this.cumulativeLengths = [];
        this.totalLength = 0;
        for (const curve of curves) {
            this.totalLength += curve.length();
            this.cumulativeLengths.push(this.totalLength);
        }
    }
    length(): number {
        return this.totalLength;
    }
    determineSegment(t: number): { segmentIndex: number; segmentT: number } {
        let low = 0, high = this.cumulativeLengths.length - 1;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (t < this.cumulativeLengths[mid]) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        const segmentIndex = low;
        const segmentStartLength = segmentIndex === 0 ? 0 : this.cumulativeLengths[segmentIndex - 1];
        const segmentT = t - segmentStartLength;
        return { segmentIndex, segmentT };
    }
    at(t: number): CEval {
        if (this.totalLength === 0) {
            return {
                position: this.startPosition,
                direction: this.startDirection,
            };
        }
        const clampedT = Math.max(0, Math.min(this.totalLength, t));
        const { segmentIndex, segmentT } = this.determineSegment(clampedT);
        return this.curves[segmentIndex].at(segmentT);
    }
}

class ApproxBezier extends PathBase {
    inner: SegmentedPath;
    bezier: BezierCurve;
    cStart: CEval;
    cEnd: CEval;
    constructor(bezier: BezierCurve, segments: number) {
        super();
        this.bezier = bezier;
        const curveSegments: Array<Path> = [];
        const step = 1 / segments;
        let prevPoint = bezier.evaluate(0);
        for (let i = 1; i <= segments; i++) {
            const t = i * step;
            const currPoint = bezier.evaluate(t);
            curveSegments.push(new LineSegment(prevPoint, currPoint));
            prevPoint = currPoint;
        }
        this.cStart = { position: bezier.evaluate(0), direction: bezier.derivative(0).normalized() };
        this.cEnd = { position: bezier.evaluate(1), direction: bezier.derivative(1).normalized() };
        this.inner = new SegmentedPath(this.cStart.position, this.cStart.direction, curveSegments);
    }
    length(): number {
        return this.inner.length();
    }
    at(t: number): CEval {
        return this.inner.at(t);
    }
}

export { Vector2, LineSegment, Arc, BezierCurve, SegmentedPath, ApproxBezier };
export type { Path, CEval };