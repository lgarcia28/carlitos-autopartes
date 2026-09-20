import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
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
  authDomain: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "carlitos-autopartes.firebaseapp.com" 
    : window.location.hostname,
  messagingSenderId: "857884800045",
  projectNumber: "857884800045"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DYNAMIC SECURITY ALLOWLIST (Emails autorizados) ---
const CORREOS_AUTORIZADOS = [
  "leoneldariogarcia@gmail.com", // Administrador principal
  "carlitos@carlitosautopartes.com" // Usuario simplificado "carlitos"
];

// --- DOM REFERENCES ---
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const loginForm = document.getElementById("login-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const logoutBtn = document.getElementById("logout-btn");
const userEmailTag = document.getElementById("user-email-tag");

// Product Form & Modal Overlay
const productModal = document.getElementById("product-modal");
const openModalBtn = document.getElementById("open-modal-btn");
const closeModalX = document.getElementById("close-modal-x");

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

// Listing
const adminProductsList = document.getElementById("admin-products-list");
const adminResultsCount = document.getElementById("admin-results-count");

// Advanced Live Filters
const adminSearchFilter = document.getElementById("admin-search-filter");
const adminCategoryFilter = document.getElementById("admin-category-filter");
const adminResetFilters = document.getElementById("admin-reset-filters");

// --- INITIAL STATES & SETUP ---
let imgbbApiKey = localStorage.getItem("autocentro_imgbb_key") || "3e8f85f1c4e77248e3e44ebf996d99df";
let allProducts = [];
let catalogUnsubscribe = null;

// ERP Mini-System Global State
let allInvoices = [];
let allChecks = [];
let allContacts = [];
let allPayments = [];
let invoicesUnsubscribe = null;
let checksUnsubscribe = null;
let contactsUnsubscribe = null;
let paymentsUnsubscribe = null;
let currentCheckingSubtab = "clients"; // "clients" or "suppliers"

// --- AUTHENTICATION STATE OBSERVER ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userEmail = user.email ? user.email.toLowerCase().trim() : "";
    
    // 🛡️ Verify if the user is in the Authorized Allowlist or has the admin domain suffix
    const isAllowed = CORREOS_AUTORIZADOS.map(email => email.toLowerCase().trim()).includes(userEmail) ||
                      userEmail.endsWith("@carlitosautopartes.com");
    
    if (isAllowed) {
      // Access Granted!
      loginView.style.display = "none";
      adminView.style.display = "block";
      userEmailTag.textContent = user.email.split("@")[0]; // Muestra el nombre de usuario limpio
      
      // Initialize tabs navigation
      initERPTabs();

      // Subscribe to Firestore catalog updates & ERP data
      subscribeToCatalog();
      subscribeToERP();
    } else {
      // Access Denied!
      signOut(auth);
      showToast("Acceso denegado: este usuario no está autorizado.", "error");
    }
  } else {
    // Admin is logged out
    loginView.style.display = "flex";
    adminView.style.display = "none";
    if (catalogUnsubscribe) catalogUnsubscribe();
    if (invoicesUnsubscribe) invoicesUnsubscribe();
    if (checksUnsubscribe) checksUnsubscribe();
    if (contactsUnsubscribe) contactsUnsubscribe();
    if (paymentsUnsubscribe) paymentsUnsubscribe();
  }
});


// --- AUTH ACTIONS (Email & Password Sign-In) ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usernameVal = loginUsername.value.trim();
  const passwordVal = loginPassword.value;

  // Si el usuario ingresa un nombre simple (ej. "carlitos"), lo convertimos internamente en un correo válido para Firebase
  let emailVal = usernameVal;
  if (!emailVal.includes("@")) {
    emailVal = `${usernameVal.toLowerCase()}@carlitosautopartes.com`;
  }

  try {
    showToast("Iniciando sesión...", "info");
    await signInWithEmailAndPassword(auth, emailVal, passwordVal);
    showToast("¡Ingreso exitoso!", "success");
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    let errorMsg = "Usuario o contraseña incorrectos.";
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
      errorMsg = "Usuario o contraseña incorrectos.";
    } else if (err.code === "auth/invalid-credential") {
      errorMsg = "Credenciales incorrectas. Verificá los datos.";
    } else if (err.code === "auth/operation-not-allowed") {
      errorMsg = "El inicio de sesión por correo y contraseña no está habilitado en tu consola Firebase.";
    } else if (err.code === "auth/too-many-requests") {
      errorMsg = "Acceso bloqueado temporalmente por demasiados intentos fallidos.";
    }
    showToast(errorMsg, "error");
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

// --- MODAL & FORM TRIGGER EVENTS ---
openModalBtn.addEventListener("click", () => {
  resetFormState();
  productModal.showModal();
});

closeModalX.addEventListener("click", () => {
  resetFormState();
});

cancelEditBtn.addEventListener("click", () => {
  resetFormState();
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
  
  // Open the interactive dialog
  productModal.showModal();
}

function resetFormState() {
  productForm.reset();
  editProductId.value = "";
  prodImageUrl.value = "";
  formActionTitle.textContent = "Cargar Producto Nuevo";
  cancelEditBtn.style.display = "none";
  imagePreview.style.display = "none";
  imagePreview.src = "";
  uploadStatus.textContent = "Elegir foto o sacar foto con la cámara";
  
  // Close dialog safely if open
  if (productModal.open) {
    productModal.close();
  }
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
function subscribeToCatalog() {
  if (catalogUnsubscribe) {
    catalogUnsubscribe();
  }

  catalogUnsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
    // If database is completely empty, suggest seed migration
    if (snapshot.empty) {
      allProducts = [];
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

    allProducts = prods;
    applyAdminFilters();
  }, (err) => {
    console.error("Error en suscripción en vivo:", err);
    showToast("Error cargando base de datos. Comprobá conexión.", "error");
  });
}

// --- APPLY LIVE FILTERS FOR ADMIN CATALOG ---
function applyAdminFilters() {
  const query = adminSearchFilter.value.toLowerCase().trim();
  const category = adminCategoryFilter.value;

  const filtered = allProducts.filter(prod => {
    const matchesSearch = !query || 
      (prod.name && prod.name.toLowerCase().includes(query)) ||
      (prod.brand && prod.brand.toLowerCase().includes(query)) ||
      (prod.model && prod.model.toLowerCase().includes(query)) ||
      (prod.description && prod.description.toLowerCase().includes(query));

    const matchesCategory = category === "ALL" || prod.category === category;

    return matchesSearch && matchesCategory;
  });

  adminResultsCount.textContent = `${filtered.length} de ${allProducts.length} ${allProducts.length === 1 ? "repuesto" : "repuestos"}`;
  renderAdminProducts(filtered);
}

// --- EVENT LISTENERS FOR ADVANCED FILTERS ---
adminSearchFilter.addEventListener("input", applyAdminFilters);
adminCategoryFilter.addEventListener("change", applyAdminFilters);
adminResetFilters.addEventListener("click", () => {
  adminSearchFilter.value = "";
  adminCategoryFilter.value = "ALL";
  applyAdminFilters();
  showToast("Filtros limpiados.", "info");
});

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
      
      // Mostrar el error técnico exacto en la caja de diagnóstico para soporte técnico
      const diagBox = document.getElementById("diagnostico-error-box");
      const diagContent = document.getElementById("diagnostico-error-content");
      if (diagBox && diagContent) {
        diagBox.style.display = "block";
        diagContent.textContent += `\n[ERROR DE MIGRACIÓN] ${err.message || err.code || err}\n${err.stack ? err.stack : ''}`;
      }
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

// =============================================================================
// ========================= MINI-ERP MODULES IMPLEMENTATION ====================
// =============================================================================

// --- FORMATTING UTILITIES ---
function formatCurrency(num) {
  const n = Number(num) || 0;
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  // Handle ISO string or YYYY-MM-DD
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// --- ERP NAVIGATION TABS ---
let erpTabsInitialized = false;
function initERPTabs() {
  if (erpTabsInitialized) return;
  erpTabsInitialized = true;

  const tabButtons = document.querySelectorAll("#erp-tabs-bar .erp-tab");
  const views = document.querySelectorAll(".erp-view");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      
      tabButtons.forEach(b => b.classList.remove("active"));
      views.forEach(v => v.classList.remove("active"));

      btn.classList.add("active");
      const activeView = document.getElementById(`view-${targetTab}`);
      if (activeView) {
        activeView.classList.add("active");
      }

      // Refresh data on tab switch
      if (targetTab === "sales") renderSalesTable();
      if (targetTab === "purchases") renderPurchasesTable();
      if (targetTab === "checking") renderCheckingAccounts();
      if (targetTab === "checks") renderChecksTable();
      if (targetTab === "finance") calculateFinancialReport();
      if (targetTab === "catalog") applyAdminFilters();
    });
  });

  // Initialize event handlers for each ERP module
  initSalesModule();
  initPurchasesModule();
  initCheckingModule();
  initChecksModule();
  initFinanceModule();
  initPrintModal();
}

