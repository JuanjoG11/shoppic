// ===== SHOPPIC ADMIN PANEL JS =====
const ADMIN_PASSWORD = 'shoppic2024';

// State
let adminProducts = [];
let categories = ['Hogar', 'Tecnología', 'Niños', 'Aseo'];

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

// ---- INIT ----
async function initAdmin() {
    await loadAdminProducts();
    setupTabNav();
    setupNewProductPreview();
}

async function loadAdminProducts() {
    try {
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        adminProducts = data;

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

// ---- TAB NAVIGATION ----
function setupTabNav() {
    const tabs = {
        'products': { title: 'Gestión de Productos', sub: 'Edita, filtra y administra todo el catálogo' },
        'add-product': { title: 'Agregar Producto', sub: 'Añade un nuevo producto al catálogo' },
        'categories': { title: 'Categorías', sub: 'Agrega o elimina categorías del catálogo' },
    };
    document.querySelectorAll('.sidebar-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + tabId)?.classList.add('active');
            document.getElementById('page-title').textContent = tabs[tabId]?.title || '';
            document.getElementById('page-sub').textContent = tabs[tabId]?.sub || '';
        });
    });

    // Search & filter on products tab
    document.getElementById('admin-search-input').addEventListener('input', renderProductsTable);
    document.getElementById('admin-cat-filter').addEventListener('change', renderProductsTable);
}

// ---- PRODUCTS TABLE ----
function renderProductsTable() {
    const search = document.getElementById('admin-search-input').value.toLowerCase();
    const catFilter = document.getElementById('admin-cat-filter').value;
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';

    const filtered = adminProducts.filter(p => {
        const matchCat = catFilter === 'all' || p.category === catFilter;
        const matchSearch = p.title.toLowerCase().includes(search) || String(p.id).includes(search);
        return matchCat && matchSearch;
    });

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#555;padding:2rem;">Sin resultados</td></tr>`;
        return;
    }

    filtered.forEach(product => {
        const tr = document.createElement('tr');
        const imgCell = product.image
            ? `<img src="${product.image}" alt="" class="table-img" onerror="this.outerHTML='<div class=\\'img-placeholder error\\'><i class=\\'fa-solid fa-image-slash\\'></i></div>'">`
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
                <div class="table-actions">
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

    const editCatSelect = document.getElementById('edit-category');
    editCatSelect.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === p.category) opt.selected = true;
        editCatSelect.appendChild(opt);
    });

    const preview = document.getElementById('edit-img-preview');
    if (p.image) { preview.src = p.image; preview.style.display = 'block'; }
    else { preview.style.display = 'none'; }

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
    const image = document.getElementById('edit-image').value.trim();

    if (!title || isNaN(price)) { toast('Completa los campos requeridos', 'error'); return; }

    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({ title, price, category, description, image })
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

async function addNewProduct() {
    const title = document.getElementById('new-title').value.trim();
    const price = parseFloat(document.getElementById('new-price').value);
    const category = document.getElementById('new-category').value;
    const image = document.getElementById('new-image').value.trim();
    const description = document.getElementById('new-description').value.trim();

    if (!title || isNaN(price) || !category) { toast('Completa nombre, precio y categoría', 'error'); return; }

    try {
        const newProduct = {
            id: 'admin_' + Date.now(),
            title,
            price,
            category,
            image,
            description
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
        updatePreview();
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
function toast(msg, type = 'success') {
    const container = document.getElementById('admin-toast-container');
    const el = document.createElement('div');
    el.className = `admin-toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation';
    el.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
    }, 3500);
}
