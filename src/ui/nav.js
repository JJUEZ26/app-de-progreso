import { appState, DASHBOARD_MODE } from "../core/state.js";
import { renderDashboard } from "./dashboard.js";

export function initDashboardNav() {
    const btnVision = document.getElementById("btn-dashboard-vision");
    const btnToday = document.getElementById("btn-dashboard-today");

    if (btnVision) {
        btnVision.addEventListener("click", () => {
            appState.dashboardMode = DASHBOARD_MODE.VISION;
            renderDashboard();
        });
    }

    if (btnToday) {
        btnToday.addEventListener("click", () => {
            appState.dashboardMode = DASHBOARD_MODE.TODAY;
            renderDashboard();
        });
    }
}
