import { MediaBluetoothOff } from "@mui/icons-material";
import { SequencedMover } from "./Mover";
import { SequencedMoverBuilder, PathBuilder } from "./MoverBuilder";
import { Vector2 } from "./Path";

class NumberToken {
    kind: 'number' = 'number';
    value: number;
    constructor(value: number) {
        this.value = value;
    }
}

class IdentifierToken {
    kind: 'identifier' = 'identifier';
    value: string;
    constructor(value: string) {
        this.value = value;
    }
}

class OperatorToken {
    kind: 'operator' = 'operator'
    value: string;
    constructor(value: string) {
        this.value = value;
    }
}

class Tokenizer {
    content: string;
    position: number;

    constructor(content: string) {
        this.content = content;
        this.position = 0;
    }

    peek() : string {
        if (this.position >= this.content.length) {
            return " ";
        }
        return this.content[this.position];
    }

    skipWhitespace() {
        while (this.position < this.content.length && /\s/.test(this.content[this.position])) {
            this.position++;
        }
    }

    nextToken(): NumberToken | IdentifierToken | OperatorToken | null {
        this.skipWhitespace();
        if (this.position >= this.content.length) {
            return null;
        }
        const char = this.peek();
        if (/[0-9\+\-]/.test(char)) {
            let start = this.position;
            while (this.position < this.content.length && /[0-9\.eEf\+\-]/.test(this.peek())) {
                this.position++;
            }
            const numberStr = this.content.slice(start, this.position);
            const value = parseFloat(numberStr);
            return new NumberToken(value);
        }
        else if (/[a-zA-Z_]/.test(char)) {
            let start = this.position;
            while (this.position < this.content.length && /[a-zA-Z0-9_]/.test(this.peek())) {
                this.position++;
            }
            const identStr = this.content.slice(start, this.position);
            return new IdentifierToken(identStr);
        }
        else if (/[\(\),\.=><;]/.test(char)) {
            this.position++;
            const opStr = char;
            return new OperatorToken(opStr);
        }
        return null;
    }
}

type Token = NumberToken | IdentifierToken | OperatorToken;

type PathStartStatement = {
    kind: 'Start';
    start: Vector2;
}

type PathLineStatement = {
    kind: 'Line';
    end: Vector2;
}

type PathLineContinueStatement = {
    kind: 'LineContinue';
    length: number;
}

type PathArcStatement = {
    kind: 'Arc';
    center: Vector2;
    angleRadian: number;
}

type PathArcContinueStatement = {
    kind: 'ArcContinue';
    radius: number;
    angleRadian: number;
}

type PathBezierStatement = {
    kind: 'Bezier';
    c1: Vector2;
    c2: Vector2;
    end: Vector2;
    segments: number;
}

type PathBezierContinueStatement = {
    kind: 'BezierContinue';
    c1Offset: number;
    c2: Vector2;
    end: Vector2;
    segments: number;
}

type PathStatement =
    | PathStartStatement
    | PathLineStatement
    | PathLineContinueStatement
    | PathArcStatement
    | PathArcContinueStatement
    | PathBezierStatement
    | PathBezierContinueStatement;

type MoverStatement = {
    kind: 'MoverMethod';
    method: 'Uniform' | 'Sine' | 'Cosine' | 'SmoothStep' | 'InverseSmoothStep' | 'Wait';
    duration: number;
    pathStatements: Array<PathStatement>;
}

type BaseControlPoint = {
    controlPath: Array<number>;
    pathType: 'Start' | 'Line' | 'Arc' | 'Bezier';
    renderType: 'Start' | 'KeyPoint' | 'Arc' | 'Bezier';
}

type FreeControlPoint = {
    type: 'Free';
    position: Vector2;
} & BaseControlPoint;

type RayControlPoint = {
    type: 'Ray';
    from: Vector2;
    direction: Vector2;
    length: number;
} & BaseControlPoint;

