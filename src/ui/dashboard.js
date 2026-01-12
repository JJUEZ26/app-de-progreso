import { appState, DASHBOARD_MODE } from "../core/state.js";
import {
    loadCurrentGoalId,
    loadGoals,
    loadSessionsByGoal,
    saveGoals,
    saveCurrentGoalId
} from "../core/storage.js";
import { DEFAULT_GOAL, normalizeGoal, pauseGoal, resumeGoal } from "../models/goals.js";
import { getStats, getWeeklyStats, calculateETA } from "../models/metrics.js";
import { normalizeSessions } from "../models/sessions.js";
import { today } from "../utils/dates.js";
import { renderTodayView } from "./todayView.js";
import { renderVisionView } from "./visionView.js";

const dom = {
    projectName: document.getElementById("project-name"),
    wordsProgress: document.getElementById("words-progress"),
    percentProgress: document.getElementById("percent-progress"),
    progressBar: document.getElementById("progress-bar-fill"),
    etaDate: document.getElementById("eta-date"),

    settingGoal: document.getElementById("setting-goal"),
    settingDays: document.getElementById("setting-days"),
    settingHours: document.getElementById("setting-hours"),
    settingWph: document.getElementById("setting-wph"),

    weeklySessions: document.getElementById("weekly-sessions"),
    weeklyTime: document.getElementById("weekly-time"),
    weeklyUnits: document.getElementById("weekly-units"),
    weeklyUnitsLabel: document.getElementById("weekly-units-label"),

    btnDashboardVision: document.getElementById("btn-dashboard-vision"),
    btnDashboardToday: document.getElementById("btn-dashboard-today"),
    dashboardVisionPanel: document.getElementById("dashboard-vision"),
    dashboardTodayPanel: document.getElementById("dashboard-today")
};

export function renderDashboard() {
    const rawGoals = loadGoals();
    const goals = rawGoals.length ? rawGoals.map((goal) => normalizeGoal(goal)) : [normalizeGoal(DEFAULT_GOAL)];
    const sessionsByGoalId = loadSessionsByGoal();

    Object.keys(sessionsByGoalId).forEach((goalId) => {
        sessionsByGoalId[goalId] = normalizeSessions(sessionsByGoalId[goalId]);
    });

    const storedGoalId = appState.selectedGoalId || loadCurrentGoalId() || goals[0]?.id;
    const currentGoal = goals.find((goal) => goal.id === storedGoalId) || goals[0];
    if (!currentGoal) return;

    appState.selectedGoalId = currentGoal.id;
    saveCurrentGoalId(currentGoal.id);

    const sessions = normalizeSessions(sessionsByGoalId[currentGoal.id] || []);
    const stats = getStats(currentGoal, sessions);
    const weeklyStats = getWeeklyStats(currentGoal, sessions);
    const fmt = new Intl.NumberFormat("es-ES");
    const formatValue = (value) => (
        currentGoal.mode === "time"
            ? fmt.format(Number(value.toFixed(1)))
            : fmt.format(Math.floor(value))
    );

    const unitLabel = currentGoal.unitName;

    if (dom.projectName) dom.projectName.textContent = currentGoal.title;
    if (dom.wordsProgress) {
        dom.wordsProgress.textContent = `${formatValue(stats.totalUnits)} / ${formatValue(currentGoal.targetValue)} ${unitLabel}`;
    }
    if (dom.percentProgress) dom.percentProgress.textContent = `${stats.percent}%`;
    if (dom.progressBar) dom.progressBar.style.width = `${stats.percent}%`;
    if (dom.etaDate) dom.etaDate.textContent = calculateETA(currentGoal, sessions, 1);

    if (dom.settingGoal) dom.settingGoal.textContent = `${formatValue(currentGoal.targetValue)} ${unitLabel}`;
    if (dom.settingDays) dom.settingDays.textContent = `${currentGoal.plan.daysPerWeek.length} días/sem`;
    if (dom.settingHours) {
        dom.settingHours.textContent = `${(currentGoal.plan.minutesPerSession / 60).toFixed(2).replace(/\.00$/, "")}h/sesión`;
    }

    if (dom.settingWph) {
        if (currentGoal.mode !== "time") {
            const speedLabel = stats.totalMinutes > 0 ? "Real" : "Est.";
            const speedValue = stats.totalMinutes > 0 ? stats.averageRate : currentGoal.rate.valuePerHour;
            dom.settingWph.textContent = `${fmt.format(speedValue)} ${unitLabel}/h (${speedLabel})`;
        } else {
            dom.settingWph.textContent = "N/D";
        }
    }

    if (dom.weeklySessions) {
        dom.weeklySessions.textContent = `${weeklyStats.completedSessions} / ${weeklyStats.plannedSessions}`;
    }
    if (dom.weeklyTime) {
        dom.weeklyTime.textContent = `${(weeklyStats.totalMinutes / 60).toFixed(1).replace(/\.0$/, "")}h`;
    }
    if (dom.weeklyUnits) dom.weeklyUnits.textContent = formatValue(weeklyStats.totalUnits);
    if (dom.weeklyUnitsLabel) dom.weeklyUnitsLabel.textContent = unitLabel;

    const isVision = appState.dashboardMode === DASHBOARD_MODE.VISION;
    dom.dashboardVisionPanel?.classList.toggle("is-active", isVision);
    dom.dashboardTodayPanel?.classList.toggle("is-active", !isVision);
    dom.btnDashboardVision?.classList.toggle("is-active", isVision);
    dom.btnDashboardToday?.classList.toggle("is-active", !isVision);

    const todayDate = appState.today || today();
    if (isVision) {
        renderVisionView(dom.dashboardVisionPanel, goals, sessionsByGoalId, todayDate);
    } else {
        renderTodayView(dom.dashboardTodayPanel, goals, sessionsByGoalId, todayDate);
    }
}

export function handlePauseGoal(goalId) {
    const goals = loadGoals();
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return;

    const untilDate = window.prompt("¿Hasta qué fecha quieres pausar? (YYYY-MM-DD)", "")?.trim() || null;
    pauseGoal(goal, { sinceDate: today(), untilDate: untilDate || null });
    saveGoals(goals);
    renderDashboard();
}

export function handleResumeGoal(goalId) {
    const goals = loadGoals();
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return;

    resumeGoal(goal);
    saveGoals(goals);
    renderDashboard();
}
