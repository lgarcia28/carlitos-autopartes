// =============================================================================
// erp-logic.mjs — Lógica pura del Mini-ERP (sin DOM ni Firebase).
// Se usa desde control.js en el navegador y desde tests/ con `node --test`.
// =============================================================================

/** Redondea a 2 decimales evitando errores de coma flotante (1.005 -> 1.01). */
export function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/** Escapa texto para insertarlo de forma segura dentro de HTML (texto y atributos). */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Normaliza un nombre para agrupar contactos: sin mayúsculas, tildes ni espacios duplicados. */
export function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------------- FECHAS (hora local) ---------------------------

/** Fecha local "YYYY-MM-DD" (no UTC: evita que después de las 21hs en Argentina sea "mañana"). */
export function localDateISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Interpreta "YYYY-MM-DD" (o ISO con hora) como medianoche LOCAL. Devuelve null si es inválida. */
export function parseLocalDate(str) {
  if (!str) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(str));
  if (!m) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [, y, mo, da] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(da));
  // Rechaza fechas imposibles como 2026-02-31 (JS las "corrige" sola).
  if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(da)) return null;
  return date;
}

/**
 * Rango de fechas [start, end] (ambos inclusivos, hora local) según el preset del reporte.
 * `null` en un extremo significa "sin límite".
 */
export function periodRange(preset, now = new Date(), customStart = "", customEnd = "") {
  const y = now.getFullYear();
  const mo = now.getMonth();
  switch (preset) {
    case "CURRENT_MONTH":
      return { start: new Date(y, mo, 1), end: new Date(y, mo + 1, 0, 23, 59, 59, 999) };
    case "PREVIOUS_MONTH":
      return { start: new Date(y, mo - 1, 1), end: new Date(y, mo, 0, 23, 59, 59, 999) };
    case "CURRENT_YEAR":
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59, 999) };
    case "CUSTOM": {
      const s = parseLocalDate(customStart);
      const e = parseLocalDate(customEnd);
      return {
        start: s,
        end: e ? new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999) : null
      };
    }
    default:
      return { start: null, end: null };
  }
}

export function inRange(dateStr, range) {
  if (!range || (!range.start && !range.end)) return true;
  const d = parseLocalDate(dateStr);
  if (!d) return false;
  if (range.start && d < range.start) return false;
  if (range.end && d > range.end) return false;
  return true;
}

// ------------------------------ COMPROBANTES --------------------------------

/** Tipos que discriminan IVA. Remito/Presupuesto y Factura C no generan débito fiscal. */
export function typeDiscriminatesVat(invoiceType) {
  return invoiceType === "FACTURA_A" || invoiceType === "FACTURA_B";
}

/**
 * Calcula neto, IVA y total de un comprobante de venta.
 * items: [{ qty, price, vatRate }]. Los precios se consideran NETOS.
 */
export function computeSaleTotals(items, { invoiceType = "FACTURA_B", percIIBB = 0, percIVA = 0 } = {}) {
  const discriminates = typeDiscriminatesVat(invoiceType);
  let netoTotal = 0, neto21 = 0, neto105 = 0, neto0 = 0;

  for (const it of items || []) {
    const qty = Math.max(0, Number(it.qty) || 0);
    const price = Math.max(0, Number(it.price) || 0);
    const line = round2(qty * price);
    netoTotal += line;
    const rate = Number(it.vatRate);
    if (!discriminates) neto0 += line;
    else if (rate === 21) neto21 += line;
    else if (rate === 10.5) neto105 += line;
    else neto0 += line;
  }

  netoTotal = round2(netoTotal);
  neto21 = round2(neto21);
  neto105 = round2(neto105);
  neto0 = round2(neto0);
  const iva21 = round2(neto21 * 0.21);
  const iva105 = round2(neto105 * 0.105);
  const pIIBB = round2(Math.max(0, Number(percIIBB) || 0));
  const pIVA = round2(Math.max(0, Number(percIVA) || 0));
  const percTotal = round2(pIIBB + pIVA);
  const ivaTotal = round2(iva21 + iva105);
  const total = round2(netoTotal + ivaTotal + percTotal);

  return { netoTotal, neto21, neto105, neto0, iva21, iva105, ivaTotal, percIIBB: pIIBB, percIVA: pIVA, percTotal, total };
}

/** Total de una compra a partir de sus componentes ingresados a mano. */
export function computePurchaseTotals({ neto21 = 0, iva21 = 0, neto105 = 0, iva105 = 0, perc = 0, exempt = 0 } = {}) {
  const n = (v) => round2(Math.max(0, Number(v) || 0));
  const t = { neto21: n(neto21), iva21: n(iva21), neto105: n(neto105), iva105: n(iva105), perc: n(perc), exempt: n(exempt) };
  t.netoTotal = round2(t.neto21 + t.neto105);
  t.ivaTotal = round2(t.iva21 + t.iva105);
  t.total = round2(t.netoTotal + t.ivaTotal + t.perc + t.exempt);
  return t;
}

