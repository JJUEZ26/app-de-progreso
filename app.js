/* GOAL TRACKER APP
    Versión: 2.2 (Universal Goal Model)
*/

// --- 1. CONFIGURACIÓN Y MODELO DE DATOS ---

const KEYS = {
    GOAL: "writerDashboard_goal",
    SESSIONS: "writerDashboard_sessions"
};

const LEGACY_KEYS = {
    GOAL: "writerDashboard_project",
    SESSIONS: "writerDashboard_sessions_proj_001"
};

const DEFAULT_GOAL = {
    id: "goal_default",
    title: "Mi Nueva Meta",
    name: "Mi Nueva Meta",
    targetValue: 50000,
    target: 50000,
    mode: "units",
    unitName: "unidades",
    startDate: new Date().toISOString().split("T")[0],
    plan: {
        daysPerWeek: [1, 2, 3, 4, 5], // 1=Lun ... 6=Sab, 0=Dom
        minutesPerSession: 60
    },
    scheduleDays: [1, 2, 3, 4, 5],
    minutesPerSession: 60,
    rate: {
        valuePerHour: 500
    }
};

let currentGoal = normalizeGoal(DEFAULT_GOAL);
let sessions = [];

// --- 2. REFERENCIAS AL DOM ---

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

    btnLogSession: document.getElementById("btn-log-session"),
    btnExplore: document.getElementById("btn-explore-scenarios"),
    btnOpenWizard: document.getElementById("btn-open-project-wizard"),

    modalSession: document.getElementById("modal-log-session"),
    btnCloseSessionModal: document.getElementById("btn-close-modal"),
    btnCancelSession: document.getElementById("btn-cancel-session"),
    btnSaveSession: document.getElementById("btn-save-session"),
    inputSessionHours: document.getElementById("input-hours"),
    inputSessionWords: document.getElementById("input-words"),

    modalProject: document.getElementById("modal-project"),
    btnCloseProjectModal: document.getElementById("btn-close-project-modal"),
    btnCancelProject: document.getElementById("btn-cancel-project"),
    btnSaveProject: document.getElementById("btn-save-project"),
    inputProjectName: document.getElementById("input-project-name"),
    inputProjectTarget: document.getElementById("input-project-target"),
    inputProjectHours: document.getElementById("input-project-hours"),
    inputProjectWph: document.getElementById("input-project-wph")
};

// --- 3. DATOS Y MIGRACIONES ---

function normalizeGoal(rawGoal = {}) {
    const mode = rawGoal.mode || DEFAULT_GOAL.mode;
    const title = rawGoal.title || rawGoal.name || DEFAULT_GOAL.title;
    const rawTargetValue = Number(rawGoal.targetValue ?? rawGoal.target ?? DEFAULT_GOAL.targetValue);
    const targetValue = Number.isFinite(rawTargetValue) ? rawTargetValue : DEFAULT_GOAL.targetValue;
    const unitName = rawGoal.unitName || (mode === "time" ? "horas" : DEFAULT_GOAL.unitName);
    const planDays = Array.isArray(rawGoal.plan?.daysPerWeek)
        ? rawGoal.plan.daysPerWeek
        : (Array.isArray(rawGoal.scheduleDays) ? rawGoal.scheduleDays : DEFAULT_GOAL.plan.daysPerWeek);
    const rawPlanMinutes = Number(
        rawGoal.plan?.minutesPerSession ?? rawGoal.minutesPerSession ?? DEFAULT_GOAL.plan.minutesPerSession
    );
    const planMinutes = Number.isFinite(rawPlanMinutes) ? rawPlanMinutes : DEFAULT_GOAL.plan.minutesPerSession;
    const rawRateValue = Number(rawGoal.rate?.valuePerHour ?? rawGoal.rate ?? DEFAULT_GOAL.rate.valuePerHour);
    const rateValuePerHour = Number.isFinite(rawRateValue) ? rawRateValue : DEFAULT_GOAL.rate.valuePerHour;

    return {
        ...DEFAULT_GOAL,
        id: rawGoal.id || DEFAULT_GOAL.id,
        title,
        name: title,
        targetValue,
        target: targetValue,
        mode,
        unitName,
        plan: {
            daysPerWeek: planDays,
            minutesPerSession: planMinutes
        },
        scheduleDays: planDays,
        minutesPerSession: planMinutes,
        rate: {
            valuePerHour: rateValuePerHour
        }
    };
}

