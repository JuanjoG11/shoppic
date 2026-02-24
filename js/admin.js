// ===== SHOPPIC ADMIN PANEL JS =====
const ADMIN_PASSWORD = 'shoppic2024';

// State
let adminProducts = [];
let categories = ['Hogar', 'Tecnología', 'Niños', 'Aseo'];
let currentFilterCategory = 'all';

// ---- AUTH ----
function login() {
    const pw = document.getElementById('admin-password').value;
    const err = document.getElementById('login-error');
    if (pw === ADMIN_PASSWORD) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').classList.remove('hidden');
        initAdmin();
    } else {
        err.textContent = '⚠️ Contraseña incorrecta.';
        setTimeout(() => err.textContent = '', 3000);
    }
}

document.getElementById('admin-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
});

function logout() {
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('login-screen').style.display = '';
    document.getElementById('admin-password').value = '';
}

// ---- UI TABS ----
window.switchTab = (tabId) => {
    // Hide all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.add('hidden');
        tab.classList.remove('active');
    });

    // Deactivate all sidebar buttons
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
        targetTab.classList.add('active');
    }

    // Activate corresponding sidebar button
    const activeBtn = document.getElementById(`btn-tab-${tabId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update page title based on tab
    const pageTitle = document.getElementById('admin-page-title');
    if (pageTitle) {
        if (tabId === 'products') pageTitle.textContent = 'Gestión de Catálogo';
        if (tabId === 'add-product') pageTitle.textContent = 'Añadir Producto';
        if (tabId === 'categories') pageTitle.textContent = 'Gestión de Categorías';
    }

    // Special initialization for products tab
    if (tabId === 'products') renderProductsTable();
};

// ---- INIT ----
async function initAdmin() {
    console.log('🚀 SHOPPIC ADMIN: Inicializando panel premium...');
    setupEventListeners();
    await loadAdminProducts();
    switchTab('products'); // Default tab
    setupNewProductPreview();
}

async function loadAdminProducts() {
    try {
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Asegurar que cada producto tenga un array de imágenes
        adminProducts = data.map(p => ({
            ...p,
            images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : [])
        }));

        // Extract categories from products or use defaults
        const dbCategories = [...new Set(adminProducts.map(p => p.category).filter(Boolean))];
        if (dbCategories.length) categories = dbCategories;

        updateStats();
        populateCategorySelects();
        renderProductsTable();
        renderCatList();
        renderCatStats();
    } catch (error) {
        console.error('Error loading admin products:', error);
        toast('Error al cargar datos desde Supabase', 'error');
    }
}

function updateStats() {
    document.getElementById('stat-total').textContent = adminProducts.length;
}

function populateCategorySelects() {
    const selects = ['admin-cat-filter', 'new-category', 'edit-category'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isFilter = id === 'admin-cat-filter';
        el.innerHTML = isFilter ? '<option value="all">Todas las categorías</option>' : '';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            el.appendChild(opt);
        });
    });
}


function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('admin-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderProductsTable(e.target.value);
        });
    }

    // Category Filter
    const catFilter = document.getElementById('admin-cat-filter');
    if (catFilter) {
        catFilter.addEventListener('change', (e) => {
            currentFilterCategory = e.target.value;
            renderProductsTable(document.getElementById('admin-search-input')?.value || '');
        });
    }
}

// ---- PRODUCTS TABLE ----
function renderProductsTable(manualSearch = null) {
    const searchInput = document.getElementById('admin-search-input');
    const catFilterEl = document.getElementById('admin-cat-filter');

    const search = (manualSearch !== null ? manualSearch : (searchInput ? searchInput.value : '')).toLowerCase();
    const catFilter = catFilterEl ? catFilterEl.value : 'all';
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = adminProducts.filter(p => {
        const matchCat = catFilter === 'all' || p.category === catFilter;
        const matchSearch = p.title.toLowerCase().includes(search) || String(p.id).toLowerCase().includes(search);
        return matchCat && matchSearch;
    });

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#555;padding:2rem;">Sin resultados</td></tr>`;
        return;
    }

    filtered.forEach(product => {
        const tr = document.createElement('tr');
        const imgUrl = (product.images && product.images[0]) || product.image || '';
        const imgCell = imgUrl
            ? `<img src="${imgUrl}" alt="" class="table-img" onerror="this.src='https://via.placeholder.com/55?text=Error'">`
            : `<div class="img-placeholder"><i class="fa-solid fa-image"></i></div>`;

        tr.innerHTML = `
            <td>${imgCell}</td>
            <td style="max-width:220px;font-weight:500">${escHtml(product.title)}</td>
            <td>
                <input type="number" class="inline-price-input" value="${product.price}"
                    data-id="${escHtml(String(product.id))}" onchange="updatePrice(this)">
            </td>
            <td><span class="cat-badge">${escHtml(product.category || '')}</span></td>
            <td>
                <div class="table-actions" style="justify-content: flex-end;">
                    <button class="btn-icon" title="Editar" onclick="openEditModal('${escHtml(String(product.id))}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon danger" title="Eliminar" onclick="deleteProduct('${escHtml(String(product.id))}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---- QUICK PRICE UPDATE ----
async function updatePrice(input) {
    const id = input.dataset.id;
    const newPrice = parseFloat(input.value);
    if (isNaN(newPrice) || newPrice < 0) return;

    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({ price: newPrice })
            .eq('id', id);

        if (error) throw error;

        // Update local state
        const p = adminProducts.find(p => String(p.id) === id);
        if (p) p.price = newPrice;

        toast('Precio actualizado en tiempo real ✨', 'success');
    } catch (error) {
        console.error('Error updating price:', error);
        toast('Error al actualizar precio', 'error');
    }
}

// ---- DELETE PRODUCT ----
async function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto permanentemente de la base de datos?')) return;

    try {
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;

        adminProducts = adminProducts.filter(p => String(p.id) !== id);
        updateStats();
        renderProductsTable();
        renderCatStats();
        toast('Producto eliminado permanentemente', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        toast('Error al eliminar producto', 'error');
    }
}

// ---- SAVE ALL (Removed Legacy Download) ----
function saveAllChanges() {
    toast('Los cambios se guardan automáticamente en tiempo real ⚡', 'success');
}

// ---- EDIT MODAL ----
function openEditModal(id) {
    const p = adminProducts.find(p => String(p.id) === id);
    if (!p) return;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('edit-title').value = p.title;
    document.getElementById('edit-price').value = p.price;
    document.getElementById('edit-description').value = p.description || '';
    document.getElementById('edit-image').value = p.image || '';

    // Galería multi-imagen
    currentEditImages = Array.isArray(p.images) ? [...p.images] : (p.image ? [p.image] : []);
    renderAdminGallery('edit-gallery-preview', currentEditImages, true);

    const editCatSelect = document.getElementById('edit-category');
    editCatSelect.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === p.category) opt.selected = true;
        editCatSelect.appendChild(opt);
    });

    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('admin-overlay').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('admin-overlay').classList.add('hidden');
}

async function saveEditProduct() {
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const price = parseFloat(document.getElementById('edit-price').value);
    const category = document.getElementById('edit-category').value;
    const description = document.getElementById('edit-description').value.trim();
    const mainImage = document.getElementById('edit-image').value.trim();

    // Si se pegó una URL manual que no está en la galería, agregarla
    if (mainImage && !currentEditImages.includes(mainImage)) {
        currentEditImages.unshift(mainImage);
    }

    if (!title || isNaN(price)) { toast('Completa los campos requeridos', 'error'); return; }

    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({
                title,
                price,
                category,
                description,
                image: currentEditImages[0] || '',
                images: currentEditImages
            })
            .eq('id', id);

        if (error) throw error;

        // Update local state
        const p = adminProducts.find(p => String(p.id) === id);
        if (p) {
            Object.assign(p, { title, price, category, description, image });
        }

        closeEditModal();
        renderProductsTable();
        renderCatStats();
        toast('✅ Producto guardado correctamente', 'success');
    } catch (error) {
        console.error('Error saving product edits:', error);
        toast('Error al guardar cambios', 'error');
    }
}

// ---- ADD NEW PRODUCT ----
function setupNewProductPreview() {
    ['new-title', 'new-price', 'new-category', 'new-image'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updatePreview);
    });
}

function updatePreview() {
    document.getElementById('preview-title').textContent = document.getElementById('new-title').value || 'Nombre del producto';
    const price = parseFloat(document.getElementById('new-price').value);
    document.getElementById('preview-price').textContent = !isNaN(price) ? `$${price.toLocaleString('es-CO')} COP` : '$0 COP';
    document.getElementById('preview-cat').textContent = document.getElementById('new-category').value || 'Categoría';
    const imgUrl = document.getElementById('new-image').value;
    const previewImg = document.getElementById('preview-img');
    previewImg.src = imgUrl;
    previewImg.style.display = imgUrl ? 'block' : 'none';
}

// ---- IMAGE UPLOAD ----
// ---- IMAGE GALLERY ----
let currentEditImages = [];

function renderAdminGallery(containerId, imagesArray, isEdit = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    imagesArray.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item-admin';
        item.innerHTML = `
            <img src="${url}" alt="">
            <button class="remove-img-btn" onclick="removeImageFromGallery(${index}, '${containerId}', ${isEdit})">
                <i class="fa-solid fa-times"></i>
            </button>
        `;
        container.appendChild(item);
    });
}

window.removeImageFromGallery = (index, containerId, isEdit) => {
    if (isEdit) {
        currentEditImages.splice(index, 1);
        renderAdminGallery(containerId, currentEditImages, true);
        document.getElementById('edit-image').value = currentEditImages[0] || '';
    } else {
        const newImages = document.getElementById('new-image').dataset.images ? JSON.parse(document.getElementById('new-image').dataset.images) : [];
        newImages.splice(index, 1);
        document.getElementById('new-image').dataset.images = JSON.stringify(newImages);
        document.getElementById('new-image').value = newImages[0] || '';
        renderAdminGallery(containerId, newImages, false);
    }
};

async function handleFileUpload(inputEl, urlInputId, statusId, previewId) {
    const files = Array.from(inputEl.files);
    if (!files.length) return;

    const statusEl = document.getElementById(statusId);
    statusEl.textContent = `⏳ Subiendo ${files.length} archivo(s)...`;
    statusEl.className = 'upload-status loading';

    const isEdit = previewId === 'edit-gallery-preview';
    let currentImages = [];
    if (isEdit) {
        currentImages = currentEditImages;
    } else {
        const saved = document.getElementById(urlInputId).dataset.images;
        currentImages = saved ? JSON.parse(saved) : [];
    }

    try {
        for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { data, error } = await window.supabaseClient.storage
                .from('products')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('products')
                .getPublicUrl(filePath);

            currentImages.push(publicUrl);
        }

        document.getElementById(urlInputId).value = currentImages[0] || '';
        if (!isEdit) {
            document.getElementById(urlInputId).dataset.images = JSON.stringify(currentImages);
        }

        statusEl.textContent = '✅ Subida completada';
        statusEl.className = 'upload-status success';

        renderAdminGallery(previewId, currentImages, isEdit);
    } catch (error) {
        console.error('Error uploading image:', error);
        statusEl.textContent = '❌ Error al subir';
        statusEl.className = 'upload-status error';
        toast('Error al subir imágenes. Revisa el bucket de Supabase.', 'error');
    }
}

// Bind upload events
document.addEventListener('DOMContentLoaded', () => {
    const newFileInput = document.getElementById('new-image-file');
    if (newFileInput) {
        newFileInput.multiple = true;
        newFileInput.addEventListener('change', (e) => {
            handleFileUpload(e.target, 'new-image', 'new-upload-status', 'new-gallery-preview');
        });
    }

    const editFileInput = document.getElementById('edit-image-file');
    if (editFileInput) {
        editFileInput.multiple = true;
        editFileInput.addEventListener('change', (e) => {
            handleFileUpload(e.target, 'edit-image', 'edit-upload-status', 'edit-gallery-preview');
        });
    }
});

async function addNewProduct() {
    const title = document.getElementById('new-title').value.trim();
    const price = parseFloat(document.getElementById('new-price').value);
    const category = document.getElementById('new-category').value;
    const description = document.getElementById('new-description').value.trim();
    const mainImage = document.getElementById('new-image').value.trim();

    const savedImages = document.getElementById('new-image').dataset.images;
    const images = savedImages ? JSON.parse(savedImages) : (mainImage ? [mainImage] : []);

    if (!title || isNaN(price) || !category) { toast('Completa nombre, precio y categoría', 'error'); return; }

    try {
        // Generar un ID único corto para evitar problemas de búsqueda/URL
        const uniqueId = Math.random().toString(36).substr(2, 9).toUpperCase();

        const newProduct = {
            id: uniqueId,
            title,
            price,
            category,
            image: images[0] || '', // Imagen principal (para compatibilidad)
            images: images,         // Galería completa
            description,
            created_at: new Date().toISOString()
        };

        const { error } = await window.supabaseClient
            .from('products')
            .insert([newProduct]);

        if (error) throw error;

        adminProducts.unshift(newProduct);
        updateStats();
        renderProductsTable();
        renderCatStats();

        // Clear form
        ['new-title', 'new-price', 'new-image', 'new-description'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('new-image').dataset.images = '[]';
        renderAdminGallery('new-gallery-preview', []);

        toast('✅ Producto agregado exitosamente', 'success');

        // Switch to products tab
        document.querySelector('.sidebar-btn[data-tab="products"]')?.click();
    } catch (error) {
        console.error('Error adding new product:', error);
        toast('Error al agregar el producto', 'error');
    }
}

// ---- CATEGORIES ----
function renderCatList() {
    const list = document.getElementById('cat-list');
    if (!list) return;
    list.innerHTML = '';
    categories.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'cat-chip';
        chip.innerHTML = `<i class="fa-solid fa-tag"></i> ${escHtml(cat)}
            <button class="delete-cat" title="Eliminar categoría" onclick="deleteCategory('${escHtml(cat)}')">
                <i class="fa-solid fa-xmark"></i>
            </button>`;
        list.appendChild(chip);
    });
}

function renderCatStats() {
    const grid = document.getElementById('cat-stats');
    if (!grid) return;
    grid.innerHTML = '';
    categories.forEach(cat => {
        const count = adminProducts.filter(p => p.category === cat).length;
        const card = document.createElement('div');
        card.className = 'cat-stat-card';
        card.innerHTML = `<div class="count">${count}</div><div class="cat-name">${escHtml(cat)}</div>`;
        grid.appendChild(card);
    });
}

function addCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) { toast('Ingresa el nombre de la categoría', 'error'); return; }
    if (categories.includes(name)) { toast('Esa categoría ya existe', 'error'); return; }

    categories.push(name);
    document.getElementById('new-cat-name').value = '';
    populateCategorySelects();
    renderCatList();
    renderCatStats();
    toast(`Categoría "${name}" agregada localmente (se guarda al añadir productos)`, 'success');
}

function deleteCategory(cat) {
    const count = adminProducts.filter(p => p.category === cat).length;
    if (count > 0) {
        toast('No puedes eliminar una categoría que tiene productos', 'error');
        return;
    }
    categories = categories.filter(c => c !== cat);
    populateCategorySelects();
    renderCatList();
    renderCatStats();
    toast(`Categoría eliminada`, 'success');
}

// ---- TOAST ----
// ---- UTILS & UI ----
function toast(message, type = 'info') {
    const container = document.getElementById('admin-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