// --- REAL-TIME FIRESTORE SUBSCRIPTION FOR ALL ERP COLLECTIONS ---
function subscribeToERP() {
  // 1. Invoices (Sales & Purchases)
  if (invoicesUnsubscribe) invoicesUnsubscribe();
  invoicesUnsubscribe = onSnapshot(collection(db, "invoices"), (snapshot) => {
    const list = [];
    snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
    list.sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
    allInvoices = list;
    
    renderSalesTable();
    renderPurchasesTable();
    renderCheckingAccounts();
    calculateFinancialReport();
    updateCheckingKPIs();
  }, (err) => {
    console.error("Error al cargar comprobantes:", err);
  });

  // 2. Checks (Cartera de cheques)
  if (checksUnsubscribe) checksUnsubscribe();
  checksUnsubscribe = onSnapshot(collection(db, "checks"), (snapshot) => {
    const list = [];
    snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
    list.sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0));
    allChecks = list;

    renderChecksTable();
    populateCheckSelects();
    calculateFinancialReport();
  }, (err) => {
    console.error("Error al cargar cartera de cheques:", err);
  });

  // 3. Contacts (Clientes y Proveedores)
  if (contactsUnsubscribe) contactsUnsubscribe();
  contactsUnsubscribe = onSnapshot(collection(db, "contacts"), (snapshot) => {
    const list = [];
    snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
    allContacts = list;

    renderCheckingAccounts();
    populateContactSelects();
  }, (err) => {
    console.error("Error al cargar contactos:", err);
  });

  // 4. Payments (Cobranzas y pagos imputados)
  if (paymentsUnsubscribe) paymentsUnsubscribe();
  paymentsUnsubscribe = onSnapshot(collection(db, "payments"), (snapshot) => {
    const list = [];
    snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
    list.sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
    allPayments = list;

    renderCheckingAccounts();
    calculateFinancialReport();
  }, (err) => {
    console.error("Error al cargar pagos:", err);
  });
}

// =============================================================================
// ========================= 1. SALES & INVOICES MODULE ========================
// =============================================================================

function initSalesModule() {
  const openModalBtn = document.getElementById("open-sale-modal-btn");
  const closeModalBtn = document.getElementById("close-sale-modal-x");
  const modal = document.getElementById("sale-modal");
  const saleForm = document.getElementById("sale-form");
  const addItemBtn = document.getElementById("sale-add-item-btn");
  const paymentTerm = document.getElementById("sale-payment-term");
  const checkFields = document.getElementById("sale-check-fields");
  const percIIBB = document.getElementById("sale-perc-iibb");
  const percIVA = document.getElementById("sale-perc-iva");

  // Filters
  const searchFilter = document.getElementById("sales-search-filter");
  const typeFilter = document.getElementById("sales-type-filter");
  const statusFilter = document.getElementById("sales-status-filter");

  if (searchFilter) searchFilter.addEventListener("input", renderSalesTable);
  if (typeFilter) typeFilter.addEventListener("change", renderSalesTable);
  if (statusFilter) statusFilter.addEventListener("change", renderSalesTable);

  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      openSaleModal();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      if (modal.open) modal.close();
    });
  }

  if (addItemBtn) {
    addItemBtn.addEventListener("click", () => {
      addSaleItemRow();
    });
  }

  if (paymentTerm) {
    paymentTerm.addEventListener("change", () => {
      if (paymentTerm.value === "CONTADO_CHEQUE") {
        checkFields.style.display = "block";
      } else {
        checkFields.style.display = "none";
      }
    });
  }

  if (percIIBB) percIIBB.addEventListener("input", recalculateSaleTotals);
  if (percIVA) percIVA.addEventListener("input", recalculateSaleTotals);

  if (saleForm) {
    saleForm.addEventListener("submit", handleSaveSale);
  }
}

function openSaleModal() {
  const modal = document.getElementById("sale-modal");
  const form = document.getElementById("sale-form");
  const dateInput = document.getElementById("sale-date");
  const numberInput = document.getElementById("sale-number");
  const itemsList = document.getElementById("sale-items-list");
  const checkFields = document.getElementById("sale-check-fields");

  form.reset();
  checkFields.style.display = "none";
  dateInput.value = new Date().toISOString().split("T")[0];

  // Auto-generate invoice number (e.g. 0001-00000023)
  const salesCount = allInvoices.filter(i => i.type === "sale").length + 1;
  numberInput.value = `0001-${String(salesCount).padStart(8, "0")}`;

  // Clear and add 1 default item row
  itemsList.innerHTML = "";
  addSaleItemRow();

  recalculateSaleTotals();
  modal.showModal();
}

function addSaleItemRow(item = {}) {
  const itemsList = document.getElementById("sale-items-list");
  const row = document.createElement("div");
  row.className = "sale-item-row";
  row.style.cssText = "display: flex; gap: 8px; align-items: center; background: white; padding: 8px; border-radius: var(--radius-md); border: 1px solid var(--border-light); flex-wrap: wrap;";

  // Build product options from allProducts
  let productOptionsHtml = `<option value="">-- Repuesto Manual / Detalle Libre --</option>`;
  allProducts.forEach(prod => {
    productOptionsHtml += `<option value="${prod.id}" data-price="${prod.price}" data-name="${prod.name}" data-stock="${prod.stock}">${prod.name} (Stk: ${prod.stock}) - $${prod.price}</option>`;
  });

  row.innerHTML = `
    <div style="flex: 2; min-width: 180px;">
      <select class="form-control item-product-select" style="font-size: 0.8rem; margin-bottom: 4px;">
        ${productOptionsHtml}
      </select>
      <input type="text" class="form-control item-desc" placeholder="Descripción del repuesto" value="${item.name || ''}" required style="font-size: 0.8rem;">
    </div>
    <div style="width: 70px;">
      <label style="font-size: 0.65rem; color: var(--text-secondary); display: block;">Cant.</label>
      <input type="number" class="form-control item-qty" value="${item.qty || 1}" min="1" required style="font-size: 0.8rem;">
    </div>
    <div style="width: 100px;">
      <label style="font-size: 0.65rem; color: var(--text-secondary); display: block;">P. Unit ($)</label>
      <input type="number" class="form-control item-price" value="${item.price || 0}" step="0.01" min="0" required style="font-size: 0.8rem;">
    </div>
    <div style="width: 80px;">
      <label style="font-size: 0.65rem; color: var(--text-secondary); display: block;">IVA</label>
      <select class="form-control item-vat" style="font-size: 0.8rem;">
        <option value="21" ${item.vatRate === 21 ? 'selected' : ''}>21%</option>
        <option value="10.5" ${item.vatRate === 10.5 ? 'selected' : ''}>10.5%</option>
        <option value="0" ${item.vatRate === 0 ? 'selected' : ''}>0%</option>
      </select>
    </div>
    <div style="width: 90px; text-align: right;">
      <label style="font-size: 0.65rem; color: var(--text-secondary); display: block;">Subtotal</label>
      <span class="item-subtotal" style="font-weight: 700; font-size: 0.85rem; color: var(--primary-navy);">$0.00</span>
    </div>
    <button type="button" class="admin-btn-danger remove-item-btn" style="padding: 4px 8px; border-radius: var(--radius-sm); align-self: flex-end;" title="Eliminar fila">
      ✕
    </button>
  `;

  // Select change handler: auto fill description & price
  const productSelect = row.querySelector(".item-product-select");
  const descInput = row.querySelector(".item-desc");
  const priceInput = row.querySelector(".item-price");
  const qtyInput = row.querySelector(".item-qty");
  const vatSelect = row.querySelector(".item-vat");
  const removeBtn = row.querySelector(".remove-item-btn");

  productSelect.addEventListener("change", () => {
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    if (selectedOption.value) {
      descInput.value = selectedOption.getAttribute("data-name");
      priceInput.value = selectedOption.getAttribute("data-price");
    }
    recalculateSaleTotals();
  });

  qtyInput.addEventListener("input", recalculateSaleTotals);
  priceInput.addEventListener("input", recalculateSaleTotals);
  vatSelect.addEventListener("change", recalculateSaleTotals);

  removeBtn.addEventListener("click", () => {
    if (itemsList.children.length > 1) {
      row.remove();
      recalculateSaleTotals();
    } else {
      showToast("El comprobante debe tener al menos un artículo.", "info");
    }
  });

  itemsList.appendChild(row);
  recalculateSaleTotals();
}

function recalculateSaleTotals() {
  const rows = document.querySelectorAll("#sale-items-list .sale-item-row");
  let totalNeto = 0;
  let neto21 = 0;
  let neto105 = 0;
  let iva21 = 0;
  let iva105 = 0;

  rows.forEach(row => {
    const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
    const price = parseFloat(row.querySelector(".item-price").value) || 0;
    const vatRate = parseFloat(row.querySelector(".item-vat").value) || 0;
    const subtotal = qty * price;

    totalNeto += subtotal;
    if (vatRate === 21) {
      neto21 += subtotal;
      iva21 += subtotal * 0.21;
    } else if (vatRate === 10.5) {
      neto105 += subtotal;
      iva105 += subtotal * 0.105;
    }

    const subtotalSpan = row.querySelector(".item-subtotal");
    if (subtotalSpan) subtotalSpan.textContent = formatCurrency(subtotal);
  });

  const percIIBB = parseFloat(document.getElementById("sale-perc-iibb").value) || 0;
  const percIVA = parseFloat(document.getElementById("sale-perc-iva").value) || 0;
  const totalPerc = percIIBB + percIVA;
  const grandTotal = totalNeto + iva21 + iva105 + totalPerc;

  document.getElementById("sale-total-neto").textContent = formatCurrency(totalNeto);
  document.getElementById("sale-total-iva-21").textContent = formatCurrency(iva21);
  document.getElementById("sale-total-iva-105").textContent = formatCurrency(iva105);
  document.getElementById("sale-total-perc").textContent = formatCurrency(totalPerc);
  document.getElementById("sale-total-final").textContent = formatCurrency(grandTotal);

  return { totalNeto, neto21, neto105, iva21, iva105, percIIBB, percIVA, totalPerc, grandTotal };
}

