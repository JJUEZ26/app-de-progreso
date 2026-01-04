import { appState, goals, sessionsByGoalId } from "../core/state.js";
import { getGoalTypeLabel, getTodayItems } from "../models/goals.js";
import { dom } from "./domRefs.js";

export function renderTodayView({ onAddMinutes, onSelectGoal } = {}) {
    const todayDate = new Date();
    if (!goals.length) {
        dom.dashboardTodayPanel.innerHTML = `<div class="empty-state">Crea tu primera meta para empezar.</div>`;
        return;
    }

    const items = getTodayItems(goals, sessionsByGoalId, todayDate);
    const hasActiveDay = items.some((item) => item.plannedMinutes > 0);

    const header = `
        <div class="today-header">
            <h3>Hoy</h3>
            <p class="card-subtitle">Lo que realmente importa hoy.</p>
        </div>
    `;

    const list = items.map((item) => `
        <div class="today-item" data-goal-id="${item.goalId}">
            <div class="today-item-header">
                <div>
                    <div class="goal-type">${getGoalTypeLabel(item.type)}</div>
                    <div class="today-title" data-select-goal="${item.goalId}">${item.goalTitle}</div>
                </div>
                <div class="today-progress">
                    <span class="today-chip">${item.completedMinutes} / ${item.plannedMinutes} min</span>
                    <span>${item.isTodayWorkDay ? "Día activo" : "Día libre"}</span>
                </div>
            </div>
            <div class="goal-status status-${item.status}">${item.suggestionText}</div>
            <div class="today-actions">
                <button class="btn btn-secondary" data-add-minutes="15" data-goal-id="${item.goalId}">+15 min</button>
                <button class="btn btn-secondary" data-add-minutes="30" data-goal-id="${item.goalId}">+30 min</button>
            </div>
        </div>
    `).join("");

    const restMessage = !hasActiveDay
        ? `<div class="empty-state">Hoy toca descansar o revisar tus metas.</div>`
        : "";

    dom.dashboardTodayPanel.innerHTML = `${header}<div class="today-list">${list}</div>${restMessage}`;

    dom.dashboardTodayPanel.querySelectorAll("[data-add-minutes]").forEach((button) => {
        button.addEventListener("click", (event) => {
            const goalId = event.currentTarget.getAttribute("data-goal-id");
            const minutes = Number(event.currentTarget.getAttribute("data-add-minutes"));
            if (!goalId || !Number.isFinite(minutes)) return;
            if (onAddMinutes) {
                onAddMinutes(goalId, minutes);
            }
        });
    });

    dom.dashboardTodayPanel.querySelectorAll("[data-select-goal]").forEach((el) => {
        el.addEventListener("click", (event) => {
            const goalId = event.currentTarget.getAttribute("data-select-goal");
            if (goalId && onSelectGoal) {
                appState.dashboardMode = "vision";
                onSelectGoal(goalId);
            }
        });
    });
}