type OnArcControlPoint = {
    type: 'OnArc';
    center: Vector2;
    radius: number;
    baseAngleRadian: number;
    angleRadian: number;
    keepPositivity: boolean;
} & BaseControlPoint;

type RadiusControlPoint = {
    type: 'Radius';
    start: Vector2;
    direction: Vector2;
    counterClockwise: boolean;
    radius: number;
} & BaseControlPoint;

type ControlPoint =
    | FreeControlPoint
    | RayControlPoint
    | OnArcControlPoint
    | RadiusControlPoint;

class Program {
    moverStatements: Array<MoverStatement>;
    constructor(moverStatements: Array<MoverStatement>) {
        this.moverStatements = moverStatements;
    }

    toSequencedMover(): SequencedMover {
        const builder = new SequencedMoverBuilder();
        for (const ms of this.moverStatements) {
            const pathBuilder = (pb: PathBuilder) => {
                for (const ps of ms.pathStatements) {
                    if (ps.kind === 'Start') {
                        pb.Start(ps.start);
                    } else if (ps.kind === 'Line') {
                        pb.Line(ps.end);
                    } else if (ps.kind === 'LineContinue') {
                        pb.LineContinue(ps.length);
                    } else if (ps.kind === 'Arc') {
                        pb.Arc(ps.center, ps.angleRadian);
                    } else if (ps.kind === 'ArcContinue') {
                        pb.ArcContinue(ps.radius, ps.angleRadian);
                    } else if (ps.kind === 'Bezier') {
                        pb.Bezier(ps.c1, ps.c2, ps.end, ps.segments);
                    } else if (ps.kind === 'BezierContinue') {
                        pb.BezierContinue(ps.c1Offset, ps.c2, ps.end, ps.segments);
                    }
                }
                return pb;
            }
            if (ms.method === 'Uniform') {
                builder.Uniform(ms.duration, pathBuilder);
            } else if (ms.method === 'Sine') {
                builder.Sine(ms.duration, pathBuilder);
            } else if (ms.method === 'Cosine') {    
                builder.Cosine(ms.duration, pathBuilder);
            } else if (ms.method === 'SmoothStep') {
                builder.SmoothStep(ms.duration, pathBuilder);
            } else if (ms.method === 'InverseSmoothStep') {
                builder.InverseSmoothStep(ms.duration, pathBuilder);
            } else if (ms.method === 'Wait') {
                builder.Uniform(ms.duration, pathBuilder);
            }
        }
        return builder.Build();
    }