async function handleSaveSale(e) {
  e.preventDefault();
  const saveBtn = document.getElementById("save-sale-btn");
  const modal = document.getElementById("sale-modal");

  try {
    saveBtn.disabled = true;
    saveBtn.querySelector("span").textContent = "Guardando comprobante...";

    const saleType = document.getElementById("sale-type").value;
    const saleNumber = document.getElementById("sale-number").value.trim();
    const saleDate = document.getElementById("sale-date").value;
    const clientName = document.getElementById("sale-client-name").value.trim();
    const clientCuit = document.getElementById("sale-client-cuit").value.trim();
    const clientIva = document.getElementById("sale-client-iva").value;
    const clientAddress = document.getElementById("sale-client-address").value.trim();
    const paymentTerm = document.getElementById("sale-payment-term").value;

    const totals = recalculateSaleTotals();

    // Collect line items
    const rows = document.querySelectorAll("#sale-items-list .sale-item-row");
    const items = [];
    rows.forEach(row => {
      const prodId = row.querySelector(".item-product-select").value;
      const desc = row.querySelector(".item-desc").value.trim();
      const qty = parseInt(row.querySelector(".item-qty").value) || 1;
      const price = parseFloat(row.querySelector(".item-price").value) || 0;
      const vatRate = parseFloat(row.querySelector(".item-vat").value) || 0;
      items.push({
        productId: prodId || null,
        name: desc,
        qty,
        price,
        vatRate,
        subtotal: qty * price
      });
    });

    if (items.length === 0) {
      throw new Error("Agregá al menos un artículo al comprobante.");
    }

    const batch = writeBatch(db);

    // 1. Stock deduction for items linked to the catalog
    for (const item of items) {
      if (item.productId) {
        const product = allProducts.find(p => p.id === item.productId);
        if (product) {
          const currentStock = parseInt(product.stock) || 0;
          const newStock = Math.max(0, currentStock - item.qty);
          batch.update(doc(db, "products", item.productId), {
            stock: newStock,
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    // 2. If paid by check, register in checks collection
    if (paymentTerm === "CONTADO_CHEQUE") {
      const bank = document.getElementById("sale-check-bank").value.trim();
      const checkNumber = document.getElementById("sale-check-number").value.trim();
      const dueDate = document.getElementById("sale-check-due").value;
      const drawer = document.getElementById("sale-check-drawer").value.trim();

      const checkRef = doc(collection(db, "checks"));
      batch.set(checkRef, {
        id: checkRef.id,
        direction: "RECEIVED",
        status: "IN_PORTFOLIO",
        bank: bank || "No especificado",
        number: checkNumber || "S/N",
        dueDate: dueDate || saleDate,
        drawer: drawer || clientName,
        clientName,
        amount: totals.grandTotal,
        receivedDate: saleDate,
        created_at: new Date().toISOString()
      });
    }

    // 3. Create invoice document
    const isCtaCte = paymentTerm === "CTA_CTE";
    const invoiceRef = doc(collection(db, "invoices"));
    const invoiceData = {
      id: invoiceRef.id,
      type: "sale",
      invoiceType: saleType,
      number: saleNumber,
      date: saleDate,
      clientName,
      clientCuit: clientCuit || "-",
      clientIva,
      clientAddress: clientAddress || "-",
      paymentTerm,
      items,
      neto21: totals.neto21,
      neto105: totals.neto105,
      netoTotal: totals.totalNeto,
      iva21: totals.iva21,
      iva105: totals.iva105,
      ivaTotal: totals.iva21 + totals.iva105,
      percIIBB: totals.percIIBB,
      percIVA: totals.percIVA,
      percTotal: totals.totalPerc,
      total: totals.grandTotal,
      pendingBalance: isCtaCte ? totals.grandTotal : 0,
      status: isCtaCte ? "pending" : "paid",
      created_at: new Date().toISOString()
    };
    batch.set(invoiceRef, invoiceData);

    // 4. Ensure contact exists in contacts collection
    const existingContact = allContacts.find(c => c.type === "client" && c.name.toLowerCase() === clientName.toLowerCase());
    if (!existingContact) {
      const contactRef = doc(collection(db, "contacts"));
      batch.set(contactRef, {
        id: contactRef.id,
        type: "client",
        name: clientName,
        cuit: clientCuit || "-",
        address: clientAddress || "-",
        ivaCondition: clientIva,
        created_at: new Date().toISOString()
      });
    }

    await batch.commit();

    showToast(`¡Comprobante ${saleNumber} emitido con éxito!`, "success");
    modal.close();

    // Offer to print voucher
    openPrintVoucher(invoiceData);

  } catch (err) {
    console.error("Error al emitir comprobante:", err);
    showToast(err.message || "Error al guardar comprobante.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.querySelector("span").textContent = "Emitir y Registrar Comprobante";
  }
}

function renderSalesTable() {
  const tbody = document.getElementById("sales-table-body");
  if (!tbody) return;

  const searchQuery = (document.getElementById("sales-search-filter")?.value || "").toLowerCase().trim();
  const typeFilter = document.getElementById("sales-type-filter")?.value || "ALL";
  const statusFilter = document.getElementById("sales-status-filter")?.value || "ALL";

  const sales = allInvoices.filter(inv => inv.type === "sale");

  let totalInvoiced = 0;
  let totalPending = 0;
  let totalCollected = 0;

  sales.forEach(s => {
    totalInvoiced += (s.total || 0);
    totalPending += (s.pendingBalance || 0);
  });
  totalCollected = totalInvoiced - totalPending;

  document.getElementById("sales-kpi-total").textContent = formatCurrency(totalInvoiced);
  document.getElementById("sales-kpi-pending").textContent = formatCurrency(totalPending);
  document.getElementById("sales-kpi-collected").textContent = formatCurrency(totalCollected);

  const filtered = sales.filter(s => {
    const matchesSearch = !searchQuery || 
      (s.clientName && s.clientName.toLowerCase().includes(searchQuery)) ||
      (s.clientCuit && s.clientCuit.includes(searchQuery)) ||
      (s.number && s.number.toLowerCase().includes(searchQuery));

    const matchesType = typeFilter === "ALL" || s.invoiceType === typeFilter;
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 24px;">No se encontraron comprobantes emitidos.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach(inv => {
    const tr = document.createElement("tr");

    let statusBadge = `<span class="erp-badge erp-badge-success">Cobrado</span>`;
    if (inv.status === "pending") {
      statusBadge = `<span class="erp-badge erp-badge-danger">Pendiente</span>`;
    } else if (inv.status === "partial") {
      statusBadge = `<span class="erp-badge erp-badge-warning">Parcial</span>`;
    }

    let typeLabel = inv.invoiceType || "Comprobante";
    if (typeLabel === "FACTURA_A") typeLabel = "Factura A";
    if (typeLabel === "FACTURA_B") typeLabel = "Factura B";
    if (typeLabel === "FACTURA_C") typeLabel = "Factura C";
    if (typeLabel === "REMITO") typeLabel = "Remito / Pres.";

    let condLabel = "Contado";
    if (inv.paymentTerm === "CTA_CTE") condLabel = "Cta Cte";
    if (inv.paymentTerm === "CONTADO_CHEQUE") condLabel = "Cheque";

    tr.innerHTML = `
      <td>${formatDate(inv.date)}</td>
      <td><strong>${typeLabel}</strong> <br><small style="color: var(--text-secondary);">${inv.number}</small></td>
      <td><strong>${inv.clientName}</strong> <br><small style="color: var(--text-secondary);">CUIT: ${inv.clientCuit}</small></td>
      <td><span class="erp-badge erp-badge-neutral">${condLabel}</span></td>
      <td style="text-align: right; font-weight: 700;">${formatCurrency(inv.total)}</td>
      <td style="text-align: right; color: ${inv.pendingBalance > 0 ? '#DC2626' : '#10B981'}; font-weight: 700;">${formatCurrency(inv.pendingBalance || 0)}</td>
      <td style="text-align: center;">${statusBadge}</td>
      <td style="text-align: center;">
        <button class="admin-btn admin-btn-primary print-inv-btn" style="padding: 4px 10px; font-size: 0.75rem; border-radius: var(--radius-sm);" title="Ver / Imprimir Comprobante">
          🖨️ Ver
        </button>
      </td>
    `;

    tr.querySelector(".print-inv-btn").addEventListener("click", () => {
      openPrintVoucher(inv);
    });

    tbody.appendChild(tr);
  });
}

// =============================================================================
// ========================= 2. PURCHASES & EXPENSES MODULE ====================
// =============================================================================

function initPurchasesModule() {
  const openModalBtn = document.getElementById("open-purchase-modal-btn");
  const closeModalBtn = document.getElementById("close-purchase-modal-x");
  const modal = document.getElementById("purchase-modal");
  const purchaseForm = document.getElementById("purchase-form");
  const paymentMethod = document.getElementById("purchase-payment-method");
  const checkContainer = document.getElementById("purchase-check-container");

  // Live tax inputs
  const neto21Input = document.getElementById("purchase-neto-21");
  const iva21Input = document.getElementById("purchase-iva-21");
  const neto105Input = document.getElementById("purchase-neto-105");
  const iva105Input = document.getElementById("purchase-iva-105");
  const percInput = document.getElementById("purchase-perc");
  const exemptInput = document.getElementById("purchase-exempt");

  // Filters
  const searchFilter = document.getElementById("purchases-search-filter");
  const typeFilter = document.getElementById("purchases-type-filter");

  if (searchFilter) searchFilter.addEventListener("input", renderPurchasesTable);
  if (typeFilter) typeFilter.addEventListener("change", renderPurchasesTable);

  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      openPurchaseModal();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      if (modal.open) modal.close();
    });
  }

  if (neto21Input) {
    neto21Input.addEventListener("input", () => {
      const neto = parseFloat(neto21Input.value) || 0;
      iva21Input.value = (neto * 0.21).toFixed(2);
      recalculatePurchaseTotal();
    });
  }
  if (iva21Input) iva21Input.addEventListener("input", recalculatePurchaseTotal);

  if (neto105Input) {
    neto105Input.addEventListener("input", () => {
      const neto = parseFloat(neto105Input.value) || 0;
      iva105Input.value = (neto * 0.105).toFixed(2);
      recalculatePurchaseTotal();
    });
  }
  if (iva105Input) iva105Input.addEventListener("input", recalculatePurchaseTotal);
  if (percInput) percInput.addEventListener("input", recalculatePurchaseTotal);
  if (exemptInput) exemptInput.addEventListener("input", recalculatePurchaseTotal);

  if (paymentMethod) {
    paymentMethod.addEventListener("change", () => {
      if (paymentMethod.value === "CHEQUE_CARTERA") {
        checkContainer.style.display = "block";
        populatePurchaseCheckSelect();
      } else {
        checkContainer.style.display = "none";
      }
    });
  }

  if (purchaseForm) {
    purchaseForm.addEventListener("submit", handleSavePurchase);
  }
}

function openPurchaseModal() {
  const modal = document.getElementById("purchase-modal");
  const form = document.getElementById("purchase-form");
  const dateInput = document.getElementById("purchase-date");
  const stockProdSelect = document.getElementById("purchase-stock-product");
  const checkContainer = document.getElementById("purchase-check-container");

  form.reset();
  checkContainer.style.display = "none";
  dateInput.value = new Date().toISOString().split("T")[0];

  // Populate stock replenishment dropdown
  stockProdSelect.innerHTML = `<option value="">-- Ninguno (No modificar stock) --</option>`;
  allProducts.forEach(prod => {
    stockProdSelect.innerHTML += `<option value="${prod.id}">${prod.name} (Stock actual: ${prod.stock})</option>`;
  });

  recalculatePurchaseTotal();
  modal.showModal();
}

function recalculatePurchaseTotal() {
  const neto21 = parseFloat(document.getElementById("purchase-neto-21").value) || 0;
  const iva21 = parseFloat(document.getElementById("purchase-iva-21").value) || 0;
  const neto105 = parseFloat(document.getElementById("purchase-neto-105").value) || 0;
  const iva105 = parseFloat(document.getElementById("purchase-iva-105").value) || 0;
  const perc = parseFloat(document.getElementById("purchase-perc").value) || 0;
  const exempt = parseFloat(document.getElementById("purchase-exempt").value) || 0;

  const total = neto21 + iva21 + neto105 + iva105 + perc + exempt;
  document.getElementById("purchase-total-final").textContent = formatCurrency(total);
  return { neto21, iva21, neto105, iva105, perc, exempt, total };
}

function populatePurchaseCheckSelect() {
  const select = document.getElementById("purchase-check-select");
  if (!select) return;

  const availableChecks = allChecks.filter(c => c.status === "IN_PORTFOLIO");
  select.innerHTML = `<option value="">-- Seleccionar cheque disponible en cartera --</option>`;
  availableChecks.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.bank} N° ${c.number} - Vto: ${formatDate(c.dueDate)} - $${c.amount} (${c.clientName})</option>`;
  });
}

async function handleSavePurchase(e) {
  e.preventDefault();
  const saveBtn = document.getElementById("save-purchase-btn");
  const modal = document.getElementById("purchase-modal");

  try {
    saveBtn.disabled = true;
    saveBtn.querySelector("span").textContent = "Guardando compra...";

    const type = document.getElementById("purchase-type").value;
    const number = document.getElementById("purchase-number").value.trim();
    const date = document.getElementById("purchase-date").value;
    const supplierName = document.getElementById("purchase-supplier-name").value.trim();
    const supplierCuit = document.getElementById("purchase-supplier-cuit").value.trim();
    const category = document.getElementById("purchase-category").value;
    const stockProductId = document.getElementById("purchase-stock-product").value;
    const stockQty = parseInt(document.getElementById("purchase-stock-qty").value) || 0;
    const paymentMethod = document.getElementById("purchase-payment-method").value;
    const endorsedCheckId = document.getElementById("purchase-check-select")?.value;

    const totals = recalculatePurchaseTotal();

    const batch = writeBatch(db);

    // 1. Stock replenishment if chosen
    if (stockProductId && stockQty > 0) {
      const prod = allProducts.find(p => p.id === stockProductId);
      if (prod) {
        batch.update(doc(db, "products", stockProductId), {
          stock: (parseInt(prod.stock) || 0) + stockQty,
          updated_at: new Date().toISOString()
        });
      }
    }

    // 2. Endorse check if paid with portfolio check
    if (paymentMethod === "CHEQUE_CARTERA" && endorsedCheckId) {
      batch.update(doc(db, "checks", endorsedCheckId), {
        status: "ENDORSED",
        endorsedTo: supplierName,
        endorsedDate: date,
        updated_at: new Date().toISOString()
      });
    }

    // 3. Create purchase invoice document
    const isCtaCte = paymentMethod === "CTA_CTE";
    const invoiceRef = doc(collection(db, "invoices"));
    batch.set(invoiceRef, {
      id: invoiceRef.id,
      type: "purchase",
      invoiceType: type,
      number,
      date,
      supplierName,
      supplierCuit: supplierCuit || "-",
      category,
      neto21: totals.neto21,
      iva21: totals.iva21,
      neto105: totals.neto105,
      iva105: totals.iva105,
      netoTotal: totals.neto21 + totals.neto105,
      ivaTotal: totals.iva21 + totals.iva105,
      percTotal: totals.perc,
      exempt: totals.exempt,
      total: totals.total,
      paymentMethod,
      pendingBalance: isCtaCte ? totals.total : 0,
      status: isCtaCte ? "pending" : "paid",
      created_at: new Date().toISOString()
    });

    // 4. Ensure supplier contact exists
    const existingSupplier = allContacts.find(c => c.type === "supplier" && c.name.toLowerCase() === supplierName.toLowerCase());
    if (!existingSupplier) {
      const contactRef = doc(collection(db, "contacts"));
      batch.set(contactRef, {
        id: contactRef.id,
        type: "supplier",
        name: supplierName,
        cuit: supplierCuit || "-",
        category,
        created_at: new Date().toISOString()
      });
    }

    await batch.commit();

    showToast(`¡Compra / Gasto "${number}" registrado con éxito!`, "success");
    modal.close();

  } catch (err) {
    console.error("Error al registrar compra:", err);
    showToast(err.message || "Error al guardar compra.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.querySelector("span").textContent = "Registrar Compra / Gasto";
  }
}

function renderPurchasesTable() {
  const tbody = document.getElementById("purchases-table-body");
  if (!tbody) return;

  const searchQuery = (document.getElementById("purchases-search-filter")?.value || "").toLowerCase().trim();
  const typeFilter = document.getElementById("purchases-type-filter")?.value || "ALL";

  const purchases = allInvoices.filter(inv => inv.type === "purchase");

  let totalPurchases = 0;
  let totalIvaCredito = 0;
  let totalPending = 0;

  purchases.forEach(p => {
    totalPurchases += (p.total || 0);
    totalIvaCredito += (p.ivaTotal || 0);
    totalPending += (p.pendingBalance || 0);
  });

  document.getElementById("purchases-kpi-total").textContent = formatCurrency(totalPurchases);
  document.getElementById("purchases-kpi-iva").textContent = formatCurrency(totalIvaCredito);
  document.getElementById("purchases-kpi-pending").textContent = formatCurrency(totalPending);

  const filtered = purchases.filter(p => {
    const matchesSearch = !searchQuery ||
      (p.supplierName && p.supplierName.toLowerCase().includes(searchQuery)) ||
      (p.supplierCuit && p.supplierCuit.includes(searchQuery)) ||
      (p.category && p.category.toLowerCase().includes(searchQuery)) ||
      (p.number && p.number.toLowerCase().includes(searchQuery));

    let matchesType = true;
    if (typeFilter === "FACTURA_PROVEEDOR") matchesType = p.invoiceType.startsWith("FACTURA");
    if (typeFilter === "GASTO_OPERATIVO") matchesType = p.invoiceType === "GASTO_OPERATIVO";

    return matchesSearch && matchesType;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 24px;">No se encontraron compras o gastos cargados.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach(p => {
    const tr = document.createElement("tr");

    let statusBadge = `<span class="erp-badge erp-badge-success">Pagado</span>`;
    if (p.status === "pending") {
      statusBadge = `<span class="erp-badge erp-badge-danger">A Pagar</span>`;
    } else if (p.status === "partial") {
      statusBadge = `<span class="erp-badge erp-badge-warning">Parcial</span>`;
    }

    let typeLabel = p.invoiceType || "Compra";
    if (typeLabel === "FACTURA_A") typeLabel = "Factura A";
    if (typeLabel === "FACTURA_B") typeLabel = "Factura B";
    if (typeLabel === "FACTURA_C") typeLabel = "Factura C";
    if (typeLabel === "GASTO_OPERATIVO") typeLabel = "Gasto Op.";

    let condLabel = "Contado";
    if (p.paymentMethod === "CTA_CTE") condLabel = "Cta Cte";
    if (p.paymentMethod === "CHEQUE_CARTERA") condLabel = "Cheque Cart.";

    tr.innerHTML = `
      <td>${formatDate(p.date)}</td>
      <td><strong>${typeLabel}</strong> <br><small style="color: var(--text-secondary);">${p.number}</small></td>
      <td><strong>${p.supplierName}</strong> <br><small style="color: var(--text-secondary);">${p.category}</small></td>
      <td style="text-align: right;">${formatCurrency(p.netoTotal || 0)}</td>
      <td style="text-align: right; color: #10B981; font-weight: 600;">${formatCurrency(p.ivaTotal || 0)}</td>
      <td style="text-align: right;">${formatCurrency(p.percTotal || 0)}</td>
      <td style="text-align: right; font-weight: 700; color: #DC2626;">${formatCurrency(p.total)}</td>
      <td><span class="erp-badge erp-badge-neutral">${condLabel}</span></td>
      <td style="text-align: center;">${statusBadge}</td>
      <td style="text-align: center;">
        <button class="admin-btn admin-btn-primary print-pur-btn" style="padding: 4px 10px; font-size: 0.75rem; border-radius: var(--radius-sm);">
          Detalle
        </button>
      </td>
    `;

    tr.querySelector(".print-pur-btn").addEventListener("click", () => {
      openPrintVoucher(p);
    });

    tbody.appendChild(tr);
  });
}

// =============================================================================
// ========================= 3. CHECKING ACCOUNTS MODULE =======================
// =============================================================================

function initCheckingModule() {
  const btnClients = document.getElementById("cta-tab-clients");
  const btnSuppliers = document.getElementById("cta-tab-suppliers");
  const openModalBtn = document.getElementById("open-payment-modal-btn");
  const closeModalBtn = document.getElementById("close-payment-modal-x");
  const modal = document.getElementById("payment-modal");
  const paymentForm = document.getElementById("payment-form");
  const directionSelect = document.getElementById("payment-direction");
  const contactSelect = document.getElementById("payment-contact-select");
  const methodSelect = document.getElementById("payment-method");
  const thirdCheckFields = document.getElementById("payment-check-third-fields");
  const carteraCheckFields = document.getElementById("payment-check-cartera-fields");
  const searchFilter = document.getElementById("checking-search-filter");

  if (searchFilter) searchFilter.addEventListener("input", renderCheckingAccounts);

  if (btnClients) {
    btnClients.addEventListener("click", () => {
      currentCheckingSubtab = "clients";
      btnClients.className = "admin-btn admin-btn-primary";
      btnSuppliers.className = "admin-btn";
      btnSuppliers.style.backgroundColor = "var(--bg-surface-low)";
      btnSuppliers.style.color = "var(--text-primary)";
      renderCheckingAccounts();
    });
  }

  if (btnSuppliers) {
    btnSuppliers.addEventListener("click", () => {
      currentCheckingSubtab = "suppliers";
      btnSuppliers.className = "admin-btn admin-btn-primary";
      btnClients.className = "admin-btn";
      btnClients.style.backgroundColor = "var(--bg-surface-low)";
      btnClients.style.color = "var(--text-primary)";
      renderCheckingAccounts();
    });
  }

  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      openPaymentModal();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      if (modal.open) modal.close();
    });
  }

  if (directionSelect) {
    directionSelect.addEventListener("change", () => {
      populatePaymentContactSelect();
      updatePaymentMethodOptions();
    });
  }

  if (contactSelect) {
    contactSelect.addEventListener("change", () => {
      loadContactPendingInvoicesForPayment(contactSelect.value);
    });
  }

  if (methodSelect) {
    methodSelect.addEventListener("change", () => {
      if (methodSelect.value === "CHEQUE_TERCERO") {
        thirdCheckFields.style.display = "block";
        carteraCheckFields.style.display = "none";
      } else if (methodSelect.value === "CHEQUE_CARTERA") {
        carteraCheckFields.style.display = "block";
        thirdCheckFields.style.display = "none";
        populatePortfolioChecksForPayment();
      } else {
        thirdCheckFields.style.display = "none";
        carteraCheckFields.style.display = "none";
      }
    });
  }

  if (paymentForm) {
    paymentForm.addEventListener("submit", handleSavePayment);
  }
}

function updateCheckingKPIs() {
  let clientsPending = 0;
  let suppliersPending = 0;

  allInvoices.forEach(inv => {
    if (inv.type === "sale") {
      clientsPending += (inv.pendingBalance || 0);
    } else if (inv.type === "purchase") {
      suppliersPending += (inv.pendingBalance || 0);
    }
  });

  const kpiClients = document.getElementById("checking-kpi-clients-pending");
  const kpiSuppliers = document.getElementById("checking-kpi-suppliers-pending");
  if (kpiClients) kpiClients.textContent = formatCurrency(clientsPending);
  if (kpiSuppliers) kpiSuppliers.textContent = formatCurrency(suppliersPending);
}

function renderCheckingAccounts() {
  const tbody = document.getElementById("checking-table-body");
  if (!tbody) return;

  updateCheckingKPIs();

  const query = (document.getElementById("checking-search-filter")?.value || "").toLowerCase().trim();
  const isClients = currentCheckingSubtab === "clients";

  // Group invoices by contact name
  const contactMap = {};

  allInvoices.forEach(inv => {
    if (isClients && inv.type === "sale") {
      const name = inv.clientName || "Sin Nombre";
      if (!contactMap[name]) {
        contactMap[name] = {
          name,
          cuit: inv.clientCuit || "-",
          address: inv.clientAddress || "-",
          totalAmount: 0,
          pendingAmount: 0,
          invoicesCount: 0
        };
      }
      contactMap[name].totalAmount += (inv.total || 0);
      contactMap[name].pendingAmount += (inv.pendingBalance || 0);
      contactMap[name].invoicesCount++;
    } else if (!isClients && inv.type === "purchase") {
      const name = inv.supplierName || "Sin Proveedor";
      if (!contactMap[name]) {
        contactMap[name] = {
          name,
          cuit: inv.supplierCuit || "-",
          address: inv.category || "-",
          totalAmount: 0,
          pendingAmount: 0,
          invoicesCount: 0
        };
      }
      contactMap[name].totalAmount += (inv.total || 0);
      contactMap[name].pendingAmount += (inv.pendingBalance || 0);
      contactMap[name].invoicesCount++;
    }
  });

  let contacts = Object.values(contactMap);
  if (query) {
    contacts = contacts.filter(c => c.name.toLowerCase().includes(query) || c.cuit.includes(query));
  }

  // Sort by pending balance descending (debtors first)
  contacts.sort((a, b) => b.pendingAmount - a.pendingAmount);

  if (contacts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 24px;">No hay cuentas corrientes en ${isClients ? 'clientes' : 'proveedores'}.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  contacts.forEach(c => {
    const totalPaid = c.totalAmount - c.pendingAmount;
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><strong>${c.name}</strong> <br><small style="color: var(--text-secondary);">${c.invoicesCount} comprobantes</small></td>
      <td>${c.cuit}</td>
      <td>${c.address}</td>
      <td style="text-align: right; font-weight: 600;">${formatCurrency(c.totalAmount)}</td>
      <td style="text-align: right; color: #10B981; font-weight: 600;">${formatCurrency(totalPaid)}</td>
      <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: ${c.pendingAmount > 0 ? (isClients ? '#D97706' : '#DC2626') : '#10B981'};">
        ${formatCurrency(c.pendingAmount)}
      </td>
      <td style="text-align: center;">
        <button class="admin-btn admin-btn-accent impute-btn" style="padding: 4px 10px; font-size: 0.75rem; border-radius: var(--radius-sm);" ${c.pendingAmount <= 0 ? 'disabled' : ''}>
          ${isClients ? '➕ Cobrar' : '➕ Pagar'}
        </button>
      </td>
    `;

    tr.querySelector(".impute-btn").addEventListener("click", () => {
      openPaymentModal(isClients ? "CLIENT_COLLECTION" : "SUPPLIER_PAYMENT", c.name);
    });

    tbody.appendChild(tr);
  });
}

