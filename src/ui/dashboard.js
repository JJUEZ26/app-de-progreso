import {
    appState,
    currentGoal,
    currentGoalId,
    goals,
    sessions,
    sessionsByGoalId,
    setCurrentGoal,
    setCurrentGoalId,
    setSessions
} from "../core/state.js";
import { saveCurrentGoalId, saveData } from "../core/storage.js";
import { calculateETA, getStats, normalizeGoal } from "../models/goals.js";
import { addSessionForGoal, getWeeklyStats, normalizeSessions } from "../models/sessions.js";
import { formatHours } from "../utils/calc.js";
import { dom } from "./domRefs.js";
import { renderTodayView } from "./todayView.js";
import { renderVisionBoard } from "./visionView.js";

export function renderDashboard() {
    const stats = getStats(currentGoal, sessions);
    const weeklyStats = getWeeklyStats(currentGoal, sessions);
    const fmt = new Intl.NumberFormat("es-ES");
    const formatValue = (value) => (
        currentGoal.mode === "time"
            ? fmt.format(Number(value.toFixed(1)))
            : fmt.format(Math.floor(value))
    );

    const unitLabel = currentGoal.unitName;

    dom.projectName.textContent = currentGoal.title;
    dom.wordsProgress.textContent = `${formatValue(stats.totalUnits)} / ${formatValue(currentGoal.targetValue)} ${unitLabel}`;
    dom.percentProgress.textContent = `${stats.percent}%`;
    dom.progressBar.style.width = `${stats.percent}%`;
    dom.etaDate.textContent = calculateETA(1, currentGoal, sessions);

    dom.settingGoal.textContent = `${formatValue(currentGoal.targetValue)} ${unitLabel}`;
    dom.settingDays.textContent = `${currentGoal.plan.daysPerWeek.length} días/sem`;
    dom.settingHours.textContent = `${formatHours(currentGoal.plan.minutesPerSession / 60)}h/sesión`;

    if (currentGoal.mode !== "time") {
        const speedLabel = stats.totalMinutes > 0 ? "Real" : "Est.";
        const speedValue = stats.totalMinutes > 0 ? stats.averageRate : currentGoal.rate.valuePerHour;
        dom.settingWph.textContent = `${fmt.format(speedValue)} ${unitLabel}/h (${speedLabel})`;
    } else {
        dom.settingWph.textContent = "N/D";
    }

    dom.weeklySessions.textContent = `${weeklyStats.completedSessions} / ${weeklyStats.plannedSessions}`;
    dom.weeklyTime.textContent = `${(weeklyStats.totalMinutes / 60).toFixed(1).replace(/\.0$/, "")}h`;
    dom.weeklyUnits.textContent = formatValue(weeklyStats.totalUnits);
    dom.weeklyUnitsLabel.textContent = unitLabel;

    renderDashboardMode();
}

export function renderDashboardMode() {
    if (!dom.dashboardVisionPanel || !dom.dashboardTodayPanel) return;
    const isVision = appState.dashboardMode === "vision";
    dom.dashboardVisionPanel.classList.toggle("is-active", isVision);
    dom.dashboardTodayPanel.classList.toggle("is-active", !isVision);
    dom.btnDashboardVision?.classList.toggle("is-active", isVision);
    dom.btnDashboardToday?.classList.toggle("is-active", !isVision);

    if (isVision) {
        renderVisionBoard({
            onSelectGoal: setCurrentGoalById
        });
    } else {
        renderTodayView({
            onAddMinutes: addQuickSession,
            onSelectGoal: setCurrentGoalById
        });
    }
}

export function renderScenarios() {
    const scenarioCards = document.querySelectorAll(".scenario-card");
    const modifiers = [0.8, 1, 1.2];
    scenarioCards.forEach((card, index) => {
        const dateEl = card.querySelector(".scenario-date");
        const descEl = card.querySelector(".scenario-desc");
        if (!dateEl || !descEl) return;

        const modifier = modifiers[index] ?? 1;
        dateEl.textContent = calculateETA(modifier, currentGoal, sessions);
        if (modifier < 1) descEl.textContent = "-20% intensidad";
        if (modifier === 1) descEl.textContent = "Basado en tu histórico";
        if (modifier > 1) descEl.textContent = "+20% intensidad";
    });
}

export function setCurrentGoalById(goalId) {
    const targetGoal = goals.find((goal) => goal.id === goalId);
    if (!targetGoal) return;
    setCurrentGoalId(goalId);
    setCurrentGoal(normalizeGoal(targetGoal));
    setSessions(normalizeSessions(sessionsByGoalId[goalId]));
    appState.selectedGoalId = goalId;
    saveCurrentGoalId(goalId);
    renderDashboard();
    renderScenarios();
}

export function setDashboardMode(mode) {
    appState.dashboardMode = mode;
    renderDashboardMode();
}

export function addQuickSession(goalId, minutes) {
    if (minutes <= 0) return;
    addSessionForGoal(goalId, { minutes });
    saveData();
    renderDashboard();
    renderScenarios();
}
