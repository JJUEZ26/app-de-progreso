import { byId } from "../utils/dom.js";

export const dom = {
    projectName: byId("project-name"),
    wordsProgress: byId("words-progress"),
    percentProgress: byId("percent-progress"),
    progressBar: byId("progress-bar-fill"),
    etaDate: byId("eta-date"),

    settingGoal: byId("setting-goal"),
    settingDays: byId("setting-days"),
    settingHours: byId("setting-hours"),
    settingWph: byId("setting-wph"),

    weeklySessions: byId("weekly-sessions"),
    weeklyTime: byId("weekly-time"),
    weeklyUnits: byId("weekly-units"),
    weeklyUnitsLabel: byId("weekly-units-label"),

    smartIntentInput: byId("smart-intent-input"),
    btnSmartContinue: byId("btn-smart-continue"),
    smartCreateMessage: byId("smart-create-message"),

    btnDashboardVision: byId("btn-dashboard-vision"),
    btnDashboardToday: byId("btn-dashboard-today"),
    dashboardVisionPanel: byId("dashboard-vision"),
    dashboardTodayPanel: byId("dashboard-today"),

    btnLogSession: byId("btn-log-session"),
    btnExplore: byId("btn-explore-scenarios"),
    btnOpenWizard: byId("btn-open-project-wizard"),

    modalSession: byId("modal-log-session"),
    btnCloseSessionModal: byId("btn-close-modal"),
    btnCancelSession: byId("btn-cancel-session"),
    btnSaveSession: byId("btn-save-session"),
    inputSessionHours: byId("input-hours"),
    inputSessionWords: byId("input-words"),

    modalProject: byId("modal-project"),
    btnCloseProjectModal: byId("btn-close-project-modal"),
    btnCancelProject: byId("btn-cancel-project"),
    btnWizardBack: byId("btn-wizard-back"),
    btnWizardNext: byId("btn-wizard-next"),
    btnWizardFinish: byId("btn-wizard-finish"),
    wizardStepLabel: byId("wizard-step-label"),
    wizardDots: byId("wizard-dots"),
    wizardSteps: byId("wizard-steps")
};
