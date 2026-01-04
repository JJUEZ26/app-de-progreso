import { appState } from "../core/state.js";
import { getGoalProgress, getGoalStatus } from "../models/goals.js";
import { getSessionsForGoal } from "../models/sessions.js";
import { clearEl, createEl } from "../utils/dom.js";
import { renderDashboard } from "./dashboard.js";

const GOAL_TYPE_LABELS = {
    reading: "📖 Lectura",
    fitness: "🏃 Fitness",
    study: "📚 Estudio",
    habit: "✨ Hábito",
    generic: "🎯 Meta"
};

function getGoalTypeLabel(type) {
    return GOAL_TYPE_LABELS[type] || "🎯 Meta";
}

export function renderVisionView(containerEl, goals, sessionsByGoal, todayDate) {
    if (!containerEl) return;
    clearEl(containerEl);

    if (!goals.length) {
        containerEl.innerHTML = '<div class="empty-state">Crea tu primera meta para empezar.</div>';
        return;
    }

    const grid = createEl("div", { className: "vision-grid" });

    goals.forEach((goal) => {
        const sessionsForGoal = getSessionsForGoal(sessionsByGoal, goal.id);
        const progressInfo = getGoalProgress(goal, sessionsForGoal);
        const status = getGoalStatus(goal, progressInfo, todayDate);
        const isSelected = appState.selectedGoalId === goal.id;

        const card = createEl("article", {
            className: `card goal-card ${status.colorClass} ${isSelected ? "is-selected" : ""}`.trim(),
            attrs: { "data-goal-id": goal.id }
        });

        const header = createEl("div", { className: "goal-card-header" });
        const headerInfo = createEl("div");
        headerInfo.append(
            createEl("div", { className: "goal-type", text: getGoalTypeLabel(goal.type) }),
            createEl("h3", { text: goal.title })
        );

        const progress = createEl("div", {
            className: "goal-progress",
            text: `${progressInfo.progressPercent}%`
        });
        progress.style.setProperty("--progress", progressInfo.progressPercent);

        header.append(headerInfo, progress);

        const statusEl = createEl("div", {
            className: `goal-status ${status.colorClass}`.trim(),
            text: status.label
        });

        const eta = createEl("div", { className: "goal-eta", text: status.etaText });

        card.append(header, statusEl, eta);
        card.addEventListener("click", () => {
            appState.selectedGoalId = goal.id;
            renderDashboard();
        });

        grid.appendChild(card);
    });

    containerEl.appendChild(grid);
}