function openPaymentModal(direction = "CLIENT_COLLECTION", preselectedContact = "") {
  const modal = document.getElementById("payment-modal");
  const form = document.getElementById("payment-form");
  const dateInput = document.getElementById("payment-date");
  const dirSelect = document.getElementById("payment-direction");

  form.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
  dirSelect.value = direction;

  updatePaymentMethodOptions();
  populatePaymentContactSelect(preselectedContact);

  if (preselectedContact) {
    loadContactPendingInvoicesForPayment(preselectedContact);
  }

  modal.showModal();
}

function updatePaymentMethodOptions() {
  const dir = document.getElementById("payment-direction").value;
  const methodSelect = document.getElementById("payment-method");
  const thirdFields = document.getElementById("payment-check-third-fields");
  const carteraFields = document.getElementById("payment-check-cartera-fields");

  thirdFields.style.display = "none";
  carteraFields.style.display = "none";

  if (dir === "CLIENT_COLLECTION") {
    methodSelect.innerHTML = `
      <option value="EFECTIVO">Efectivo</option>
      <option value="TRANSFERENCIA">Transferencia Bancaria</option>
      <option value="CHEQUE_TERCERO">Cheque de Tercero (Ingreso a Cartera)</option>
    `;
  } else {
    methodSelect.innerHTML = `
      <option value="EFECTIVO">Efectivo</option>
      <option value="TRANSFERENCIA">Transferencia Bancaria</option>
      <option value="CHEQUE_CARTERA">Cheque de Cartera (Endoso a Proveedor)</option>
    `;
  }
}

