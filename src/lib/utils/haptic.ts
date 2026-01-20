import { attempt } from "ts-utils"

const hapticPatterns = {
    selection: [10],
    alert: [30, 50, 30],
    error: [50, 100, 50, 100, 50],
    success: [20, 40, 20, 40, 20],
};

export type HapticPattern = keyof typeof hapticPatterns;

export const haptic = (
    pattern: HapticPattern,
) => {
    return attempt(() => {
        navigator.vibrate(hapticPatterns[pattern]);
    });
}