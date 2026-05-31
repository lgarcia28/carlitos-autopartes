/**
 * Seed script using Firestore REST API directly.
 * No Admin SDK credentials needed - uses the project's API key.
 */

const API_KEY = "AIzaSyCgeSNL_oFVBK6UElLTtwnPWXAaogBTcDI";
const PROJECT_ID = "carlitos-autopartes";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const seedProducts = [
  {
    name: "Juego de Tazas Rodado 14 Deportivo",
    description: "Juego de 4 tazas deportivas universales rodado 14, plástico ABS flexible resistente a impactos.",
    category: "Tazas y Molduras",
    brand: "Universal",
    model: "Todos",
    year_start: 1990,
    year_end: 2026,
    price: 18500,
    stock: 12,
    image_url: "https://images.unsplash.com/photo-1611245789429-281b37803a67?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Óptica Delantera Toyota Hilux 2016-2020",
    description: "Óptica delantera derecha homologada, acrílico de alta transparencia y lúmenes reforzados.",
    category: "Faros y Ópticas",
    brand: "Toyota",
    model: "Hilux",
    year_start: 2016,
    year_end: 2020,
    price: 94000,
    stock: 4,
    image_url: "https://images.unsplash.com/photo-1606577924006-27d39b132ae2?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Espejo Eléctrico Volkswagen Gol Trend",
    description: "Espejo exterior eléctrico completo con carcasa lista para pintar, lado acompañante.",
    category: "Espejos y Levantacristales",
    brand: "Volkswagen",
    model: "Gol Trend",
    year_start: 2012,
    year_end: 2021,
    price: 38200,
    stock: 6,
    image_url: "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Manija Exterior Puerta delantera Ford Fiesta",
    description: "Manija exterior de puerta delantera color negro texturado, repuesto original homologado.",
    category: "Manijas y Cerraduras",
    brand: "Ford",
    model: "Fiesta",
    year_start: 2010,
    year_end: 2019,
    price: 11500,
    stock: 15,
    image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Volante Deportivo Cuerina Confort",
    description: "Volante deportivo universal tapizado en cuerina negra con centro reforzado de aluminio.",
    category: "Volantes Deportivos y Accesorios",
    brand: "Universal",
    model: "Todos",
    year_start: 1990,
    year_end: 2026,
    price: 49000,
    stock: 8,
    image_url: "https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Faro Trasero Peugeot 208 II 2020+",
    description: "Faro trasero derecho acrílico con tecnología LED integrada, alta visibilidad nocturna.",
    category: "Faros y Ópticas",
    brand: "Peugeot",
    model: "208",
    year_start: 2020,
    year_end: 2026,
    price: 78500,
    stock: 3,
    image_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Kit Levantacristal Manual Fiat Uno 2p",
    description: "Máquina levantacristal manual lado conductor para modelo 2 puertas, incluye manija rotativa.",
    category: "Espejos y Levantacristales",
    brand: "Fiat",
    model: "Uno",
    year_start: 2004,
    year_end: 2014,
    price: 24300,
    stock: 9,
    image_url: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Cerradura Portón Trasero Chevrolet Cruze",
    description: "Cerradura eléctrica de baúl/portón trasero con sensor de apertura integrado, repuesto original.",
    category: "Manijas y Cerraduras",
    brand: "Chevrolet",
    model: "Cruze",
    year_start: 2016,
    year_end: 2025,
    price: 42900,
    stock: 5,
    image_url: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Masa Adaptadora Volante Sandero / Logan",
    description: "Masa de aluminio estriado universal para colocación de volantes deportivos en línea Renault.",
    category: "Volantes Deportivos y Accesorios",
    brand: "Renault",
    model: "Todos",
    year_start: 2008,
    year_end: 2026,
    price: 19800,
    stock: 14,
    image_url: "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Moldura Paragolpe Delantero Toyota Corolla",
    description: "Moldura embellecedora cromada delantera derecha para paragolpes, encaje a presión original.",
    category: "Tazas y Molduras",
    brand: "Toyota",
    model: "Corolla",
    year_start: 2014,
    year_end: 2024,
    price: 16200,
    stock: 11,
    image_url: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Óptica Auxiliar Antiniebla Volkswagen Amarok",
    description: "Faro auxiliar antiniebla delantero izquierdo, lente de vidrio y lámpara halógena incluida.",
    category: "Faros y Ópticas",
    brand: "Volkswagen",
    model: "Amarok",
    year_start: 2010,
    year_end: 2024,
    price: 31000,
    stock: 7,
    image_url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Levantacristal Eléctrico Chevrolet Onix/Prisma",
    description: "Kit de máquina levantacristal eléctrica delantera derecha sin motor, repuesto certificado original.",
    category: "Espejos y Levantacristales",
    brand: "Chevrolet",
    model: "Onix",
    year_start: 2013,
    year_end: 2022,
    price: 49500,
    stock: 5,
    image_url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Juego de Cerraduras de Puerta Fiat Duna/Uno",
    description: "Juego de 2 cilindros/tambores de cerradura con llaves idénticas para puertas izquierda y derecha.",
    category: "Manijas y Cerraduras",
    brand: "Fiat",
    model: "Uno",
    year_start: 1989,
    year_end: 2010,
    price: 13900,
    stock: 20,
    image_url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Juego de Alfombras de Goma Pesada Toyota Corolla",
    description: "Kit de 3 alfombras de goma virgen pesada antideslizante con logo bordado para habitáculo.",
    category: "Volantes Deportivos y Accesorios",
    brand: "Toyota",
    model: "Corolla",
    year_start: 2014,
    year_end: 2026,
    price: 36700,
    stock: 9,
    image_url: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?q=80&w=600&auto=format&fit=crop"
  },
  {
    name: "Tazas Rodado 13 Deportivo Negro Mate",
    description: "Juego de 4 tazas deportivas universales rodado 13, acabado color negro mate texturado premium.",
    category: "Tazas y Molduras",
    brand: "Universal",
    model: "Todos",
    year_start: 1990,
    year_end: 2026,
    price: 17200,
    stock: 13,
    image_url: "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=600&auto=format&fit=crop"
  }
];

function toFirestoreValue(val) {
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number" && Number.isInteger(val)) return { integerValue: String(val) };
  if (typeof val === "number") return { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  return { stringValue: String(val) };
}

function productToFirestoreFields(prod, docId) {
  const now = new Date().toISOString();
  const fields = {};
  for (const [key, val] of Object.entries(prod)) {
    fields[key] = toFirestoreValue(val);
  }
  fields["id"] = { stringValue: docId };
  fields["created_at"] = { stringValue: now };
  fields["updated_at"] = { stringValue: now };
  return fields;
}

async function createDoc(prod) {
  // Generate a random doc ID
  const docId = Array.from({ length: 20 }, () => 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]
  ).join("");
  
  const url = `${BASE_URL}/products/${docId}?key=${API_KEY}`;
  const body = { fields: productToFirestoreFields(prod, docId) };
  
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  
  return docId;
}

async function seed() {
  console.log("🚀 Cargando 15 productos de muestra via REST API...\n");
  
  let count = 0;
  for (const prod of seedProducts) {
    try {
      const docId = await createDoc(prod);
      count++;
      console.log(`  ✅ [${count}/15] ${prod.name} (${docId})`);
    } catch (err) {
      console.error(`  ❌ Error con "${prod.name}": ${err.message}`);
    }
  }
  
  console.log(`\n🎉 ¡Listo! ${count} productos cargados en Firestore.`);
}

seed().catch(err => {
  console.error("❌ Error fatal:", err.message);
  process.exit(1);
});
