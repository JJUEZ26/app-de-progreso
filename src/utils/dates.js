export function formatFutureDate(daysToAdd) {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function formatShortDate(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

export function getWeekStart(date = new Date()) {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}