function populatePaymentContactSelect(preselected = "") {
  const dir = document.getElementById("payment-direction").value;
  const select = document.getElementById("payment-contact-select");
  const isClient = dir === "CLIENT_COLLECTION";

  // Collect distinct contacts with pending invoices
  const relevantInvoices = allInvoices.filter(i => (isClient ? i.type === "sale" : i.type === "purchase") && (i.pendingBalance > 0));
  const contactNames = [...new Set(relevantInvoices.map(i => isClient ? i.clientName : i.supplierName))];

  select.innerHTML = `<option value="">-- Seleccionar Contacto con Saldo Pendiente --</option>`;
  contactNames.forEach(name => {
    const isSel = name.toLowerCase() === preselected.toLowerCase();
    select.innerHTML += `<option value="${name}" ${isSel ? 'selected' : ''}>${name}</option>`;
  });
}

function populatePortfolioChecksForPayment() {
  const select = document.getElementById("payment-portfolio-check-select");
  if (!select) return;

  const available = allChecks.filter(c => c.status === "IN_PORTFOLIO");
  select.innerHTML = `<option value="">-- Seleccionar cheque disponible --</option>`;
  available.forEach(c => {
    select.innerHTML += `<option value="${c.id}" data-amount="${c.amount}">${c.bank} N° ${c.number} - $${c.amount} (Vto: ${formatDate(c.dueDate)})</option>`;
  });

  select.addEventListener("change", () => {
    const opt = select.options[select.selectedIndex];
    if (opt && opt.getAttribute("data-amount")) {
      document.getElementById("payment-amount").value = opt.getAttribute("data-amount");
      distributePaymentAmountAcrossInvoices();
    }
  });
}

