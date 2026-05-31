import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- FIREBASE WEB SDK INITIALIZATION ---
const firebaseConfig = {
  projectId: "carlitos-autopartes",
  appId: "1:857884800045:web:19badd1649ae17712734a4",
  storageBucket: "carlitos-autopartes.firebasestorage.app",
  apiKey: "AIzaSyCgeSNL_oFVBK6UElLTtwnPWXAaogBTcDI",
  authDomain: "carlitos-autopartes.firebaseapp.com",
  messagingSenderId: "857884800045",
  projectNumber: "857884800045"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DYNAMIC SECURITY ALLOWLIST (Emails autorizados) ---
const CORREOS_AUTORIZADOS = [
  "leoneldariogarcia@gmail.com" // Administrador principal
];

// --- DOM REFERENCES ---
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const googleLoginBtn = document.getElementById("google-login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userEmailTag = document.getElementById("user-email-tag");

// Product Form
const productForm = document.getElementById("product-form");
const editProductId = document.getElementById("edit-product-id");
const formActionTitle = document.getElementById("form-action-title");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const saveProductBtn = document.getElementById("save-product-btn");

const prodName = document.getElementById("prod-name");
const prodDesc = document.getElementById("prod-desc");
const prodCategory = document.getElementById("prod-category");
const prodBrand = document.getElementById("prod-brand");
const prodModel = document.getElementById("prod-model");
const prodYearStart = document.getElementById("prod-year-start");
const prodYearEnd = document.getElementById("prod-year-end");
const prodPrice = document.getElementById("prod-price");
const prodStock = document.getElementById("prod-stock");
const prodImageFile = document.getElementById("prod-image-file");
const prodImageUrl = document.getElementById("prod-image-url");

const imagePreview = document.getElementById("image-preview");
const uploadStatus = document.getElementById("upload-status");

// Settings & Listing
const imgbbKeyInput = document.getElementById("imgbb-key");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const adminProductsList = document.getElementById("admin-products-list");
const adminResultsCount = document.getElementById("admin-results-count");

// --- INITIAL STATES & SETUP ---
let imgbbApiKey = localStorage.getItem("autocentro_imgbb_key") || "";
if (imgbbApiKey) {
  imgbbKeyInput.value = imgbbApiKey;
}

// --- CAPTURE REDIRECT RESULT (Para capturar errores o éxito post-redirección) ---
getRedirectResult(auth)
  .then((result) => {
    if (result && result.user) {
      console.log("Sesión iniciada vía redirección:", result.user.email);
      showToast("¡Autenticación completada con éxito!", "success");
    }
  })
  .catch((err) => {
    console.error("Error al retornar de la redirección de Google:", err);
    let errorMsg = "Error al iniciar sesión con Google. Intentá de nuevo.";
    if (err.code === "auth/unauthorized-domain") {
      errorMsg = "Este dominio no está autorizado en la consola de Firebase.";
    } else if (err.code === "auth/operation-not-allowed") {
      errorMsg = "El proveedor de Google no está habilitado en Firebase.";
    }
    showToast(errorMsg, "error");
  });

// --- AUTHENTICATION STATE OBSERVER ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userEmail = user.email ? user.email.toLowerCase().trim() : "";
    
    // 🛡️ Verify if the user is in the Authorized Allowlist
    if (CORREOS_AUTORIZADOS.map(email => email.toLowerCase().trim()).includes(userEmail)) {
      // Access Granted!
      loginView.style.display = "none";
      adminView.style.display = "block";
      userEmailTag.textContent = user.email;
      
      // Subscribe to Firestore catalog updates
      subscribeToCatalog();
    } else {
      // Access Denied!
      signOut(auth);
      showToast("Acceso denegado: esta cuenta de Google no está autorizada.", "error");
    }
  } else {
    // Admin is logged out
    loginView.style.display = "flex";
    adminView.style.display = "none";
  }
});

