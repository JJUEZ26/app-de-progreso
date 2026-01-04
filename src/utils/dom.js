export const byId = (id) => document.getElementById(id);

export const clearChildren = (element) => {
    while (element?.firstChild) {
        element.removeChild(element.firstChild);
    }
};
