import test from "node:test";
import assert from "node:assert/strict";
import {
  round2,
  escapeHtml,
  normalizeName,
  localDateISO,
  parseLocalDate,
  periodRange,
  inRange,
  typeDiscriminatesVat,
  computeSaleTotals,
  computePurchaseTotals,
  purchaseVatMismatch,
  nextInvoiceNumber,
  isDuplicateInvoiceNumber,
  findStockShortages,
  distributePayment,
  applyPayment,
  validateImputation,
  groupAccountBalances,
  computeFinancialReport,
  filterProducts
} from "../erp-logic.mjs";

test("round2: rounds to 2 decimal places and handles float quirks", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2("10.556"), 10.56);
  assert.equal(round2(null), 0);
  assert.equal(round2(undefined), 0);
  assert.equal(round2(NaN), 0);
  assert.equal(round2(-5.555), -5.55);
});

test("escapeHtml: safely sanitizes XSS characters", () => {
  assert.equal(escapeHtml('<script>alert("xss")</script>'), "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  assert.equal(escapeHtml("Carlitos & Hijos 'S.R.L.'"), "Carlitos &amp; Hijos &#39;S.R.L.&#39;");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(1234), "1234");
});

test("normalizeName: cleans accents, case, and duplicate spaces", () => {
  assert.equal(normalizeName("  JOSÉ   MARÍA   PÉREZ  "), "jose maria perez");
  assert.equal(normalizeName("Taller El Éxito"), "taller el exito");
  assert.equal(normalizeName(""), "");
  assert.equal(normalizeName(null), "");
});

test("localDateISO & parseLocalDate: handles local dates without UTC day-shifts", () => {
  const d = new Date(2026, 4, 15); // May 15, 2026
  assert.equal(localDateISO(d), "2026-05-15");

  const parsed = parseLocalDate("2026-05-15");
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 4);
  assert.equal(parsed.getDate(), 15);

  // Invalid dates
  assert.equal(parseLocalDate("2026-02-31"), null);
  assert.equal(parseLocalDate("invalid-date"), null);
  assert.equal(parseLocalDate(""), null);
});

test("periodRange & inRange: filters date boundaries correctly", () => {
  const now = new Date(2026, 9, 3); // Oct 3, 2026
  const curMonth = periodRange("CURRENT_MONTH", now);
  assert.equal(curMonth.start.getFullYear(), 2026);
  assert.equal(curMonth.start.getMonth(), 9);
  assert.equal(curMonth.start.getDate(), 1);
  assert.equal(curMonth.end.getDate(), 31);

  assert.equal(inRange("2026-10-01", curMonth), true);
  assert.equal(inRange("2026-10-31", curMonth), true);
  assert.equal(inRange("2026-09-30", curMonth), false);
  assert.equal(inRange("2026-11-01", curMonth), false);

  const prevMonth = periodRange("PREVIOUS_MONTH", now);
  assert.equal(inRange("2026-09-15", prevMonth), true);
  assert.equal(inRange("2026-10-01", prevMonth), false);

  const custom = periodRange("CUSTOM", now, "2026-05-01", "2026-05-10");
  assert.equal(inRange("2026-05-05", custom), true);
  assert.equal(inRange("2026-05-11", custom), false);
});

test("computeSaleTotals: computes VAT discriminately for Factura A/B and non-discriminately for Remito/C", () => {
  const items = [
    { qty: 2, price: 1000, vatRate: 21 },
    { qty: 1, price: 500, vatRate: 10.5 }
  ];

  // Factura B: discriminates VAT
  const factB = computeSaleTotals(items, { invoiceType: "FACTURA_B", percIIBB: 50, percIVA: 20 });
  assert.equal(factB.netoTotal, 2500);
  assert.equal(factB.neto21, 2000);
  assert.equal(factB.iva21, 420);
  assert.equal(factB.neto105, 500);
  assert.equal(factB.iva105, 52.5);
  assert.equal(factB.ivaTotal, 472.5);
  assert.equal(factB.percTotal, 70);
  assert.equal(factB.total, 3042.5);

  // Remito / Presupuesto: does NOT discriminate VAT (no fiscal debit)
  const remito = computeSaleTotals(items, { invoiceType: "REMITO", percIIBB: 0, percIVA: 0 });
  assert.equal(remito.netoTotal, 2500);
  assert.equal(remito.neto0, 2500);
  assert.equal(remito.iva21, 0);
  assert.equal(remito.iva105, 0);
  assert.equal(remito.ivaTotal, 0);
  assert.equal(remito.total, 2500);
});