    applyChange(controlPoint: ControlPoint, newPosition: Vector2): Program {
        const controlPath = controlPoint.controlPath;
        const [moverIndex, pathIndex, argumentIndex] = controlPath;
        const newMoverStatements = this.moverStatements.map((ms, mi) => {
            if (mi !== moverIndex) return ms;
            const newPathStatements = ms.pathStatements.map((ps, pi) => {
                if (pi !== pathIndex) return ps;
                if (controlPoint.type === 'Free') {
                    if (ps.kind === 'Start') {
                        return { ...ps, start: newPosition } as PathStartStatement;
                    } else if (ps.kind === 'Line') {
                        return { ...ps, end: newPosition } as PathLineStatement;
                    } else if (ps.kind === 'Arc') {
                        return { ...ps, center: newPosition } as PathArcStatement;
                    } else if (ps.kind === 'Bezier') {
                        if (argumentIndex === 0) {
                            return { ...ps, c1: newPosition } as PathBezierStatement;
                        } else if (argumentIndex === 1) {
                            return { ...ps, c2: newPosition } as PathBezierStatement;
                        } else if (argumentIndex === 2) {
                            return { ...ps, end: newPosition } as PathBezierStatement;
                        }
                    } else if (ps.kind === 'BezierContinue') {
                        if (argumentIndex === 1) {
                            return { ...ps, c2: newPosition } as PathBezierContinueStatement;
                        } else if (argumentIndex === 2) {
                            return { ...ps, end: newPosition } as PathBezierContinueStatement;
                        }
                    }
                } else if (controlPoint.type === 'Ray') {
                    const d = newPosition.subtract(controlPoint.from);
                    const newLength = d.dot(controlPoint.direction.normalized());
                    if (ps.kind === 'LineContinue') {
                        return { ...ps, length: newLength } as PathLineContinueStatement;
                    } else if (ps.kind === 'BezierContinue') {
                        return { ...ps, c1Offset: newLength } as PathBezierContinueStatement;
                    } else {
                        return ps;
                    }
                } else if (controlPoint.type === 'OnArc') {
                    const center = controlPoint.center;
                    const newAngle = newPosition.subtract(center).angle();
                    const oldAngle = controlPoint.baseAngleRadian + controlPoint.angleRadian;
                    // find new angle as the nearest value in {oldAngle + 2kπ}
                    let delta = (newAngle - oldAngle) % (2 * Math.PI);
                    if (delta > Math.PI) delta -= 2 * Math.PI;
                    if (delta < -Math.PI) delta += 2 * Math.PI;
                    let finalAngle = controlPoint.angleRadian + delta;
                    if (controlPoint.keepPositivity) {
                        if (controlPoint.angleRadian > 0 && finalAngle < 0) {
                            finalAngle = 0.01;
                        } else if (controlPoint.angleRadian < 0 && finalAngle > 0) {
                            finalAngle = -0.01;
                        }
                    }
                    if (ps.kind === 'ArcContinue') {
                        return { ...ps, angleRadian: finalAngle } as PathArcContinueStatement;
                    } else if (ps.kind === 'Arc') {
                        return { ...ps, angleRadian: finalAngle } as PathArcStatement;
                    } else {
                        return ps;
                    }
                } else if (controlPoint.type === 'Radius') {
                    const normal = controlPoint.direction.rotate(Math.PI / 2).normalized();
                    const toCenter = newPosition.subtract(controlPoint.start);
                    let newRadius = toCenter.dot(normal);
                    let newCounterClockwise = true;
                    if (newRadius < 0) {
                        newRadius = -newRadius;
                        newCounterClockwise = false;
                    }
                    const reverseAngle = newCounterClockwise != controlPoint.counterClockwise;
                    if (ps.kind === 'ArcContinue') {
                        return { ...ps, 
                            radius: newRadius,
                            angleRadian: reverseAngle ? -ps.angleRadian : ps.angleRadian,
                        } as PathArcContinueStatement;
                    } else {
                        return ps;
                    }
                } else {
                    return ps;
                }
            });
            return {
                ...ms,
                pathStatements: newPathStatements,
            } as MoverStatement;
        });
        return new Program(newMoverStatements);
    }

