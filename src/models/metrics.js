export function getStats(goal, sessionsList = []) {
    let totalUnits = 0;
    let totalMinutes = 0;

    sessionsList.forEach((session) => {
        totalMinutes += session.minutes;

        if (goal.mode === "time") {
            totalUnits += session.minutes / 60;
            return;
        }

        if (typeof session.value === "number") {
            totalUnits += session.value;
            return;
        }

        const rate = goal.rate.valuePerHour;
        if (rate > 0 && session.minutes > 0) {
            totalUnits += Math.floor((session.minutes / 60) * rate);
        }
    });

    const percent = goal.targetValue > 0
        ? Math.min(100, Math.floor((totalUnits / goal.targetValue) * 100))
        : 0;

    const averageRate = goal.mode !== "time" && totalMinutes > 0
        ? Math.floor(totalUnits / (totalMinutes / 60))
        : goal.rate.valuePerHour;

    return { totalUnits, totalMinutes, percent, averageRate };
}

export function getWeeklyStats(goal, sessionsList = []) {
    const now = new Date();
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    let completedSessions = 0;
    let totalMinutes = 0;
    let totalUnits = 0;

    sessionsList.forEach((session) => {
        const sessionDate = new Date(`${session.date}T00:00:00`);
        if (sessionDate >= weekStart) {
            completedSessions += 1;
            totalMinutes += session.minutes;

            if (goal.mode === "time") {
                totalUnits += session.minutes / 60;
            } else if (typeof session.value === "number") {
                totalUnits += session.value;
            } else if (goal.rate.valuePerHour > 0 && session.minutes > 0) {
                totalUnits += Math.floor((session.minutes / 60) * goal.rate.valuePerHour);
            }
        }
    });

    return {
        completedSessions,
        plannedSessions: goal.plan.daysPerWeek.length,
        totalMinutes,
        totalUnits
    };
}

export function calculateETA(goal, sessionsList = [], paceModifier = 1) {
    const stats = getStats(goal, sessionsList);
    const remainingUnits = goal.targetValue - stats.totalUnits;

    if (remainingUnits <= 0) {
        return "¡Completado!";
    }

    const sessionsPerWeek = goal.plan.daysPerWeek.length;
    const minutesPerSession = goal.plan.minutesPerSession;

    if (goal.mode === "time") {
        const minutesPerWeek = minutesPerSession * sessionsPerWeek * paceModifier;
        if (minutesPerWeek <= 0) {
            return "Configura tu ritmo";
        }
        const weeksNeeded = (remainingUnits * 60) / minutesPerWeek;
        return formatFutureDate(Math.ceil(weeksNeeded * 7));
    }

    const rateToUse = stats.averageRate > 0 ? stats.averageRate : goal.rate.valuePerHour;
    const unitsPerSession = (rateToUse * (minutesPerSession / 60)) * paceModifier;

    if (unitsPerSession <= 0 || sessionsPerWeek <= 0) {
        return "Configura tu ritmo";
    }

    const unitsPerWeek = unitsPerSession * sessionsPerWeek;
    const weeksNeeded = remainingUnits / unitsPerWeek;
    return formatFutureDate(Math.ceil(weeksNeeded * 7));
}

export function calculateEtaDays(goal, paceModifier = 1, sessionsOverride = null, sessionsList = []) {
    const stats = getStats(goal, sessionsList);
    const remainingUnits = goal.targetValue - stats.totalUnits;

    if (remainingUnits <= 0) {
        return 0;
    }

    const sessionsPerWeek = sessionsOverride ?? goal.plan.daysPerWeek.length;
    const minutesPerSession = goal.plan.minutesPerSession;

    if (goal.mode === "time") {
        const minutesPerWeek = minutesPerSession * sessionsPerWeek * paceModifier;
        if (minutesPerWeek <= 0) {
            return null;
        }
        const weeksNeeded = (remainingUnits * 60) / minutesPerWeek;
        return Math.ceil(weeksNeeded * 7);
    }

    const rateToUse = stats.averageRate > 0 ? stats.averageRate : goal.rate.valuePerHour;
    const unitsPerSession = (rateToUse * (minutesPerSession / 60)) * paceModifier;
    if (unitsPerSession <= 0 || sessionsPerWeek <= 0) {
        return null;
    }
    const unitsPerWeek = unitsPerSession * sessionsPerWeek;
    const weeksNeeded = remainingUnits / unitsPerWeek;
    return Math.ceil(weeksNeeded * 7);
}

export function formatFutureDate(daysToAdd) {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysToAdd);
    return targetDate.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

const DAY_LETTER_MAP = {
    L: 1,
    M: 2,
    X: 3,
    J: 4,
    V: 5,
    S: 6,
    D: 0
};

function toDateString(date) {
    if (!date) return "";
    if (typeof date === "string") return date;
    return date.toISOString().split("T")[0];
}

function addDays(dateString, offset) {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + offset);
    return date.toISOString().split("T")[0];
}

function isRelevantDay(goal, dateString) {
    const planDays = goal.plan?.daysPerWeek;
    if (!Array.isArray(planDays) || planDays.length === 0) {
        return true;
    }

    const date = new Date(`${dateString}T00:00:00`);
    const dayIndex = date.getDay();

    return planDays.some((day) => {
        if (typeof day === "number") {
            const normalized = day === 7 ? 0 : day;
            return normalized === dayIndex;
        }
        if (typeof day === "string") {
            const key = day.trim().toUpperCase();
            return DAY_LETTER_MAP[key] === dayIndex;
        }
        return false;
    });
}

function isPausedDay(goal, dateString) {
    if (!goal.paused || !goal.pauseSince) return false;
    const date = new Date(`${dateString}T00:00:00`);
    const pauseStart = new Date(`${goal.pauseSince}T00:00:00`);
    if (date < pauseStart) return false;
    if (goal.pauseUntil) {
        const pauseEnd = new Date(`${goal.pauseUntil}T00:00:00`);
        if (date > pauseEnd) return false;
    }
    return true;
}

export function computeStreak(goal, sessionsForGoal = [], todayDate = new Date().toISOString().split("T")[0]) {
    const limitDays = 60;
    const todayString = toDateString(todayDate);
    const sessionDates = new Set(sessionsForGoal.map((session) => session.date));

    let currentStreak = 0;

    for (let offset = 0; offset < limitDays; offset += 1) {
        const dateString = addDays(todayString, -offset);

        if (isPausedDay(goal, dateString)) {
            continue;
        }

        if (!isRelevantDay(goal, dateString)) {
            continue;
        }

        if (sessionDates.has(dateString)) {
            currentStreak += 1;
        } else {
            break;
        }
    }

    const longestStreak = Math.max(Number(goal.longestStreak || 0), currentStreak);

    return { currentStreak, longestStreak };
}