/** Detecta IVA inconsistente con el neto (tolerancia de $1 por redondeos del proveedor). */
export function purchaseVatMismatch({ neto21 = 0, iva21 = 0, neto105 = 0, iva105 = 0 } = {}, tolerance = 1) {
  const problems = [];
  if (Math.abs(round2(neto21 * 0.21) - Number(iva21 || 0)) > tolerance) problems.push("IVA 21%");
  if (Math.abs(round2(neto105 * 0.105) - Number(iva105 || 0)) > tolerance) problems.push("IVA 10.5%");
  return problems;
}

/** Próximo número "0001-00000024" para un tipo de comprobante de venta. */
export function nextInvoiceNumber(invoices, invoiceType, pointOfSale = "0001") {
  let max = 0;
  for (const inv of invoices || []) {
    if (inv.type !== "sale" || inv.invoiceType !== invoiceType) continue;
    const m = /^(\d{1,5})-(\d{1,8})$/.exec(String(inv.number || "").trim());
    if (m && m[1].padStart(4, "0") === pointOfSale) max = Math.max(max, Number(m[2]));
  }
  return `${pointOfSale}-${String(max + 1).padStart(8, "0")}`;
}

export function isDuplicateInvoiceNumber(invoices, { type, invoiceType, number, party }) {
  const key = normalizeName(party);
  return (invoices || []).some((inv) => {
    if (inv.type !== type || inv.invoiceType !== invoiceType) return false;
    if (String(inv.number).trim() !== String(number).trim()) return false;
    if (type === "purchase") return normalizeName(inv.supplierName) === key;
    return true; // la numeración de ventas es única por tipo
  });
}

// ------------------------------ STOCK ---------------------------------------

/** Devuelve los ítems que superan el stock disponible. Agrupa renglones del mismo producto. */
export function findStockShortages(items, products) {
  const byId = new Map((products || []).map((p) => [p.id, p]));
  const requested = new Map();
  for (const it of items || []) {
    if (!it.productId) continue;
    requested.set(it.productId, (requested.get(it.productId) || 0) + (Number(it.qty) || 0));
  }
  const shortages = [];
  for (const [productId, qty] of requested) {
    const p = byId.get(productId);
    if (!p) { shortages.push({ productId, name: "(producto inexistente)", requested: qty, available: 0 }); continue; }
    const available = Number(p.stock) || 0;
    if (qty > available) shortages.push({ productId, name: p.name, requested: qty, available });
  }
  return shortages;
}

// ------------------------- CUENTAS CORRIENTES / PAGOS ------------------------

/** Reparte `amount` entre comprobantes pendientes, del más antiguo al más nuevo. */
export function distributePayment(amount, pendingInvoices) {
  let remaining = round2(amount);
  const sorted = [...(pendingInvoices || [])].sort(
    (a, b) => (parseLocalDate(a.date)?.getTime() ?? 0) - (parseLocalDate(b.date)?.getTime() ?? 0)
  );
  const imputations = [];
  for (const inv of sorted) {
    if (remaining <= 0) break;
    const pending = round2(inv.pendingBalance);
    if (pending <= 0) continue;
    const applied = round2(Math.min(remaining, pending));
    imputations.push({ invoiceId: inv.id, amount: applied });
    remaining = round2(remaining - applied);
  }
  return { imputations, remaining };
}

/** Aplica un pago a un saldo. Nunca deja saldo negativo. */
export function applyPayment(pendingBalance, amount) {
  const pending = round2(pendingBalance);
  const applied = round2(Math.min(Math.max(0, amount), pending));
  const newBalance = round2(pending - applied);
  return { newBalance, applied, status: newBalance <= 0.009 ? "paid" : "partial" };
}

/**
 * Valida una imputación antes de guardar. Devuelve [] si es válida o la lista de errores.
 * `checkAmount`: importe del cheque usado como medio de pago (si corresponde).
 */
export function validateImputation({ amount, imputations, invoicesById, checkAmount = null }) {
  const errors = [];
  const total = round2(amount);
  if (!(total > 0)) errors.push("El monto debe ser mayor a 0.");
  if (!imputations || imputations.length === 0) errors.push("Seleccioná al menos un comprobante.");
  let sum = 0;
  for (const imp of imputations || []) {
    const inv = invoicesById?.[imp.invoiceId];
    if (!inv) { errors.push(`Comprobante inexistente (${imp.invoiceId}).`); continue; }
    if (!(imp.amount > 0)) errors.push(`Importe inválido para ${inv.number}.`);
    if (round2(imp.amount) > round2(inv.pendingBalance) + 0.009) {
      errors.push(`El importe imputado a ${inv.number} supera su saldo pendiente.`);
    }
    sum = round2(sum + imp.amount);
  }
  if (Math.abs(sum - total) > 0.009) {
    errors.push(`El monto (${total}) no coincide con la suma de lo imputado (${sum}).`);
  }
  if (checkAmount != null && Math.abs(round2(checkAmount) - total) > 0.009) {
    errors.push(`El importe del cheque (${round2(checkAmount)}) no coincide con el monto del pago (${total}).`);
  }
  return errors;
}

