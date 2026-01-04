import {
    DEFAULT_GOAL,
    KEYS,
    LEGACY_KEYS,
    LEGACY_PROJECT_KEYS,
    appState,
    currentGoal,
    currentGoalId,
    goals,
    setCurrentGoal,
    setCurrentGoalId,
    setGoals,
    setSessions,
    setSessionsByGoalId,
    sessionsByGoalId
} from "./state.js";
import { normalizeGoal } from "../models/goals.js";
import { normalizeSessions } from "../models/sessions.js";

export function migrateStorageIfNeeded() {
    const hasGoals = localStorage.getItem(KEYS.GOALS);
    const hasSessions = localStorage.getItem(KEYS.SESSIONS);

    if (!hasGoals) {
        const legacyGoalStr = localStorage.getItem(LEGACY_KEYS.GOAL);
        const legacyProjectStr = localStorage.getItem(LEGACY_PROJECT_KEYS.GOAL);
        const rawGoalStr = legacyGoalStr || legacyProjectStr;

        try {
            const legacyGoal = rawGoalStr ? JSON.parse(rawGoalStr) : null;
            const baseGoal = legacyGoal
                ? normalizeGoal({
                    id: legacyGoal.id || DEFAULT_GOAL.id,
                    title: legacyGoal.title || legacyGoal.name || DEFAULT_GOAL.title,
                    targetValue: legacyGoal.targetValue ?? legacyGoal.targetWords ?? DEFAULT_GOAL.targetValue,
                    plan: {
                        daysPerWeek: legacyGoal.plan?.daysPerWeek || legacyGoal.schedule?.workDays || DEFAULT_GOAL.plan.daysPerWeek,
                        minutesPerSession: Math.round(
                            (legacyGoal.plan?.minutesPerSession || legacyGoal.schedule?.hoursPerSession || DEFAULT_GOAL.plan.minutesPerSession / 60) * 60
                        )
                    },
                    rate: {
                        valuePerHour: legacyGoal.rate?.valuePerHour || legacyGoal.schedule?.wordsPerHour || DEFAULT_GOAL.rate.valuePerHour
                    }
                })
                : normalizeGoal(DEFAULT_GOAL);

            localStorage.setItem(KEYS.GOALS, JSON.stringify([baseGoal]));
            localStorage.setItem(KEYS.CURRENT_GOAL_ID, baseGoal.id);
        } catch (error) {
            console.error(error);
            localStorage.setItem(KEYS.GOALS, JSON.stringify([normalizeGoal(DEFAULT_GOAL)]));
            localStorage.setItem(KEYS.CURRENT_GOAL_ID, DEFAULT_GOAL.id);
        }
    }

    if (!hasSessions) {
        const legacySessionsStr = localStorage.getItem(LEGACY_KEYS.SESSIONS)
            || localStorage.getItem(LEGACY_PROJECT_KEYS.SESSIONS);
        if (legacySessionsStr) {
            try {
                const legacySessions = JSON.parse(legacySessionsStr);
                const migratedSessions = Array.isArray(legacySessions)
                    ? legacySessions.map((session) => ({
                        id: session.id || Date.now(),
                        date: session.date || new Date().toISOString().split("T")[0],
                        minutes: Number(session.minutes) || 0,
                        value: session.words ?? session.value ?? null,
                        isEstimated: Boolean(session.isEstimated)
                    }))
                    : [];
                const goalId = localStorage.getItem(KEYS.CURRENT_GOAL_ID) || DEFAULT_GOAL.id;
                localStorage.setItem(KEYS.SESSIONS, JSON.stringify({ [goalId]: migratedSessions }));
            } catch (error) {
                console.error(error);
            }
        }
    }
}

export function loadData() {
    const goalsStr = localStorage.getItem(KEYS.GOALS);
    if (!goalsStr) {
        setGoals([normalizeGoal(DEFAULT_GOAL)]);
    } else {
        try {
            const parsed = JSON.parse(goalsStr);
            setGoals(Array.isArray(parsed) ? parsed.map((goal) => normalizeGoal(goal)) : [normalizeGoal(DEFAULT_GOAL)]);
        } catch (error) {
            console.error(error);
            setGoals([normalizeGoal(DEFAULT_GOAL)]);
        }
    }

    const storedGoalId = localStorage.getItem(KEYS.CURRENT_GOAL_ID);
    const validGoalId = goals.some((goal) => goal.id === storedGoalId) ? storedGoalId : goals[0].id;
    setCurrentGoalId(validGoalId);
    setCurrentGoal(normalizeGoal(goals.find((goal) => goal.id === validGoalId)));

    const sessionsStr = localStorage.getItem(KEYS.SESSIONS);
    if (sessionsStr) {
        try {
            const parsedSessions = JSON.parse(sessionsStr);
            if (Array.isArray(parsedSessions)) {
                setSessionsByGoalId({ [validGoalId]: parsedSessions });
            } else {
                setSessionsByGoalId(typeof parsedSessions === "object" && parsedSessions !== null ? parsedSessions : {});
            }
        } catch (error) {
            console.error(error);
            setSessionsByGoalId({});
        }
    } else {
        setSessionsByGoalId({});
    }

    Object.keys(sessionsByGoalId).forEach((goalId) => {
        sessionsByGoalId[goalId] = normalizeSessions(sessionsByGoalId[goalId]);
    });

    setSessions(normalizeSessions(sessionsByGoalId[validGoalId]));
    appState.selectedGoalId = validGoalId;
}

export function saveData() {
    const existingIndex = goals.findIndex((goal) => goal.id === currentGoal.id);
    if (existingIndex >= 0) {
        goals[existingIndex] = currentGoal;
    } else {
        goals.push(currentGoal);
    }
    sessionsByGoalId[currentGoal.id] = sessionsByGoalId[currentGoal.id] || [];

    localStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
    localStorage.setItem(KEYS.CURRENT_GOAL_ID, currentGoal.id);
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessionsByGoalId));
}

export function saveCurrentGoalId(goalId) {
    localStorage.setItem(KEYS.CURRENT_GOAL_ID, goalId);
}
