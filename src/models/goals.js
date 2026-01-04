import { DEFAULT_GOAL, sessionsByGoalId } from "../core/state.js";
import { clamp } from "../utils/calc.js";
import { formatFutureDate, formatShortDate } from "../utils/dates.js";

export function normalizeGoal(rawGoal = {}) {
    const mode = rawGoal.mode || DEFAULT_GOAL.mode;
    const title = rawGoal.title || rawGoal.name || DEFAULT_GOAL.title;
    const type = rawGoal.type || DEFAULT_GOAL.type;
    const paceMode = rawGoal.paceMode || DEFAULT_GOAL.paceMode;
    const startDate = rawGoal.startDate || DEFAULT_GOAL.startDate;
    const deadlineDate = rawGoal.deadlineDate || rawGoal.deadline || null;
    const rawTargetValue = Number(rawGoal.targetValue ?? rawGoal.target ?? DEFAULT_GOAL.targetValue);
    const targetValue = Number.isFinite(rawTargetValue) ? rawTargetValue : DEFAULT_GOAL.targetValue;
    const rawUnitName = rawGoal.unitName || (mode === "time" ? "horas" : DEFAULT_GOAL.unitName);
    const unitName = rawUnitName === "unidades" ? "sesiones" : rawUnitName;
    const planDays = Array.isArray(rawGoal.plan?.daysPerWeek)
        ? rawGoal.plan.daysPerWeek
        : (Array.isArray(rawGoal.scheduleDays) ? rawGoal.scheduleDays : DEFAULT_GOAL.plan.daysPerWeek);
    const rawPlanMinutes = Number(
        rawGoal.plan?.minutesPerSession ?? rawGoal.minutesPerSession ?? DEFAULT_GOAL.plan.minutesPerSession
    );
    const planMinutes = Number.isFinite(rawPlanMinutes) ? rawPlanMinutes : DEFAULT_GOAL.plan.minutesPerSession;
    const rawRateValue = Number(rawGoal.rate?.valuePerHour ?? rawGoal.rate ?? DEFAULT_GOAL.rate.valuePerHour);
    const rateValuePerHour = Number.isFinite(rawRateValue) ? rawRateValue : DEFAULT_GOAL.rate.valuePerHour;

    return {
        ...DEFAULT_GOAL,
        id: rawGoal.id || DEFAULT_GOAL.id,
        title,
        name: title,
        type,
        paceMode,
        targetValue,
        target: targetValue,
        mode,
        unitName,
        startDate,
        deadlineDate,
        plan: {
            daysPerWeek: planDays,
            minutesPerSession: planMinutes
        },
        scheduleDays: planDays,
        minutesPerSession: planMinutes,
        rate: {
            valuePerHour: rateValuePerHour
        }
    };
}

