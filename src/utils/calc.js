export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const formatHours = (hours) => hours.toFixed(2).replace(/\.00$/, "");
