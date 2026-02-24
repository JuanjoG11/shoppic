// State
let cart = JSON.parse(localStorage.getItem('shoppic_cart')) || [];
let currentCategory = 'all';
let searchQuery = '';
let carouselIndex = 0;
let allProducts = []; // Reemplazamos 'products' para evitar conflictos con products.js

// Global filter function for HTML onclick
window.filterCategory = (category) => {
    // Find button to activate
    const btn = document.querySelector(`.filter-btn[data-category="${category}"]`) || document.querySelector('.filter-btn[data-category="all"]');
    if (btn) btn.click();
    document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
};

// DOM Elements
const catalogGrid = document.getElementById('catalog');
const cartBtn = document.getElementById('cart-btn');
const cartDrawer = document.getElementById('cart-drawer');
const closeCartBtn = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total-price');
const cartCountEl = document.getElementById('cart-count');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const overlay = document.getElementById('overlay');

// Modal Elements
const modal = document.getElementById('product-modal');
const closeModal = document.querySelector('.close-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalDesc = document.getElementById('modal-desc');
let modalAddBtn = document.getElementById('modal-add-btn');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // initCarousel se llamará después de cargar productos
    await loadProducts();
    renderCart();
    setupEventListeners();
    initScrollAnimations();
});

async function loadProducts() {
    console.log('📦 SHOPPIC: Intentando cargar productos desde Supabase...');
    try {
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProducts = data;
        renderCategories();
        renderCategoryCards(); // Nueva función dinámica
        renderCatalog();

        // Inicializar carrusel DESPUÉS de renderizar tarjetas
        setTimeout(() => initCarousel(), 100);

    } catch (error) {
        console.error('❌ Error cargando desde Supabase:', error);
        if (typeof window.products !== 'undefined' && allProducts.length === 0) {
            allProducts = window.products;
            renderCategories();
            renderCategoryCards();
            renderCatalog();
            setTimeout(() => initCarousel(), 100);
        } else {
            catalogGrid.innerHTML = '<p class="no-results">Error al cargar productos.</p>';
        }
    }
}

const categoryImageMap = {
    'Hogar': 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop',
    'Tecnología': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop',
    'Aseo': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop',
    'Niños': 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800&auto=format&fit=crop',
    'Juguetería': 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800&auto=format&fit=crop',
    'Belleza': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=800&auto=format&fit=crop',
    'Moda': 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop',
    'Deportes': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop',
    'Gym': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
    'GYM': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
    'Gimnasio': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop'
};

const defaultCategoryImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop';