    toControlPoints(): Array<ControlPoint> {
        const ret: Array<ControlPoint> = [];
        // controlPath is [moverIndex, pathIndex, argumentIndex]
        let moverCounter = 0;
        let lastPosition = new Vector2(0, 0);
        let lastDirection = new Vector2(1, 0);
        for (const ms of this.moverStatements) {
            const pb = new PathBuilder(lastPosition, lastDirection);
            let innerCounter = 0;
            for (const ps of ms.pathStatements) {
                if (ps.kind === 'Start') {
                    pb.Start(ps.start);
                    ret.push({
                        type: 'Free',
                        pathType: 'Start',
                        renderType: 'Start',
                        controlPath: [moverCounter, innerCounter, 0],
                        position: pb.lastPosition,
                    });
                } else if (ps.kind === 'Line') {
                    pb.Line(ps.end);
                    ret.push({
                        type: 'Free',
                        controlPath: [moverCounter, innerCounter, 0],
                        pathType: 'Line',
                        renderType: 'KeyPoint',
                        position: pb.lastPosition,
                    });
                } else if (ps.kind === 'LineContinue') {
                    const from = pb.lastPosition;
                    const dir = pb.lastDirection;
                    pb.LineContinue(ps.length);
                    ret.push({
                        type: 'Ray',
                        controlPath: [moverCounter, innerCounter, 0],
                        pathType: 'Line',
                        renderType: 'KeyPoint',
                        from: from,
                        direction: dir,
                        length: ps.length,
                    });
                } else if (ps.kind === 'Arc') {
                    const baseAngle = pb.lastPosition.subtract(ps.center);
                    const radius = baseAngle.length();
                    const baseAngleRadian = Math.atan2(baseAngle.y, baseAngle.x);
                    pb.Arc(ps.center, ps.angleRadian);
                    ret.push({
                        type: 'Free',
                        controlPath: [moverCounter, innerCounter, 0],
                        pathType: 'Arc',
                        renderType: 'Arc',
                        position: ps.center
                    })
                    ret.push({
                        type: 'OnArc',
                        controlPath: [moverCounter, innerCounter, 1],
                        pathType: 'Arc',
                        renderType: 'KeyPoint',
                        center: ps.center,
                        radius: radius,
                        baseAngleRadian: baseAngleRadian,
                        angleRadian: ps.angleRadian,
                        keepPositivity: false,
                    });
                } else if (ps.kind === 'ArcContinue') {
                    const lastDirection = pb.lastDirection;
                    const lastPosition = pb.lastPosition;
                    let center: Vector2;
                    if (ps.angleRadian > 0) {
                        center = lastPosition.add(
                            new Vector2(-lastDirection.y, lastDirection.x).multiply(ps.radius)
                        );
                    } else {
                        center = lastPosition.add(
                            new Vector2(lastDirection.y, -lastDirection.x).multiply(ps.radius)
                        );
                    }
                    const baseAngle = lastPosition.subtract(center);
                    const baseAngleRadian = Math.atan2(baseAngle.y, baseAngle.x);
                    pb.ArcContinue(ps.radius, ps.angleRadian);
                    ret.push({
                        type: 'Radius',
                        controlPath: [moverCounter, innerCounter, 0],
                        pathType: 'Arc',
                        renderType: 'Arc',
                        start: lastPosition,
                        direction: lastDirection,
                        counterClockwise: ps.angleRadian > 0,
                        radius: ps.radius,
                    });
                    ret.push({
                        type: 'OnArc',
                        controlPath: [moverCounter, innerCounter, 1],
                        pathType: 'Arc',
                        renderType: 'KeyPoint',
                        center: center,
                        radius: ps.radius,
                        baseAngleRadian: baseAngleRadian,
                        angleRadian: ps.angleRadian,
                        keepPositivity: true,
                    });
                } else if (ps.kind === 'Bezier') {
                    pb.Bezier(ps.c1, ps.c2, ps.end, ps.segments);
                    ret.push({
                        type: 'Free',
                        controlPath: [moverCounter, innerCounter, 0],
                        pathType: 'Bezier',
                        renderType: 'Bezier',
                        position: ps.c1,
                    });
                    ret.push({
                        type: 'Free',
                        controlPath: [moverCounter, innerCounter, 1],
                        pathType: 'Bezier',
                        renderType: 'Bezier',
                        position: ps.c2,
                    });
                    ret.push({
                        type: 'Free',
                        controlPath: [moverCounter, innerCounter, 2],
                        pathType: 'Bezier',
                        renderType: 'KeyPoint',
                        position: ps.end,
                    });
                } else if (ps.kind === 'BezierContinue') {
                    const lastPos = pb.lastPosition;
                    const lastDir = pb.lastDirection;
                    pb.BezierContinue(ps.c1Offset, ps.c2, ps.end, ps.segments);
                    ret.push({
                        type: 'Ray',
                        controlPath: [moverCounter, innerCounter, 0],
                        pathType: 'Bezier',
                        renderType: 'Bezier',
                        from: lastPos,
                        direction: lastDir,
                        length: ps.c1Offset,
                    });
                    ret.push({
                        type: 'Free',
                        controlPath: [moverCounter, innerCounter, 1],
                        pathType: 'Bezier', 
                        renderType: 'Bezier',
                        position: ps.c2,
                    });
                    ret.push({
                        type: 'Free',
                        controlPath: [moverCounter, innerCounter, 2],
                        pathType: 'Bezier',
                        renderType: 'KeyPoint',
                        position: ps.end,
                    });
                }
                innerCounter++;
            }
            lastPosition = pb.lastPosition;
            lastDirection = pb.lastDirection;
            moverCounter++;
        }
        return ret;
    }

