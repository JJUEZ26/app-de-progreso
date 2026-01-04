import { currentGoalId, sessionsByGoalId, setSessions, setSessionsByGoalId } from "../core/state.js";
import { getWeekStart } from "../utils/dates.js";

export function normalizeSessions(sessionList) {
    if (!Array.isArray(sessionList)) return [];
    return sessionList.map((session) => ({
        id: session.id || Date.now(),
        date: session.date || new Date().toISOString().split("T")[0],
        minutes: Number(session.minutes) || 0,
        value: typeof session.value === "number" ? session.value : session.value ?? null,
        isEstimated: Boolean(session.isEstimated)
    }));
}

export function addSessionForGoal(goalId, { minutes, value = null, isEstimated = false } = {}) {
    if (!sessionsByGoalId[goalId]) {
        sessionsByGoalId[goalId] = [];
    }

    sessionsByGoalId[goalId].unshift({
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        minutes,
        value,
        isEstimated
    });

    if (goalId === currentGoalId) {
        setSessions(normalizeSessions(sessionsByGoalId[goalId]));
    }

    setSessionsByGoalId({ ...sessionsByGoalId });
}

export function getWeeklyStats(goal, sessionsList) {
    const weekStart = getWeekStart();

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
