import { loadSessionsByGoal, saveSessionsByGoal } from "../core/storage.js";
import { today } from "../utils/dates.js";

export function getSessionsForGoal(sessionsByGoal, goalId) {
    if (!sessionsByGoal || !goalId) return [];
    return Array.isArray(sessionsByGoal[goalId]) ? sessionsByGoal[goalId] : [];
}

export function getSessionsForDate(sessionsForGoal, dateStr) {
    if (!Array.isArray(sessionsForGoal)) return [];
    return sessionsForGoal.filter((session) => session.date === dateStr);
}

export function addSessionForToday(goalId, minutes) {
    if (!goalId || !Number.isFinite(minutes) || minutes <= 0) {
        return loadSessionsByGoal();
    }

    const sessionsByGoal = loadSessionsByGoal();
    const list = Array.isArray(sessionsByGoal[goalId]) ? sessionsByGoal[goalId] : [];

    const session = {
        id: Date.now(),
        date: today(),
        minutes,
        value: null,
        isEstimated: true
    };

    sessionsByGoal[goalId] = [session, ...list];
    saveSessionsByGoal(sessionsByGoal);
    document.dispatchEvent(new CustomEvent("sessions:updated", { detail: { goalId } }));
    return sessionsByGoal;
}

export function normalizeSessions(sessionList) {
    if (!Array.isArray(sessionList)) return [];
    return sessionList.map((session) => ({
        id: session.id || Date.now(),
        date: session.date || today(),
        minutes: Number(session.minutes) || 0,
        value: typeof session.value === "number" ? session.value : session.value ?? null,
        isEstimated: Boolean(session.isEstimated)
    }));
}
