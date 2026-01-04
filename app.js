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
    unitName: "sesiones",
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
    category: "generic",
    templateKey: "generic",
    paceMode: "",
    deadlineDays: 0,
    bookTitle: "",
    unitSelection: "",
    targetValue: 0,
    pageCount: 0,
    pagesUnknown: false,
    timeTargetHours: 0,
    daysPerWeek: [1, 2, 3, 4, 5],
    minutesPerSession: 60,
    rateValuePerHour: 20
};

let wizardState = { ...DEFAULT_WIZARD_STATE };
let wizardStepIndex = 0;

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
    wizardSteps: document.getElementById("wizard-steps")
};

// --- 3. DATOS Y MIGRACIONES ---

function normalizeGoal(rawGoal = {}) {
    const mode = rawGoal.mode || DEFAULT_GOAL.mode;
    const title = rawGoal.title || rawGoal.name || DEFAULT_GOAL.title;
    const rawTargetValue = Number(rawGoal.targetValue ?? rawGoal.target ?? DEFAULT_GOAL.targetValue);
    const targetValue = Number.isFinite(rawTargetValue) ? rawTargetValue : DEFAULT_GOAL.targetValue;
    const rawUnitName = rawGoal.unitName || (mode === "time" ? "horas" : DEFAULT_GOAL.unitName);
    const unitName = rawUnitName === "unidades" ? "sesiones" : rawUnitName;
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

    if (hasKeyword(["leer", "libro", "novela", "autor"])) {
        return "reading";
    }
    if (hasKeyword(["cancion", "canción", "piano", "guitarra"])) {
        return "music";
    }
    if (hasKeyword(["estudiar", "examen", "curso"])) {
        return "study";
    }
    if (hasKeyword(["correr", "km", "gym", "entrenar", "caminar"])) {
        return "fitness";
    }
    return "generic";
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
const WIZARD_MINUTES_OPTIONS = [15, 30, 45, 60, 90].map((value) => ({
    label: `${value} min`,
    value
}));

const WIZARD_STEP_INTENT = {
    id: "intent",
    title: "¿Qué quieres lograr?",
    subtitle: "Describe tu meta en una frase.",
    inputType: "text",
    key: "intentText",
    placeholder: "Quiero leer La Peste de Camus",
    multiline: true
};

const WIZARD_STEP_DAYS = {
    id: "days-per-week",
    title: "¿Qué días puedes avanzar?",
    subtitle: "Selecciona los días que planeas dedicarle.",
    inputType: "days",
    key: "daysPerWeek"
};

const WIZARD_STEP_MINUTES = {
    id: "minutes-per-session",
    title: "¿Cuánto tiempo por sesión?",
    inputType: "chips",
    key: "minutesPerSession",
    options: WIZARD_MINUTES_OPTIONS
};

const GENERIC_STEPS = [
    WIZARD_STEP_INTENT,
    {
        id: "generic-unit",
        title: "¿Cómo quieres medir tu meta?",
        inputType: "chips",
        key: "unitSelection",
        options: [
            { label: "Páginas", value: "páginas" },
            { label: "Km", value: "km" },
            { label: "Sesiones", value: "sesiones" },
            { label: "Horas", value: "horas" }
        ]
    },
    {
        id: "generic-target",
        title: "¿Cuánto quieres completar en total?",
        inputType: "number",
        key: "targetValue",
        placeholder: "Ej: 20",
        condition: (state) => Boolean(state.unitSelection)
    },
    WIZARD_STEP_DAYS,
    WIZARD_STEP_MINUTES
];

const WIZARD_TEMPLATES = {
    reading: {
        steps: [
            WIZARD_STEP_INTENT,
            {
                id: "reading-mode",
                title: "¿Quieres terminar en una fecha o a tu ritmo?",
                inputType: "chips",
                key: "paceMode",
                options: [
                    { label: "En X días", value: "deadline" },
                    { label: "A mi ritmo", value: "pace" }
                ]
            },
            {
                id: "reading-book",
                title: "¿Qué libro quieres leer?",
                inputType: "text",
                key: "bookTitle",
                placeholder: "Ej: La Peste",
                multiline: false
            },
            {
                id: "reading-deadline",
                title: "¿En cuántos días?",
                inputType: "number",
                key: "deadlineDays",
                placeholder: "Ej: 30",
                condition: (state) => state.paceMode === "deadline"
            },
            {
                id: "reading-days",
                title: "¿Cuántos días a la semana puedes leer?",
                inputType: "days",
                key: "daysPerWeek"
            },
            {
                id: "reading-minutes",
                title: "¿Cuánto tiempo por sesión?",
                inputType: "chips",
                key: "minutesPerSession",
                options: WIZARD_MINUTES_OPTIONS
            },
            {
                id: "reading-pages",
                title: "¿Cuántas páginas tiene?",
                subtitle: "Opcional",
                inputType: "number",
                key: "pageCount",
                placeholder: "Ej: 320",
                required: false,
                options: [{ label: "No lo sé", value: "unknown" }]
            },
            {
                id: "reading-hours",
                title: "¿Cuántas horas en total quieres dedicar?",
                inputType: "number",
                key: "timeTargetHours",
                placeholder: "Ej: 12",
                condition: (state) => state.pageCount <= 0
            }
        ]
    },
    study: { steps: GENERIC_STEPS },
    fitness: { steps: GENERIC_STEPS },
    music: { steps: GENERIC_STEPS },
    generic: { steps: GENERIC_STEPS }
};

function buildWizardStateFromGoal(goal) {
    const intentText = goal.title || "";
    const category = inferCategory(intentText);
    const isReading = category === "reading";
    const unitSelection = goal.mode === "time" ? "horas" : goal.unitName;
    const pageCount = isReading && goal.mode !== "time" && goal.unitName === "páginas" ? goal.targetValue : 0;
    const timeTargetHours = goal.mode === "time" ? goal.targetValue : 0;

    return {
        ...DEFAULT_WIZARD_STATE,
        intentText,
        title: goal.title || "",
        category,
        templateKey: category,
        unitSelection: unitSelection || DEFAULT_WIZARD_STATE.unitSelection,
        targetValue: Number(goal.targetValue) || DEFAULT_WIZARD_STATE.targetValue,
        pageCount: Number(pageCount) || 0,
        timeTargetHours: Number(timeTargetHours) || 0,
        pagesUnknown: isReading && goal.mode === "time",
        daysPerWeek: Array.isArray(goal.plan?.daysPerWeek)
            ? [...goal.plan.daysPerWeek]
            : [...DEFAULT_WIZARD_STATE.daysPerWeek],
        minutesPerSession: Number(goal.plan?.minutesPerSession) || DEFAULT_WIZARD_STATE.minutesPerSession,
        rateValuePerHour: Number(goal.rate?.valuePerHour) || DEFAULT_WIZARD_STATE.rateValuePerHour,
        bookTitle: isReading && goal.title?.startsWith("Leer: ")
            ? goal.title.replace(/^Leer:\s*/i, "")
            : DEFAULT_WIZARD_STATE.bookTitle
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
    const template = WIZARD_TEMPLATES[wizardState.templateKey] ?? WIZARD_TEMPLATES.generic;
    return template.steps.filter((step) => !step.condition || step.condition(wizardState));
}

function getUnitQuestion(unitName) {
    const unit = (unitName || "").toLowerCase();
    if (unit === "horas") return "¿Cuántas horas en total?";
    if (unit === "páginas") return "¿Cuántas páginas en total?";
    if (unit === "sesiones") return "¿Cuántas sesiones en total?";
    if (unit === "km") return "¿Cuántos km en total?";
    return "¿Cuánto quieres completar en total?";
}

function getWizardStepTitle(step) {
    if (step.id === "generic-target") {
        return getUnitQuestion(wizardState.unitSelection);
    }
    return step.title;
}

function updateWizardProgress(steps) {
    const totalSteps = steps.length;
    const displayIndex = Math.min(wizardStepIndex + 1, totalSteps);

    dom.wizardStepLabel.textContent = `Paso ${displayIndex}/${totalSteps}`;
    dom.wizardDots.innerHTML = "";
    steps.forEach((_, index) => {
        const dot = document.createElement("span");
        dot.className = `wizard-dot${index === wizardStepIndex ? " active" : ""}`;
        dom.wizardDots.appendChild(dot);
    });
}

function isWizardStepValid(step) {
    if (!step) return false;
    if (step.required === false) return true;

    const value = wizardState[step.key];
    switch (step.inputType) {
        case "text":
            return Boolean(String(value || "").trim());
        case "number":
            return Number(value) > 0;
        case "chips":
            return value !== undefined && value !== null && String(value).length > 0;
        case "days":
            return Array.isArray(value) && value.length > 0;
        default:
            return true;
    }
}

function updateWizardButtons(steps) {
    const isFirst = wizardStepIndex === 0;
    const isLast = wizardStepIndex === steps.length - 1;
    const currentStep = steps[wizardStepIndex];

    dom.btnWizardBack.style.display = isFirst ? "none" : "inline-flex";
    dom.btnWizardNext.style.display = isLast ? "none" : "inline-flex";
    dom.btnWizardFinish.style.display = isLast ? "inline-flex" : "none";

    const isValid = isWizardStepValid(currentStep);
    dom.btnWizardNext.disabled = !isValid;
    dom.btnWizardFinish.disabled = !isValid;
}

function renderWizardStep() {
    const steps = getActiveWizardSteps();
    const step = steps[wizardStepIndex];
    if (!step) return;

    const title = getWizardStepTitle(step);
    const subtitle = step.subtitle ? `<p class="field-hint">${step.subtitle}</p>` : "";
    dom.wizardSteps.innerHTML = `
        <div class="wizard-step active" data-step="${step.id}">
            <h4 class="wizard-question">${title}</h4>
            ${subtitle}
            ${renderWizardInput(step)}
        </div>
    `;

    bindWizardStep(step);
}

function renderWizardInput(step) {
    if (step.inputType === "text") {
        if (step.multiline) {
            return `
                <div class="form-field">
                    <textarea class="input-field wizard-input" rows="3" placeholder="${step.placeholder ?? ""}"></textarea>
                </div>
            `;
        }
        return `
            <div class="form-field">
                <input type="text" class="input-field wizard-input" placeholder="${step.placeholder ?? ""}" />
            </div>
        `;
    }

    if (step.inputType === "number") {
        const chips = step.options?.length
            ? `
                <div class="choice-chips">
                    ${step.options
                        .map((option) => {
                            const isActive = step.id === "reading-pages"
                                ? wizardState.pagesUnknown && option.value === "unknown"
                                : wizardState[step.key] === option.value;
                            return `<button class="choice-chip${isActive ? " active" : ""}" type="button" data-value="${option.value}">${option.label}</button>`;
                        })
                        .join("")}
                </div>
            `
            : "";
        return `
            <div class="form-field">
                <input type="number" min="0" class="input-field wizard-input" placeholder="${step.placeholder ?? ""}" />
                ${chips}
            </div>
        `;
    }

    if (step.inputType === "chips") {
        const options = step.options ?? [];
        return `
            <div class="choice-chips">
                ${options
                    .map((option) => {
                        const isActive = wizardState[step.key] === option.value;
                        return `<button class="choice-chip${isActive ? " active" : ""}" type="button" data-value="${option.value}">${option.label}</button>`;
                    })
                    .join("")}
            </div>
        `;
    }

    if (step.inputType === "days") {
        const days = [
            { value: 1, label: "L" },
            { value: 2, label: "M" },
            { value: 3, label: "X" },
            { value: 4, label: "J" },
            { value: 5, label: "V" },
            { value: 6, label: "S" },
            { value: 0, label: "D" }
        ];
        return `
            <div class="day-chips">
                ${days
                    .map((day) => {
                        const checked = wizardState.daysPerWeek.includes(day.value) ? "checked" : "";
                        return `
                            <label class="day-chip">
                                <input type="checkbox" class="day-checkbox" value="${day.value}" ${checked} />
                                <span>${day.label}</span>
                            </label>
                        `;
                    })
                    .join("")}
            </div>
        `;
    }

    return "";
}

function updateWizardFlow({ rerenderStep = true } = {}) {
    const steps = getActiveWizardSteps();
    if (wizardStepIndex >= steps.length) {
        wizardStepIndex = Math.max(steps.length - 1, 0);
    }
    updateWizardProgress(steps);
    if (rerenderStep) {
        renderWizardStep();
    }
    updateWizardButtons(steps);
}

function bindWizardStep(step) {
    const stepEl = dom.wizardSteps.querySelector(".wizard-step");
    if (!stepEl) return;

    if (step.inputType === "text") {
        const input = stepEl.querySelector(".wizard-input");
        input.value = wizardState[step.key] || "";
        input.addEventListener("input", (event) => {
            wizardState[step.key] = event.target.value.trim();
            if (step.key === "intentText") {
                const nextCategory = inferCategory(wizardState.intentText);
                if (nextCategory !== wizardState.category) {
                    wizardState.category = nextCategory;
                    wizardState.templateKey = nextCategory;
                    updateWizardFlow();
                    return;
                }
            }
            updateWizardFlow({ rerenderStep: false });
        });
        return;
    }

    if (step.inputType === "number") {
        const input = stepEl.querySelector(".wizard-input");
        input.value = wizardState[step.key] || "";
        input.addEventListener("input", (event) => {
            const value = Number(event.target.value);
            wizardState[step.key] = Number.isFinite(value) ? value : 0;
            if (step.id === "reading-pages") {
                wizardState.pagesUnknown = wizardState[step.key] > 0 ? false : wizardState.pagesUnknown;
            }
            updateWizardFlow({ rerenderStep: false });
        });

        const chips = stepEl.querySelectorAll(".choice-chip");
        chips.forEach((chip) => {
            chip.addEventListener("click", () => {
                const value = chip.dataset.value;
                if (step.id === "reading-pages" && value === "unknown") {
                    wizardState.pagesUnknown = true;
                    wizardState.pageCount = 0;
                } else {
                    const numericValue = Number(value);
                    wizardState[step.key] = Number.isFinite(numericValue) ? numericValue : value;
                    if (step.id === "reading-pages") {
                        wizardState.pagesUnknown = false;
                    }
                }
                updateWizardFlow();
            });
        });
        return;
    }

    if (step.inputType === "chips") {
        const chips = stepEl.querySelectorAll(".choice-chip");
        chips.forEach((chip) => {
            chip.addEventListener("click", () => {
                const rawValue = chip.dataset.value;
                const option = step.options?.find((opt) => String(opt.value) === rawValue);
                const value = option ? option.value : rawValue;
                wizardState[step.key] = value;
                if (step.id === "reading-mode" && value === "pace") {
                    wizardState.deadlineDays = 0;
                }
                updateWizardFlow();
            });
        });
        return;
    }

    if (step.inputType === "days") {
        const checkboxes = stepEl.querySelectorAll(".day-checkbox");
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                wizardState.daysPerWeek = Array.from(stepEl.querySelectorAll(".day-checkbox:checked")).map(
                    (chk) => parseInt(chk.value, 10)
                );
                updateWizardFlow({ rerenderStep: false });
            });
        });
    }
}

