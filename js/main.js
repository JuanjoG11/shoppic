// State
let cart = JSON.parse(localStorage.getItem('shoppic_cart')) || [];
let currentCategory = 'all';
let searchQuery = '';
let carouselIndex = 0;

// Data is now loaded from products.js


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
document.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    renderCatalog();
    renderCart();
    setupEventListeners();
    initScrollAnimations();
});

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

    const filteredProducts = products.filter(product => {
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
    toast.innerHTML = `< i class="fa-solid fa-check-circle" ></i > ${message} `;
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

    // Filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderCatalog();
        });
    });

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
    modalImg.src = product.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    if (!product.image) modalImg.classList.add('error');
    else modalImg.classList.remove('error');
    modalImg.onerror = function () {
        this.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        this.classList.add('error');
    };
    modalTitle.textContent = product.title;
    modalPrice.textContent = `$${product.price.toLocaleString('es-CO')} COP`;
    modalDesc.textContent = product.description;
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
    // Overlay logic handled by modal internal backdrop, but if we want consistent overlay:
    // overlay.classList.add('active'); // If using custom overlay instead of modal built-in
}

function closeModalFunc() {
    modal.style.display = 'none';
}