function loadContactPendingInvoicesForPayment(contactName) {
  const container = document.getElementById("payment-invoices-list");
  if (!contactName) {
    container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; margin: 12px 0;">Selecciona un contacto con comprobantes pendientes.</p>`;
    return;
  }

  const dir = document.getElementById("payment-direction").value;
  const isClient = dir === "CLIENT_COLLECTION";

  const pendingInvoices = allInvoices.filter(i => 
    (isClient ? i.type === "sale" : i.type === "purchase") &&
    (isClient ? i.clientName === contactName : i.supplierName === contactName) &&
    (i.pendingBalance > 0)
  );

  if (pendingInvoices.length === 0) {
    container.innerHTML = `<p style="font-size: 0.8rem; color: #10B981; text-align: center; margin: 12px 0;">✓ Este contacto no tiene saldos pendientes.</p>`;
    return;
  }

  container.innerHTML = "";
  let totalPending = 0;

  pendingInvoices.forEach(inv => {
    totalPending += inv.pendingBalance;
    const row = document.createElement("div");
    row.className = "impute-row";
    row.style.cssText = "display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border-light); font-size: 0.8rem;";

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <input type="checkbox" class="impute-checkbox" checked data-inv-id="${inv.id}">
        <span><strong>${inv.invoiceType || 'Comp'}</strong> ${inv.number} (${formatDate(inv.date)})</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: var(--text-secondary);">Debe: <strong>${formatCurrency(inv.pendingBalance)}</strong></span>
        <input type="number" class="form-control impute-input" value="${inv.pendingBalance}" step="0.01" min="0" max="${inv.pendingBalance}" style="width: 100px; padding: 4px; font-size: 0.8rem; text-align: right;">
      </div>
    `;

    const chk = row.querySelector(".impute-checkbox");
    const inp = row.querySelector(".impute-input");

    chk.addEventListener("change", () => {
      inp.disabled = !chk.checked;
      if (!chk.checked) inp.value = "0";
      else inp.value = inv.pendingBalance;
      sumImputeInputs();
    });

    inp.addEventListener("input", () => {
      sumImputeInputs();
    });

    container.appendChild(row);
  });

  document.getElementById("payment-amount").value = totalPending.toFixed(2);

  const amountInput = document.getElementById("payment-amount");
  amountInput.addEventListener("input", distributePaymentAmountAcrossInvoices);
}

function sumImputeInputs() {
  const inputs = document.querySelectorAll("#payment-invoices-list .impute-input");
  let total = 0;
  inputs.forEach(inp => {
    if (!inp.disabled) total += (parseFloat(inp.value) || 0);
  });
  document.getElementById("payment-amount").value = total.toFixed(2);
}

function distributePaymentAmountAcrossInvoices() {
  let available = parseFloat(document.getElementById("payment-amount").value) || 0;
  const rows = document.querySelectorAll("#payment-invoices-list .impute-row");

  rows.forEach(row => {
    const chk = row.querySelector(".impute-checkbox");
    const inp = row.querySelector(".impute-input");
    const invId = chk.getAttribute("data-inv-id");
    const inv = allInvoices.find(i => i.id === invId);

    if (inv && available > 0) {
      chk.checked = true;
      inp.disabled = false;
      const apply = Math.min(available, inv.pendingBalance);
      inp.value = apply.toFixed(2);
      available -= apply;
    } else {
      chk.checked = false;
      inp.disabled = true;
      inp.value = "0";
    }
  });
}

async function handleSavePayment(e) {
  e.preventDefault();
  const saveBtn = document.getElementById("save-payment-btn");
  const modal = document.getElementById("payment-modal");

  try {
    saveBtn.disabled = true;
    saveBtn.querySelector("span").textContent = "Procesando imputación...";

    const direction = document.getElementById("payment-direction").value;
    const contactName = document.getElementById("payment-contact-select").value;
    const date = document.getElementById("payment-date").value;
    const method = document.getElementById("payment-method").value;
    const totalAmount = parseFloat(document.getElementById("payment-amount").value) || 0;

    if (!contactName) throw new Error("Seleccioná un contacto.");
    if (totalAmount <= 0) throw new Error("El monto a imputar debe ser mayor a 0.");

    const rows = document.querySelectorAll("#payment-invoices-list .impute-row");
    const imputations = [];

    rows.forEach(row => {
      const chk = row.querySelector(".impute-checkbox");
      const inp = row.querySelector(".impute-input");
      if (chk.checked) {
        const invId = chk.getAttribute("data-inv-id");
        const applied = parseFloat(inp.value) || 0;
        if (applied > 0) {
          imputations.push({ invoiceId: invId, amount: applied });
        }
      }
    });

    if (imputations.length === 0) {
      throw new Error("No seleccionaste comprobantes para cancelar.");
    }

    const batch = writeBatch(db);

    // 1. Update pending balances of each affected invoice
    for (const imp of imputations) {
      const inv = allInvoices.find(i => i.id === imp.invoiceId);
      if (inv) {
        const newBalance = Math.max(0, (inv.pendingBalance || 0) - imp.amount);
        const newStatus = newBalance <= 0.01 ? "paid" : "partial";
        batch.update(doc(db, "invoices", imp.invoiceId), {
          pendingBalance: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString()
        });
      }
    }

    // 2. If client paid with a new check, register in checks
    if (direction === "CLIENT_COLLECTION" && method === "CHEQUE_TERCERO") {
      const bank = document.getElementById("payment-check-bank").value.trim();
      const checkNum = document.getElementById("payment-check-number").value.trim();
      const dueDate = document.getElementById("payment-check-due").value;
      const drawer = document.getElementById("payment-check-drawer").value.trim();

      const checkRef = doc(collection(db, "checks"));
      batch.set(checkRef, {
        id: checkRef.id,
        direction: "RECEIVED",
        status: "IN_PORTFOLIO",
        bank: bank || "No informado",
        number: checkNum || "S/N",
        dueDate: dueDate || date,
        drawer: drawer || contactName,
        clientName: contactName,
        amount: totalAmount,
        receivedDate: date,
        created_at: new Date().toISOString()
      });
    }

    // 3. If paid supplier with a portfolio check, endorse check
    if (direction === "SUPPLIER_PAYMENT" && method === "CHEQUE_CARTERA") {
      const checkId = document.getElementById("payment-portfolio-check-select").value;
      if (checkId) {
        batch.update(doc(db, "checks", checkId), {
          status: "ENDORSED",
          endorsedTo: contactName,
          endorsedDate: date,
          updated_at: new Date().toISOString()
        });
      }
    }

    // 4. Save payment receipt document
    const paymentRef = doc(collection(db, "payments"));
    batch.set(paymentRef, {
      id: paymentRef.id,
      direction,
      contactName,
      date,
      method,
      amount: totalAmount,
      imputations,
      created_at: new Date().toISOString()
    });

    await batch.commit();

    showToast(`¡Cobro / Pago de ${formatCurrency(totalAmount)} imputado con éxito!`, "success");
    modal.close();

  } catch (err) {
    console.error("Error al imputar pago:", err);
    showToast(err.message || "Error al procesar pago.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.querySelector("span").textContent = "Registrar e Imputar Pago";
  }
}

function populateContactSelects() {
  // Utility if other selects need contacts
}

function populateCheckSelects() {
  populatePurchaseCheckSelect();
  populatePortfolioChecksForPayment();
}

// =============================================================================
// ========================= 4. CHECKS PORTFOLIO MODULE ========================
// =============================================================================

function initChecksModule() {
  const searchFilter = document.getElementById("checks-search-filter");
  const statusFilter = document.getElementById("checks-status-filter");

  if (searchFilter) searchFilter.addEventListener("input", renderChecksTable);
  if (statusFilter) statusFilter.addEventListener("change", renderChecksTable);
}

function renderChecksTable() {
  const tbody = document.getElementById("checks-table-body");
  if (!tbody) return;

  const searchQuery = (document.getElementById("checks-search-filter")?.value || "").toLowerCase().trim();
  const statusFilter = document.getElementById("checks-status-filter")?.value || "ALL";

  let available = 0;
  let collected = 0;
  let endorsed = 0;
  let rejected = 0;

  allChecks.forEach(c => {
    const amt = parseFloat(c.amount) || 0;
    if (c.status === "IN_PORTFOLIO") available += amt;
    else if (c.status === "DEPOSITED") collected += amt;
    else if (c.status === "ENDORSED") endorsed += amt;
    else if (c.status === "REJECTED") rejected += amt;
  });

  document.getElementById("checks-kpi-available").textContent = formatCurrency(available);
  document.getElementById("checks-kpi-collected").textContent = formatCurrency(collected);
  document.getElementById("checks-kpi-endorsed").textContent = formatCurrency(endorsed);
  document.getElementById("checks-kpi-rejected").textContent = formatCurrency(rejected);

  const filtered = allChecks.filter(c => {
    const matchesSearch = !searchQuery ||
      (c.number && c.number.toLowerCase().includes(searchQuery)) ||
      (c.bank && c.bank.toLowerCase().includes(searchQuery)) ||
      (c.clientName && c.clientName.toLowerCase().includes(searchQuery)) ||
      (c.drawer && c.drawer.toLowerCase().includes(searchQuery));

    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 24px;">No hay cheques registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach(c => {
    const tr = document.createElement("tr");

    let statusBadge = `<span class="erp-badge erp-badge-warning">En Cartera</span>`;
    let actionsHtml = `
      <button class="admin-btn admin-btn-primary act-deposit" style="padding: 4px 8px; font-size: 0.7rem; border-radius: var(--radius-sm);" title="Marcar como cobrado / depositado en banco">Cobrado</button>
      <button class="admin-btn-danger act-reject" style="padding: 4px 8px; font-size: 0.7rem; border-radius: var(--radius-sm);" title="Marcar como rechazado">Rechazado</button>
    `;

    if (c.status === "DEPOSITED") {
      statusBadge = `<span class="erp-badge erp-badge-success">Cobrado</span>`;
      actionsHtml = `<small style="color: var(--text-secondary);">Acreditado</small>`;
    } else if (c.status === "ENDORSED") {
      statusBadge = `<span class="erp-badge erp-badge-info">Endosado</span>`;
      actionsHtml = `<small style="color: var(--text-secondary);">A: ${c.endorsedTo || 'Proveedor'}</small>`;
    } else if (c.status === "REJECTED") {
      statusBadge = `<span class="erp-badge erp-badge-danger">Rechazado</span>`;
      actionsHtml = `<button class="admin-btn act-reopen" style="padding: 4px 8px; font-size: 0.7rem; border-radius: var(--radius-sm); background: var(--bg-surface-low);">Reabrir</button>`;
    }

    tr.innerHTML = `
      <td><strong>${c.number || '-'}</strong></td>
      <td>${c.bank || '-'}</td>
      <td>${formatDate(c.dueDate)}</td>
      <td><strong>${c.clientName || '-'}</strong></td>
      <td>${c.drawer || '-'}</td>
      <td style="text-align: right; font-weight: 700; color: var(--primary-navy);">${formatCurrency(c.amount)}</td>
      <td style="text-align: center;">${statusBadge}</td>
      <td style="text-align: center; white-space: nowrap;">${actionsHtml}</td>
    `;

    const btnDep = tr.querySelector(".act-deposit");
    const btnRej = tr.querySelector(".act-reject");
    const btnReop = tr.querySelector(".act-reopen");

    if (btnDep) {
      btnDep.addEventListener("click", () => updateCheckStatus(c.id, "DEPOSITED", "Cheque marcado como cobrado/depositado"));
    }
    if (btnRej) {
      btnRej.addEventListener("click", () => updateCheckStatus(c.id, "REJECTED", "Cheque marcado como rechazado"));
    }
    if (btnReop) {
      btnReop.addEventListener("click", () => updateCheckStatus(c.id, "IN_PORTFOLIO", "Cheque reabierto a cartera"));
    }

    tbody.appendChild(tr);
  });
}

async function updateCheckStatus(checkId, newStatus, successMsg) {
  try {
    await updateDoc(doc(db, "checks", checkId), {
      status: newStatus,
      updated_at: new Date().toISOString()
    });
    showToast(successMsg, "success");
  } catch (err) {
    console.error("Error al actualizar cheque:", err);
    showToast("Error al modificar estado del cheque.", "error");
  }
}

// =============================================================================
// ==================== 5. FINANCIAL & TAX REPORT (IVA / RET) ==================
// =============================================================================

function initFinanceModule() {
  const presetSelect = document.getElementById("finance-period-preset");
  const dateInputs = document.getElementById("finance-date-inputs");
  const filterBtn = document.getElementById("finance-filter-btn");

  if (presetSelect) {
    presetSelect.addEventListener("change", () => {
      if (presetSelect.value === "CUSTOM") {
        dateInputs.style.display = "flex";
      } else {
        dateInputs.style.display = "none";
        calculateFinancialReport();
      }
    });
  }

  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      calculateFinancialReport();
    });
  }

  // Pre-fill date inputs with current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];

  const startInput = document.getElementById("finance-date-start");
  const endInput = document.getElementById("finance-date-end");
  if (startInput) startInput.value = firstDay;
  if (endInput) endInput.value = today;
}

function calculateFinancialReport() {
  const preset = document.getElementById("finance-period-preset")?.value || "CURRENT_MONTH";
  const startInput = document.getElementById("finance-date-start")?.value;
  const endInput = document.getElementById("finance-date-end")?.value;

  const now = new Date();
  let startDate = null;
  let endDate = null;

  if (preset === "CURRENT_MONTH") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (preset === "PREVIOUS_MONTH") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (preset === "CURRENT_YEAR") {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (preset === "CUSTOM") {
    if (startInput) startDate = new Date(startInput + "T00:00:00");
    if (endInput) endDate = new Date(endInput + "T23:59:59");
  } // ALL means null boundaries

  // Filter sales and purchases in range
  const salesInRange = allInvoices.filter(i => {
    if (i.type !== "sale") return false;
    if (!startDate && !endDate) return true;
    const d = new Date(i.date || i.created_at);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const purchasesInRange = allInvoices.filter(i => {
    if (i.type !== "purchase") return false;
    if (!startDate && !endDate) return true;
    const d = new Date(i.date || i.created_at);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  // Sales totals
  let salesTotal = 0;
  let salesNeto21 = 0;
  let salesIva21 = 0;
  let salesNeto105 = 0;
  let salesIva105 = 0;
  let salesPerc = 0;

  salesInRange.forEach(s => {
    salesTotal += (s.total || 0);
    salesNeto21 += (s.neto21 || 0);
    salesIva21 += (s.iva21 || 0);
    salesNeto105 += (s.neto105 || 0);
    salesIva105 += (s.iva105 || 0);
    salesPerc += (s.percTotal || 0);
  });
  const salesIvaTotal = salesIva21 + salesIva105;

  // Purchases totals
  let purchasesTotal = 0;
  let purchasesNeto21 = 0;
  let purchasesIva21 = 0;
  let purchasesNeto105 = 0;
  let purchasesIva105 = 0;
  let purchasesPerc = 0;

  purchasesInRange.forEach(p => {
    purchasesTotal += (p.total || 0);
    purchasesNeto21 += (p.neto21 || 0);
    purchasesIva21 += (p.iva21 || 0);
    purchasesNeto105 += (p.neto105 || 0);
    purchasesIva105 += (p.iva105 || 0);
    purchasesPerc += (p.percTotal || 0);
  });
  const purchasesIvaTotal = purchasesIva21 + purchasesIva105;

  // Technical VAT balance: Débito Fiscal - Crédito Fiscal
  const taxNetResult = salesIvaTotal - purchasesIvaTotal;

  // Cashflow: Real cash received vs paid in period
  let realCashIn = 0;
  salesInRange.forEach(s => {
    if (s.paymentTerm !== "CTA_CTE") realCashIn += s.total;
    else realCashIn += (s.total - (s.pendingBalance || 0));
  });

  let realCashOut = 0;
  purchasesInRange.forEach(p => {
    if (p.paymentMethod !== "CTA_CTE") realCashOut += p.total;
    else realCashOut += (p.total - (p.pendingBalance || 0));
  });
  const cashflowNet = realCashIn - realCashOut;

  // Update UI Elements
  document.getElementById("fin-kpi-sales").textContent = formatCurrency(salesTotal);
  document.getElementById("fin-kpi-sales-sub").textContent = `${salesInRange.length} comprobantes emitidos`;

  document.getElementById("fin-kpi-purchases").textContent = formatCurrency(purchasesTotal);
  document.getElementById("fin-kpi-purchases-sub").textContent = `${purchasesInRange.length} facturas/gastos`;

  const taxCard = document.getElementById("fin-kpi-card-tax");
  const taxBalanceEl = document.getElementById("fin-kpi-tax-balance");
  const taxStatusEl = document.getElementById("fin-kpi-tax-status");

  taxBalanceEl.textContent = formatCurrency(Math.abs(taxNetResult));
  if (taxNetResult > 0) {
    taxStatusEl.textContent = "A Pagar a AFIP (Débito > Crédito)";
    taxStatusEl.style.color = "#DC2626";
    taxCard.className = "finance-kpi-card danger";
  } else if (taxNetResult < 0) {
    taxStatusEl.textContent = "Saldo Técnico a Favor (Crédito > Débito)";
    taxStatusEl.style.color = "#10B981";
    taxCard.className = "finance-kpi-card success";
  } else {
    taxStatusEl.textContent = "Saldo Técnico Neutro ($0.00)";
    taxStatusEl.style.color = "var(--text-secondary)";
    taxCard.className = "finance-kpi-card";
  }

  document.getElementById("fin-kpi-cashflow").textContent = formatCurrency(cashflowNet);

  // Sales Tax Table
  document.getElementById("fin-sales-neto-21").textContent = formatCurrency(salesNeto21);
  document.getElementById("fin-sales-iva-21").textContent = formatCurrency(salesIva21);
  document.getElementById("fin-sales-neto-105").textContent = formatCurrency(salesNeto105);
  document.getElementById("fin-sales-iva-105").textContent = formatCurrency(salesIva105);
  document.getElementById("fin-sales-perc").textContent = formatCurrency(salesPerc);
  document.getElementById("fin-sales-iva-total").textContent = formatCurrency(salesIvaTotal);

  // Purchases Tax Table
  document.getElementById("fin-purchases-neto-21").textContent = formatCurrency(purchasesNeto21);
  document.getElementById("fin-purchases-iva-21").textContent = formatCurrency(purchasesIva21);
  document.getElementById("fin-purchases-neto-105").textContent = formatCurrency(purchasesNeto105);
  document.getElementById("fin-purchases-iva-105").textContent = formatCurrency(purchasesIva105);
  document.getElementById("fin-purchases-perc").textContent = formatCurrency(purchasesPerc);
  document.getElementById("fin-purchases-iva-total").textContent = formatCurrency(purchasesIvaTotal);

  // Bottom Banner
  const bannerResult = document.getElementById("fin-tax-net-result");
  const bannerLabel = document.getElementById("fin-tax-net-label");

  bannerResult.textContent = formatCurrency(Math.abs(taxNetResult));
  if (taxNetResult > 0) {
    bannerLabel.textContent = "Saldo Técnico a Pagar a AFIP (Posición Deudora)";
    bannerLabel.style.color = "#FCA5A5";
  } else if (taxNetResult < 0) {
    bannerLabel.textContent = "Saldo Técnico a Favor del Contribuyente";
    bannerLabel.style.color = "#6EE7B7";
  } else {
    bannerLabel.textContent = "Saldo Técnico Neutro";
    bannerLabel.style.color = "white";
  }
}

// =============================================================================
// ========================= 6. PRINT VOUCHER MODAL ============================
// =============================================================================

function initPrintModal() {
  const closeBtn = document.getElementById("close-print-modal-x");
  const printBtn = document.getElementById("trigger-print-btn");
  const modal = document.getElementById("print-modal");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (modal.open) modal.close();
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}

function openPrintVoucher(inv) {
  const modal = document.getElementById("print-modal");
  const container = document.getElementById("print-voucher-content");
  if (!modal || !container) return;

  const isSale = inv.type === "sale";
  let letter = "X";
  let typeTitle = "REMITO / PRESUPUESTO COMERCIAL";

  if (inv.invoiceType === "FACTURA_A") {
    letter = "A";
    typeTitle = "FACTURA A";
  } else if (inv.invoiceType === "FACTURA_B") {
    letter = "B";
    typeTitle = "FACTURA B";
  } else if (inv.invoiceType === "FACTURA_C") {
    letter = "C";
    typeTitle = "FACTURA C";
  } else if (inv.invoiceType === "GASTO_OPERATIVO") {
    letter = "G";
    typeTitle = "COMPROBANTE DE GASTO";
  }

  let itemsRows = "";
  if (inv.items && inv.items.length > 0) {
    inv.items.forEach(item => {
      itemsRows += `
        <tr>
          <td style="text-align: center; border-bottom: 1px solid #E2E8F0; padding: 6px;">${item.qty}</td>
          <td style="border-bottom: 1px solid #E2E8F0; padding: 6px;">${item.name}</td>
          <td style="text-align: right; border-bottom: 1px solid #E2E8F0; padding: 6px;">${formatCurrency(item.price)}</td>
          <td style="text-align: center; border-bottom: 1px solid #E2E8F0; padding: 6px;">${item.vatRate}%</td>
          <td style="text-align: right; border-bottom: 1px solid #E2E8F0; padding: 6px; font-weight: 600;">${formatCurrency(item.subtotal)}</td>
        </tr>
      `;
    });
  } else {
    itemsRows = `
      <tr>
        <td style="text-align: center; border-bottom: 1px solid #E2E8F0; padding: 6px;">1</td>
        <td style="border-bottom: 1px solid #E2E8F0; padding: 6px;">${inv.category || 'Servicios / Conceptos varios'}</td>
        <td style="text-align: right; border-bottom: 1px solid #E2E8F0; padding: 6px;">${formatCurrency(inv.netoTotal || inv.total)}</td>
        <td style="text-align: center; border-bottom: 1px solid #E2E8F0; padding: 6px;">-</td>
        <td style="text-align: right; border-bottom: 1px solid #E2E8F0; padding: 6px; font-weight: 600;">${formatCurrency(inv.total)}</td>
      </tr>
    `;
  }

  const clientOrSupplierName = isSale ? inv.clientName : inv.supplierName;
  const clientOrSupplierCuit = isSale ? inv.clientCuit : inv.supplierCuit;
  const condition = inv.paymentTerm || inv.paymentMethod || "Contado";

  container.innerHTML = `
    <div style="border: 2px solid #0B2545; border-radius: 8px; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; background: white;">
      
      <!-- Top Header -->
      <div style="display: flex; justify-content: space-between; position: relative; border-bottom: 2px solid #0B2545; padding-bottom: 14px; margin-bottom: 14px;">
        
        <!-- Left: Company Info -->
        <div style="flex: 1;">
          <h2 style="margin: 0 0 4px 0; color: #0B2545; font-size: 1.4rem; font-weight: 800;">CARLITOS AUTOPARTES</h2>
          <p style="margin: 0; font-size: 0.8rem; color: #475569;">Venta de Repuestos y Accesorios del Automotor</p>
          <p style="margin: 0; font-size: 0.8rem; color: #475569;">Av. San Martín 1540 - Bs. As., Argentina</p>
          <p style="margin: 0; font-size: 0.8rem; color: #475569;">Tel: (011) 4567-8900 / carlitosautopartes.com</p>
          <p style="margin: 4px 0 0 0; font-size: 0.8rem; font-weight: 600;">IVA Responsable Inscripto</p>
        </div>

        <!-- Center: Voucher Type Letter Badge -->
        <div style="position: absolute; left: 50%; transform: translateX(-50%); top: -4px; text-align: center; border: 2px solid #0B2545; width: 44px; height: 44px; border-radius: 6px; background: #FFC107; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: 900; color: #0B2545;">
          ${letter}
        </div>

        <!-- Right: Invoice Metadata -->
        <div style="flex: 1; text-align: right;">
          <h3 style="margin: 0 0 4px 0; color: #0B2545; font-size: 1.15rem; font-weight: 800;">${typeTitle}</h3>
          <p style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0B2545;">N°: ${inv.number}</p>
          <p style="margin: 0; font-size: 0.8rem; color: #475569;">Fecha: <strong>${formatDate(inv.date)}</strong></p>
          <p style="margin: 0; font-size: 0.8rem; color: #475569;">CUIT: <strong>30-71239845-8</strong></p>
          <p style="margin: 0; font-size: 0.8rem; color: #475569;">Ingresos Brutos: <strong>30-71239845-8</strong></p>
          <p style="margin: 0; font-size: 0.8rem; color: #475569;">Inicio de Actividades: <strong>01/03/2012</strong></p>
        </div>
      </div>

      <!-- Customer / Entity Box -->
      <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 0.82rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>${isSale ? 'Señor(es)' : 'Proveedor'}: <strong>${clientOrSupplierName}</strong></span>
          <span>CUIT / DNI: <strong>${clientOrSupplierCuit}</strong></span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Condición IVA: <strong>${inv.clientIva || 'Consumidor Final'}</strong></span>
          <span>Condición de Venta: <strong>${condition}</strong></span>
        </div>
        ${inv.clientAddress ? `<div style="margin-top: 4px; color: #64748B;">Domicilio: ${inv.clientAddress}</div>` : ''}
      </div>

      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 16px;">
        <thead>
          <tr style="background: #0B2545; color: white;">
            <th style="padding: 6px; text-align: center; width: 60px;">Cant.</th>
            <th style="padding: 6px; text-align: left;">Descripción / Concepto</th>
            <th style="padding: 6px; text-align: right; width: 110px;">P. Unit</th>
            <th style="padding: 6px; text-align: center; width: 65px;">Alíc. IVA</th>
            <th style="padding: 6px; text-align: right; width: 120px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Bottom Financial Summary -->
      <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
        <div style="width: 280px; font-size: 0.82rem;">
          <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #E2E8F0;">
            <span style="color: #64748B;">Subtotal Neto Gravado:</span>
            <span>${formatCurrency(inv.netoTotal || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #E2E8F0;">
            <span style="color: #64748B;">IVA Débito / Crédito (21% + 10.5%):</span>
            <span>${formatCurrency(inv.ivaTotal || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #E2E8F0;">
            <span style="color: #64748B;">Percepciones IIBB / IVA:</span>
            <span>${formatCurrency(inv.percTotal || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0 0 0; font-size: 1.15rem; font-weight: 800; color: #0B2545;">
            <span>TOTAL:</span>
            <span>${formatCurrency(inv.total)}</span>
          </div>
        </div>
      </div>

      <!-- Legal Footer -->
      <div style="margin-top: 20px; border-top: 1px dashed #CBD5E1; padding-top: 10px; text-align: center; font-size: 0.72rem; color: #64748B;">
        Documento emitido mediante Sistema de Gestión Comercial Carlitos Autopartes. Gracias por su confianza.
      </div>
    </div>
  `;

  modal.showModal();
}
