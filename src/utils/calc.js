export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function roundToInt(value) {
    return Math.round(value);
}

export function percent(part, total) {
    if (!total) return 0;
    return (part / total) * 100;
}