test("computePurchaseTotals & purchaseVatMismatch: validates purchase sums and VAT consistency", () => {
  const purchase = computePurchaseTotals({
    neto21: 1000,
    iva21: 210,
    neto105: 200,
    iva105: 21,
    perc: 30,
    exempt: 50
  });

  assert.equal(purchase.netoTotal, 1200);
  assert.equal(purchase.ivaTotal, 231);
  assert.equal(purchase.total, 1511);

  // Consistent VAT
  assert.deepEqual(purchaseVatMismatch(purchase), []);

  // Inconsistent VAT (e.g. user entered iva21: 50 instead of 210)
  const badVat = { neto21: 1000, iva21: 50, neto105: 200, iva105: 21 };
  assert.deepEqual(purchaseVatMismatch(badVat), ["IVA 21%"]);
});

test("nextInvoiceNumber: generates sequential numbers per type", () => {
  const existingInvoices = [
    { type: "sale", invoiceType: "FACTURA_B", number: "0001-00000001" },
    { type: "sale", invoiceType: "FACTURA_B", number: "0001-00000004" },
    { type: "sale", invoiceType: "REMITO", number: "0001-00000010" }
  ];

  assert.equal(nextInvoiceNumber(existingInvoices, "FACTURA_B"), "0001-00000005");
  assert.equal(nextInvoiceNumber(existingInvoices, "REMITO"), "0001-00000011");
  assert.equal(nextInvoiceNumber(existingInvoices, "FACTURA_A"), "0001-00000001");
});

test("isDuplicateInvoiceNumber: detects duplicate numbers correctly", () => {
  const existing = [
    { type: "sale", invoiceType: "FACTURA_B", number: "0001-00000005" },
    { type: "purchase", invoiceType: "FACTURA_A", number: "0002-00001234", supplierName: "Distribuidora Warnes" }
  ];

  assert.equal(isDuplicateInvoiceNumber(existing, { type: "sale", invoiceType: "FACTURA_B", number: "0001-00000005" }), true);
  assert.equal(isDuplicateInvoiceNumber(existing, { type: "sale", invoiceType: "FACTURA_B", number: "0001-00000006" }), false);
  assert.equal(isDuplicateInvoiceNumber(existing, { type: "sale", invoiceType: "FACTURA_A", number: "0001-00000005" }), false);

  assert.equal(isDuplicateInvoiceNumber(existing, {
    type: "purchase",
    invoiceType: "FACTURA_A",
    number: "0002-00001234",
    party: "distribuidora warnes"
  }), true);

  assert.equal(isDuplicateInvoiceNumber(existing, {
    type: "purchase",
    invoiceType: "FACTURA_A",
    number: "0002-00001234",
    party: "Otro Proveedor"
  }), false);
});

test("findStockShortages: detects insufficient stock and aggregates multiple rows of same product", () => {
  const products = [
    { id: "p1", name: "Pastillas de Freno Gol", stock: 5 },
    { id: "p2", name: "Filtro de Aceite Hilux", stock: 2 }
  ];

  const items = [
    { productId: "p1", qty: 3 },
    { productId: "p1", qty: 4 }, // total 7 > 5
    { productId: "p2", qty: 2 }, // 2 <= 2 (ok)
    { productId: "p3", qty: 1 }  // non-existent
  ];

  const shortages = findStockShortages(items, products);
  assert.equal(shortages.length, 2);
  assert.equal(shortages[0].productId, "p1");
  assert.equal(shortages[0].requested, 7);
  assert.equal(shortages[0].available, 5);
  assert.equal(shortages[1].productId, "p3");
});

