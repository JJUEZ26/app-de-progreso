export const KEYS = {
    GOALS: "writerDashboard_goals",
    CURRENT_GOAL_ID: "writerDashboard_current_goal_id",
    SESSIONS: "writerDashboard_sessions_by_goal"
};

export const LEGACY_KEYS = {
    GOAL: "writerDashboard_goal",
    SESSIONS: "writerDashboard_sessions"
};

export const LEGACY_PROJECT_KEYS = {
    GOAL: "writerDashboard_project",
    SESSIONS: "writerDashboard_sessions_proj_001"
};

export const DEFAULT_GOAL = {
    id: "goal_default",
    title: "Mi Nueva Meta",
    name: "Mi Nueva Meta",
    type: "generic",
    paceMode: "pace",
    targetValue: 50000,
    target: 50000,
    mode: "units",
    unitName: "sesiones",
    startDate: new Date().toISOString().split("T")[0],
    plan: {
        daysPerWeek: [1, 2, 3, 4, 5],
        minutesPerSession: 60
    },
    scheduleDays: [1, 2, 3, 4, 5],
    minutesPerSession: 60,
    rate: {
        valuePerHour: 500
    }
};

export const DEFAULT_WIZARD_STATE = {
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

export let goals = [];
export let currentGoalId = DEFAULT_GOAL.id;
export let currentGoal = DEFAULT_GOAL;
export let sessions = [];
export let sessionsByGoalId = {};

export const appState = {
    view: "dashboard",
    selectedGoalId: null,
    dashboardMode: "vision"
};

export let smartIntentText = "";
export let wizardMode = "edit";
export let wizardState = { ...DEFAULT_WIZARD_STATE };
export let wizardStepIndex = 0;

export const setGoals = (nextGoals) => {
    goals = nextGoals;
};

export const setCurrentGoalId = (goalId) => {
    currentGoalId = goalId;
};

export const setCurrentGoal = (goal) => {
    currentGoal = goal;
};

export const setSessions = (nextSessions) => {
    sessions = nextSessions;
};

export const setSessionsByGoalId = (nextSessionsMap) => {
    sessionsByGoalId = nextSessionsMap;
};

export const setSmartIntentText = (text) => {
    smartIntentText = text;
};

export const setWizardMode = (mode) => {
    wizardMode = mode;
};

export const setWizardState = (nextState) => {
    wizardState = nextState;
};

export const resetWizardState = (overrides = {}) => {
    wizardState = { ...DEFAULT_WIZARD_STATE, ...overrides };
};

export const setWizardStepIndex = (index) => {
    wizardStepIndex = index;
};