// --- AUTH ACTIONS (Google Sign-In Redirect) ---
googleLoginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  // Request profile and email scopes
  provider.addScope("profile");
  provider.addScope("email");

  try {
    showToast("Redirigiendo a inicio de sesión de Google...", "info");
    // Usamos redirección para evitar bloqueadores de popups, especialmente en celulares
    await signInWithRedirect(auth, provider);
  } catch (err) {
    console.error("Error al iniciar redirección de Google:", err);
    showToast("Error al iniciar sesión con Google. Intentá de nuevo.", "error");
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("Has cerrado sesión.", "info");
  } catch (err) {
    console.error("Error al salir:", err);
  }
});

// --- SETTINGS ACTIONS ---
saveSettingsBtn.addEventListener("click", () => {
  const key = imgbbKeyInput.value.trim();
  if (key) {
    imgbbApiKey = key;
    localStorage.setItem("autocentro_imgbb_key", key);
    showToast("Clave API de ImgBB guardada correctamente.", "success");
  } else {
    showToast("Por favor ingresa una clave válida.", "error");
  }
});

// --- FILE UPLOAD INTERACTION (Camera & Preview) ---
prodImageFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadStatus.textContent = `Archivo seleccionado: ${file.name}`;
    
    // Show thumbnail preview locally
    const reader = new FileReader();
    reader.onload = (event) => {
      imagePreview.src = event.target.result;
      imagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});

// --- IMAGE UPLOAD TO IMGBB (Programmable Background Upload) ---
async function uploadImage(file) {
  if (!imgbbApiKey) {
    throw new Error("Falta la clave API de ImgBB. Por favor, ingresala en la caja de ajustes antes de guardar.");
  }

  showToast("Subiendo foto del repuesto...", "info");
  
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Error al subir la imagen al servidor gratuito.");
  }

  const result = await response.json();
  return result.data.url; // Returns the direct secure image URL
}

// --- PRODUCT SAVE ACTIONS (Add & Edit CRUD) ---
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = editProductId.value;
  const name = prodName.value.trim();
  const description = prodDesc.value.trim();
  const category = prodCategory.value;
  const brand = prodBrand.value.trim();
  const model = prodModel.value.trim();
  const yearStart = parseInt(prodYearStart.value);
  const yearEnd = parseInt(prodYearEnd.value);
  const price = parseFloat(prodPrice.value);
  const stock = parseInt(prodStock.value);
  
  const imageFile = prodImageFile.files[0];
  let finalImageUrl = prodImageUrl.value;

  try {
    saveProductBtn.disabled = true;
    saveProductBtn.querySelector("span").textContent = "Guardando...";

    // 1. Upload file if a new one is selected
    if (imageFile) {
      finalImageUrl = await uploadImage(imageFile);
    }

    if (!finalImageUrl) {
      throw new Error("Por favor selecciona una foto para el repuesto o asegúrate de que la clave API esté guardada.");
    }

    const productData = {
      name,
      description,
      category,
      brand,
      model,
      year_start: yearStart,
      year_end: yearEnd,
      price,
      stock,
      image_url: finalImageUrl,
      updated_at: new Date().toISOString()
    };

    // 2. Add or Update in Firestore
    if (id) {
      // Edit mode
      await setDoc(doc(db, "products", id), productData, { merge: true });
      showToast(`¡Repuesto "${name}" actualizado!`, "success");
    } else {
      // Add new mode
      await addDoc(collection(db, "products"), {
        ...productData,
        id: "", // placeholder, will fill below
        created_at: new Date().toISOString()
      }).then(async (docRef) => {
        // Self-reference id field for easier client queries
        await updateDoc(docRef, { id: docRef.id });
      });
      showToast(`¡Repuesto "${name}" cargado al catálogo!`, "success");
    }

    // 3. Reset UI state
    resetFormState();
  } catch (err) {
    console.error("Error al guardar producto:", err);
    showToast(err.message, "error");
  } finally {
    saveProductBtn.disabled = false;
    saveProductBtn.querySelector("span").textContent = "Guardar Producto";
  }
});

