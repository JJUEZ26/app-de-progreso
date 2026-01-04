import { dom } from "./domRefs.js";
import { setDashboardMode } from "./dashboard.js";

export function bindDashboardNav() {
    if (dom.btnDashboardVision) {
        dom.btnDashboardVision.addEventListener("click", () => setDashboardMode("vision"));
    }
    if (dom.btnDashboardToday) {
        dom.btnDashboardToday.addEventListener("click", () => setDashboardMode("today"));
    }
}