function renderCategoryCards() {
    const container = document.getElementById('category-cards-container');
    if (!container) return;

    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
    container.innerHTML = '';

    categories.forEach((cat, index) => {
        const trimmedCat = cat.trim();
        const imageUrl = categoryImageMap[trimmedCat] ||
            categoryImageMap[trimmedCat.charAt(0).toUpperCase() + trimmedCat.slice(1).toLowerCase()] ||
            defaultCategoryImage;
        const card = document.createElement('div');
        card.className = `card-3d ${index === 0 ? 'active' : ''}`;
        card.dataset.index = index;
        card.onclick = () => window.filterCategory(cat);

        card.innerHTML = `
            <div class="card-inner">
                <div class="card-badge">${cat.toUpperCase()}</div>
                <img src="${imageUrl}" alt="${cat}" class="card-img">
                <div class="card-bottom">
                    <h3>${cat === 'Aseo' ? 'CUIDADO' : (cat === 'Hogar' ? 'AMBIENTES' : cat.toUpperCase())}</h3>
                    <button>Ver Categoría</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderCategories() {
    const container = document.getElementById('category-filters-container');
    if (!container) return;

    // Obtener categorías únicas
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

    // Mantener el botón "Todo" y limpiar el resto
    container.innerHTML = '<button class="filter-btn active" data-category="all">Todo</button>';

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.category = cat;
        btn.textContent = cat;
        container.appendChild(btn);
    });

    // Re-vincular eventos a los nuevos botones
    const newFilterBtns = container.querySelectorAll('.filter-btn');
    newFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            newFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderCatalog();
        });
    });
}

// 3D Carousel Logic
function initCarousel() {
    const cards = document.querySelectorAll('.card-3d');
    const prevBtn = document.querySelector('.carousel-control.prev');
    const nextBtn = document.querySelector('.carousel-control.next');

    if (!cards.length) return;

    function updateCarousel() {
        cards.forEach((card, i) => {
            card.className = 'card-3d'; // Reset classes

            const diff = i - carouselIndex;

            if (i === carouselIndex) {
                card.classList.add('active');
            } else if (diff === -1 || (carouselIndex === 0 && i === cards.length - 1)) {
                card.classList.add('prev-card');
            } else if (diff === 1 || (carouselIndex === cards.length - 1 && i === 0)) {
                card.classList.add('next-card');
            } else if (diff < -1) {
                card.classList.add('far-prev');
            } else if (diff > 1) {
                card.classList.add('far-next');
            }
        });
    }

    prevBtn?.addEventListener('click', () => {
        carouselIndex = (carouselIndex > 0) ? carouselIndex - 1 : cards.length - 1;
        updateCarousel();
    });

    nextBtn?.addEventListener('click', () => {
        carouselIndex = (carouselIndex < cards.length - 1) ? carouselIndex + 1 : 0;
        updateCarousel();
    });


    // Touch Events for Swipe
    let touchStartX = 0;
    let touchEndX = 0;

    const carouselContainer = document.querySelector('.cards-3d-container');

    carouselContainer?.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carouselContainer?.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const threshold = 50;
        if (touchEndX < touchStartX - threshold) {
            // Swipe Left -> Next
            carouselIndex = (carouselIndex < cards.length - 1) ? carouselIndex + 1 : 0;
            updateCarousel();
        } else if (touchEndX > touchStartX + threshold) {
            // Swipe Right -> Prev
            carouselIndex = (carouselIndex > 0) ? carouselIndex - 1 : cards.length - 1;
            updateCarousel();
        }
    }

    updateCarousel();
}

// Scroll Entrance Animations
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-reveal');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    window.observeNewItems = () => {
        document.querySelectorAll('.product-card:not(.observed), .wholesale-card:not(.observed), .wholesale-title:not(.observed)').forEach(card => {
            card.classList.add('observed');
            observer.observe(card);
        });
    };
}

// Render Catalog
function renderCatalog() {
    catalogGrid.innerHTML = '';

    const filteredProducts = allProducts.filter(product => {
        const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
        const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (filteredProducts.length === 0) {
        catalogGrid.innerHTML = '<p class="no-results">No se encontraron productos.</p>';
        return;
    }

    filteredProducts.forEach((product, index) => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        const imgUrl = product.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        card.innerHTML = `
            <div class="product-img-wrapper">
                <img src="${imgUrl}" alt="${product.title}" class="product-img ${!product.image ? 'error' : ''}" loading="lazy" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; this.classList.add('error');">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-price">$${product.price.toLocaleString('es-CO')} COP</p>
                <button class="add-btn" data-id="${product.id}">
                    <i class="fa-solid fa-cart-plus"></i> Agregar
                </button>
            </div>
        `;

        // Add event listener to card for modal (excluding button)
        card.querySelector('.product-img-wrapper').addEventListener('click', () => openModal(product));
        card.querySelector('.product-title').addEventListener('click', () => openModal(product));

        // Add event listener to button
        card.querySelector('.add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(product);
        });

        catalogGrid.appendChild(card);
    });

    // Re-run observer for new cards
    if (window.observeNewItems) window.observeNewItems();
}

// Add to Cart
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    renderCart();
    showToast(`${product.title} añadido a la bolsa ✨`);
    // openCart(); // Optional: open cart or just show toast
}

function showToast(message) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.classList.add('toast-container');
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


function updateQuantity(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
            renderCart();
        }
    }
}

function saveCart() {
    localStorage.setItem('shoppic_cart', JSON.stringify(cart));
}


// Remove from Cart
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
}

// Update Cart UI
function renderCart() {
    const cartItemsContainer = document.querySelector('.cart-items');

    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-container"><i class="fa-solid fa-bag-shopping empty-icon"></i><p class="empty-cart-msg">Tu bolsa está vacía.</p></div>';
        cartTotalEl.textContent = '$0.00';
        cartCountEl.textContent = '0';
        return;
    }

    cart.forEach((item) => {
        total += item.price * item.quantity;
        count += item.quantity;

        const cartItem = document.createElement('div');
        cartItem.classList.add('cart-item');
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="cart-item-img" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; this.classList.add('error');">
                <div class="item-details">
                    <div class="item-header">
                        <h4 class="cart-item-title">${item.title}</h4>
                        <button class="remove-item-btn" data-id="${item.id}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                    <p class="cart-item-price">$${item.price.toLocaleString('es-CO')}</p>
                    <div class="quantity-controls">
                        <button class="qty-btn minus" data-id="${item.id}">-</button>
                        <span class="qty-number">${item.quantity}</span>
                        <button class="qty-btn plus" data-id="${item.id}">+</button>
                    </div>
                </div>
        `;

        cartItem.querySelector('.minus').addEventListener('click', () => updateQuantity(item.id, -1));
        cartItem.querySelector('.plus').addEventListener('click', () => updateQuantity(item.id, 1));
        cartItem.querySelector('.remove-item-btn').addEventListener('click', () => removeFromCart(item.id));
        cartItemsContainer.appendChild(cartItem);
    });

    cartTotalEl.textContent = `$${total.toLocaleString('es-CO')} COP`;
    cartCountEl.textContent = count;
}