// --- EDIT SELECTION TRIGGER ---
function editProduct(prod) {
  editProductId.value = prod.id;
  formActionTitle.textContent = "Editar Repuesto";
  cancelEditBtn.style.display = "inline-block";

  prodName.value = prod.name;
  prodDesc.value = prod.description;
  prodCategory.value = prod.category;
  prodBrand.value = prod.brand;
  prodModel.value = prod.model;
  prodYearStart.value = prod.year_start;
  prodYearEnd.value = prod.year_end;
  prodPrice.value = prod.price;
  prodStock.value = prod.stock;
  
  prodImageUrl.value = prod.image_url;
  imagePreview.src = prod.image_url;
  imagePreview.style.display = "block";
  uploadStatus.textContent = "Foto guardada activa. Subí otra para reemplazarla.";
  
  // Scroll form into view
  productForm.scrollIntoView({ behavior: "smooth" });
}

cancelEditBtn.addEventListener("click", () => {
  resetFormState();
});

function resetFormState() {
  productForm.reset();
  editProductId.value = "";
  prodImageUrl.value = "";
  formActionTitle.textContent = "Cargar Producto Nuevo";
  cancelEditBtn.style.display = "none";
  imagePreview.style.display = "none";
  imagePreview.src = "";
  uploadStatus.textContent = "Elegir foto o sacar foto con la cámara";
}