    toProgramString(): string {
        const vecstring = (v: Vector2): string => {
            return `new Vector2(${v.x.toFixed(3)}f, ${v.y.toFixed(3)}f)`;
        }
        const indent = " ".repeat(2);
        let ret = "new MoverBuilder()\n";
        for (let i = 0; i < this.moverStatements.length; i++) {
            const ms = this.moverStatements[i];
            ret += indent + `.${ms.method}(${ms.duration}, e => e\n`;
            for (const ps of ms.pathStatements) {
                    if (ps.kind === 'Start') {
                    ret += indent.repeat(2) + `.Start(${vecstring(ps.start)})\n`;
                } else if (ps.kind === 'Line') {
                    ret += indent.repeat(2) + `.Line(${vecstring(ps.end)})\n`;
                } else if (ps.kind === 'LineContinue') {
                    ret += indent.repeat(2) + `.LineContinue(${ps.length.toFixed(3)}f)\n`;
                } else if (ps.kind === 'Arc') {
                    ret += indent.repeat(2) + `.Arc(${vecstring(ps.center)}, ${ps.angleRadian.toFixed(3)}f)\n`;
                } else if (ps.kind === 'ArcContinue') {
                    ret += indent.repeat(2) + `.ArcContinue(${ps.radius.toFixed(3)}f, ${ps.angleRadian.toFixed(3)}f)\n`;
                } else if (ps.kind === 'Bezier') {
                    ret += indent.repeat(2) + `.Bezier(${vecstring(ps.c1)}, ${vecstring(ps.c2)}, ${vecstring(ps.end)}, ${ps.segments})\n`;
                } else if (ps.kind === 'BezierContinue') {
                    ret += indent.repeat(2) + `.BezierContinue(${ps.c1Offset.toFixed(3)}f, ${vecstring(ps.c2)}, ${vecstring(ps.end)}, ${ps.segments})\n`;
                }
            }
            ret += indent + `)` + (i === this.moverStatements.length - 1 ? ";\n" : "\n");
        }
        return ret;
    }
}

class Parser {
    tokenizer: Tokenizer;
    putback: Array<Token>;
    
    constructor(content: string) {
        this.tokenizer = new Tokenizer(content);
        this.putback = [];
    }

    peek(): Token | null {
        if (this.putback.length > 0) {
            return this.putback[this.putback.length - 1];
        }
        const token = this.tokenizer.nextToken();
        if (token) {
            this.putback.push(token);
        }
        return token;
    }

    consume(): Token | null {
        this.peek();
        return this.putback.pop() || null;
    }

    assertIdentifier(val: string): boolean {
        const token = this.consume();
        if (token?.kind === 'identifier' && token.value === val) {
            return true;
        }
        return false;
    }

    assertOperator(val: string): boolean {
        const token = this.consume();
        if (token?.kind === 'operator' && token.value === val) {
            return true;
        }
        return false;
    }

    wantIdentifier(): string | null {
        const token = this.consume();
        if (token?.kind === 'identifier') {
            return token.value;
        }
        return null;
    }

    wantNumber(): number | null {
        const token = this.consume();
        if (token?.kind === 'number') {
            return token.value;
        }
        return null;
    }

    wantVector(): Vector2 | string {
        if (!this.assertIdentifier("new")) return "Expected Vector2 'new'";
        if (!this.assertIdentifier("Vector2")) return "Expected 'Vector2'";
        if (!this.assertOperator("(")) return "Expected '('";
        const x = this.wantNumber();
        if (x === null) return "Expected number for x";
        if (!this.assertOperator(",")) return "Expected ','";
        const y = this.wantNumber();
        if (y === null) return "Expected number for y";
        if (!this.assertOperator(")")) return "Expected ')'";
        // console.log("Parsed Vector2:", x, y);
        return new Vector2(x, y);
    }

