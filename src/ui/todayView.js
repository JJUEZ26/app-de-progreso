import { appState } from "../core/state.js";
import { getGoalProgress, getGoalStatus } from "../models/goals.js";
import { addSessionForToday, getSessionsForDate, getSessionsForGoal } from "../models/sessions.js";
import { clearEl, createEl } from "../utils/dom.js";
import { renderDashboard } from "./dashboard.js";

const DAY_LETTER_MAP = {
    L: 1,
    M: 2,
    X: 3,
    J: 4,
    V: 5,
    S: 6,
    D: 0
};

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

function isTodayWorkDay(goal, todayDate) {
    const planDays = goal.plan?.daysPerWeek;
    if (!Array.isArray(planDays) || planDays.length === 0) {
        return true;
    }

    const date = new Date(`${todayDate}T00:00:00`);
    const dayIndex = date.getDay();

    return planDays.some((day) => {
        if (typeof day === "number") {
            const normalized = day === 7 ? 0 : day;
            return normalized === dayIndex;
        }
        if (typeof day === "string") {
            const key = day.trim().toUpperCase();
            return DAY_LETTER_MAP[key] === dayIndex;
        }
        return false;
    });
}

export function buildTodayItems(goals, sessionsByGoal, todayDate) {
    return goals.map((goal) => {
        const sessionsForGoal = getSessionsForGoal(sessionsByGoal, goal.id);
        const todaySessions = getSessionsForDate(sessionsForGoal, todayDate);
        const completedMinutes = todaySessions.reduce((acc, session) => acc + session.minutes, 0);
        const isWorkDay = isTodayWorkDay(goal, todayDate);
        const plannedMinutes = isWorkDay ? (goal.plan?.minutesPerSession || 0) : 0;
        const remainingMinutes = Math.max(plannedMinutes - completedMinutes, 0);

        let suggestionText = "Hoy es día libre para esta meta.";
        if (!isWorkDay) {
            suggestionText = "Hoy es día libre para esta meta.";
        } else if (remainingMinutes > 0) {
            suggestionText = `Te faltan ~${remainingMinutes} min para cumplir lo de hoy.`;
        } else if (plannedMinutes > 0) {
            suggestionText = "Meta de hoy cumplida 🎉";
        }

        const progressInfo = getGoalProgress(goal, sessionsForGoal);
        const status = getGoalStatus(goal, progressInfo, todayDate);

        return {
            goalId: goal.id,
            title: goal.title,
            type: goal.type,
            isTodayWorkDay: isWorkDay,
            plannedMinutes,
            completedMinutes,
            remainingMinutes,
            suggestionText,
            status
        };
    });
}

export function renderTodayView(containerEl, goals, sessionsByGoal, todayDate) {
    if (!containerEl) return;
    clearEl(containerEl);

    if (!goals.length) {
        containerEl.innerHTML = '<div class="empty-state">Crea tu primera meta para empezar.</div>';
        return;
    }

    const header = createEl("div", { className: "today-header" });
    header.append(
        createEl("h3", { text: "Hoy" }),
        createEl("p", { className: "card-subtitle", text: "Lo importante para este día" })
    );

    const list = createEl("div", { className: "today-list" });
    const items = buildTodayItems(goals, sessionsByGoal, todayDate);

    items.forEach((item) => {
        const card = createEl("div", {
            className: `today-item ${item.status.colorClass}`.trim(),
            attrs: { "data-goal-id": item.goalId }
        });

        const headerRow = createEl("div", { className: "today-item-header" });
        const titleWrap = createEl("div");
        titleWrap.append(
            createEl("div", { className: "goal-type", text: getGoalTypeLabel(item.type) }),
            createEl("div", { className: "today-title", text: item.title })
        );

        const progress = createEl("div", { className: "today-progress" });
        progress.append(
            createEl("span", { className: "today-chip", text: `${item.completedMinutes} / ${item.plannedMinutes} min hoy` }),
            createEl("span", { text: item.isTodayWorkDay ? "Día activo" : "Día libre" })
        );

        headerRow.append(titleWrap, progress);

        const status = createEl("div", { className: `goal-status ${item.status.colorClass}`.trim(), text: item.suggestionText });

        const actions = createEl("div", { className: "today-actions" });
        if (item.isTodayWorkDay && item.remainingMinutes > 0) {
            const add15 = createEl("button", {
                className: "btn btn-secondary",
                text: "+15 min",
                attrs: { type: "button", "data-add-minutes": "15" }
            });
            const add30 = createEl("button", {
                className: "btn btn-secondary",
                text: "+30 min",
                attrs: { type: "button", "data-add-minutes": "30" }
            });
            actions.append(add15, add30);

            actions.querySelectorAll("[data-add-minutes]").forEach((button) => {
                button.addEventListener("click", (event) => {
                    const minutes = Number(event.currentTarget.getAttribute("data-add-minutes"));
                    if (!Number.isFinite(minutes)) return;
                    addSessionForToday(item.goalId, minutes);
                    appState.selectedGoalId = item.goalId;
                    renderDashboard();
                });
            });
        }

        card.append(headerRow, status, actions);
        list.appendChild(card);
    });

    const hasActiveDay = items.some((item) => item.plannedMinutes > 0);
    if (!hasActiveDay) {
        list.appendChild(createEl("div", { className: "empty-state", text: "Hoy toca descansar o revisar tus metas." }));
    }

    containerEl.append(header, list);
}