function migrateStorageIfNeeded() {
    const hasGoal = localStorage.getItem(KEYS.GOAL);
    const hasSessions = localStorage.getItem(KEYS.SESSIONS);

    if (!hasGoal) {
        const legacyGoalStr = localStorage.getItem(LEGACY_KEYS.GOAL);
        if (legacyGoalStr) {
            try {
                const legacyGoal = JSON.parse(legacyGoalStr);
                const migratedGoal = normalizeGoal({
                    title: legacyGoal.name || DEFAULT_GOAL.title,
                    targetValue: legacyGoal.targetWords || DEFAULT_GOAL.targetValue,
                    plan: {
                        daysPerWeek: legacyGoal.schedule?.workDays || DEFAULT_GOAL.plan.daysPerWeek,
                        minutesPerSession: Math.round(
                            (legacyGoal.schedule?.hoursPerSession || DEFAULT_GOAL.plan.minutesPerSession / 60) * 60
                        )
                    },
                    rate: {
                        valuePerHour: legacyGoal.schedule?.wordsPerHour || DEFAULT_GOAL.rate.valuePerHour
                    }
                });
                localStorage.setItem(KEYS.GOAL, JSON.stringify(migratedGoal));
            } catch (error) {
                console.error(error);
            }
        }
    }

    if (!hasSessions) {
        const legacySessionsStr = localStorage.getItem(LEGACY_KEYS.SESSIONS);
        if (legacySessionsStr) {
            try {
                const legacySessions = JSON.parse(legacySessionsStr);
                const migratedSessions = Array.isArray(legacySessions)
                    ? legacySessions.map((session) => ({
                        id: session.id || Date.now(),
                        date: session.date || new Date().toISOString().split("T")[0],
                        minutes: Number(session.minutes) || 0,
                        value: session.words ?? null,
                        isEstimated: false
                    }))
                    : [];
                localStorage.setItem(KEYS.SESSIONS, JSON.stringify(migratedSessions));
            } catch (error) {
                console.error(error);
            }
        }
    }
}

function loadData() {
    const goalStr = localStorage.getItem(KEYS.GOAL);
    if (!goalStr) {
        currentGoal = normalizeGoal(DEFAULT_GOAL);
    } else {
        try {
            const parsed = JSON.parse(goalStr);
            currentGoal = normalizeGoal(parsed);
        } catch (error) {
            console.error(error);
            currentGoal = normalizeGoal(DEFAULT_GOAL);
        }
    }

    const sessionsStr = localStorage.getItem(KEYS.SESSIONS);
    if (sessionsStr) {
        try {
            const parsedSessions = JSON.parse(sessionsStr);
            sessions = Array.isArray(parsedSessions)
                ? parsedSessions.map((session) => ({
                    id: session.id || Date.now(),
                    date: session.date || new Date().toISOString().split("T")[0],
                    minutes: Number(session.minutes) || 0,
                    value: typeof session.value === "number" ? session.value : session.value ?? null,
                    isEstimated: Boolean(session.isEstimated)
                }))
                : [];
        } catch (error) {
            console.error(error);
            sessions = [];
        }
    } else {
        sessions = [];
    }
}

function saveData() {
    localStorage.setItem(KEYS.GOAL, JSON.stringify(currentGoal));
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
}

// --- 4. LÓGICA DE NEGOCIO (Cálculos) ---

function getStats() {
    let totalUnits = 0;
    let totalMinutes = 0;

    sessions.forEach((session) => {
        totalMinutes += session.minutes;

        if (currentGoal.mode === "time") {
            totalUnits += session.minutes / 60;
            return;
        }

        if (typeof session.value === "number") {
            totalUnits += session.value;
            return;
        }

        const rate = currentGoal.rate.valuePerHour;
        if (rate > 0 && session.minutes > 0) {
            totalUnits += Math.floor((session.minutes / 60) * rate);
        }
    });

    const percent = currentGoal.targetValue > 0
        ? Math.min(100, Math.floor((totalUnits / currentGoal.targetValue) * 100))
        : 0;

    const averageRate = currentGoal.mode === "units" && totalMinutes > 0
        ? Math.floor(totalUnits / (totalMinutes / 60))
        : currentGoal.rate.valuePerHour;

    return { totalUnits, totalMinutes, percent, averageRate };
}

