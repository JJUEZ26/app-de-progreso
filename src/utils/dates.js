const DAY_MS = 86400000;

function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(`${value}T00:00:00`);
}

export function today() {
    return new Date().toISOString().split("T")[0];
}

export function diffInDays(dateA, dateB) {
    const a = toDate(dateA);
    const b = toDate(dateB);
    if (!a || !b) return 0;
    return Math.round((b - a) / DAY_MS);
}

export function isSameDay(dateA, dateB) {
    const a = toDate(dateA);
    const b = toDate(dateB);
    if (!a || !b) return false;
    return a.toISOString().split("T")[0] === b.toISOString().split("T")[0];
}

export function isDateBefore(dateA, dateB) {
    const a = toDate(dateA);
    const b = toDate(dateB);
    if (!a || !b) return false;
    return a < b;
}

export function isDateAfter(dateA, dateB) {
    const a = toDate(dateA);
    const b = toDate(dateB);
    if (!a || !b) return false;
    return a > b;
}

export function formatShortDate(dateString) {
    if (!dateString) return "";
    const date = toDate(dateString);
    if (!date || Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}
