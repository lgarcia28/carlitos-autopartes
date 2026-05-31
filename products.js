/**
 * Accesorios Autocentro S.R.L. - Base de Datos de Productos (Firestore Mock Structure)
 * 15 productos reales basados en la cartelería del local de Corrientes 579, Rosario.
 * Incluye campos 'brand', 'model', 'year_start' y 'year_end' para filtros jerárquicos avanzados.
 */

const products = [
  // --- FAROS Y ÓPTICAS ---
  {
    id: "faros-aux-fal",
    name: "Faros Auxiliares Deportivos Universales FAL",
    category: "Faros y Ópticas",
    brand: "Universal",
    model: "Todos",
    year_start: 1990,
    year_end: 2026,
    price: 48500,
    image_url: "https://images.unsplash.com/photo-1606577924006-27d39b132ae2?q=80&w=600&auto=format&fit=crop",
    description: "Faros auxiliares universales marca FAL de alta potencia y penetración de neblina. Cuerpo metálico reforzado y lentes de vidrio templado. Ideales para ruta.",
    stock: 12
  },
  {
    id: "optica-peugeot-208",
    name: "Óptica Delantera Peugeot 208 II (Izquierda/Derecha)",
    category: "Faros y Ópticas",
    brand: "Peugeot",
    model: "208",
    year_start: 2020,
    year_end: 2026,
    price: 145000,
    image_url: "https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=600&auto=format&fit=crop",
    description: "Óptica delantera original homologada para Peugeot 208 Línea Nueva (Fase II). Máxima visibilidad y diseño con firma lumínica característica. No incluye lámparas.",
    stock: 6
  },
  {
    id: "optica-gol-trend-led",
    name: "Óptica Trasera Led Volkswagen Gol Trend",
    category: "Faros y Ópticas",
    brand: "Volkswagen",
    model: "Gol Trend",
    year_start: 2008,
    year_end: 2022,
    price: 85000,
    image_url: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?q=80&w=600&auto=format&fit=crop",
    description: "Faros traseros deportivos con tecnología LED integrada para Volkswagen Gol Trend. Fácil instalación y gran durabilidad. Estilo moderno ahumado.",
    stock: 8
  },

  // --- ESPEJOS Y LEVANTACRISTALES ---
  {
    id: "espejo-hilux-electric",
    name: "Espejo Retrovisor Toyota Hilux Cromado Eléctrico",
    category: "Espejos y Levantacristales",
    brand: "Toyota",
    model: "Hilux",
    year_start: 2016,
    year_end: 2026,
    price: 120000,
    image_url: "https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=600&auto=format&fit=crop",
    description: "Espejo exterior completo cromado con regulación eléctrica e indicador de giro LED para Toyota Hilux (Modelos 2016+). Calidad original.",
    stock: 4
  },
  {
    id: "levantacristales-fiesta",
    name: "Kit de Levantacristales Eléctrico Ford Fiesta",
    category: "Espejos y Levantacristales",
    brand: "Ford",
    model: "Fiesta",
    year_start: 2010,
    year_end: 2019,
    price: 95000,
    image_url: "https://images.unsplash.com/photo-1616422285623-13ff0162193c?q=80&w=600&auto=format&fit=crop",
    description: "Kit completo de alza cristales eléctrico para puertas delanteras de Ford Fiesta. Incluye motores blindados de alta velocidad, teclas y cableado listo para instalar.",
    stock: 5
  },
  {
    id: "espejo-fiat-uno-manual",
    name: "Espejo Exterior Manual Fiat Uno Attractive",
    category: "Espejos y Levantacristales",
    brand: "Fiat",
    model: "Uno",
    year_start: 2010,
    year_end: 2021,
    price: 52000,
    image_url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=600&auto=format&fit=crop",
    description: "Espejo retrovisor externo regulable manualmente desde el interior para Fiat Uno. Carcasa de plástico ABS inyectado de alta resistencia con terminación texturada.",
    stock: 14
  },

  // --- MANIJAS Y CERRADURAS ---
  {
    id: "manija-exterior-amarok",
    name: "Manija Exterior Puerta Volkswagen Amarok (Negra)",
    category: "Manijas y Cerraduras",
    brand: "Volkswagen",
    model: "Amarok",
    year_start: 2010,
    year_end: 2026,
    price: 35000,
    image_url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=600&auto=format&fit=crop",
    description: "Manija exterior de puerta delantera/trasera para Volkswagen Amarok. Fabricada en plástico reforzado color negro original. Ajuste perfecto de fábrica.",
    stock: 20
  },
  {
    id: "cilindro-peugeot-partner",
    name: "Cilindro de Cerradura de Puerta con Llave Peugeot Partner",
    category: "Manijas y Cerraduras",
    brand: "Peugeot",
    model: "Partner",
    year_start: 1999,
    year_end: 2022,
    price: 28000,
    image_url: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=600&auto=format&fit=crop",
    description: "Tambor/cilindro de llave metálico de alta seguridad para puerta delantera de Peugeot Partner y Citroen Berlingo. Incluye dos llaves personalizadas.",
    stock: 15
  },
  {
    id: "cerradura-capot-ford-ka",
    name: "Cerradura de Capot Ford Ka (2015-2020)",
    category: "Manijas y Cerraduras",
    brand: "Ford",
    model: "Ka",
    year_start: 2015,
    year_end: 2020,
    price: 42000,
    image_url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=600&auto=format&fit=crop",
    description: "Traba y cerradura de capot de acero galvanizado reforzado para Ford Ka (modelos del 2015 al 2020). Mecanismo seguro que previene vibraciones en ruta.",
    stock: 9
  },

  // --- VOLANTES DEPORTIVOS Y ACCESORIOS ---
  {
    id: "volante-deportivo-universal",
    name: "Volante Deportivo Universal Cuero Negro con Rayos de Aluminio",
    category: "Volantes Deportivos y Accesorios",
    brand: "Universal",
    model: "Todos",
    year_start: 1990,
    year_end: 2026,
    price: 89000,
    image_url: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?q=80&w=600&auto=format&fit=crop",
    description: "Volante deportivo universal tapizado en eco-cuero italiano antideslizante con costuras Navy. Centro de bocina y rayos de aluminio anodizado mate. Requiere maza adaptadora.",
    stock: 7
  },
  {
    id: "bocina-caracol-universal",
    name: "Bocina Caracol Bitonal 12V Universal (Sonido Premium)",
    category: "Volantes Deportivos y Accesorios",
    brand: "Universal",
    model: "Todos",
    year_start: 1990,
    year_end: 2026,
    price: 22500,
    image_url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=600&auto=format&fit=crop",
    description: "Juego de dos bocinas tipo caracol (tono alto y bajo) con relays incluidos. Sonido potente y nítido de 115dB. Compatibilidad universal para cualquier auto de 12V.",
    stock: 18
  },
  {
    id: "alfombras-toyota-corolla",
    name: "Juego de Alfombras de Goma Pesada Toyota Corolla",
    category: "Volantes Deportivos y Accesorios",
    brand: "Toyota",
    model: "Corolla",
    year_start: 2014,
    year_end: 2026,
    price: 45000,
    image_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop",
    description: "Kit de 4 alfombras de goma vulcanizada pesada anti-deslizante con calce a medida para Toyota Corolla (modelos 2014 a 2026). Bordes elevados contenedores.",
    stock: 10
  },

  // --- TAZAS Y MOLDURAS ---
  {
    id: "tazas-rueda-14-deportivas",
    name: "Tazas de Rueda 14\" Deportivas Satinadas (Juego x4)",
    category: "Tazas y Molduras",
    brand: "Universal",
    model: "Todos",
    year_start: 1990,
    year_end: 2026,
    price: 38000,
    image_url: "https://images.unsplash.com/photo-1562591176-b2956503c275?q=80&w=600&auto=format&fit=crop",
    description: "Juego de 4 tazas deportivas universales de llanta rodado 14\". Color plata satinado con detalles en negro brillante. Fabricadas en plástico flexible resistente a impactos.",
    stock: 11
  },
  {
    id: "moldura-cruze-cromada",
    name: "Moldura de Paragolpes Delantero Chevrolet Cruze Cromada",
    category: "Tazas y Molduras",
    brand: "Chevrolet",
    model: "Cruze",
    year_start: 2016,
    year_end: 2025,
    price: 46000,
    image_url: "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=600&auto=format&fit=crop",
    description: "Aplique cromado de paragolpes delantero para Chevrolet Cruze (modelos 2016 a 2025). Calce de encastre original con acabado brillante de altísima durabilidad.",
    stock: 8
  },
  {
    id: "cubre-alfombra-baul-ranger",
    name: "Cubre Alfombra de Baúl Termoformado Ford Ranger",
    category: "Tazas y Molduras",
    brand: "Ford",
    model: "Ranger",
    year_start: 2012,
    year_end: 2026,
    price: 65000,
    image_url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600&auto=format&fit=crop",
    description: "Protector de baúl termoformado de alta resistencia fabricado en polietileno impermeable para Ford Ranger (modelos 2012 a 2026). Ideal para carga.",
    stock: 5
  }
];

// Exportación compatible tanto con imports ES6 como con scripts convencionales de navegador
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = products;
}
