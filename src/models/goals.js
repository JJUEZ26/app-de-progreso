import { clamp, percent, roundToInt } from "../utils/calc.js";
import { diffInDays, formatShortDate } from "../utils/dates.js";

export const DEFAULT_GOAL = {
    id: "goal_default",
    title: "Mi Nueva Meta",
    name: "Mi Nueva Meta",
    type: "generic",
    paceMode: "pace",
    targetValue: 50000,
    target: 50000,
    mode: "units",
    unitName: "sesiones",
    startDate: new Date().toISOString().split("T")[0],
    plan: {
        daysPerWeek: [1, 2, 3, 4, 5],
        minutesPerSession: 60
    },
    scheduleDays: [1, 2, 3, 4, 5],
    minutesPerSession: 60,
    rate: {
        valuePerHour: 500
    }
};

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
    const planDays = Array.isArray(rawGoal.plan?.daysPerWeek)\n        ? rawGoal.plan.daysPerWeek\n        : (Array.isArray(rawGoal.scheduleDays) ? rawGoal.scheduleDays : DEFAULT_GOAL.plan.daysPerWeek);
    const rawPlanMinutes = Number(\n        rawGoal.plan?.minutesPerSession ?? rawGoal.minutesPerSession ?? DEFAULT_GOAL.plan.minutesPerSession\n    );
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

export function getGoalProgress(goal, sessionsForGoal = []) {
    let totalMinutes = 0;
    let totalValue = 0;
    let lastSessionDate = null;

    sessionsForGoal.forEach((session) => {
        totalMinutes += session.minutes;
        if (!lastSessionDate || session.date > lastSessionDate) {
            lastSessionDate = session.date;
        }

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
            progressPercent = percent(totalMinutes, goal.targetValue * 60);
        } else {
            progressPercent = sessionsForGoal.length > 0 ? 50 : 0;
        }
    } else if (goal.targetValue) {
        progressPercent = percent(totalValue, goal.targetValue);
    } else {
        progressPercent = sessionsForGoal.length > 0 ? 50 : 0;
    }

    return {
        progressPercent: clamp(roundToInt(progressPercent), 0, 100),
        totalMinutes,
        totalValue,
        lastSessionDate
    };
}

export function getGoalStatus(goal, progressInfo, todayDate) {
    const labels = {
        "on-track": "En ruta",
        "warning": "Necesita ajuste",
        "behind": "Atrasada"
    };

    const colors = {
        "on-track": "status-ontrack",
        "warning": "status-warning",
        "behind": "status-behind"
    };

    let status = "on-track";
    let etaText = "A tu ritmo";

    if (goal.deadlineDate) {
        const totalDays = Math.max(1, diffInDays(goal.startDate || todayDate, goal.deadlineDate));
        const elapsedDays = Math.min(totalDays, Math.max(0, diffInDays(goal.startDate || todayDate, todayDate)));
        const expectedProgress = percent(elapsedDays, totalDays);

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
        const plannedSessions = Math.max(1, goal.plan?.daysPerWeek?.length || 1);
        const expectedGap = Math.max(1, Math.floor(7 / plannedSessions));
        const lastSessionDate = progressInfo.lastSessionDate;

        if (!lastSessionDate) {
            status = "warning";
        } else {
            const daysSince = Math.abs(diffInDays(lastSessionDate, todayDate));
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