test("distributePayment & applyPayment: distributes payments safely", () => {
  const invoices = [
    { id: "inv1", date: "2026-09-01", pendingBalance: 100 },
    { id: "inv2", date: "2026-09-15", pendingBalance: 250 }
  ];

  // Pay 150: should pay 100 of inv1, 50 of inv2, 0 remaining
  const dist1 = distributePayment(150, invoices);
  assert.deepEqual(dist1.imputations, [
    { invoiceId: "inv1", amount: 100 },
    { invoiceId: "inv2", amount: 50 }
  ]);
  assert.equal(dist1.remaining, 0);

  // Pay 400: should pay both completely and have 50 remaining
  const dist2 = distributePayment(400, invoices);
  assert.equal(dist2.remaining, 50);

  // applyPayment test
  const res1 = applyPayment(100, 100);
  assert.equal(res1.newBalance, 0);
  assert.equal(res1.status, "paid");

  const res2 = applyPayment(100, 40);
  assert.equal(res2.newBalance, 60);
  assert.equal(res2.status, "partial");
});

test("validateImputation: catches imputation anomalies", () => {
  const invoicesById = {
    inv1: { id: "inv1", number: "0001-00000001", pendingBalance: 100 },
    inv2: { id: "inv2", number: "0001-00000002", pendingBalance: 200 }
  };

  // Valid imputation
  const valid = validateImputation({
    amount: 150,
    imputations: [{ invoiceId: "inv1", amount: 100 }, { invoiceId: "inv2", amount: 50 }],
    invoicesById
  });
  assert.deepEqual(valid, []);

  // Exceeds invoice pending balance
  const exceeds = validateImputation({
    amount: 150,
    imputations: [{ invoiceId: "inv1", amount: 150 }],
    invoicesById
  });
  assert.equal(exceeds.length, 1);
  assert.match(exceeds[0], /supera su saldo pendiente/);

  // Sum mismatch with total amount
  const sumMismatch = validateImputation({
    amount: 200,
    imputations: [{ invoiceId: "inv1", amount: 100 }],
    invoicesById
  });
  assert.equal(sumMismatch.length, 1);
  assert.match(sumMismatch[0], /no coincide con la suma de lo imputado/);

  // Check amount mismatch
  const checkMismatch = validateImputation({
    amount: 100,
    imputations: [{ invoiceId: "inv1", amount: 100 }],
    invoicesById,
    checkAmount: 150
  });
  assert.equal(checkMismatch.length, 1);
  assert.match(checkMismatch[0], /importe del cheque/);
});

test("groupAccountBalances: groups by contact and computes pending balances", () => {
  const invoices = [
    { type: "sale", clientName: "Taller Juan", total: 1000, pendingBalance: 400 },
    { type: "sale", clientName: "taller juan", total: 500, pendingBalance: 500 }, // same contact, different case
    { type: "sale", clientName: "Mecánica Pepe", total: 300, pendingBalance: 0 }
  ];

  const grouped = groupAccountBalances(invoices, "clients");
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].name, "Taller Juan");
  assert.equal(grouped[0].totalAmount, 1500);
  assert.equal(grouped[0].pendingAmount, 900);
  assert.equal(grouped[0].invoicesCount, 2);

  assert.equal(grouped[1].name, "Mecánica Pepe");
  assert.equal(grouped[1].pendingAmount, 0);
});

