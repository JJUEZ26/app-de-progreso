import { migrateStorageIfNeeded, loadData } from "./core/storage.js";
import { dom } from "./ui/domRefs.js";
import { renderDashboard, renderScenarios } from "./ui/dashboard.js";
import { bindSessionModalEvents, handleSessionModalBackdrop } from "./ui/modals.js";
import { bindDashboardNav } from "./ui/nav.js";
import { bindWizardEvents, handleWizardModalBackdrop, maybeOpenDefaultWizard } from "./ui/wizard.js";

function initApp() {
    migrateStorageIfNeeded();
    loadData();
    renderDashboard();
    renderScenarios();

    bindDashboardNav();
    bindSessionModalEvents();
    bindWizardEvents();

    dom.btnExplore.addEventListener("click", () => {
        const section = document.getElementById("scenarios-section");
        if (section) section.scrollIntoView({ behavior: "smooth" });
    });

    maybeOpenDefaultWizard();

    window.addEventListener("click", (event) => {
        handleSessionModalBackdrop(event);
        handleWizardModalBackdrop(event);
    });
}

document.addEventListener("DOMContentLoaded", initApp);
