/**
 * TODO: Integrar proveedor de IA.
 * El objetivo es devolver un JSON estructurado con intención, plan sugerido y ajustes de ritmo.
 *
 * Ejemplo esperado:
 * {
 *   title: "Leer: La Peste",
 *   type: "reading",
 *   paceMode: "deadline",
 *   deadlineDays: 21,
 *   minutesPerSession: 30,
 *   daysPerWeek: [1,2,3,4,5],
 *   targetValue: 320,
 *   unitName: "páginas"
 * }
 */
export async function suggestPlanFromIntent(intentText) {
    if (!intentText) return null;
    return null;
}
