export const KEYS = {
    GOALS: "writerDashboard_goals",
    CURRENT_GOAL_ID: "writerDashboard_current_goal_id",
    SESSIONS: "writerDashboard_sessions_by_goal"
};

export const LEGACY_KEYS = {
    GOAL: "writerDashboard_goal",
    SESSIONS: "writerDashboard_sessions"
};

export const LEGACY_PROJECT_KEYS = {
    GOAL: "writerDashboard_project",
    SESSIONS: "writerDashboard_sessions_proj_001"
};

export function loadGoals() {
    const goalsStr = localStorage.getItem(KEYS.GOALS);
    if (!goalsStr) return [];
    try {
        const parsed = JSON.parse(goalsStr);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

export function saveGoals(goals) {
    localStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
}

export function loadSessionsByGoal() {
    const sessionsStr = localStorage.getItem(KEYS.SESSIONS);
    if (!sessionsStr) return {};

    try {
        const parsed = JSON.parse(sessionsStr);
        if (Array.isArray(parsed)) {
            const currentGoalId = localStorage.getItem(KEYS.CURRENT_GOAL_ID);
            return currentGoalId ? { [currentGoalId]: parsed } : {};
        }
        return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch (error) {
        console.error(error);
        return {};
    }
}

export function saveSessionsByGoal(map) {
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(map));
}

export function loadCurrentGoalId() {
    return localStorage.getItem(KEYS.CURRENT_GOAL_ID);
}

export function saveCurrentGoalId(goalId) {
    if (!goalId) return;
    localStorage.setItem(KEYS.CURRENT_GOAL_ID, goalId);
}
