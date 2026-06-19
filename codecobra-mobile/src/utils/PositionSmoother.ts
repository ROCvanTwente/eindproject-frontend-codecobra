import { UserPosition } from "../types/positioning";

export class PositionSmoother {
    private xHistory: number[] = [];
    private yHistory: number[] = [];
    private windowSize: number;

    constructor(windowSize: number = 5) {
        this.windowSize = windowSize;
    }

    addPosition(pos: UserPosition): UserPosition {
        this.xHistory.push(pos.x);
        this.yHistory.push(pos.y);

        // Maintain window size
        if (this.xHistory.length > this.windowSize) {
            this.xHistory.shift();
            this.yHistory.shift();
        }

        // Calculate smoothed position
        const avgX = this.xHistory.reduce((sum, val) => sum + val, 0) / this.xHistory.length;
        const avgY = this.yHistory.reduce((sum, val) => sum + val, 0) / this.yHistory.length;

        return { x: avgX, y: avgY };
    }
}