    parseInnerMethod(): PathStatement | string {
        if (!this.assertOperator(".")) return "Expected '.'";
        const methodToken = this.wantIdentifier();
        if (!methodToken) return "Expected method name";
        if (!this.assertOperator("(")) return "Expected '('";
        let ret: PathStatement | string = "";
        if (methodToken === "Start") {
            const vec = this.wantVector();
            if (typeof vec === "string") return "Expected Start: " + vec;
            ret = { kind: 'Start', start: vec };
        }
        else if (methodToken === "Line") {
            const vec = this.wantVector();
            if (typeof vec === "string") return "Expected Line: " + vec;
            ret = { kind: 'Line', end: vec };
        }
        else if (methodToken === "LineContinue") {
            const length = this.wantNumber();
            if (length === null) return "Expected number argument for LineContinue";
            ret = { kind: 'LineContinue', length: length };
        }
        else if (methodToken === "Arc") {
            const center = this.wantVector();
            if (typeof center === "string") return "Expected Arc: " + center;
            if (!this.assertOperator(",")) return "Expected ','";
            const angle = this.wantNumber();
            if (angle === null) return "Expected number argument for Arc";
            ret = { kind: 'Arc', center: center, angleRadian: angle };
        }
        else if (methodToken === "ArcContinue") {
            const radius = this.wantNumber();
            if (radius === null) return "Expected number argument for ArcContinue";
            if (!this.assertOperator(",")) return "Expected ','";
            const angle = this.wantNumber();
            if (angle === null) return "Expected number argument for ArcContinue";
            ret = { kind: 'ArcContinue', radius: radius, angleRadian: angle };
        }
        else if (methodToken === "Bezier") {
            const c1 = this.wantVector();
            if (typeof c1 === "string") return "Expected Bezier c1: " + c1;
            if (!this.assertOperator(",")) return "Expected ','";
            const c2 = this.wantVector();
            if (typeof c2 === "string") return "Expected Bezier c2: " + c2;
            if (!this.assertOperator(",")) return "Expected ','";
            const end = this.wantVector();
            if (typeof end === "string") return "Expected Bezier end: " + end;
            if (!this.assertOperator(",")) return "Expected ','";
            const segments = this.wantNumber();
            if (segments === null) return "Expected number argument for Bezier segments";
            ret = { kind: 'Bezier', c1: c1, c2: c2, end: end, segments: segments };
        }
        else if (methodToken === "BezierContinue") {
            const c1Offset = this.wantNumber();
            if (c1Offset === null) return "Expected number argument for BezierContinue c1Offset";
            if (!this.assertOperator(",")) return "Expected ','";
            const c2 = this.wantVector();
            if (typeof c2 === "string") return "Expected BezierContinue c2: " + c2;
            if (!this.assertOperator(",")) return "Expected ','";
            const end = this.wantVector();
            if (typeof end === "string") return "Expected BezierContinue end: " + end;
            if (!this.assertOperator(",")) return "Expected ','";
            const segments = this.wantNumber();
            if (segments === null) return "Expected number argument for BezierContinue segments";
            ret = { kind: 'BezierContinue', c1Offset: c1Offset, c2: c2, end: end, segments: segments };
        } else {
            ret = `Unknown method name: ${methodToken}`;
        }
        if (typeof ret === "string") return ret;
        if (!this.assertOperator(")")) return "Expected ')'";
        return ret;
    }

