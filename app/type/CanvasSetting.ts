class CanvasSetting {
    width: number;
    height: number;
    horizontalLines: Array<number>;
    verticalLines: Array<number>;
    scale: number;
    unitPixels: number;

    constructor(width: number, height: number, horizontalLines: Array<number>, verticalLines: Array<number>, scale: number, unitPixels: number) {
        this.width = width;
        this.height = height;
        this.horizontalLines = horizontalLines;
        this.verticalLines = verticalLines;
        this.scale = scale;
        this.unitPixels = unitPixels;
    }

    static default(): CanvasSetting {
        return new CanvasSetting(
            768 + 200,
            896 + 200,
            [-4.667, -4, -2, 0, 2, 4, 4.667],
            [-4, -2, 0, 2, 4],
            0.7,
            96,
        );
    }

    worldToCanvas(x: number, y: number): { px: number; py: number } {
        const px = x * this.unitPixels * this.scale + (this.width * this.scale) / 2;
        const py = -y * this.unitPixels * this.scale + (this.height * this.scale) / 2;
        return { px, py };
    }
}

export default CanvasSetting;