function getWeeklyStats() {
    const now = new Date();
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    let completedSessions = 0;
    let totalMinutes = 0;
    let totalUnits = 0;

    sessions.forEach((session) => {
        const sessionDate = new Date(`${session.date}T00:00:00`);
        if (sessionDate >= weekStart) {
            completedSessions += 1;
            totalMinutes += session.minutes;

            if (currentGoal.mode === "time") {
                totalUnits += session.minutes / 60;
            } else if (typeof session.value === "number") {
                totalUnits += session.value;
            } else if (currentGoal.rate.valuePerHour > 0 && session.minutes > 0) {
                totalUnits += Math.floor((session.minutes / 60) * currentGoal.rate.valuePerHour);
            }
        }
    });

    return {
        completedSessions,
        plannedSessions: currentGoal.plan.daysPerWeek.length,
        totalMinutes,
        totalUnits
    };
}

function calculateETA(paceModifier = 1) {
    const stats = getStats();
    const remainingUnits = currentGoal.targetValue - stats.totalUnits;

    if (remainingUnits <= 0) {
        return "¡Completado!";
    }

    const sessionsPerWeek = currentGoal.plan.daysPerWeek.length;
    const minutesPerSession = currentGoal.plan.minutesPerSession;

    if (currentGoal.mode === "time") {
        const minutesPerWeek = minutesPerSession * sessionsPerWeek * paceModifier;
        if (minutesPerWeek <= 0) {
            return "Configura tu ritmo";
        }
        const weeksNeeded = (remainingUnits * 60) / minutesPerWeek;
        return formatFutureDate(Math.ceil(weeksNeeded * 7));
    }

    const rateToUse = stats.averageRate > 0 ? stats.averageRate : currentGoal.rate.valuePerHour;
    const unitsPerSession = (rateToUse * (minutesPerSession / 60)) * paceModifier;

    if (unitsPerSession <= 0 || sessionsPerWeek <= 0) {
        return "Configura tu ritmo";
    }

    const unitsPerWeek = unitsPerSession * sessionsPerWeek;
    const weeksNeeded = remainingUnits / unitsPerWeek;
    return formatFutureDate(Math.ceil(weeksNeeded * 7));
}

