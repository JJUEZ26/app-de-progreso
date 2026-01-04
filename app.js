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

const DEFAULT_WIZARD_STATE = {
    intentText: "",
    title: "",
    category: "auto",
    mode: "units",
    unitName: "unidades",
    targetValue: 0,
    targetAuto: false,
    daysPerWeek: [1, 2, 3, 4, 5],
    minutesPerSession: 60,
    rateValuePerHour: 20,
    paceStyle: "normal"
};

let wizardState = { ...DEFAULT_WIZARD_STATE };
let wizardStep = 1;
const wizardMeta = {
    titleEdited: false,
    unitNameEdited: false,
    rateEdited: false,
    modeEdited: false
};

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
    btnWizardBack: document.getElementById("btn-wizard-back"),
    btnWizardNext: document.getElementById("btn-wizard-next"),
    btnWizardFinish: document.getElementById("btn-wizard-finish"),
    wizardStepLabel: document.getElementById("wizard-step-label"),
    wizardDots: document.getElementById("wizard-dots"),
    wizardSteps: document.getElementById("wizard-steps"),
    wizardIntent: document.getElementById("wizard-intent"),
    wizardTitle: document.getElementById("wizard-title"),
    wizardTarget: document.getElementById("wizard-target"),
    wizardTargetAuto: document.getElementById("wizard-target-auto"),
    wizardTargetLabel: document.getElementById("wizard-target-label"),
    wizardUnitField: document.getElementById("wizard-unit-field"),
    wizardUnitName: document.getElementById("wizard-unit-name"),
    wizardMinutes: document.getElementById("wizard-minutes"),
    wizardRate: document.getElementById("wizard-rate"),
    wizardPaceOptions: document.getElementById("wizard-pace-options"),
    wizardSummaryTarget: document.getElementById("wizard-summary-target"),
    wizardSummaryPlan: document.getElementById("wizard-summary-plan"),
    wizardSummaryEta: document.getElementById("wizard-summary-eta"),
    wizardSummaryInsights: document.getElementById("wizard-summary-insights")
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

