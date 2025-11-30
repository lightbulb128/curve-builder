interface Curve {
    evaluate(t: number): number;
    derivative(t: number): number;
}

class UniformCurve implements Curve {
    evaluate(t: number): number {
        return t;
    }
    derivative(t: number): number {
        return 1;
    }
}

class SineCurve implements Curve {
    // [0, 1] -> [0, 1]
    evaluate(t: number): number {
        return Math.sin(t * Math.PI / 2);
    }
    derivative(t: number): number {
        return (Math.PI / 2) * Math.cos(t * Math.PI / 2);
    }
}

class CosineCurve implements Curve {
    // [0, 1] -> [0, 1]
    evaluate(t: number): number {
        return 1 - Math.cos(t * Math.PI / 2);
    }
    derivative(t: number): number {
        return (Math.PI / 2) * Math.sin(t * Math.PI / 2);
    }
}

class SmoothStepCurve implements Curve {
    // [0, 1] -> [0, 1]
    evaluate(t: number): number {
        return t * t * (3 - 2 * t);
    }
    derivative(t: number): number {
        return 6 * t * (1 - t);
    }
}

export type { Curve };
export { UniformCurve, SineCurve, CosineCurve, SmoothStepCurve };