/** Agrupa saldos por contacto (clave normalizada) para la vista de cuentas corrientes. */
export function groupAccountBalances(invoices, kind) {
  const isClients = kind === "clients";
  const wantType = isClients ? "sale" : "purchase";
  const map = new Map();
  for (const inv of invoices || []) {
    if (inv.type !== wantType) continue;
    const display = (isClients ? inv.clientName : inv.supplierName) || (isClients ? "Sin Nombre" : "Sin Proveedor");
    const key = normalizeName(display);
    if (!map.has(key)) {
      map.set(key, {
        name: display,
        cuit: (isClients ? inv.clientCuit : inv.supplierCuit) || "-",
        address: (isClients ? inv.clientAddress : inv.category) || "-",
        totalAmount: 0,
        pendingAmount: 0,
        invoicesCount: 0
      });
    }
    const g = map.get(key);
    g.totalAmount = round2(g.totalAmount + (Number(inv.total) || 0));
    g.pendingAmount = round2(g.pendingAmount + (Number(inv.pendingBalance) || 0));
    g.invoicesCount++;
  }
  return [...map.values()].sort((a, b) => b.pendingAmount - a.pendingAmount);
}

// ------------------------------ REPORTE FISCAL -------------------------------

const CASH_METHODS_SALE = new Set(["CONTADO_EFECTIVO", "CONTADO_TRANSFERENCIA"]);
const CASH_METHODS_PAYMENT = new Set(["EFECTIVO", "TRANSFERENCIA"]);

/**
 * Reporte financiero/fiscal de un período.
 * - IVA débito/crédito y percepciones: según fecha del comprobante.
 * - Caja: movimientos reales de fondos en el período (contado + cobranzas/pagos +
 *   cheques depositados). Los cheques en cartera o endosados NO son caja.
 */
export function computeFinancialReport({ invoices = [], payments = [], checks = [] }, range) {
  const sales = invoices.filter((i) => i.type === "sale" && inRange(i.date || i.created_at, range));
  const purchases = invoices.filter((i) => i.type === "purchase" && inRange(i.date || i.created_at, range));

  const sum = (arr, f) => round2(arr.reduce((acc, x) => acc + (Number(f(x)) || 0), 0));

  const s = {
    count: sales.length,
    total: sum(sales, (x) => x.total),
    neto21: sum(sales, (x) => x.neto21), iva21: sum(sales, (x) => x.iva21),
    neto105: sum(sales, (x) => x.neto105), iva105: sum(sales, (x) => x.iva105),
    perc: sum(sales, (x) => x.percTotal)
  };
  s.ivaTotal = round2(s.iva21 + s.iva105);

  const p = {
    count: purchases.length,
    total: sum(purchases, (x) => x.total),
    neto21: sum(purchases, (x) => x.neto21), iva21: sum(purchases, (x) => x.iva21),
    neto105: sum(purchases, (x) => x.neto105), iva105: sum(purchases, (x) => x.iva105),
    perc: sum(purchases, (x) => x.percTotal)
  };
  p.ivaTotal = round2(p.iva21 + p.iva105);

  const taxBalance = round2(s.ivaTotal - p.ivaTotal); // >0 a pagar, <0 a favor

  let cashIn = 0, cashOut = 0;
  for (const inv of invoices) {
    if (!inRange(inv.date || inv.created_at, range)) continue;
    if (inv.type === "sale" && CASH_METHODS_SALE.has(inv.paymentTerm)) cashIn += Number(inv.total) || 0;
    if (inv.type === "purchase" && CASH_METHODS_SALE.has(inv.paymentMethod)) cashOut += Number(inv.total) || 0;
  }
  for (const pay of payments) {
    if (!inRange(pay.date || pay.created_at, range)) continue;
    if (!CASH_METHODS_PAYMENT.has(pay.method)) continue;
    if (pay.direction === "CLIENT_COLLECTION") cashIn += Number(pay.amount) || 0;
    if (pay.direction === "SUPPLIER_PAYMENT") cashOut += Number(pay.amount) || 0;
  }
  for (const c of checks) {
    if (c.status === "DEPOSITED" && c.depositedDate && inRange(c.depositedDate, range)) {
      cashIn += Number(c.amount) || 0;
    }
  }
  cashIn = round2(cashIn);
  cashOut = round2(cashOut);

  return { sales: s, purchases: p, taxBalance, cashIn, cashOut, cashNet: round2(cashIn - cashOut) };
}
