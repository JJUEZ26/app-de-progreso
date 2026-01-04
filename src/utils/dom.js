export function clearEl(el) {
    if (el) {
        el.innerHTML = "";
    }
}

export function createEl(tag, { className, text, attrs } = {}) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    if (attrs) {
        Object.entries(attrs).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                el.setAttribute(key, value);
            }
        });
    }
    return el;
}