// Event Listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCatalog();
    });

    // Filters (Manejados dinámicamente en renderCategories)

    // Cart Drawer
    cartBtn.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    overlay.addEventListener('click', () => {
        closeCart();
        closeModalFunc();
    });

    // Checkout WhatsApp
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkoutWhatsApp);
    }

    // Modal Close
    closeModal.addEventListener('click', closeModalFunc);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModalFunc();
    });
}

function checkoutWhatsApp() {
    if (cart.length === 0) {
        showToast("⚠️ Tu bolsa está vacía.");
        return;
    }

    // Get form data
    const name = document.getElementById('customer-name').value.trim();
    const city = document.getElementById('customer-city').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();

    // Basic validation
    if (!name || !city || !address || !phone) {
        showToast("⚠️ Por favor completa todos los datos de envío.");
        // Highlight empty fields
        const fields = ['customer-name', 'customer-city', 'customer-address', 'customer-phone'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (!el.value.trim()) {
                el.style.borderColor = "#ff4d4d";
                setTimeout(() => el.style.borderColor = "", 3000);
            }
        });
        return;
    }

    const phoneNumber = "573150665892";
    let message = "SOLICITUD DE PEDIDO - SHOPPIC ✨\n\n";

    message += "DATOS DEL CLIENTE\n";
    message += "----------------------------\n";
    message += `• Nombre: ${name} \n`;
    message += `• Ciudad: ${city} \n`;
    message += `• Dirección: ${address} \n`;
    message += `• Teléfono: ${phone} \n\n`;

    message += "DETALLE DEL PEDIDO\n";
    message += "----------------------------\n";

    let total = 0;
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        message += `• ${item.title} (x${item.quantity}) \n  Subtotal: $${subtotal.toLocaleString('es-CO')} \n\n`;
    });

    message += "----------------------------\n";
    message += `TOTAL A PAGAR: $${total.toLocaleString('es-CO')} COP\n`;
    message += "----------------------------\n\n";
    message += "Quedo atento(a) a la confirmación de mi pedido. Gracias.";

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
}


function openCart() {
    cartDrawer.classList.add('open');
    overlay.classList.add('active');
}

function closeCart() {
    cartDrawer.classList.remove('open');
    if (modal.style.display !== 'block') {
        overlay.classList.remove('active');
    }
}

// Modal Functions
function openModal(product) {
    const mainImg = product.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    modalImg.src = mainImg;

    if (!product.image) modalImg.classList.add('error');
    else modalImg.classList.remove('error');

    modalImg.onerror = function () {
        this.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        this.classList.add('error');
    };

    modalTitle.textContent = product.title;
    modalPrice.textContent = `$${product.price.toLocaleString('es-CO')} COP`;
    modalDesc.textContent = product.description;

    // Gallery Thumbnails
    const thumbContainer = document.getElementById('modal-thumbnails');
    if (thumbContainer) {
        thumbContainer.innerHTML = '';
        const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);

        if (images.length > 1) {
            images.forEach((imgUrl, idx) => {
                const thumb = document.createElement('img');
                thumb.src = imgUrl;
                thumb.className = `modal-thumb ${imgUrl === mainImg ? 'active' : ''}`;
                thumb.onclick = () => {
                    modalImg.src = imgUrl;
                    document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                };
                thumbContainer.appendChild(thumb);
            });
            thumbContainer.style.display = 'flex';
        } else {
            thumbContainer.style.display = 'none';
        }
    }

    modalAddBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> AÑADIR A LA BOLSA';

    // Clear previous event listener on modal button to avoid duplicates
    const newBtn = modalAddBtn.cloneNode(true);
    modalAddBtn.parentNode.replaceChild(newBtn, modalAddBtn);
    modalAddBtn = newBtn; // Update global reference
    modalAddBtn.addEventListener('click', () => {
        addToCart(product);
        closeModalFunc();
    });

    modal.style.display = 'block';
    overlay.classList.add('active');
}

function closeModalFunc() {
    modal.style.display = 'none';
    overlay.classList.remove('active'); // Quitar el overlay oscuro al cerrar el modal
}
