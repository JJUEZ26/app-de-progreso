export const VIEW = {
    DASHBOARD: "dashboard",
    DIARY: "diary",
    SETTINGS: "settings"
};

export const DASHBOARD_MODE = {
    VISION: "vision",
    TODAY: "today"
};

export const appState = {
    view: VIEW.DASHBOARD,
    dashboardMode: DASHBOARD_MODE.VISION,
    selectedGoalId: null,
    today: ""
};