// --- DELETE ACTION ---
async function deleteProduct(id, name) {
  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente de la tienda a:\n"${name}"?`)) {
    try {
      showToast("Eliminando producto...", "info");
      await deleteDoc(doc(db, "products", id));
      showToast(`¡"${name}" eliminado con éxito!`, "success");
    } catch (err) {
      console.error("Error al eliminar repuesto:", err);
      showToast("Error de permisos al eliminar. Iniciá sesión de nuevo.", "error");
    }
  }
}

// --- INLINE FAST UPDATES FOR PRICES AND STOCK ---
async function saveInlineUpdate(id, price, stock, name) {
  try {
    await updateDoc(doc(db, "products", id), {
      price: parseFloat(price),
      stock: parseInt(stock)
    });
    showToast(`Valores rápidos de "${name}" actualizados.`, "success");
  } catch (err) {
    console.error("Error en actualización rápida:", err);
    showToast("Error de permisos al guardar valores.", "error");
  }
}

// --- SUBSCRIBE TO LIVE FIRESTORE DATABASE ---
let catalogUnsubscribe = null;
function subscribeToCatalog() {
  if (catalogUnsubscribe) {
    catalogUnsubscribe();
  }

  catalogUnsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
    // If database is completely empty, suggest seed migration
    if (snapshot.empty) {
      adminResultsCount.textContent = "Base de datos vacía (0 productos)";
      renderSeedMigrationOffer();
      return;
    }

    const prods = [];
    snapshot.forEach(doc => {
      prods.push(doc.data());
    });

    // Sort by updated_at or created_at descending (newest first)
    prods.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    adminResultsCount.textContent = `${prods.length} ${prods.length === 1 ? "repuesto" : "repuestos"} en catálogo`;
    renderAdminProducts(prods);
  }, (err) => {
    console.error("Error en suscripción en vivo:", err);
    showToast("Error cargando base de datos. Comprobá conexión.", "error");
  });
}

// --- RENDER PRODUCTS GRID FOR ADMIN ---
function renderAdminProducts(productsArray) {
  adminProductsList.innerHTML = "";

  productsArray.forEach(prod => {
    const card = document.createElement("div");
    card.className = "manage-item-card";
    card.innerHTML = `
      <img src="${prod.image_url}" alt="${prod.name}" class="manage-item-img">
      <div class="manage-item-info">
        <span class="manage-item-title">${prod.name}</span>
        <span class="manage-item-meta">${prod.category} | ${prod.brand} ${prod.model} (${prod.year_start}-${prod.year_end})</span>
      </div>
      <div class="manage-item-inputs">
        <div class="inline-input-group">
          <span>$</span>
          <input type="number" class="inline-input inline-price" value="${prod.price}" aria-label="Editar precio">
        </div>
        <div class="inline-input-group">
          <span>Stk</span>
          <input type="number" class="inline-input inline-stock" value="${prod.stock}" aria-label="Editar stock">
        </div>
        <button class="admin-btn admin-btn-primary fast-save-btn" style="padding: 6px 12px; font-size: 0.75rem;" title="Guardar cambios rápidos">
          OK
        </button>
        <button class="admin-btn-danger inline-delete-btn" style="border-radius: var(--radius-sm);" title="Eliminar del catálogo">
          Borrar
        </button>
      </div>
    `;

    // Fast inline edits
    const priceInput = card.querySelector(".inline-price");
    const stockInput = card.querySelector(".inline-stock");
    const fastSaveBtn = card.querySelector(".fast-save-btn");
    
    fastSaveBtn.addEventListener("click", () => {
      saveInlineUpdate(prod.id, priceInput.value, stockInput.value, prod.name);
    });

    // Delete and Edit triggers
    card.querySelector(".inline-delete-btn").addEventListener("click", () => {
      deleteProduct(prod.id, prod.name);
    });

    // Make the title/meta clickable to trigger full form edit
    card.querySelector(".manage-item-info").style.cursor = "pointer";
    card.querySelector(".manage-item-info").addEventListener("click", () => {
      editProduct(prod);
    });

    adminProductsList.appendChild(card);
  });
}

// --- AUTOMATIC SEED MIGRATION (Populate 15 products if empty) ---
function renderSeedMigrationOffer() {
  adminProductsList.innerHTML = `
    <div style="padding: var(--spacing-lg); text-align: center; background-color: var(--bg-surface); border-radius: var(--radius-md); border: 2px dashed var(--accent-yellow);">
      <h4 style="color: var(--primary-navy); margin-block-end: 8px;">¡Base de datos vacía detectada!</h4>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-block-end: 16px;">
        Para ayudarte a empezar rápidamente, podemos migrar de forma automática los 15 repuestos muestra iniciales directamente a tu base de datos Firestore en vivo.
      </p>
      <button id="run-migration-btn" class="admin-btn admin-btn-accent" style="margin: 0 auto;">
        <span>Migrar 15 Productos de Muestra</span>
      </button>
    </div>
  `;

  document.getElementById("run-migration-btn").addEventListener("click", async () => {
    try {
      const btn = document.getElementById("run-migration-btn");
      btn.disabled = true;
      btn.querySelector("span").textContent = "Migrando...";

      showToast("Migrando productos muestra...", "info");

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

      const batch = writeBatch(db);

      seedProducts.forEach(prod => {
        const docRef = doc(collection(db, "products"));
        batch.set(docRef, {
          ...prod,
          id: docRef.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });

      await batch.commit();
      showToast("¡Migración de muestra completada con éxito!", "success");
      subscribeToCatalog();
    } catch (err) {
      console.error("Error al migrar catálogo:", err);
      showToast("Error subiendo datos muestra a Firestore.", "error");
    }
  });
}

// --- ADMINISTRATIVE TOAST NOTIFICATIONS ---
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-notification";
  
  if (type === "error") {
    toast.style.borderLeftColor = "#DC2626";
    toast.style.backgroundColor = "#FEE2E2";
    toast.style.color = "#DC2626";
  } else if (type === "info") {
    toast.style.borderLeftColor = "var(--primary-navy)";
  }

  const successIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="#25D366" style="inline-size: 18px; block-size: 18px; flex-shrink: 0;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`;
  const errorIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="#DC2626" style="inline-size: 18px; block-size: 18px; flex-shrink: 0;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>`;
  const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--primary-navy)" style="inline-size: 18px; block-size: 18px; flex-shrink: 0;"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>`;

  let icon = successIcon;
  if (type === "error") icon = errorIcon;
  if (type === "info") icon = infoIcon;

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toast-slide-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