export function getStats(goal, sessionsList) {
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

export function calculateETA(paceModifier, goal, sessionsList) {
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

export function calculateEtaDays(goal, paceModifier, sessionsOverride, sessionsList) {
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

export function getGoalProgress(goal, sessionsForGoal = []) {
    let totalMinutes = 0;
    let totalValue = 0;

    sessionsForGoal.forEach((session) => {
        totalMinutes += session.minutes;

        if (goal.mode === "time") {
            totalValue += session.minutes / 60;
            return;
        }

        if (typeof session.value === "number") {
            totalValue += session.value;
            return;
        }

        const rate = goal.rate?.valuePerHour ?? 0;
        if (rate > 0 && session.minutes > 0) {
            totalValue += Math.floor((session.minutes / 60) * rate);
        }
    });

    let progressPercent = 0;
    if (goal.mode === "time") {
        if (goal.targetValue) {
            progressPercent = (totalMinutes / (goal.targetValue * 60)) * 100;
        } else {
            const baseline = goal.plan.minutesPerSession * Math.max(1, goal.plan.daysPerWeek.length) * 4;
            progressPercent = baseline > 0 ? (totalMinutes / baseline) * 100 : 0;
        }
    } else if (goal.targetValue) {
        progressPercent = (totalValue / goal.targetValue) * 100;
    } else {
        progressPercent = Math.min(100, sessionsForGoal.length * 10);
    }

    return {
        progressPercent: clamp(Math.round(progressPercent), 0, 100),
        totalMinutes,
        totalValue
    };
}

export function getGoalStatus(goal, progressInfo, todayDate, sessionsForGoal = []) {
    const labels = {
        "on-track": "En ruta",
        "warning": "Un pequeño empujón",
        "behind": "Vamos a rescatar esta meta"
    };
    const colors = {
        "on-track": "status-on-track",
        "warning": "status-warning",
        "behind": "status-behind"
    };

    let status = "on-track";
    let etaText = "A tu ritmo";

    if (goal.deadlineDate) {
        const startDate = new Date(`${goal.startDate || todayDate}T00:00:00`);
        const deadlineDate = new Date(`${goal.deadlineDate}T00:00:00`);
        const totalDays = Math.max(1, Math.round((deadlineDate - startDate) / 86400000));
        const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((todayDate - startDate) / 86400000)));
        const expectedProgress = (elapsedDays / totalDays) * 100;

        if (progressInfo.progressPercent >= expectedProgress - 5) {
            status = "on-track";
        } else if (progressInfo.progressPercent >= expectedProgress - 15) {
            status = "warning";
        } else {
            status = "behind";
        }

        etaText = progressInfo.progressPercent >= 100
            ? "Meta cumplida 🎉"
            : `Terminas aprox el ${formatShortDate(goal.deadlineDate)}`;
    } else {
        const lastSession = sessionsForGoal[0];
        const plannedSessions = Math.max(1, goal.plan.daysPerWeek.length || 1);
        const expectedGap = Math.max(1, Math.floor(7 / plannedSessions));
        if (!lastSession) {
            status = "warning";
        } else {
            const lastDate = new Date(`${lastSession.date}T00:00:00`);
            const daysSince = Math.round((todayDate - lastDate) / 86400000);
            if (daysSince > expectedGap * 2) {
                status = "behind";
            } else if (daysSince > expectedGap) {
                status = "warning";
            }
        }
    }

    return {
        status,
        label: labels[status],
        colorClass: colors[status],
        etaText
    };
}

export function isTodayWorkDay(goal, todayDate) {
    const planDays = goal.plan?.daysPerWeek;
    if (!Array.isArray(planDays) || planDays.length === 0) {
        return false;
    }

    const dayIndex = todayDate.getDay();
    const letterMap = {
        L: 1,
        M: 2,
        X: 3,
        J: 4,
        V: 5,
        S: 6,
        D: 0
    };

    return planDays.some((day) => {
        if (typeof day === "number") {
            const normalized = day === 7 ? 0 : day;
            return normalized === dayIndex || (dayIndex === 0 && day === 0);
        }
        if (typeof day === "string") {
            const key = day.trim().toUpperCase();
            return letterMap[key] === dayIndex;
        }
        return false;
    });
}

export function getTodaySummaryForGoal(goal, sessionsForGoal, todayDate) {
    const todayKey = todayDate.toISOString().split("T")[0];
    const todaySessions = sessionsForGoal.filter((session) => session.date === todayKey);
    const completedMinutes = todaySessions.reduce((acc, session) => acc + session.minutes, 0);
    const isWorkDay = isTodayWorkDay(goal, todayDate);
    const plannedMinutes = isWorkDay ? (goal.plan?.minutesPerSession || 0) : 0;
    const remainingMinutes = Math.max(plannedMinutes - completedMinutes, 0);

    let suggestionText = "Hoy es día libre para esta meta.";
    if (isWorkDay) {
        suggestionText = remainingMinutes > 0
            ? `Te faltan ~${remainingMinutes} min para cumplir lo de hoy.`
            : "Meta diaria cumplida 🎉";
    }

    return {
        plannedMinutes,
        completedMinutes,
        remainingMinutes,
        suggestionText
    };
}

export function getTodayItems(goalsList, sessionsMap, todayDate) {
    return goalsList.map((goal) => {
        const sessionsForGoal = sessionsMap[goal.id] || [];
        const summary = getTodaySummaryForGoal(goal, sessionsForGoal, todayDate);
        const progressInfo = getGoalProgress(goal, sessionsForGoal);
        const status = getGoalStatus(goal, progressInfo, todayDate, sessionsForGoal);

        return {
            goalId: goal.id,
            goalTitle: goal.title,
            type: goal.type,
            status: status.status,
            isTodayWorkDay: summary.plannedMinutes > 0,
            plannedMinutes: summary.plannedMinutes,
            completedMinutes: summary.completedMinutes,
            remainingMinutes: summary.remainingMinutes,
            suggestionText: summary.suggestionText
        };
    });
}

export function getGoalTypeLabel(type) {
    const map = {
        reading: "📖 Lectura",
        fitness: "🏃 Fitness",
        study: "📚 Estudio",
        habit: "✨ Hábito",
        generic: "🎯 Meta"
    };
    return map[type] || "🎯 Meta";
}

export function buildDaysFromCount(count) {
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    return dayOrder.slice(0, Math.min(count, dayOrder.length));
}

export function getLatestSessionsForGoal(goalId) {
    return sessionsByGoalId[goalId] || [];
}

// TODO: rachas, pausas, subtareas, motivación visual.
