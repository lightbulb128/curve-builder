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
            while (this.position < this.content.length && /[0-9\.eE\+\-]/.test(this.peek())) {
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

    

    /*
new MoverBuilder()
    .Uniform(40, e => e
        .Start(new Vector2(0, 0))
        .Line(new Vector2(10, 0))
        .LineContinue(100)
        .Arc(new Vector2(50, 0), 90)
        .ArcContinue(50, 90)
        .Bezier(new Vector2(20, 0), new Vector2(30, 0), new Vector2(40, 0), 100)
        .BezierContinue(60, new Vector2(60, 0), new Vector2(70, 0), 100)
    )
    .Sine(60, e => e)
    */

    parseInnerMethod(): ((pb: PathBuilder) => PathBuilder) | string {
        if (!this.assertOperator(".")) return "Expected '.'";
        const methodToken = this.wantIdentifier();
        if (!methodToken) return "Expected method name";
        if (!this.assertOperator("(")) return "Expected '('";
        let ret: ((pb: PathBuilder) => PathBuilder) | string = "";
        if (methodToken === "Start") {
            const vec = this.wantVector();
            if (typeof vec === "string") return "Expected Start: " + vec;
            ret = (pb: PathBuilder) => pb.Start(vec);
        }
        else if (methodToken === "Line") {
            const vec = this.wantVector();
            if (typeof vec === "string") return "Expected Line: " + vec;
            ret = (pb: PathBuilder) => pb.Line(vec);
        }
        else if (methodToken === "LineContinue") {
            const length = this.wantNumber();
            if (length === null) return "Expected number argument for LineContinue";
            ret = (pb: PathBuilder) => pb.LineContinue(length);
        }
        else if (methodToken === "Arc") {
            const center = this.wantVector();
            if (typeof center === "string") return "Expected Arc: " + center;
            if (!this.assertOperator(",")) return "Expected ','";
            const angle = this.wantNumber();
            if (angle === null) return "Expected number argument for Arc";
            ret = (pb: PathBuilder) => pb.Arc(center, angle);
        }
        else if (methodToken === "ArcContinue") {
            const radius = this.wantNumber();
            if (radius === null) return "Expected number argument for ArcContinue";
            if (!this.assertOperator(",")) return "Expected ','";
            const angle = this.wantNumber();
            if (angle === null) return "Expected number argument for ArcContinue";
            ret = (pb: PathBuilder) => pb.ArcContinue(radius, angle);
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
            ret = (pb: PathBuilder) => pb.Bezier(c1, c2, end, segments);
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
            ret = (pb: PathBuilder) => pb.BezierContinue(c1Offset, c2, end, segments);
        } else {
            ret = `Unknown method name: ${methodToken}`;
        }
        if (typeof ret === "string") return ret;
        if (!this.assertOperator(")")) return "Expected ')'";
        return ret;
    }

    parseMethod(builder: SequencedMoverBuilder): string | null {
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
        const builders: Array<(pb: PathBuilder) => PathBuilder> = [];
        while (true) {
            const peek = this.peek();
            if (!peek) return "Unexpected end of input in method body";
            if (peek.kind === 'operator' && peek.value === ")") {
                this.consume();
                break;
            }
            const result = this.parseInnerMethod();
            if (typeof result === 'string') return result;
            builders.push(result);
        }
        const pbBuilder = (pb: PathBuilder): PathBuilder => {
            for (const b of builders) {
                pb = b(pb);
            }
            return pb;
        };
        if (methodToken === "Uniform") {
            builder.Uniform(duration, pbBuilder);
        } else if (methodToken === "Sine") {
            builder.Sine(duration, pbBuilder);
        } else if (methodToken === "Cosine") {
            builder.Cosine(duration, pbBuilder);
        } else if (methodToken === "SmoothStep") {
            builder.SmoothStep(duration, pbBuilder);
        } else if (methodToken === "InverseSmoothStep") {
            builder.InverseSmoothStep(duration, pbBuilder);
        } else {
            return `Unknown method name: ${methodToken}`;
        }
        return null;
    }

    parse(): SequencedMover | string {

        if (!this.assertIdentifier("new")) return "Expected 'new'";
        if (!this.assertIdentifier("MoverBuilder")) return "Expected 'MoverBuilder'";
        if (!this.assertOperator("(")) return "Expected '('";
        if (!this.assertOperator(")")) return "Expected ')'";

        const moverBuilder = new SequencedMoverBuilder();
        while (true) {
            const peek = this.peek();
            if (!peek) break;
            if (peek.kind === 'operator' && peek.value === ";") {
                this.consume();
                break;
            }
            const err = this.parseMethod(moverBuilder);
            if (err) return err;
        }

        return moverBuilder.Build();
    }
    
    

}

export { Tokenizer, Parser };

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