    parseMethod(): MoverStatement | string {
        if (!this.assertOperator(".")) return "Expected '.'";
        const methodToken = this.wantIdentifier();
        if (!methodToken) return "Expected method name";
        if (!this.assertOperator("(")) return "Expected '('";
        const duration = this.wantNumber();
        if (!duration) return "Expected duration number";
        if (!this.assertOperator(",")) return "Expected ','";
        const placeholderIdentifier = this.wantIdentifier();
        if (!placeholderIdentifier) return "Expected placeholder identifier";
        if (!this.assertOperator("=")) return "Expected '='";
        if (!this.assertOperator(">")) return "Expected '>'";
        const placeholderIdentifier2 = this.wantIdentifier();
        if (!placeholderIdentifier2) return "Expected placeholder identifier";
        if (placeholderIdentifier !== placeholderIdentifier2) return "Placeholder identifiers do not match";
        const items = [];
        while (true) {
            const peek = this.peek();
            if (!peek) return "Unexpected end of input in method body";
            if (peek.kind === 'operator' && peek.value === ")") {
                this.consume();
                break;
            }
            const result = this.parseInnerMethod();
            if (typeof result === 'string') return result;
            items.push(result);
        }
        if (methodToken === "Uniform" || methodToken === "Sine" || methodToken === "Cosine" || methodToken === "SmoothStep" || methodToken === "InverseSmoothStep" || methodToken === "Wait") {
            return {
                kind: 'MoverMethod',
                method: methodToken as 'Uniform' | 'Sine' | 'Cosine' | 'SmoothStep' | 'InverseSmoothStep' | 'Wait',
                duration: duration,
                pathStatements: items,
            };
        }
        return `Unknown method name: ${methodToken}`;
    }

    parse(): Program | string {

        if (!this.assertIdentifier("new")) return "Expected 'new'";
        if (!this.assertIdentifier("MoverBuilder")) return "Expected 'MoverBuilder'";
        if (!this.assertOperator("(")) return "Expected '('";
        if (!this.assertOperator(")")) return "Expected ')'";

        const items = [];
        while (true) {
            const peek = this.peek();
            if (!peek) break;
            if (peek.kind === 'operator' && peek.value === ";") {
                this.consume();
                break;
            }
            const result = this.parseMethod();
            if (typeof result === "string") return result;
            items.push(result);
        }

        return new Program(items);
    }

    static getControlPointPosition(cp: ControlPoint): Vector2 {
        if (cp.type === "Free") {
        return new Vector2(cp.position.x, cp.position.y);
        } else if (cp.type === "Ray") {
            const from = cp.from;
            const dir = cp.direction;
            const length = cp.length;
            const to = from.add(dir.multiply(length));
            return new Vector2(to.x, to.y);
        } else if (cp.type === "OnArc") {
            const center = cp.center;
            const radius = cp.radius;
            const angleRadian = cp.angleRadian + cp.baseAngleRadian;
            const position = new Vector2(
                center.x + radius * Math.cos(angleRadian),
                center.y + radius * Math.sin(angleRadian)
            );
            return new Vector2(position.x, position.y);
        } else if (cp.type === "Radius") {
            const start = cp.start;
            const radius = cp.radius;
            const counterClockwise = cp.counterClockwise;
            const direction = cp.direction.normalized();
            if (counterClockwise) {
                const center = start.add(
                    new Vector2(-direction.y, direction.x).multiply(radius)
                );
                return new Vector2(center.x, center.y);
            } else {
                const center = start.add(
                    new Vector2(direction.y, -direction.x).multiply(radius)
                );
                return new Vector2(center.x, center.y);
            }
        }
        return new Vector2(0, 0);
    }
    
}

export { Tokenizer, Parser, Program };
export type { PathStatement, MoverStatement, ControlPoint };

/*
new MoverBuilder()
  .Uniform(60, e => e
    .Start(new Vector2(0, 3))
    .Line(new Vector2(0.7, 1.3))
    .Arc(new Vector2(2, 1.5), 0.8)
    .BezierContinue(2.9, new Vector2(2, -3), new Vector2(0, -3), 100)
    .ArcContinue(1, -2)
    .ArcContinue(1.4, 2)
    .BezierContinue(1, new Vector2(-2, 1.5), new Vector2(-3, 2), 100)
    .LineContinue(0.4)
    .Bezier(new Vector2(-3, 4), new Vector2(-1, 2), new Vector2(0, 5), 100)
  );
*/