function getStats(goal = currentGoal) {
    let totalUnits = 0;
    let totalMinutes = 0;

    sessions.forEach((session) => {
        totalMinutes += session.minutes;

        if (goal.mode === "time") {
            totalUnits += session.minutes / 60;
            return;
        }

        if (typeof session.value === "number") {
            totalUnits += session.value;
            return;
        }

        const rate = goal.rate.valuePerHour;
        if (rate > 0 && session.minutes > 0) {
            totalUnits += Math.floor((session.minutes / 60) * rate);
        }
    });

    const percent = goal.targetValue > 0
        ? Math.min(100, Math.floor((totalUnits / goal.targetValue) * 100))
        : 0;

    const averageRate = goal.mode !== "time" && totalMinutes > 0
        ? Math.floor(totalUnits / (totalMinutes / 60))
        : goal.rate.valuePerHour;

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

function calculateETA(paceModifier = 1, goal = currentGoal) {
    const stats = getStats(goal);
    const remainingUnits = goal.targetValue - stats.totalUnits;

    if (remainingUnits <= 0) {
        return "¡Completado!";
    }

    const sessionsPerWeek = goal.plan.daysPerWeek.length;
    const minutesPerSession = goal.plan.minutesPerSession;

    if (goal.mode === "time") {
        const minutesPerWeek = minutesPerSession * sessionsPerWeek * paceModifier;
        if (minutesPerWeek <= 0) {
            return "Configura tu ritmo";
        }
        const weeksNeeded = (remainingUnits * 60) / minutesPerWeek;
        return formatFutureDate(Math.ceil(weeksNeeded * 7));
    }

    const rateToUse = stats.averageRate > 0 ? stats.averageRate : goal.rate.valuePerHour;
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

function getPaceModifier(style = "normal") {
    const modifiers = {
        relajado: 0.8,
        normal: 1,
        intenso: 1.2
    };
    return modifiers[style] ?? 1;
}

function roundToNearest(value, step) {
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
        return value;
    }
    return Math.round(value / step) * step;
}

function stripAccents(text) {
    return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function summarizeIntent(intentText, maxWords = 8) {
    if (!intentText) return "";
    const stopWords = new Set([
        "quiero", "quisiera", "gustaria", "gustaría", "me", "aprender", "hacer", "lograr", "alcanzar", "terminar",
        "completar", "empezar", "empezar", "poder", "un", "una", "unos", "unas", "el", "la", "los", "las", "de",
        "del", "al", "para", "por", "en", "con", "sobre", "y", "a", "mi", "mis", "tu", "tus", "su", "sus", "que",
        "leer", "estudiar", "practicar"
    ]);

    const tokens = intentText
        .split(/\s+/)
        .map((word) => word.replace(/[^\p{L}\p{N}]+/gu, ""))
        .filter(Boolean);

    const filtered = tokens.filter((word) => {
        const normalized = stripAccents(word.toLowerCase());
        return !stopWords.has(normalized);
    });

    return filtered.slice(0, maxWords).join(" ");
}

function inferCategory(intentText) {
    const normalized = stripAccents(intentText.toLowerCase());
    const hasKeyword = (keywords) => keywords.some((keyword) => normalized.includes(keyword));

    if (hasKeyword(["leer", "libro", "novela", "lectura"])) {
        return "reading";
    }
    if (hasKeyword(["cancion", "canción", "piano", "guitarra", "musica", "música"])) {
        return "music";
    }
    if (hasKeyword(["curso", "estudiar", "examen", "estudio", "tema"])) {
        return "study";
    }
    if (hasKeyword(["gym", "gimnasio", "correr", "entreno", "entrenar", "fitness"])) {
        return "fitness";
    }
    return "generic";
}

function suggestGoalConfig(intentText, mode, userInputs) {
    const category = inferCategory(intentText);
    const summary = summarizeIntent(intentText, 8);
    const planTweaks = {};
    const notes = [];
    let unitName = userInputs.unitName || "";
    let rateSuggestion = null;
    let targetValueSuggestion = null;

    if (category === "study" && !userInputs.modeEdited) {
        planTweaks.mode = "time";
    }

    const effectiveMode = planTweaks.mode ?? mode;

    if (category === "reading") {
        if (effectiveMode !== "time") {
            unitName = "páginas";
        }
        const minutes = userInputs.minutesPerSession || 0;
        if (minutes > 0) {
            if (minutes <= 20) {
                rateSuggestion = 15;
            } else if (minutes <= 45) {
                rateSuggestion = 20;
            } else {
                rateSuggestion = 25;
            }
        } else {
            rateSuggestion = 20;
        }
    }

    if (category === "music") {
        if (effectiveMode !== "time") {
            const unitHint = stripAccents((userInputs.unitName || "").toLowerCase());
            unitName = unitHint.includes("sesion") ? "sesiones" : "minutos";
        }
        rateSuggestion = null;
    }

    if (category === "fitness") {
        if (effectiveMode !== "time") {
            unitName = "sesiones";
        }
        const daysCount = userInputs.daysPerWeek?.length ?? 0;
        if (daysCount > 0) {
            if (daysCount <= 2) {
                targetValueSuggestion = 12;
            } else if (daysCount <= 4) {
                targetValueSuggestion = 24;
            } else {
                targetValueSuggestion = 36;
            }
        }
    }

    if (category === "generic") {
        if (effectiveMode !== "time") {
            unitName = "unidades";
        }
        rateSuggestion = 10;
    }

    const titleMap = {
        reading: summary ? `Leer: ${summary}` : "",
        music: summary ? `Practicar: ${summary}` : "",
        study: summary ? `Estudiar: ${summary}` : "",
        fitness: summary ? `Entrenar: ${summary}` : "",
        generic: summary ? `Meta: ${summary}` : ""
    };

    if (userInputs.useAutoTarget) {
        const days = userInputs.daysPerWeek?.length ?? 0;
        const minutes = userInputs.minutesPerSession ?? 0;
        const weeks = 4;
        const hoursPerSession = minutes / 60;
        if (category === "reading" && effectiveMode !== "time") {
            const rate = rateSuggestion ?? userInputs.rateValuePerHour ?? 0;
            if (days && minutes && rate > 0) {
                targetValueSuggestion = roundToNearest(days * weeks * hoursPerSession * rate, 10);
            }
        } else if (category === "study" && effectiveMode === "time") {
            if (days && minutes) {
                targetValueSuggestion = Math.round(days * weeks * hoursPerSession);
            }
        } else if (category === "fitness") {
            if (days) {
                targetValueSuggestion = days * weeks;
            }
        } else if (category === "generic") {
            if (days) {
                targetValueSuggestion = days * weeks;
            }
        }
    }

    return {
        title: titleMap[category] || "",
        category,
        unitName,
        targetValueSuggestion,
        rateSuggestion,
        planTweaks,
        notes
    };
}

function calculateEtaDays(goal, paceModifier = 1, sessionsOverride = null) {
    const stats = getStats(goal);
    const remainingUnits = goal.targetValue - stats.totalUnits;

    if (remainingUnits <= 0) {
        return 0;
    }

    const sessionsPerWeek = sessionsOverride ?? goal.plan.daysPerWeek.length;
    const minutesPerSession = goal.plan.minutesPerSession;

    if (goal.mode === "time") {
        const minutesPerWeek = minutesPerSession * sessionsPerWeek * paceModifier;
        if (minutesPerWeek <= 0) {
            return null;
        }
        const weeksNeeded = (remainingUnits * 60) / minutesPerWeek;
        return Math.ceil(weeksNeeded * 7);
    }

    const rateToUse = stats.averageRate > 0 ? stats.averageRate : goal.rate.valuePerHour;
    const unitsPerSession = (rateToUse * (minutesPerSession / 60)) * paceModifier;
    if (unitsPerSession <= 0 || sessionsPerWeek <= 0) {
        return null;
    }
    const unitsPerWeek = unitsPerSession * sessionsPerWeek;
    const weeksNeeded = remainingUnits / unitsPerWeek;
    return Math.ceil(weeksNeeded * 7);
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

    if (currentGoal.mode !== "time") {
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

    if (currentGoal.mode !== "time" && wordsInput && !isNaN(parseInt(wordsInput, 10))) {
        value = parseInt(wordsInput, 10);
    } else if (currentGoal.mode !== "time" && currentGoal.rate.valuePerHour > 0) {
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

function buildWizardStateFromGoal(goal) {
    return {
        ...DEFAULT_WIZARD_STATE,
        intentText: goal.title || "",
        title: goal.title || "",
        mode: goal.mode || DEFAULT_WIZARD_STATE.mode,
        unitName: goal.unitName || DEFAULT_WIZARD_STATE.unitName,
        targetValue: Number(goal.targetValue) || DEFAULT_WIZARD_STATE.targetValue,
        daysPerWeek: Array.isArray(goal.plan?.daysPerWeek)
            ? [...goal.plan.daysPerWeek]
            : [...DEFAULT_WIZARD_STATE.daysPerWeek],
        minutesPerSession: Number(goal.plan?.minutesPerSession) || DEFAULT_WIZARD_STATE.minutesPerSession,
        rateValuePerHour: Number(goal.rate?.valuePerHour) || DEFAULT_WIZARD_STATE.rateValuePerHour
    };
}

function isDefaultGoal(goal) {
    const baseline = normalizeGoal(DEFAULT_GOAL);
    return goal.id === baseline.id
        && goal.title === baseline.title
        && goal.targetValue === baseline.targetValue
        && goal.mode === baseline.mode
        && goal.unitName === baseline.unitName
        && goal.plan.minutesPerSession === baseline.plan.minutesPerSession
        && JSON.stringify(goal.plan.daysPerWeek) === JSON.stringify(baseline.plan.daysPerWeek);
}

function getActiveWizardSteps() {
    return wizardState.mode === "time" ? [1, 2, 3, 4, 6] : [1, 2, 3, 4, 5, 6];
}

function getWizardStepIndex(step) {
    return getActiveWizardSteps().indexOf(step);
}

function formatWizardValue(value) {
    const fmt = new Intl.NumberFormat("es-ES");
    if (wizardState.mode === "time") {
        return fmt.format(Number(value.toFixed(1)));
    }
    return fmt.format(Math.floor(value));
}

function updateWizardProgress() {
    const steps = getActiveWizardSteps();
    const activeIndex = getWizardStepIndex(wizardStep);
    const totalSteps = steps.length;
    const displayIndex = activeIndex >= 0 ? activeIndex + 1 : 1;

    dom.wizardStepLabel.textContent = `Paso ${displayIndex}/${totalSteps}`;
    dom.wizardDots.innerHTML = "";
    steps.forEach((step) => {
        const dot = document.createElement("span");
        dot.className = `wizard-dot${step === wizardStep ? " active" : ""}`;
        dom.wizardDots.appendChild(dot);
    });
}

function updateWizardStepVisibility() {
    const stepNodes = dom.wizardSteps.querySelectorAll(".wizard-step");
    stepNodes.forEach((node) => {
        const step = Number(node.dataset.step);
        node.classList.toggle("active", step === wizardStep);
    });
}

function updateWizardModeUI() {
    const modeButtons = dom.wizardSteps.querySelectorAll(".mode-card");
    modeButtons.forEach((btn) => {
        const mode = btn.dataset.mode;
        btn.classList.toggle("active", mode === wizardState.mode);
    });

    const isTime = wizardState.mode === "time";
    dom.wizardUnitField.style.display = isTime ? "none" : "flex";
    const rateField = dom.wizardRate?.closest(".form-field");
    if (rateField) {
        rateField.style.display = isTime ? "none" : "block";
    }
    dom.wizardTargetLabel.textContent = isTime
        ? "¿Cuántas horas en total?"
        : "¿Meta total?";
}

function updateWizardDaysUI() {
    const checkboxes = dom.wizardSteps.querySelectorAll(".day-checkbox");
    checkboxes.forEach((chk) => {
        const dayValue = parseInt(chk.value, 10);
        chk.checked = wizardState.daysPerWeek.includes(dayValue);
    });
}

function updateWizardPaceUI() {
    const buttons = dom.wizardSteps.querySelectorAll(".pace-card");
    buttons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.pace === wizardState.paceStyle);
    });
}

function updateWizardTargetAutoUI() {
    if (!dom.wizardTargetAuto) return;
    dom.wizardTargetAuto.classList.toggle("active", wizardState.targetAuto);
}

function updateWizardSummary() {
    const paceModifier = getPaceModifier(wizardState.paceStyle);
    const previewGoal = normalizeGoal({
        ...currentGoal,
        title: wizardState.title || wizardState.intentText || DEFAULT_GOAL.title,
        mode: wizardState.mode,
        unitName: wizardState.mode === "time" ? "horas" : wizardState.unitName || "unidades",
        targetValue: wizardState.targetValue || 0,
        plan: {
            daysPerWeek: wizardState.daysPerWeek,
            minutesPerSession: wizardState.minutesPerSession
        },
        rate: {
            valuePerHour: wizardState.rateValuePerHour
        }
    });

    const targetLabel = `${formatWizardValue(previewGoal.targetValue)} ${previewGoal.unitName}`;
    const planLabel = `${previewGoal.plan.daysPerWeek.length} días · ${previewGoal.plan.minutesPerSession} min/sesión`;
    const etaLabel = calculateETA(paceModifier, previewGoal);
    const insights = [];

    if (etaLabel && etaLabel !== "Configura tu ritmo" && etaLabel !== "¡Completado!") {
        insights.push(`Con este ritmo, terminas aprox el ${etaLabel}.`);
    }
    if (previewGoal.plan.daysPerWeek.length > 0 && previewGoal.plan.minutesPerSession > 0) {
        insights.push(
            `Tu semana ideal sería ${previewGoal.plan.daysPerWeek.length} sesiones de ${previewGoal.plan.minutesPerSession} min.`
        );
    }
    const baseEtaDays = calculateEtaDays(previewGoal, paceModifier);
    const delayedEtaDays = calculateEtaDays(previewGoal, paceModifier, Math.max(previewGoal.plan.daysPerWeek.length - 1, 0));
    if (Number.isFinite(baseEtaDays) && Number.isFinite(delayedEtaDays) && delayedEtaDays > baseEtaDays) {
        const diffDays = delayedEtaDays - baseEtaDays;
        insights.push(`Si un día fallas, tu fecha se movería ~${diffDays} días.`);
    }
    if (previewGoal.mode !== "time" && previewGoal.rate.valuePerHour > 0) {
        insights.push("Puedes registrar solo tiempo y la app estimará tu avance.");
    }

    dom.wizardSummaryTarget.textContent = targetLabel;
    dom.wizardSummaryPlan.textContent = planLabel;
    dom.wizardSummaryEta.textContent = etaLabel;
    if (dom.wizardSummaryInsights) {
        dom.wizardSummaryInsights.innerHTML = insights.map((note) => `<li>${note}</li>`).join("");
    }
    dom.wizardTitle.value = wizardState.title || wizardState.intentText || "";
}

function isWizardStepValid(step) {
    switch (step) {
        case 1:
            return Boolean(wizardState.intentText.trim());
        case 2:
            return Boolean(wizardState.mode);
        case 3:
            if (wizardState.mode === "time") {
                return wizardState.targetValue > 0;
            }
            return wizardState.targetValue > 0 && Boolean(wizardState.unitName.trim());
        case 4:
            return wizardState.daysPerWeek.length > 0 && wizardState.minutesPerSession > 0;
        case 5:
            if (wizardState.mode === "time") {
                return true;
            }
            if (wizardState.category === "music") {
                return true;
            }
            return wizardState.rateValuePerHour > 0;
        case 6:
        default:
            return true;
    }
}

function updateWizardButtons() {
    const steps = getActiveWizardSteps();
    const activeIndex = getWizardStepIndex(wizardStep);
    const isLast = activeIndex === steps.length - 1;

    dom.btnWizardBack.style.display = activeIndex > 0 ? "inline-flex" : "none";
    dom.btnWizardNext.style.display = isLast ? "none" : "inline-flex";
    dom.btnWizardFinish.style.display = isLast ? "inline-flex" : "none";

    dom.btnWizardNext.disabled = !isWizardStepValid(wizardStep);
    dom.btnWizardFinish.disabled = !isWizardStepValid(wizardStep);
}

function setWizardStep(nextStep) {
    const steps = getActiveWizardSteps();
    const clampedStep = steps.includes(nextStep) ? nextStep : steps[0];
    wizardStep = clampedStep;
    updateWizardProgress();
    updateWizardStepVisibility();
    updateWizardButtons();
    updateWizardSummary();
}

function moveWizardStep(direction) {
    const steps = getActiveWizardSteps();
    const currentIndex = getWizardStepIndex(wizardStep);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < steps.length) {
        setWizardStep(steps[nextIndex]);
    }
}

function applyIntentSuggestions() {
    const suggestion = suggestGoalConfig(wizardState.intentText, wizardState.mode, {
        unitName: wizardState.unitName,
        daysPerWeek: wizardState.daysPerWeek,
        minutesPerSession: wizardState.minutesPerSession,
        rateValuePerHour: wizardState.rateValuePerHour,
        modeEdited: wizardMeta.modeEdited,
        useAutoTarget: wizardState.targetAuto
    });

    wizardState.category = suggestion.category;

    if (!wizardMeta.modeEdited && suggestion.planTweaks?.mode && suggestion.planTweaks.mode !== wizardState.mode) {
        wizardState.mode = suggestion.planTweaks.mode;
        if (wizardState.mode === "time") {
            wizardState.unitName = "horas";
        }
        updateWizardModeUI();
        const steps = getActiveWizardSteps();
        if (!steps.includes(wizardStep)) {
            wizardStep = steps[steps.length - 1];
        }
    }

    if (!wizardMeta.unitNameEdited && wizardState.mode !== "time" && suggestion.unitName) {
        wizardState.unitName = suggestion.unitName;
        dom.wizardUnitName.value = wizardState.unitName;
    }
    if (!wizardMeta.rateEdited && wizardState.mode !== "time" && Number.isFinite(suggestion.rateSuggestion)) {
        wizardState.rateValuePerHour = suggestion.rateSuggestion;
        dom.wizardRate.value = wizardState.rateValuePerHour;
    }
    if (!wizardMeta.titleEdited && suggestion.title) {
        wizardState.title = suggestion.title || wizardState.intentText;
        dom.wizardTitle.value = wizardState.title;
    }
    if (wizardState.targetAuto && Number.isFinite(suggestion.targetValueSuggestion)) {
        wizardState.targetValue = suggestion.targetValueSuggestion;
        dom.wizardTarget.value = wizardState.targetValue;
    }
}

function openWizard() {
    dom.modalProject.classList.remove("hidden");
    wizardState = buildWizardStateFromGoal(currentGoal);
    if (isDefaultGoal(currentGoal)) {
        wizardState.intentText = "";
        wizardState.title = "";
    }
    wizardMeta.titleEdited = Boolean(wizardState.title && wizardState.title !== DEFAULT_GOAL.title);
    wizardMeta.unitNameEdited = Boolean(wizardState.unitName && wizardState.unitName !== DEFAULT_WIZARD_STATE.unitName);
    wizardMeta.rateEdited = Boolean(wizardState.rateValuePerHour && wizardState.rateValuePerHour !== DEFAULT_WIZARD_STATE.rateValuePerHour);
    wizardMeta.modeEdited = false;
    wizardState.targetAuto = false;
    wizardState.paceStyle = "normal";
    wizardStep = getActiveWizardSteps()[0];

    dom.wizardIntent.value = wizardState.intentText;
    dom.wizardTarget.value = wizardState.targetValue || "";
    dom.wizardUnitName.value = wizardState.unitName;
    dom.wizardMinutes.value = wizardState.minutesPerSession;
    dom.wizardRate.value = wizardState.rateValuePerHour;
    dom.wizardTitle.value = wizardState.title;
    dom.wizardTargetAuto?.classList.remove("active");
    applyIntentSuggestions();
    updateWizardModeUI();
    updateWizardDaysUI();
    updateWizardPaceUI();
    updateWizardTargetAutoUI();
    updateWizardProgress();
    updateWizardStepVisibility();
    updateWizardButtons();
    updateWizardSummary();
}

function closeWizard() {
    dom.modalProject.classList.add("hidden");
}

function saveWizardGoal() {
    const goalTitle = wizardState.title || wizardState.intentText || DEFAULT_GOAL.title;
    const finalUnitName = wizardState.mode === "time" ? "horas" : (wizardState.unitName || "unidades");
    const finalRate = wizardState.mode === "time"
        ? currentGoal.rate.valuePerHour
        : wizardState.rateValuePerHour;

    currentGoal = normalizeGoal({
        ...currentGoal,
        title: goalTitle,
        mode: wizardState.mode,
        unitName: finalUnitName,
        targetValue: wizardState.targetValue,
        plan: {
            daysPerWeek: wizardState.daysPerWeek,
            minutesPerSession: wizardState.minutesPerSession
        },
        rate: {
            valuePerHour: finalRate
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
    dom.btnWizardBack.addEventListener("click", () => moveWizardStep(-1));
    dom.btnWizardNext.addEventListener("click", () => {
        if (isWizardStepValid(wizardStep)) {
            moveWizardStep(1);
        }
    });
    dom.btnWizardFinish.addEventListener("click", () => {
        if (isWizardStepValid(wizardStep)) {
            saveWizardGoal();
        }
    });

    dom.wizardIntent.addEventListener("input", (event) => {
        wizardState.intentText = event.target.value.trim();
        applyIntentSuggestions();
        updateWizardButtons();
        updateWizardSummary();
    });

    dom.wizardTitle.addEventListener("input", (event) => {
        wizardMeta.titleEdited = true;
        wizardState.title = event.target.value.trim();
        updateWizardButtons();
        updateWizardSummary();
    });

    dom.wizardTarget.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        wizardState.targetValue = Number.isFinite(value) ? value : 0;
        if (wizardState.targetValue > 0) {
            wizardState.targetAuto = false;
            updateWizardTargetAutoUI();
        }
        updateWizardButtons();
        updateWizardSummary();
    });

    dom.wizardUnitName.addEventListener("input", (event) => {
        wizardMeta.unitNameEdited = true;
        wizardState.unitName = event.target.value.trim();
        updateWizardButtons();
        updateWizardSummary();
    });

    dom.wizardMinutes.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        wizardState.minutesPerSession = Number.isFinite(value) ? value : 0;
        applyIntentSuggestions();
        updateWizardButtons();
        updateWizardSummary();
    });

    dom.wizardRate.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        wizardState.rateValuePerHour = Number.isFinite(value) ? value : 0;
        wizardMeta.rateEdited = true;
        applyIntentSuggestions();
        updateWizardButtons();
        updateWizardSummary();
    });

    dom.wizardSteps.querySelectorAll(".mode-card").forEach((button) => {
        button.addEventListener("click", () => {
            wizardState.mode = button.dataset.mode;
            wizardMeta.modeEdited = true;
            if (wizardState.mode === "time") {
                wizardState.unitName = "horas";
            } else if (!wizardMeta.unitNameEdited) {
                const suggestion = suggestGoalConfig(wizardState.intentText, wizardState.mode, {
                    unitName: wizardState.unitName,
                    daysPerWeek: wizardState.daysPerWeek,
                    minutesPerSession: wizardState.minutesPerSession,
                    rateValuePerHour: wizardState.rateValuePerHour,
                    modeEdited: wizardMeta.modeEdited,
                    useAutoTarget: wizardState.targetAuto
                });
                wizardState.unitName = suggestion.unitName || wizardState.unitName;
            }
            updateWizardModeUI();
            applyIntentSuggestions();
            const steps = getActiveWizardSteps();
            if (!steps.includes(wizardStep)) {
                wizardStep = steps[steps.length - 1];
            }
            setWizardStep(wizardStep);
        });
    });

    dom.wizardSteps.querySelectorAll(".day-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            wizardState.daysPerWeek = Array.from(dom.wizardSteps.querySelectorAll(".day-checkbox:checked")).map(
                (chk) => parseInt(chk.value, 10)
            );
            applyIntentSuggestions();
            updateWizardButtons();
            updateWizardSummary();
        });
    });

    if (dom.wizardTargetAuto) {
        dom.wizardTargetAuto.addEventListener("click", () => {
            wizardState.targetAuto = !wizardState.targetAuto;
            if (wizardState.targetAuto) {
                applyIntentSuggestions();
            }
            updateWizardTargetAutoUI();
            updateWizardButtons();
            updateWizardSummary();
        });
    }

    dom.wizardSteps.querySelectorAll(".pace-card").forEach((button) => {
        button.addEventListener("click", () => {
            wizardState.paceStyle = button.dataset.pace;
            updateWizardPaceUI();
            updateWizardSummary();
        });
    });

    dom.btnExplore.addEventListener("click", () => {
        const section = document.getElementById("scenarios-section");
        if (section) section.scrollIntoView({ behavior: "smooth" });
    });

    if (isDefaultGoal(currentGoal) && sessions.length === 0) {
        setTimeout(() => {
            openWizard();
        }, 500);
    }

    window.addEventListener("click", (event) => {
        if (event.target === dom.modalSession) closeLogModal();
        if (event.target === dom.modalProject) closeWizard();
    });
}

document.addEventListener("DOMContentLoaded", initApp);