function formatFutureDate(daysToAdd) {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

// --- 5. RENDERIZADO ---

function renderDashboard() {
    const stats = getStats();
    const weeklyStats = getWeeklyStats();
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
    dom.etaDate.textContent = calculateETA(1);

    dom.settingGoal.textContent = `${formatValue(currentGoal.targetValue)} ${unitLabel}`;
    dom.settingDays.textContent = `${currentGoal.plan.daysPerWeek.length} días/sem`;
    dom.settingHours.textContent = `${(currentGoal.plan.minutesPerSession / 60).toFixed(2).replace(/\\.00$/, "")}h/sesión`;

    if (currentGoal.mode === "units") {
        const speedLabel = stats.totalMinutes > 0 ? "Real" : "Est.";
        const speedValue = stats.totalMinutes > 0 ? stats.averageRate : currentGoal.rate.valuePerHour;
        dom.settingWph.textContent = `${fmt.format(speedValue)} ${unitLabel}/h (${speedLabel})`;
    } else {
        dom.settingWph.textContent = "N/D";
    }

    dom.weeklySessions.textContent = `${weeklyStats.completedSessions} / ${weeklyStats.plannedSessions}`;
    dom.weeklyTime.textContent = `${(weeklyStats.totalMinutes / 60).toFixed(1).replace(/\\.0$/, "")}h`;
    dom.weeklyUnits.textContent = formatValue(weeklyStats.totalUnits);
    dom.weeklyUnitsLabel.textContent = unitLabel;
}

function renderScenarios() {
    const scenarioCards = document.querySelectorAll(".scenario-card");
    const modifiers = [0.8, 1, 1.2];
    scenarioCards.forEach((card, index) => {
        const dateEl = card.querySelector(".scenario-date");
        const descEl = card.querySelector(".scenario-desc");
        if (!dateEl || !descEl) return;

        const modifier = modifiers[index] ?? 1;
        dateEl.textContent = calculateETA(modifier);
        if (modifier < 1) descEl.textContent = "-20% intensidad";
        if (modifier === 1) descEl.textContent = "Basado en tu histórico";
        if (modifier > 1) descEl.textContent = "+20% intensidad";
    });
}

// --- 6. MODAL: REGISTRAR SESIÓN ---

function openLogModal() {
    dom.modalSession.classList.remove("hidden");
    dom.inputSessionHours.value = (currentGoal.plan.minutesPerSession / 60).toFixed(2).replace(/\\.00$/, "");
    dom.inputSessionWords.value = "";
    dom.inputSessionHours.focus();
}

function closeLogModal() {
    dom.modalSession.classList.add("hidden");
}

function saveSession() {
    const hours = parseFloat(dom.inputSessionHours.value);
    const wordsInput = dom.inputSessionWords.value;

    if (isNaN(hours) || hours <= 0) {
        alert("Horas inválidas");
        return;
    }

    const minutes = hours * 60;
    let value = null;
    let isEstimated = false;

    if (currentGoal.mode === "units" && wordsInput && !isNaN(parseInt(wordsInput, 10))) {
        value = parseInt(wordsInput, 10);
    } else if (currentGoal.mode === "units" && currentGoal.rate.valuePerHour > 0) {
        value = Math.floor(hours * currentGoal.rate.valuePerHour);
        isEstimated = true;
    } else {
        value = null;
        isEstimated = false;
    }

    sessions.unshift({
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        minutes,
        value,
        isEstimated
    });

    saveData();
    renderDashboard();
    renderScenarios();
    closeLogModal();
}

// --- 7. MODAL: CONFIGURAR PROYECTO (WIZARD) ---

function openWizard() {
    dom.modalProject.classList.remove("hidden");
    dom.inputProjectName.value = currentGoal.title;
    dom.inputProjectTarget.value = currentGoal.targetValue;
    dom.inputProjectHours.value = (currentGoal.plan.minutesPerSession / 60).toFixed(2).replace(/\\.00$/, "");
    dom.inputProjectWph.value = currentGoal.rate.valuePerHour;

    const checkboxes = document.querySelectorAll(".day-checkbox");
    checkboxes.forEach((chk) => {
        const dayValue = parseInt(chk.value, 10);
        chk.checked = currentGoal.plan.daysPerWeek.includes(dayValue);
    });
}

function toggleWizardMode(mode) {
    currentGoal.mode = mode || currentGoal.mode || "units";
}

function closeWizard() {
    dom.modalProject.classList.add("hidden");
}

function saveGoalConfiguration() {
    const name = dom.inputProjectName.value.trim();
    const target = parseInt(dom.inputProjectTarget.value, 10);
    const hours = parseFloat(dom.inputProjectHours.value);
    const rateInput = parseInt(dom.inputProjectWph.value, 10);

    const selectedDays = Array.from(document.querySelectorAll(".day-checkbox:checked")).map((chk) =>
        parseInt(chk.value, 10)
    );

    if (!name) {
        alert("El nombre es obligatorio");
        return;
    }

    if (isNaN(target) || target <= 0) {
        alert("Meta inválida");
        return;
    }

    if (selectedDays.length === 0) {
        alert("Selecciona al menos un día de escritura");
        return;
    }

    const minutesPerSession = !isNaN(hours) && hours > 0 ? Math.round(hours * 60) : 60;
    const rate = currentGoal.mode === "time"
        ? currentGoal.rate.valuePerHour
        : (!isNaN(rateInput) && rateInput > 0 ? rateInput : 10);

    currentGoal = normalizeGoal({
        ...currentGoal,
        title: name,
        targetValue: target,
        plan: {
            daysPerWeek: selectedDays,
            minutesPerSession
        },
        rate: {
            valuePerHour: rate
        }
    });

    saveData();
    renderDashboard();
    renderScenarios();
    closeWizard();
}

// --- 8. INICIALIZACIÓN ---

function initApp() {
    migrateStorageIfNeeded();
    loadData();
    renderDashboard();
    renderScenarios();

    dom.btnLogSession.addEventListener("click", openLogModal);
    dom.btnCloseSessionModal.addEventListener("click", closeLogModal);
    dom.btnCancelSession.addEventListener("click", closeLogModal);
    dom.btnSaveSession.addEventListener("click", saveSession);

    dom.btnOpenWizard.addEventListener("click", openWizard);
    dom.btnCloseProjectModal.addEventListener("click", closeWizard);
    dom.btnCancelProject.addEventListener("click", closeWizard);
    dom.btnSaveProject.addEventListener("click", saveGoalConfiguration);

    dom.btnExplore.addEventListener("click", () => {
        const section = document.getElementById("scenarios-section");
        if (section) section.scrollIntoView({ behavior: "smooth" });
    });

    window.addEventListener("click", (event) => {
        if (event.target === dom.modalSession) closeLogModal();
        if (event.target === dom.modalProject) closeWizard();
    });
}

document.addEventListener("DOMContentLoaded", initApp);
