import { appState } from "./core/state.js";
import {
    KEYS,
    LEGACY_KEYS,
    LEGACY_PROJECT_KEYS,
    loadCurrentGoalId,
    loadGoals,
    loadSessionsByGoal,
    saveCurrentGoalId,
    saveGoals,
    saveSessionsByGoal
} from "./core/storage.js";
import { DEFAULT_GOAL, normalizeGoal } from "./models/goals.js";
import { calculateETA, calculateEtaDays, formatFutureDate } from "./models/metrics.js";
import { normalizeSessions } from "./models/sessions.js";
import { today } from "./utils/dates.js";
import { renderDashboard } from "./ui/dashboard.js";
import { initDashboardNav } from "./ui/nav.js";

/* GOAL TRACKER APP
    Versión: 2.2 (Universal Goal Model)
*/

// --- 1. CONFIGURACIÓN Y MODELO DE DATOS ---

let goals = [];
let currentGoalId = DEFAULT_GOAL.id;
let currentGoal = normalizeGoal(DEFAULT_GOAL);
let sessions = [];
let sessionsByGoalId = {};
let smartIntentText = "";
let wizardMode = "edit";

const DEFAULT_WIZARD_STATE = {
    smartIntentText: "",
    intentText: "",
    title: "",
    category: "generic",
    templateKey: "generic",
    paceMode: "",
    deadlineDays: 0,
    bookTitle: "",
    topicTitle: "",
    habitTitle: "",
    habitFrequency: "",
    preferredTime: "",
    daysPerWeekCount: 0,
    hasPresetDays: false,
    hasPresetMinutes: false,
    hasPresetDeadline: false,
    hasPresetBook: false,
    unitSelection: "",
    targetValue: 0,
    pageCount: 0,
    pagesUnknown: false,
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

    smartIntentInput: document.getElementById("smart-intent-input"),
    btnSmartContinue: document.getElementById("btn-smart-continue"),
    smartCreateMessage: document.getElementById("smart-create-message"),

    btnDashboardVision: document.getElementById("btn-dashboard-vision"),
    btnDashboardToday: document.getElementById("btn-dashboard-today"),
    dashboardVisionPanel: document.getElementById("dashboard-vision"),
    dashboardTodayPanel: document.getElementById("dashboard-today"),

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

function migrateStorageIfNeeded() {
    const hasGoals = localStorage.getItem(KEYS.GOALS);
    const hasSessions = localStorage.getItem(KEYS.SESSIONS);

    if (!hasGoals) {
        const legacyGoalStr = localStorage.getItem(LEGACY_KEYS.GOAL);
        const legacyProjectStr = localStorage.getItem(LEGACY_PROJECT_KEYS.GOAL);
        const rawGoalStr = legacyGoalStr || legacyProjectStr;

        try {
            const legacyGoal = rawGoalStr ? JSON.parse(rawGoalStr) : null;
            const baseGoal = legacyGoal
                ? normalizeGoal({
                    id: legacyGoal.id || DEFAULT_GOAL.id,
                    title: legacyGoal.title || legacyGoal.name || DEFAULT_GOAL.title,
                    targetValue: legacyGoal.targetValue ?? legacyGoal.targetWords ?? DEFAULT_GOAL.targetValue,
                    plan: {
                        daysPerWeek: legacyGoal.plan?.daysPerWeek || legacyGoal.schedule?.workDays || DEFAULT_GOAL.plan.daysPerWeek,
                        minutesPerSession: Math.round(
                            (legacyGoal.plan?.minutesPerSession || legacyGoal.schedule?.hoursPerSession || DEFAULT_GOAL.plan.minutesPerSession / 60) * 60
                        )
                    },
                    rate: {
                        valuePerHour: legacyGoal.rate?.valuePerHour || legacyGoal.schedule?.wordsPerHour || DEFAULT_GOAL.rate.valuePerHour
                    }
                })
                : normalizeGoal(DEFAULT_GOAL);

            localStorage.setItem(KEYS.GOALS, JSON.stringify([baseGoal]));
            localStorage.setItem(KEYS.CURRENT_GOAL_ID, baseGoal.id);
        } catch (error) {
            console.error(error);
            localStorage.setItem(KEYS.GOALS, JSON.stringify([normalizeGoal(DEFAULT_GOAL)]));
            localStorage.setItem(KEYS.CURRENT_GOAL_ID, DEFAULT_GOAL.id);
        }
    }

    if (!hasSessions) {
        const legacySessionsStr = localStorage.getItem(LEGACY_KEYS.SESSIONS)
            || localStorage.getItem(LEGACY_PROJECT_KEYS.SESSIONS);
        if (legacySessionsStr) {
            try {
                const legacySessions = JSON.parse(legacySessionsStr);
                const migratedSessions = Array.isArray(legacySessions)
                    ? legacySessions.map((session) => ({
                        id: session.id || Date.now(),
                        date: session.date || new Date().toISOString().split("T")[0],
                        minutes: Number(session.minutes) || 0,
                        value: session.words ?? session.value ?? null,
                        isEstimated: Boolean(session.isEstimated)
                    }))
                    : [];
                const goalId = localStorage.getItem(KEYS.CURRENT_GOAL_ID) || DEFAULT_GOAL.id;
                localStorage.setItem(KEYS.SESSIONS, JSON.stringify({ [goalId]: migratedSessions }));
            } catch (error) {
                console.error(error);
            }
        }
    }
}

function loadData() {
    const storedGoals = loadGoals();
    goals = storedGoals.length ? storedGoals.map((goal) => normalizeGoal(goal)) : [normalizeGoal(DEFAULT_GOAL)];

    const storedGoalId = loadCurrentGoalId();
    currentGoalId = goals.some((goal) => goal.id === storedGoalId) ? storedGoalId : goals[0].id;
    currentGoal = normalizeGoal(goals.find((goal) => goal.id === currentGoalId));

    sessionsByGoalId = loadSessionsByGoal();

    Object.keys(sessionsByGoalId).forEach((goalId) => {
        sessionsByGoalId[goalId] = normalizeSessions(sessionsByGoalId[goalId]);
    });
    sessions = normalizeSessions(sessionsByGoalId[currentGoalId]);
    appState.selectedGoalId = currentGoalId;
}

function saveData() {
    const existingIndex = goals.findIndex((goal) => goal.id === currentGoal.id);
    if (existingIndex >= 0) {
        goals[existingIndex] = currentGoal;
    } else {
        goals.push(currentGoal);
    }
    sessionsByGoalId[currentGoal.id] = sessions;

    saveGoals(goals);
    saveCurrentGoalId(currentGoal.id);
    saveSessionsByGoal(sessionsByGoalId);
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

function classifyIntent(intentText) {
    const normalized = stripAccents(intentText.toLowerCase());
    const hasKeyword = (keywords) => keywords.some((keyword) => normalized.includes(keyword));

    if (hasKeyword(["leer", "libro", "novela", "autor"])) {
        return "reading";
    }
    if (hasKeyword(["correr", "caminar", "km", "entrenar"])) {
        return "fitness";
    }
    if (hasKeyword(["estudiar", "examen", "curso", "clase"])) {
        return "study";
    }
    if (hasKeyword(["cada dia", "cada día", "todos los dias", "todos los días", "hábito", "habito"])) {
        return "habit";
    }
    return "generic";
}

function extractNumberMatch(text, regex) {
    const match = text.match(regex);
    if (!match) return 0;
    const value = Number(match[1].replace(",", "."));
    return Number.isFinite(value) ? value : 0;
}

function buildDaysFromCount(count) {
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    return dayOrder.slice(0, Math.min(count, dayOrder.length));
}

function parseIntent(text) {
    const normalized = stripAccents(text.toLowerCase());
    const category = classifyIntent(text);
    const daysMatch = extractNumberMatch(normalized, /(\d+)\s*dias?/);
    const hoursMatch = extractNumberMatch(normalized, /(\d+(?:[.,]\d+)?)\s*horas?/);
    const minutesMatch = extractNumberMatch(normalized, /(\d+)\s*min/);
    const timesPerWeekMatch = extractNumberMatch(normalized, /(\d+)\s*veces\s*(por|a la)\s*semana/);
    const daysPerWeekMatch = extractNumberMatch(normalized, /(\d+)\s*dias?\s*(por|a la)\s*semana/);
    const dailyMention = ["cada dia", "cada día", "todos los dias", "todos los días", "diario", "diaria", "diarias"]
        .some((keyword) => normalized.includes(keyword));

    let bookTitle = "";
    if (category === "reading") {
        const bookMatch = text.match(/(?:leer|terminar)\s+(.+?)(?:\s+en\s+\d+\s*d[ií]as|\s*$)/i);
        if (bookMatch) {
            bookTitle = bookMatch[1].trim();
        }
    }

    let topicTitle = "";
    if (category === "study") {
        const topicMatch = text.match(/estudiar\s+(.+?)(?:\s+\d+|$)/i);
        if (topicMatch) {
            topicTitle = topicMatch[1].trim();
        }
    }

    let habitTitle = "";
    if (category === "habit") {
        const habitMatch = text.match(/(?:hábito|habito|hacer|mantener)\s+(.+?)(?:\s+cada|\s*$)/i);
        if (habitMatch) {
            habitTitle = habitMatch[1].trim();
        }
    }

    const minutesPerSession = minutesMatch > 0 ? minutesMatch : (hoursMatch > 0 ? Math.round(hoursMatch * 60) : 0);
    let daysPerWeek = [];
    let daysPerWeekCount = 0;
    let habitFrequency = "";

    if (dailyMention) {
        daysPerWeek = [1, 2, 3, 4, 5, 6, 0];
        daysPerWeekCount = 7;
        habitFrequency = "daily";
    } else if (timesPerWeekMatch > 0) {
        daysPerWeekCount = timesPerWeekMatch;
        daysPerWeek = buildDaysFromCount(daysPerWeekCount);
        habitFrequency = "times";
    } else if (daysPerWeekMatch > 0) {
        daysPerWeekCount = daysPerWeekMatch;
        daysPerWeek = buildDaysFromCount(daysPerWeekCount);
    }

    return {
        category,
        bookTitle,
        topicTitle,
        habitTitle,
        minutesPerSession,
        daysPerWeek,
        daysPerWeekCount,
        habitFrequency,
        paceMode: daysMatch > 0 ? "deadline" : "",
        deadlineDays: daysMatch > 0 ? daysMatch : 0
    };
}

function setCurrentGoalById(goalId) {
    const targetGoal = goals.find((goal) => goal.id === goalId);
    if (!targetGoal) return;
    currentGoalId = goalId;
    currentGoal = normalizeGoal(targetGoal);
    sessions = normalizeSessions(sessionsByGoalId[goalId]);
    appState.selectedGoalId = goalId;
    saveCurrentGoalId(goalId);
    renderDashboard();
    renderScenarios();
}

function renderScenarios() {
    const scenarioCards = document.querySelectorAll(".scenario-card");
    const modifiers = [0.8, 1, 1.2];
    scenarioCards.forEach((card, index) => {
        const dateEl = card.querySelector(".scenario-date");
        const descEl = card.querySelector(".scenario-desc");
        if (!dateEl || !descEl) return;

        const modifier = modifiers[index] ?? 1;
        dateEl.textContent = calculateETA(currentGoal, sessions, modifier);
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

    addSessionForGoal(currentGoal.id, { minutes, value, isEstimated });

    saveData();
    renderDashboard();
    renderScenarios();
    closeLogModal();
}

function addSessionForGoal(goalId, { minutes, value = null, isEstimated = false } = {}) {
    if (!sessionsByGoalId[goalId]) {
        sessionsByGoalId[goalId] = [];
    }

    sessionsByGoalId[goalId].unshift({
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        minutes,
        value,
        isEstimated
    });

    if (goalId === currentGoalId) {
        sessions = normalizeSessions(sessionsByGoalId[goalId]);
    }
}

function addQuickSession(goalId, minutes) {
    if (minutes <= 0) return;
    addSessionForGoal(goalId, { minutes });
    saveData();
    renderDashboard();
    renderScenarios();
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
    placeholder: "Ej: Quiero terminar La Peste en 15 días",
    multiline: true,
    condition: (state) => !state.intentText
};

const WIZARD_STEP_MINUTES = {
    id: "minutes-per-session",
    title: "¿Cuánto tiempo por sesión?",
    inputType: "chips",
    key: "minutesPerSession",
    options: WIZARD_MINUTES_OPTIONS,
    condition: (state) => !state.hasPresetMinutes
};

const WIZARD_STEP_SUMMARY = {
    id: "summary",
    title: "Listo, este es tu plan base.",
    subtitle: "Podrás ajustarlo después si lo necesitas.",
    inputType: "summary",
    key: "summary"
};

const WIZARD_TEMPLATES = {
    reading: {
        steps: [
            WIZARD_STEP_INTENT,
            {
                id: "reading-book",
                title: "¿Qué libro quieres leer?",
                inputType: "text",
                key: "bookTitle",
                placeholder: "Ej: La Peste",
                multiline: false,
                condition: (state) => !state.bookTitle
            },
            {
                id: "reading-mode",
                title: "¿Quieres terminarlo en una fecha o ir a tu ritmo?",
                inputType: "chips",
                key: "paceMode",
                options: [
                    { label: "Terminar en X días", value: "deadline" },
                    { label: "A mi ritmo", value: "pace" }
                ],
                condition: (state) => !state.paceMode
            },
            {
                id: "reading-deadline",
                title: "¿En cuántos días?",
                inputType: "number",
                key: "deadlineDays",
                placeholder: "Ej: 30",
                condition: (state) => state.paceMode === "deadline" && state.deadlineDays <= 0
            },
            {
                id: "reading-days",
                title: "¿Qué días puedes leer?",
                inputType: "days",
                key: "daysPerWeek",
                condition: (state) => !state.hasPresetDays
            },
            WIZARD_STEP_MINUTES,
            {
                id: "reading-pages",
                title: "¿Cuántas páginas tiene?",
                subtitle: "Opcional",
                inputType: "number",
                key: "pageCount",
                placeholder: "Ej: 320",
                required: false,
                options: [{ label: "No lo sé", value: "unknown" }],
                condition: (state) => state.paceMode !== "deadline" && !state.pageCount
            },
            WIZARD_STEP_SUMMARY
        ]
    },
    study: {
        steps: [
            WIZARD_STEP_INTENT,
            {
                id: "study-topic",
                title: "¿Qué tema quieres estudiar?",
                inputType: "text",
                key: "topicTitle",
                placeholder: "Ej: Microeconomía",
                multiline: false,
                condition: (state) => !state.topicTitle
            },
            {
                id: "study-days",
                title: "¿Cuántos días a la semana puedes estudiar?",
                inputType: "chips",
                key: "daysPerWeekCount",
                options: [
                    { label: "2 días", value: 2 },
                    { label: "3 días", value: 3 },
                    { label: "4 días", value: 4 },
                    { label: "5 días", value: 5 },
                    { label: "6 días", value: 6 },
                    { label: "7 días", value: 7 }
                ],
                condition: (state) => !state.hasPresetDays
            },
            WIZARD_STEP_MINUTES,
            WIZARD_STEP_SUMMARY
        ]
    },
    habit: {
        steps: [
            WIZARD_STEP_INTENT,
            {
                id: "habit-title",
                title: "¿Qué hábito quieres mantener?",
                inputType: "text",
                key: "habitTitle",
                placeholder: "Ej: Meditar",
                multiline: false,
                condition: (state) => !state.habitTitle
            },
            {
                id: "habit-frequency",
                title: "¿Con qué frecuencia?",
                inputType: "chips",
                key: "habitFrequency",
                options: [
                    { label: "Diario", value: "daily" },
                    { label: "3 veces por semana", value: "three" },
                    { label: "Personalizado", value: "custom" }
                ],
                condition: (state) => !state.habitFrequency
            },
            {
                id: "habit-days",
                title: "¿Qué días te gustaría hacerlo?",
                inputType: "days",
                key: "daysPerWeek",
                condition: (state) => state.habitFrequency === "custom"
            },
            WIZARD_STEP_MINUTES,
            {
                id: "habit-time",
                title: "¿En qué horario te gustaría hacerlo?",
                subtitle: "Opcional",
                inputType: "text",
                key: "preferredTime",
                placeholder: "Ej: Por la mañana",
                multiline: false,
                required: false
            },
            WIZARD_STEP_SUMMARY
        ]
    },
    fitness: {
        steps: [
            WIZARD_STEP_INTENT,
            {
                id: "fitness-activity",
                title: "¿Qué actividad quieres hacer?",
                inputType: "text",
                key: "title",
                placeholder: "Ej: Correr",
                multiline: false,
                condition: (state) => !state.title
            },
            {
                id: "fitness-target",
                title: "¿Cuántos km quieres recorrer?",
                inputType: "number",
                key: "targetValue",
                placeholder: "Ej: 10"
            },
            {
                id: "fitness-days",
                title: "¿Qué días puedes entrenar?",
                inputType: "days",
                key: "daysPerWeek",
                condition: (state) => !state.hasPresetDays
            },
            WIZARD_STEP_MINUTES,
            WIZARD_STEP_SUMMARY
        ]
    },
    generic: {
        steps: [
            WIZARD_STEP_INTENT,
            {
                id: "generic-unit",
                title: "¿Cómo prefieres medir tu meta?",
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
                title: "¿Cuánto quieres completar?",
                inputType: "number",
                key: "targetValue",
                placeholder: "Ej: 20",
                condition: (state) => Boolean(state.unitSelection)
            },
            {
                id: "generic-days",
                title: "¿Qué días puedes avanzar?",
                subtitle: "Selecciona los días que planeas dedicarle.",
                inputType: "days",
                key: "daysPerWeek",
                condition: (state) => !state.hasPresetDays
            },
            WIZARD_STEP_MINUTES,
            WIZARD_STEP_SUMMARY
        ]
    }
};

function buildWizardStateFromGoal(goal) {
    const intentText = goal.title || "";
    const category = goal.type || classifyIntent(intentText);
    const isReading = category === "reading";
    const unitSelection = goal.mode === "time" ? "horas" : goal.unitName;
    const pageCount = isReading && goal.mode !== "time" && goal.unitName === "páginas" ? goal.targetValue : 0;
    const habitFrequency = goal.plan?.daysPerWeek?.length === 7 ? "daily" : "";
    const habitTitle = category === "habit" ? (goal.title || "").replace(/^Hábito:\s*/i, "") : "";
    const topicTitle = category === "study" ? (goal.title || "").replace(/^Estudiar:\s*/i, "") : "";

    return {
        ...DEFAULT_WIZARD_STATE,
        intentText,
        title: goal.title || "",
        category,
        templateKey: category,
        paceMode: goal.paceMode || DEFAULT_WIZARD_STATE.paceMode,
        unitSelection: unitSelection || DEFAULT_WIZARD_STATE.unitSelection,
        targetValue: Number(goal.targetValue) || DEFAULT_WIZARD_STATE.targetValue,
        pageCount: Number(pageCount) || 0,
        habitFrequency,
        habitTitle,
        topicTitle,
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
    return "¿Cuánto quieres completar?";
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
            if (typeof value === "number") {
                return value > 0;
            }
            return value !== undefined && value !== null && String(value).length > 0;
        case "days":
            return Array.isArray(value) && value.length > 0;
        case "summary":
            return true;
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

    if (step.inputType === "summary") {
        return renderPlanSummary();
    }

    return "";
}

function renderPlanSummary() {
    const plan = buildSmartPlan();
    const daysCount = plan.plan.daysPerWeek.length;
    const frequencyLabel = daysCount === 7 ? "Todos los días" : `${daysCount} días por semana`;
    const timeLabel = `${plan.plan.minutesPerSession} min por sesión`;
    const totalLabel = plan.metric.unitName === "horas"
        ? `${plan.metric.targetValue} horas en total`
        : `${plan.metric.targetValue} ${plan.metric.unitName} en total`;
    const modeLabel = plan.goal.mode === "deadline" && wizardState.deadlineDays > 0
        ? `Terminar en ${wizardState.deadlineDays} días`
        : "A tu ritmo";

    return `
        <div class="wizard-summary">
            <div class="summary-item">
                <span class="summary-label">Meta</span>
                <span class="summary-value">${plan.goal.title}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Ritmo</span>
                <span class="summary-value">${modeLabel}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Disponibilidad</span>
                <span class="summary-value">${frequencyLabel}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Tiempo</span>
                <span class="summary-value">${timeLabel}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Meta total</span>
                <span class="summary-value">${totalLabel}</span>
            </div>
        </div>
    `;
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
                const parsed = parseIntent(wizardState.intentText);
                const nextCategory = parsed.category;
                if (nextCategory !== wizardState.category) {
                    wizardState.category = nextCategory;
                    wizardState.templateKey = nextCategory;
                    updateWizardFlow();
                    return;
                }
                mergeIntentData(parsed);
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
            if (step.id === "reading-deadline" && wizardState[step.key] > 0) {
                wizardState.hasPresetDeadline = true;
                wizardState.paceMode = "deadline";
            }
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
                if (step.key === "daysPerWeekCount") {
                    const count = Number(value);
                    wizardState.daysPerWeekCount = Number.isFinite(count) ? count : 0;
                    wizardState.daysPerWeek = buildDaysFromCount(wizardState.daysPerWeekCount);
                    wizardState.hasPresetDays = true;
                }
                if (step.key === "habitFrequency") {
                    if (value === "daily") {
                        wizardState.daysPerWeek = [1, 2, 3, 4, 5, 6, 0];
                        wizardState.hasPresetDays = true;
                    } else if (value === "three") {
                        wizardState.daysPerWeek = [1, 3, 5];
                        wizardState.hasPresetDays = true;
                    } else {
                        wizardState.hasPresetDays = false;
                    }
                }
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
                wizardState.hasPresetDays = wizardState.daysPerWeek.length > 0;
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

function mergeIntentData(parsed) {
    if (!wizardState.paceMode && parsed.paceMode) {
        wizardState.paceMode = parsed.paceMode;
    }
    if (!wizardState.deadlineDays && parsed.deadlineDays) {
        wizardState.deadlineDays = parsed.deadlineDays;
        wizardState.hasPresetDeadline = true;
    }
    if (!wizardState.bookTitle && parsed.bookTitle) {
        wizardState.bookTitle = parsed.bookTitle;
        wizardState.hasPresetBook = true;
    }
    if (!wizardState.topicTitle && parsed.topicTitle) {
        wizardState.topicTitle = parsed.topicTitle;
    }
    if (!wizardState.habitTitle && parsed.habitTitle) {
        wizardState.habitTitle = parsed.habitTitle;
    }
    if (!wizardState.hasPresetMinutes && parsed.minutesPerSession) {
        wizardState.minutesPerSession = parsed.minutesPerSession;
        wizardState.hasPresetMinutes = true;
    }
    if (!wizardState.hasPresetDays && parsed.daysPerWeek.length) {
        wizardState.daysPerWeek = parsed.daysPerWeek;
        wizardState.daysPerWeekCount = parsed.daysPerWeekCount;
        wizardState.hasPresetDays = true;
        wizardState.habitFrequency = parsed.habitFrequency || wizardState.habitFrequency;
    }
}

function buildTitleFromWizardState() {
    const summary = summarizeIntent(wizardState.intentText, 6);
    if (wizardState.category === "reading") {
        return wizardState.bookTitle ? `Leer: ${wizardState.bookTitle}` : `Leer: ${summary || "Nuevo libro"}`;
    }
    if (wizardState.category === "study") {
        const topic = wizardState.topicTitle || summary;
        return topic ? `Estudiar: ${topic}` : "Estudiar";
    }
    if (wizardState.category === "habit") {
        const habit = wizardState.habitTitle || summary;
        return habit ? `Hábito: ${habit}` : "Nuevo hábito";
    }
    if (wizardState.category === "fitness") {
        const activity = wizardState.title || summary;
        return activity ? `Entrenar: ${activity}` : "Entrenar";
    }
    return summary ? `Meta: ${summary}` : DEFAULT_GOAL.title;
}

function buildSmartPlan(state = wizardState) {
    const daysPerWeek = state.daysPerWeek.length ? state.daysPerWeek : DEFAULT_WIZARD_STATE.daysPerWeek;
    const minutesPerSession = state.minutesPerSession || DEFAULT_WIZARD_STATE.minutesPerSession;
    const timelineMode = state.paceMode || "pace";
    const goalTitle = buildTitleFromWizardState();

    let metricMode = "units";
    let unitName = "sesiones";
    let targetValue = state.targetValue || 12;

    if (state.category === "reading") {
        if (state.pageCount > 0) {
            metricMode = "units";
            unitName = "páginas";
            targetValue = state.pageCount;
        } else {
            metricMode = "time";
            unitName = "horas";
            if (timelineMode === "deadline" && state.deadlineDays > 0) {
                const weeks = Math.max(1, state.deadlineDays / 7);
                targetValue = Math.max(1, Math.round((weeks * daysPerWeek.length * minutesPerSession) / 60));
            } else {
                targetValue = Math.max(1, Math.round((daysPerWeek.length * minutesPerSession) / 60 * 4));
            }
        }
    } else if (state.category === "study" || state.category === "habit") {
        metricMode = "time";
        unitName = "horas";
        targetValue = Math.max(1, Math.round((daysPerWeek.length * minutesPerSession) / 60 * 4));
    } else if (state.category === "fitness") {
        metricMode = "units";
        unitName = "km";
        targetValue = state.targetValue || 10;
    } else {
        unitName = state.unitSelection || "sesiones";
        metricMode = unitName === "horas" ? "time" : "units";
        targetValue = state.targetValue || 12;
    }

    const tempGoal = normalizeGoal({
        title: goalTitle,
        mode: metricMode,
        unitName,
        targetValue,
        plan: {
            daysPerWeek,
            minutesPerSession
        }
    });

    const etaDays = calculateEtaDays(tempGoal, 1, null, []);
    return {
        goal: {
            title: goalTitle,
            type: state.category,
            mode: timelineMode
        },
        metric: {
            mode: metricMode,
            unitName,
            targetValue
        },
        plan: {
            daysPerWeek,
            minutesPerSession
        },
        estimatedETA: etaDays ? formatFutureDate(etaDays) : null,
        deadline: timelineMode === "deadline" && state.deadlineDays > 0
            ? formatFutureDate(state.deadlineDays)
            : null,
        progress: 0
    };
}

function openSmartCreateWizard() {
    const intent = dom.smartIntentInput?.value.trim() || "";
    if (!intent) {
        alert("Cuéntanos qué quieres lograr para continuar.");
        return;
    }
    smartIntentText = intent;
    if (dom.smartCreateMessage) {
        dom.smartCreateMessage.classList.remove("is-visible");
    }
    dom.smartIntentInput.value = "";
    openWizard({ mode: "create", intentText: smartIntentText });
}

function openWizard({ mode = "edit", intentText = "" } = {}) {
    dom.modalProject.classList.remove("hidden");
    wizardMode = mode;
    updateSmartCreateMessage(false);
    if (mode === "create") {
        const parsed = parseIntent(intentText);
        wizardState = {
            ...DEFAULT_WIZARD_STATE,
            intentText,
            smartIntentText: intentText,
            category: parsed.category,
            templateKey: parsed.category,
            bookTitle: parsed.bookTitle || "",
            topicTitle: parsed.topicTitle || "",
            habitTitle: parsed.habitTitle || "",
            paceMode: parsed.paceMode || "",
            deadlineDays: parsed.deadlineDays || 0,
            daysPerWeek: parsed.daysPerWeek.length ? parsed.daysPerWeek : [...DEFAULT_WIZARD_STATE.daysPerWeek],
            daysPerWeekCount: parsed.daysPerWeekCount || 0,
            minutesPerSession: parsed.minutesPerSession || DEFAULT_WIZARD_STATE.minutesPerSession,
            habitFrequency: parsed.habitFrequency || "",
            hasPresetDays: parsed.daysPerWeek.length > 0,
            hasPresetMinutes: parsed.minutesPerSession > 0,
            hasPresetDeadline: parsed.deadlineDays > 0,
            hasPresetBook: parsed.bookTitle.length > 0
        };
    } else {
        wizardState = buildWizardStateFromGoal(currentGoal);
        if (isDefaultGoal(currentGoal)) {
            wizardState.intentText = "";
            wizardState.title = "";
        }
    }
    wizardStepIndex = 0;
    updateWizardFlow();
}

function closeWizard() {
    dom.modalProject.classList.add("hidden");
}

function saveWizardGoal() {
    const smartPlan = buildSmartPlan();
    const finalRate = smartPlan.metric.mode === "time"
        ? currentGoal.rate.valuePerHour
        : wizardState.rateValuePerHour || DEFAULT_WIZARD_STATE.rateValuePerHour;

    const goalPayload = normalizeGoal({
        id: wizardMode === "create" ? `goal_${Date.now()}` : currentGoal.id,
        title: smartPlan.goal.title,
        type: smartPlan.goal.type,
        paceMode: smartPlan.goal.mode,
        mode: smartPlan.metric.mode,
        unitName: smartPlan.metric.unitName,
        targetValue: smartPlan.metric.targetValue,
        deadlineDate: smartPlan.deadline,
        plan: smartPlan.plan,
        rate: {
            valuePerHour: finalRate
        }
    });

    if (wizardMode === "create") {
        goals.push(goalPayload);
        sessionsByGoalId[goalPayload.id] = [];
        currentGoal = goalPayload;
        currentGoalId = goalPayload.id;
        sessions = [];
    } else {
        currentGoal = normalizeGoal({ ...currentGoal, ...goalPayload });
    }

    appState.selectedGoalId = currentGoalId;
    saveData();
    renderDashboard();
    renderScenarios();
    updateSmartCreateMessage(wizardMode === "create");
    closeWizard();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateSmartCreateMessage(showMessage) {
    if (!dom.smartCreateMessage) return;
    if (!showMessage) {
        dom.smartCreateMessage.classList.remove("is-visible");
        return;
    }
    dom.smartCreateMessage.textContent = "Listo, este es tu plan base. Podrás ajustarlo después si lo necesitas.";
    dom.smartCreateMessage.classList.add("is-visible");
}

// --- 8. INICIALIZACIÓN ---

function initApp() {
    migrateStorageIfNeeded();
    loadData();
    appState.today = today();
    appState.view = "dashboard";
    appState.dashboardMode = "vision";

    renderDashboard();
    renderScenarios();
    initDashboardNav();

    document.addEventListener("sessions:updated", () => {
        loadData();
        renderScenarios();
    });

    dom.btnLogSession.addEventListener("click", openLogModal);
    dom.btnCloseSessionModal.addEventListener("click", closeLogModal);
    dom.btnCancelSession.addEventListener("click", closeLogModal);
    dom.btnSaveSession.addEventListener("click", saveSession);

    dom.btnOpenWizard.addEventListener("click", () => openWizard({ mode: "edit" }));
    if (dom.btnSmartContinue) {
        dom.btnSmartContinue.addEventListener("click", openSmartCreateWizard);
    }
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