function moveWizardStep(direction) {
    const steps = getActiveWizardSteps();
    const nextIndex = wizardStepIndex + direction;
    if (nextIndex >= 0 && nextIndex < steps.length) {
        wizardStepIndex = nextIndex;
        updateWizardFlow();
    }
}

function buildGoalFromWizardState() {
    const summary = summarizeIntent(wizardState.intentText, 8);
    const titleMap = {
        reading: "Leer",
        music: "Practicar",
        study: "Estudiar",
        fitness: "Entrenar",
        generic: "Meta"
    };
    const prefix = titleMap[wizardState.category] ?? "Meta";
    const baseTitle = summary ? `${prefix}: ${summary}` : DEFAULT_GOAL.title;
    const title = wizardState.category === "reading" && wizardState.bookTitle
        ? `Leer: ${wizardState.bookTitle}`
        : baseTitle;

    if (wizardState.category === "reading") {
        if (wizardState.pageCount > 0) {
            return {
                title,
                mode: "units",
                unitName: "páginas",
                targetValue: wizardState.pageCount
            };
        }
        return {
            title,
            mode: "time",
            unitName: "horas",
            targetValue: wizardState.timeTargetHours
        };
    }

    const unitName = wizardState.unitSelection || "sesiones";
    const isTime = unitName === "horas";
    return {
        title,
        mode: isTime ? "time" : "units",
        unitName,
        targetValue: wizardState.targetValue
    };
}

function openWizard() {
    dom.modalProject.classList.remove("hidden");
    wizardState = buildWizardStateFromGoal(currentGoal);
    if (isDefaultGoal(currentGoal)) {
        wizardState.intentText = "";
        wizardState.title = "";
    }
    wizardStepIndex = 0;
    updateWizardFlow();
}

function closeWizard() {
    dom.modalProject.classList.add("hidden");
}

function saveWizardGoal() {
    const goalBase = buildGoalFromWizardState();
    const finalRate = goalBase.mode === "time"
        ? currentGoal.rate.valuePerHour
        : wizardState.rateValuePerHour || DEFAULT_WIZARD_STATE.rateValuePerHour;

    currentGoal = normalizeGoal({
        ...currentGoal,
        title: goalBase.title,
        mode: goalBase.mode,
        unitName: goalBase.unitName,
        targetValue: goalBase.targetValue,
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
        const steps = getActiveWizardSteps();
        if (isWizardStepValid(steps[wizardStepIndex])) {
            moveWizardStep(1);
        }
    });
    dom.btnWizardFinish.addEventListener("click", () => {
        const steps = getActiveWizardSteps();
        if (isWizardStepValid(steps[wizardStepIndex])) {
            saveWizardGoal();
        }
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
