import { Curve } from "./Curve";
import { Vector2, Path } from "./Path";


type MEval = {
    position: Vector2;
    direction: Vector2;
    speed: number;
}

abstract class Mover {
    duration: number;
    constructor(duration: number) {
        this.duration = duration;
    }
    abstract evaluate(t: number): MEval;
}

class SimpleMover extends Mover {
    path: Path;
    curve: Curve;

    constructor(path: Path, duration: number, curve: Curve) {
        super(duration);
        this.path = path;
        this.curve = curve;
    }

    evaluate(timeElapsed: number): MEval {
        const relativeTime = (this.duration === 0) ? 1 : Math.min(Math.max(timeElapsed / this.duration, 0), 1);
        const t = this.curve.evaluate(relativeTime);
        const pathT = t * this.path.length();
        const evalAtT = this.path.at(pathT);
        // calculate velocity
        const curveDeriv = this.curve.derivative(relativeTime);
        const pathLength = this.path.length();
        return {
            position: evalAtT.position,
            direction: evalAtT.direction,
            speed: (curveDeriv * pathLength) / this.duration
        };
    }
}

class SequencedMover extends Mover {
    movers: Array<Mover>;
    cumulativeDuration: Array<number>;
    totalDuration: number;

    constructor(movers: Array<Mover>) {
        const totalDuration = movers.reduce((sum, mover) => sum + mover.duration, 0);
        super(totalDuration);
        this.movers = movers;
        this.totalDuration = totalDuration;
        this.cumulativeDuration = [];
        let cumSum = 0;
        for (const mover of movers) {
            cumSum += mover.duration;
            this.cumulativeDuration.push(cumSum);
        }
    }

    evaluate(timeElapsed: number): MEval {
        const clampedTime = Math.min(Math.max(timeElapsed, 0), this.totalDuration);
        let moverIndex = 0;
        while (moverIndex < this.movers.length - 1 && clampedTime > this.cumulativeDuration[moverIndex]) {
            moverIndex++;
        }
        const segmentStartTime = moverIndex === 0 ? 0 : this.cumulativeDuration[moverIndex - 1];
        const localTime = clampedTime - segmentStartTime;
        return this.movers[moverIndex].evaluate(localTime);
    }
}

export type { MEval };
export { Mover, SimpleMover, SequencedMover };