import { appState, goals, sessionsByGoalId } from "../core/state.js";
import { getGoalProgress, getGoalStatus, getGoalTypeLabel } from "../models/goals.js";
import { dom } from "./domRefs.js";

export function renderVisionBoard({ onSelectGoal } = {}) {
    const todayDate = new Date();
    if (!goals.length) {
        dom.dashboardVisionPanel.innerHTML = `<div class="empty-state">Crea tu primera meta para empezar.</div>`;
        return;
    }

    const cards = goals.map((goal) => {
        const goalSessions = sessionsByGoalId[goal.id] || [];
        const progress = getGoalProgress(goal, goalSessions);
        const status = getGoalStatus(goal, progress, todayDate, goalSessions);
        const isSelected = appState.selectedGoalId === goal.id;

        return `
            <article class="card goal-card ${isSelected ? "is-selected" : ""}" data-goal-id="${goal.id}">
                <div class="goal-card-header">
                    <div>
                        <div class="goal-type">${getGoalTypeLabel(goal.type)}</div>
                        <h3>${goal.title}</h3>
                    </div>
                    <div class="goal-progress" style="--progress: ${progress.progressPercent};">
                        ${progress.progressPercent}%
                    </div>
                </div>
                <div class="goal-status ${status.colorClass}">
                    ${status.label}
                </div>
                <div class="goal-eta">${status.etaText}</div>
            </article>
        `;
    }).join("");

    dom.dashboardVisionPanel.innerHTML = `<div class="vision-grid">${cards}</div>`;

    dom.dashboardVisionPanel.querySelectorAll(".goal-card").forEach((card) => {
        card.addEventListener("click", () => {
            const goalId = card.getAttribute("data-goal-id");
            if (goalId && onSelectGoal) {
                onSelectGoal(goalId);
            }
        });
    });
}
