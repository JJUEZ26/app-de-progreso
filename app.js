/* WRITER'S DASHBOARD APP
    Versión: 2.1 (Bugfix & Enhanced Logic)
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
    name: "Mi Nuevo Proyecto",
    target: 50000,
    mode: "units",
    startDate: new Date().toISOString().split("T")[0],
    scheduleDays: [1, 2, 3, 4, 5], // 1=Lun ... 6=Sab, 0=Dom
    minutesPerSession: 60,
    rate: 500
};

let currentGoal = { ...DEFAULT_GOAL };
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

function migrateStorageIfNeeded() {
    const hasGoal = localStorage.getItem(KEYS.GOAL);
    const hasSessions = localStorage.getItem(KEYS.SESSIONS);

    if (!hasGoal) {
        const legacyGoalStr = localStorage.getItem(LEGACY_KEYS.GOAL);
        if (legacyGoalStr) {
            try {
                const legacyGoal = JSON.parse(legacyGoalStr);
                const migratedGoal = {
                    ...DEFAULT_GOAL,
                    name: legacyGoal.name || DEFAULT_GOAL.name,
                    target: legacyGoal.targetWords || DEFAULT_GOAL.target,
                    scheduleDays: legacyGoal.schedule?.workDays || DEFAULT_GOAL.scheduleDays,
                    minutesPerSession: Math.round(
                        (legacyGoal.schedule?.hoursPerSession || DEFAULT_GOAL.minutesPerSession / 60) * 60
                    ),
                    rate: legacyGoal.schedule?.wordsPerHour || DEFAULT_GOAL.rate
                };
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
        currentGoal = { ...DEFAULT_GOAL };
    } else {
        try {
            const parsed = JSON.parse(goalStr);
            currentGoal = {
                ...DEFAULT_GOAL,
                ...parsed,
                mode: parsed.mode || "units",
                scheduleDays: Array.isArray(parsed.scheduleDays) ? parsed.scheduleDays : DEFAULT_GOAL.scheduleDays
            };
        } catch (error) {
            console.error(error);
            currentGoal = { ...DEFAULT_GOAL };
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
            totalUnits += session.minutes;
            return;
        }

        if (typeof session.value === "number") {
            totalUnits += session.value;
            return;
        }

        const rate = currentGoal.rate;
        if (rate > 0 && session.minutes > 0) {
            totalUnits += Math.floor((session.minutes / 60) * rate);
        }
    });

    const percent = currentGoal.target > 0
        ? Math.min(100, Math.floor((totalUnits / currentGoal.target) * 100))
        : 0;

    const averageRate = totalMinutes > 0
        ? Math.floor(totalUnits / (totalMinutes / 60))
        : currentGoal.rate;

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
                totalUnits += session.minutes;
            } else if (typeof session.value === "number") {
                totalUnits += session.value;
            } else if (currentGoal.rate > 0 && session.minutes > 0) {
                totalUnits += Math.floor((session.minutes / 60) * currentGoal.rate);
            }
        }
    });

    return {
        completedSessions,
        plannedSessions: currentGoal.scheduleDays.length,
        totalMinutes,
        totalUnits
    };
}

function calculateETA(paceModifier = 1) {
    const stats = getStats();
    const remainingUnits = currentGoal.target - stats.totalUnits;

    if (remainingUnits <= 0) {
        return "¡Completado!";
    }

    const sessionsPerWeek = currentGoal.scheduleDays.length;
    const minutesPerSession = currentGoal.minutesPerSession;

    if (currentGoal.mode === "time") {
        const minutesPerWeek = minutesPerSession * sessionsPerWeek * paceModifier;
        if (minutesPerWeek <= 0) {
            return "Configura tu ritmo";
        }
        const weeksNeeded = remainingUnits / minutesPerWeek;
        return formatFutureDate(Math.ceil(weeksNeeded * 7));
    }

    const rateToUse = stats.averageRate > 0 ? stats.averageRate : currentGoal.rate;
    const wordsPerSession = (rateToUse * (minutesPerSession / 60)) * paceModifier;

    if (wordsPerSession <= 0 || sessionsPerWeek <= 0) {
        return "Configura tu ritmo";
    }

    const wordsPerWeek = wordsPerSession * sessionsPerWeek;
    const weeksNeeded = remainingUnits / wordsPerWeek;
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

    dom.projectName.textContent = currentGoal.name;
    dom.wordsProgress.textContent = `${fmt.format(stats.totalUnits)} / ${fmt.format(currentGoal.target)} palabras`;
    dom.percentProgress.textContent = `${stats.percent}%`;
    dom.progressBar.style.width = `${stats.percent}%`;
    dom.etaDate.textContent = calculateETA(1);

    dom.settingGoal.textContent = fmt.format(currentGoal.target);
    dom.settingDays.textContent = `${currentGoal.scheduleDays.length} días/sem`;
    dom.settingHours.textContent = `${(currentGoal.minutesPerSession / 60).toFixed(2).replace(/\\.00$/, "")}h/sesión`;
    const speedLabel = stats.totalMinutes > 0 ? "Real" : "Est.";
    const speedValue = stats.totalMinutes > 0 ? stats.averageRate : currentGoal.rate;
    dom.settingWph.textContent = `${fmt.format(speedValue)} pal/h (${speedLabel})`;

    dom.weeklySessions.textContent = `${weeklyStats.completedSessions} / ${weeklyStats.plannedSessions}`;
    dom.weeklyTime.textContent = `${(weeklyStats.totalMinutes / 60).toFixed(1).replace(/\\.0$/, "")}h`;
    dom.weeklyUnits.textContent = fmt.format(weeklyStats.totalUnits);
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
    dom.inputSessionHours.value = (currentGoal.minutesPerSession / 60).toFixed(2).replace(/\\.00$/, "");
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

    if (currentGoal.mode === "time") {
        value = minutes;
    } else if (wordsInput && !isNaN(parseInt(wordsInput, 10))) {
        value = parseInt(wordsInput, 10);
    } else if (currentGoal.rate > 0) {
        value = Math.floor(hours * currentGoal.rate);
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
    dom.inputProjectName.value = currentGoal.name;
    dom.inputProjectTarget.value = currentGoal.target;
    dom.inputProjectHours.value = (currentGoal.minutesPerSession / 60).toFixed(2).replace(/\\.00$/, "");
    dom.inputProjectWph.value = currentGoal.rate;

    const checkboxes = document.querySelectorAll(".day-checkbox");
    checkboxes.forEach((chk) => {
        const dayValue = parseInt(chk.value, 10);
        chk.checked = currentGoal.scheduleDays.includes(dayValue);
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
        ? currentGoal.rate
        : (!isNaN(rateInput) && rateInput > 0 ? rateInput : 10);

    currentGoal = {
        ...currentGoal,
        name,
        target,
        scheduleDays: selectedDays,
        minutesPerSession,
        rate
    };

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