test("computeFinancialReport: accurately calculates tax position and cashflow", () => {
  const invoices = [
    // Sale Factura B: 1000 neto21, 210 iva21, total 1210 (cash)
    {
      type: "sale",
      invoiceType: "FACTURA_B",
      date: "2026-10-05",
      neto21: 1000,
      iva21: 210,
      neto105: 0,
      iva105: 0,
      percTotal: 0,
      total: 1210,
      paymentTerm: "CONTADO_EFECTIVO"
    },
    // Sale Remito: 500 neto, 0 iva, total 500 (account receivable)
    {
      type: "sale",
      invoiceType: "REMITO",
      date: "2026-10-06",
      neto21: 0,
      iva21: 0,
      neto105: 0,
      iva105: 0,
      percTotal: 0,
      total: 500,
      paymentTerm: "CTA_CTE"
    },
    // Purchase Factura A: 600 neto21, 126 iva21, total 726 (cash)
    {
      type: "purchase",
      invoiceType: "FACTURA_A",
      date: "2026-10-07",
      neto21: 600,
      iva21: 126,
      neto105: 0,
      iva105: 0,
      percTotal: 0,
      total: 726,
      paymentMethod: "CONTADO_TRANSFERENCIA"
    }
  ];

  const payments = [
    // Client pays 300 of the remito in cash
    {
      direction: "CLIENT_COLLECTION",
      method: "EFECTIVO",
      date: "2026-10-10",
      amount: 300
    }
  ];

  const checks = [
    // Check in portfolio (should NOT count as cash)
    {
      status: "IN_PORTFOLIO",
      amount: 1000
    },
    // Deposited check (should count as cash)
    {
      status: "DEPOSITED",
      depositedDate: "2026-10-12",
      amount: 400
    }
  ];

  const range = periodRange("CURRENT_MONTH", new Date(2026, 9, 15));
  const rep = computeFinancialReport({ invoices, payments, checks }, range);

  // Sales VAT: 210 (Factura B), Remito contributes 0
  assert.equal(rep.sales.ivaTotal, 210);
  assert.equal(rep.sales.total, 1710);

  // Purchases VAT: 126 (Factura A)
  assert.equal(rep.purchases.ivaTotal, 126);
  assert.equal(rep.purchases.total, 726);

  // Technical VAT balance: 210 - 126 = 84 (a pagar a AFIP)
  assert.equal(rep.taxBalance, 84);

  // Cashflow:
  // In: 1210 (cash sale) + 300 (client payment) + 400 (deposited check) = 1910
  // Out: 726 (cash purchase)
  // Net: 1910 - 726 = 1184
  assert.equal(rep.cashIn, 1910);
  assert.equal(rep.cashOut, 726);
  assert.equal(rep.cashNet, 1184);
});

test("filterProducts: searches by code, name, vehicle brand/model with accent & case insensitivity", () => {
  const sampleProducts = [
    {
      id: "prod-1",
      code: "OPT-HIL-16",
      name: "Óptica Delantera Toyota Hilux 2016-2020",
      brand: "Toyota",
      model: "Hilux",
      price: 94000,
      stock: 4
    },
    {
      id: "prod-2",
      code: "ESP-GOL-12",
      name: "Espejo Eléctrico Volkswagen Gol Trend",
      brand: "Volkswagen",
      model: "Gol Trend",
      price: 38200,
      stock: 6
    },
    {
      id: "prod-3",
      code: "100FAT060",
      name: "Faro Trasero Peugeot 208 II 2020+",
      brand: "Peugeot",
      model: "208",
      price: 78500,
      stock: 0
    },
    {
      id: "prod-4",
      code: "TAZ-14-DEP",
      name: "Juego de Tazas Rodado 14 Deportivo",
      brand: "Universal",
      model: "Todos",
      price: 18500,
      stock: 12
    }
  ];

  // 1. Exact & partial code search
  const byCodeExact = filterProducts(sampleProducts, "100FAT060");
  assert.equal(byCodeExact.length, 1);
  assert.equal(byCodeExact[0].id, "prod-3");

  const byCodePrefix = filterProducts(sampleProducts, "OPT");
  assert.equal(byCodePrefix.length, 1);
  assert.equal(byCodePrefix[0].code, "OPT-HIL-16");

  // 2. Accent-insensitive & case-insensitive description search
  const byAccent = filterProducts(sampleProducts, "optica hilux");
  assert.equal(byAccent.length, 1);
  assert.equal(byAccent[0].id, "prod-1");

  const byUppercase = filterProducts(sampleProducts, "ESPEJO");
  assert.equal(byUppercase.length, 1);
  assert.equal(byUppercase[0].id, "prod-2");

  // 3. Search by vehicle brand / model
  const byBrand = filterProducts(sampleProducts, "volkswagen");
  assert.equal(byBrand.length, 1);
  assert.equal(byBrand[0].id, "prod-2");

  const byModel = filterProducts(sampleProducts, "208");
  assert.equal(byModel.length, 1);
  assert.equal(byModel[0].id, "prod-3");

  // 4. Empty query returns list
  const emptyQuery = filterProducts(sampleProducts, "");
  assert.equal(emptyQuery.length, 4);

  // 5. Non-matching query returns empty array
  const noMatch = filterProducts(sampleProducts, "ferrari testarossa");
  assert.equal(noMatch.length, 0);

  // 6. Max results parameter
  const limited = filterProducts(sampleProducts, "", 2);
  assert.equal(limited.length, 2);
});
