/**
 * Accesorios Autocentro S.R.L. - Controladora Principal del E-commerce
 * Gestiona el carrito, búsquedas, filtrado jerárquico (Marca -> Modelo -> Año), categorías e integración con WhatsApp.
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MACHINE ---
  let cart = [];
  let selectedCategory = "Todos";
  let selectedBrand = "Todas";
  let selectedModel = "Todos";
  let selectedYear = "Todos";
  let searchQuery = "";

  // --- HTML ELEMENTS DOM REFERENCE ---
  const productGrid = document.getElementById("product-grid");
  const currentCategoryTitle = document.getElementById("current-category-title");
  const resultsCount = document.getElementById("results-count");
  const searchInput = document.getElementById("search-input");
  const categoryList = document.getElementById("category-list");
  
  // Hierarchical Filters
  const brandFilter = document.getElementById("brand-filter");
  const modelFilter = document.getElementById("model-filter");
  const yearFilter = document.getElementById("year-filter");
  const resetFiltersBtn = document.getElementById("reset-filters-btn");
  
  // Shopping Cart & Drawer
  const cartDrawer = document.getElementById("cart-drawer");
  const cartItemsContainer = document.getElementById("cart-items");
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  const cartGrandTotalEl = document.getElementById("cart-grand-total");
  const cartBadgeCountEl = document.getElementById("cart-badge-count");
  const checkoutBtn = document.getElementById("checkout-btn");
  const cartToggleBtn = document.getElementById("cart-toggle-btn");
  const clearCartBtn = document.getElementById("clear-cart-btn");

  // --- INITIALIZATION ---
  initApp();

  function initApp() {
    // 1. Load cart from LocalStorage
    try {
      const savedCart = localStorage.getItem("autocentro_cart");
      if (savedCart) {
        cart = JSON.parse(savedCart);
      }
    } catch (e) {
      console.error("Error cargando carrito desde localStorage:", e);
      cart = [];
    }

    // 2. Populate filters & Render views
    populateBrandFilter();
    updateCategoryCounts();
    renderProducts();
    renderCart();

    // 3. Bind interactive actions
    bindEventListeners();
    setupInvokersFallback();
  }

  // --- EVENT LISTENERS REGISTRATION ---
  function bindEventListeners() {
    // A. Category Side-Menu Filtering
    categoryList.addEventListener("click", (e) => {
      const button = e.target.closest(".category-btn");
      if (!button) return;

      // Update active styling
      document.querySelectorAll(".category-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      // Update state and render
      selectedCategory = button.dataset.category;
      currentCategoryTitle.textContent = selectedCategory === "Todos" ? "Todos los Productos" : selectedCategory;
      renderProducts();
    });

    // B. Footer Links Filtering
    document.querySelectorAll("[data-footer-category]").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const cat = link.dataset.footerCategory;
        
        // Find matching sidebar button
        const sidebarBtn = document.querySelector(`.category-btn[data-category="${cat}"]`);
        if (sidebarBtn) {
          sidebarBtn.click();
          // Scroll page to catalog
          const storefrontSec = document.getElementById("storefront");
          if (storefrontSec) {
            storefrontSec.scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    });

    // C. Instant Keyboard Search
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderProducts();
    });

    // D. Hierarchical Select Filters Bindings
    brandFilter.addEventListener("change", (e) => {
      handleBrandChange(e.target.value);
    });

    modelFilter.addEventListener("change", (e) => {
      handleModelChange(e.target.value);
    });

    yearFilter.addEventListener("change", (e) => {
      selectedYear = e.target.value === "Todos" ? "Todos" : parseInt(e.target.value);
      renderProducts();
    });

    // E. WhatsApp Checkout Action
    checkoutBtn.addEventListener("click", () => {
      sendOrderViaWhatsApp();
    });

    // F. Clear Cart Action
    clearCartBtn.addEventListener("click", () => {
      cart = [];
      saveCart();
      renderCart();
    });

    // G. Reset Filters Action
    resetFiltersBtn.addEventListener("click", () => {
      resetVehicleFilters();
    });
  }

  // --- HIERARCHICAL DYNAMIC FILTERS LOGIC ---
  
  // 1. Populate Brand selector on load
  function populateBrandFilter() {
    if (!brandFilter) return;
    
    brandFilter.innerHTML = '<option value="Todas">Todas las marcas</option>';
    
    // Extract unique car brands (excluding Universal for cleaner vehicle selection dropdown)
    const brands = [...new Set(products
      .map(p => p.brand)
      .filter(brand => brand && brand !== "Universal"))]
      .sort();

    brands.forEach(brand => {
      const option = document.createElement("option");
      option.value = brand;
      option.textContent = brand;
      brandFilter.appendChild(option);
    });
  }

  // 2. Handle Brand selection -> cascade to Models
  function handleBrandChange(brandVal) {
    selectedBrand = brandVal;
    selectedModel = "Todos";
    selectedYear = "Todos";
    
    // Reset secondary selectors DOM
    modelFilter.innerHTML = '<option value="Todos">Todos los modelos</option>';
    modelFilter.disabled = true;
    yearFilter.innerHTML = '<option value="Todos">Todos los años</option>';
    yearFilter.disabled = true;

    if (selectedBrand !== "Todas") {
      // Find models matching the selected brand
      const matchingModels = [...new Set(products
        .filter(p => p.brand === selectedBrand)
        .map(p => p.model))]
        .sort();

      // Populate Model selector
      matchingModels.forEach(model => {
        if (!model || model === "Todos") return;
        const opt = document.createElement("option");
        opt.value = model;
        opt.textContent = model;
        modelFilter.appendChild(opt);
      });

      // Enable model selector
      modelFilter.disabled = false;
    }

    renderProducts();
  }

  // 3. Handle Model selection -> cascade to Years
  function handleModelChange(modelVal) {
    selectedModel = modelVal;
    selectedYear = "Todos";

    // Reset Year selector DOM
    yearFilter.innerHTML = '<option value="Todos">Todos los años</option>';
    yearFilter.disabled = true;

    if (selectedModel !== "Todos") {
      // Find products matching the brand + model to extract the compatibility year range
      const matchingProducts = products.filter(p => p.brand === selectedBrand && p.model === selectedModel);
      
      if (matchingProducts.length > 0) {
        // Collect all compatible years from products ranges
        let compatibleYearsSet = new Set();
        
        matchingProducts.forEach(p => {
          const start = p.year_start || 2010;
          const end = p.year_end || 2026;
          for (let y = start; y <= end; y++) {
            compatibleYearsSet.add(y);
          }
        });

        // Convert, sort years descending (newest first)
        const sortedYears = [...compatibleYearsSet].sort((a, b) => b - a);

        // Populate Year selector
        sortedYears.forEach(year => {
          const opt = document.createElement("option");
          opt.value = year;
          opt.textContent = year.toString();
          yearFilter.appendChild(opt);
        });

        // Enable year selector
        yearFilter.disabled = false;
      }
    }
 
    renderProducts();
  }

  // 4. Reset all filters to default state
  function resetVehicleFilters() {
    selectedBrand = "Todas";
    selectedModel = "Todos";
    selectedYear = "Todos";

    brandFilter.value = "Todas";
    modelFilter.innerHTML = '<option value="Todos">Todos los modelos</option>';
    modelFilter.disabled = true;
    yearFilter.innerHTML = '<option value="Todos">Todos los años</option>';
    yearFilter.disabled = true;

    resetFiltersBtn.style.display = "none";
    renderProducts();
  }

  // --- INVOKER COMMANDS API FALLBACK ---
  // Bulletproof declarative fallback for older engines lacking Invokers support (Baseline 2025)
  function setupInvokersFallback() {
    const supportsInvokers = "commandForElement" in HTMLButtonElement.prototype;
    
    if (!supportsInvokers) {
      document.addEventListener("click", (event) => {
        const button = event.target.closest("button[commandfor]");
        if (!button) return;

        const targetId = button.getAttribute("commandfor");
        const command = button.getAttribute("command");
        const target = document.getElementById(targetId);

        if (target && target.tagName === "DIALOG") {
          if (command === "show-modal") {
            target.showModal();
          } else if (command === "close") {
            target.close();
          }
        }
      });
    }
  }

  // --- CURRENCY FORMATTER HELPER ---
  function formatARS(value) {
    return "$" + value.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  // --- STATIC CATEGORY COUNT BADGES ---
  function updateCategoryCounts() {
    // Calculates absolute amount of items in database per category
    const counts = { Todos: products.length };
    
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    // Map keys to specific element IDs in sidebar
    const badgeMap = {
      "Todos": "count-Todos",
      "Faros y Ópticas": "count-Faros-Opticas",
      "Espejos y Levantacristales": "count-Espejos-Cristales",
      "Manijas y Cerraduras": "count-Manijas-Cerraduras",
      "Volantes Deportivos y Accesorios": "count-Volantes-Accesorios",
      "Tazas y Molduras": "count-Tazas-Molduras"
    };

    Object.entries(badgeMap).forEach(([catKey, elId]) => {
      const el = document.getElementById(elId);
      if (el) {
        el.textContent = counts[catKey] || 0;
      }
    });
  }

  // --- RENDER PRODUCTS GRID (Combined Hierarchical Cascading Filtering) ---
  function renderProducts() {
    productGrid.innerHTML = "";

    // Toggle reset filters button visibility
    const hasActiveFilters = selectedBrand !== "Todas" || selectedModel !== "Todos" || selectedYear !== "Todos";
    if (resetFiltersBtn) {
      resetFiltersBtn.style.display = hasActiveFilters ? "inline-flex" : "none";
    }

    // Apply combined filters: Category + Keyword Search + Brand + Model + Year compatibility
    const filtered = products.filter(p => {
      // 1. Category Filter Match
      const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
      
      // 2. Hierarchical vehicle compatibility match (Universal parts always visible to maximize sales)
      const matchesBrand = selectedBrand === "Todas" || p.brand === selectedBrand || p.brand === "Universal";
      
      const matchesModel = selectedModel === "Todos" || p.model === selectedModel || p.model === "Todos" || p.brand === "Universal";
      
      const matchesYear = selectedYear === "Todos" || 
                          (selectedYear >= p.year_start && selectedYear <= p.year_end) || 
                          p.brand === "Universal";
      
      // 3. Keyword Search Match
      const matchesSearch = p.name.toLowerCase().includes(searchQuery) ||
                            p.description.toLowerCase().includes(searchQuery) ||
                            p.category.toLowerCase().includes(searchQuery) ||
                            p.brand.toLowerCase().includes(searchQuery) ||
                            p.model.toLowerCase().includes(searchQuery);
                            
      return matchesCategory && matchesBrand && matchesModel && matchesYear && matchesSearch;
    });

    // Update display counter label
    resultsCount.textContent = `Mostrando ${filtered.length} ${filtered.length === 1 ? "producto" : "productos"}`;

    if (filtered.length === 0) {
      productGrid.innerHTML = `
        <div class="cart-empty-state" style="grid-column: 1 / -1; padding: var(--spacing-xl) var(--spacing-md);">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="inline-size: 56px; block-size: 56px; margin-block-end: 16px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p style="font-weight: 600; color: var(--text-primary);">No encontramos repuestos coincidentes</p>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-block-start: 4px;">Probá modificando los filtros del vehículo, seleccionando otro año o cambiando la búsqueda.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((p, index) => {
      const isLowStock = p.stock <= 5;
      
      const card = document.createElement("article");
      card.className = "product-card";
      card.style.animationDelay = `${index * 0.04}s`;
      card.innerHTML = `
        <div class="product-img-wrapper">
          <span class="category-tag">${p.category}</span>
          <img src="${p.image_url}" alt="${p.name}" class="product-img" loading="lazy">
        </div>
        <div class="product-info">
          <h4 class="product-title">${p.name}</h4>
          <p class="product-description">${p.description}</p>
        </div>
        <div class="product-footer">
          <div class="price-stock-wrapper">
            <span class="product-price">${formatARS(p.price)}</span>
            <span class="product-stock ${isLowStock ? "low-stock" : ""}">
              ${isLowStock ? `¡Solo ${p.stock} disp.!` : `${p.stock} disponibles`}
            </span>
          </div>
          <button class="add-to-cart-btn" data-product-id="${p.id}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Añadir al carrito</span>
          </button>
        </div>
      `;

      // Hook up add button
      const addBtn = card.querySelector(".add-to-cart-btn");
      addBtn.addEventListener("click", () => {
        addToCart(p);
      });

      productGrid.appendChild(card);
    });
  }

  // --- ADD TO SHOPPING CART ACTION ---
  function addToCart(product) {
    // Check if product is already in the cart
    const existing = cart.find(item => item.product.id === product.id);

    if (existing) {
      if (existing.quantity < product.stock) {
        existing.quantity += 1;
      } else {
        alert(`Disculpas, no disponemos de más stock para: ${product.name}`);
        return;
      }
    } else {
      cart.push({ product, quantity: 1 });
    }

    saveCart();
    renderCart();
    animateCartBadge();
    
    // Show a beautiful premium toast instead of disrupting navigation
    showToast(`¡Añadido al pedido: ${product.name}!`);
  }

  // --- MANIPULATE QUANTITIES AND REMOVALS ---
  function updateQuantity(productId, change) {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + change;
    
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.product.stock) {
      alert(`Límite de stock alcanzado para: ${item.product.name}`);
      return;
    }

    item.quantity = newQty;
    saveCart();
    renderCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.product.id !== productId);
    saveCart();
    renderCart();
  }

  function saveCart() {
    try {
      localStorage.setItem("autocentro_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Error guardando carrito en localStorage:", e);
    }
  }

  // --- CART ANIMATION INTERACTION ---
  function animateCartBadge() {
    cartToggleBtn.classList.remove("bounce");
    void cartToggleBtn.offsetWidth; // trigger reflow
    cartToggleBtn.classList.add("bounce");
  }

  // --- TOAST NOTIFICATIONS SYSTEM ---
  function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    // Clear existing notifications to avoid visual clutter
    const activeToasts = container.querySelectorAll(".toast-notification");
    activeToasts.forEach(t => {
      t.classList.add("hide");
      setTimeout(() => t.remove(), 300);
    });

    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="#25D366" style="inline-size: 18px; block-size: 18px; flex-shrink: 0;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <span>${message}</span>
      <button class="toast-action-btn" id="toast-action">Ver pedido</button>
    `;

    toast.querySelector("#toast-action").addEventListener("click", () => {
      cartDrawer.showModal();
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 300);
      }
    }, 3500);
  }

  // --- RENDER CART DRAWER CONTENTS ---
  function renderCart() {
    cartItemsContainer.innerHTML = "";
    
    let subtotal = 0;
    let totalItems = 0;

    if (cart.length === 0) {
      clearCartBtn.style.display = "none";
      cartItemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          <p style="font-weight: 600;">El carrito está vacío</p>
          <p style="font-size: 0.8rem; margin-block-start: 4px;">¡Agregá productos de la tienda para empezar tu pedido!</p>
        </div>
      `;
      
      cartSubtotalEl.textContent = "$0";
      cartGrandTotalEl.textContent = "$0";
      cartBadgeCountEl.textContent = "0";
      checkoutBtn.disabled = true;
      return;
    }

    cart.forEach(item => {
      const itemCost = item.product.price * item.quantity;
      subtotal += itemCost;
      totalItems += item.quantity;

      const itemRow = document.createElement("div");
      itemRow.className = "cart-item";
      itemRow.innerHTML = `
        <img src="${item.product.image_url}" alt="${item.product.name}" class="cart-item-img">
        <div class="cart-item-details">
          <span class="cart-item-name">${item.product.name}</span>
          <span class="cart-item-price">${formatARS(item.product.price)} c/u</span>
          
          <div class="cart-item-actions">
            <!-- Quantity selectors -->
            <div class="quantity-selector">
              <button class="qty-btn dec-btn" aria-label="Disminuir cantidad">-</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn inc-btn" aria-label="Aumentar cantidad">+</button>
            </div>
            <!-- Remove link -->
            <button class="remove-item-btn" aria-label="Eliminar producto del pedido">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="inline-size: 12px; block-size: 12px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      `;

      // Quantities bindings
      itemRow.querySelector(".dec-btn").addEventListener("click", () => updateQuantity(item.product.id, -1));
      itemRow.querySelector(".inc-btn").addEventListener("click", () => updateQuantity(item.product.id, 1));
      itemRow.querySelector(".remove-item-btn").addEventListener("click", () => removeFromCart(item.product.id));

      cartItemsContainer.appendChild(itemRow);
    });

    // Update totals and badge count
    cartSubtotalEl.textContent = formatARS(subtotal);
    cartGrandTotalEl.textContent = formatARS(subtotal);
    cartBadgeCountEl.textContent = totalItems;
    checkoutBtn.disabled = false;
    clearCartBtn.style.display = "inline-flex";
  }

  // --- WHATSAPP INTEGRATION SERIALIZATION FLOW ---
  function sendOrderViaWhatsApp() {
    if (cart.length === 0) return;

    // 1. Build beautiful WhatsApp markdown text
    let message = "Hola Accesorios Autocentro! Me gustaría realizar el siguiente pedido:\n\n";
    
    let subtotal = 0;
    cart.forEach(item => {
      const itemCost = item.product.price * item.quantity;
      subtotal += itemCost;
      message += `• *${item.quantity}x* ${item.product.name} (_${formatARS(item.product.price)} c/u_)\n`;
    });

    message += `\n*Total del Pedido: ${formatARS(subtotal)}*\n\n`;
    message += "¿Tienen disponibilidad para retirar por el local de *Corrientes 579*?";

    // 2. Encode values
    const whatsappNum = "5493416055274";
    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNum}?text=${encodedText}`;

    // 3. Open URL in a new tab securely
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }
});
