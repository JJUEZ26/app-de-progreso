import { currentGoal } from "../core/state.js";
import { saveData } from "../core/storage.js";
import { addSessionForGoal } from "../models/sessions.js";
import { formatHours } from "../utils/calc.js";
import { dom } from "./domRefs.js";
import { renderDashboard, renderScenarios } from "./dashboard.js";

export function openLogModal() {
    dom.modalSession.classList.remove("hidden");
    dom.inputSessionHours.value = formatHours(currentGoal.plan.minutesPerSession / 60);
    dom.inputSessionWords.value = "";
    dom.inputSessionHours.focus();
}

export function closeLogModal() {
    dom.modalSession.classList.add("hidden");
}

export function saveSession() {
    const hours = parseFloat(dom.inputSessionHours.value);
    const wordsInput = dom.inputSessionWords.value;

    if (Number.isNaN(hours) || hours <= 0) {
        alert("Horas inválidas");
        return;
    }

    const minutes = hours * 60;
    let value = null;
    let isEstimated = false;

    if (currentGoal.mode !== "time" && wordsInput && !Number.isNaN(parseInt(wordsInput, 10))) {
        value = parseInt(wordsInput, 10);
    } else if (currentGoal.mode !== "time" && currentGoal.rate.valuePerHour > 0) {
        value = Math.floor(hours * currentGoal.rate.valuePerHour);
        isEstimated = true;
    } else {
        value = null;
        isEstimated = false;
    }

    addSessionForGoal(currentGoal.id, { minutes, value, isEstimated });

    saveData();
    renderDashboard();
    renderScenarios();
    closeLogModal();
}

export function bindSessionModalEvents() {
    dom.btnLogSession.addEventListener("click", openLogModal);
    dom.btnCloseSessionModal.addEventListener("click", closeLogModal);
    dom.btnCancelSession.addEventListener("click", closeLogModal);
    dom.btnSaveSession.addEventListener("click", saveSession);
}

export function handleSessionModalBackdrop(event) {
    if (event.target === dom.modalSession) closeLogModal();
}
