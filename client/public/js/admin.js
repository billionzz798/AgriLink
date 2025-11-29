const API_BASE = '/api';
let currentUser = null;
let allCategories = [];
let allBrands = [];

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#28a745'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s;
        max-width: 400px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/check-auth`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.user.role !== 'admin') {
                window.location.href = '/customer';
                return false;
            }
            currentUser = data.user;
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl) adminNameEl.textContent = currentUser.name;
            return true;
        } else {
            window.location.href = '/login';
            return false;
        }
    } catch (error) {
        window.location.href = '/login';
        return false;
    }
}

async function loadStats() {
    try {
        const token = localStorage.getItem('token');
        
        const usersRes = await fetch(`${API_BASE}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await usersRes.json();
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl) totalUsersEl.textContent = users.length || 0;

        const productsRes = await fetch(`${API_BASE}/products`);
        const products = await productsRes.json();
        const totalProductsEl = document.getElementById('totalProducts');
        if (totalProductsEl) totalProductsEl.textContent = products.products?.length || 0;

        const ordersRes = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await ordersRes.json();
        const totalOrdersEl = document.getElementById('totalOrders');
        if (totalOrdersEl) totalOrdersEl.textContent = orders.orders?.length || 0;
        
        const totalRevenue = orders.orders?.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) || 0;
        const totalRevenueEl = document.getElementById('totalRevenue');
        if (totalRevenueEl) totalRevenueEl.textContent = `₵${totalRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();
        
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td><strong>${user.name}</strong></td>
                    <td>${user.email}</td>
                    <td><span class="badge badge-info">${user.role}</span></td>
                    <td>${user.phone || 'N/A'}</td>
                    <td>
                        <span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">
                            ${user.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-primary'}" 
                                    onclick="toggleUserStatus('${user.id}', ${!user.isActive})">
                                ${user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        const products = data.products || [];
        
        const tbody = document.getElementById('productsTableBody');
        if (tbody) {
            tbody.innerHTML = products.map(product => `
                <tr>
                    <td><strong>${product.name}</strong></td>
                    <td>${product.farmer?.name || 'N/A'}</td>
                    <td>${product.category?.name || 'N/A'}</td>
                    <td>₵${product.pricing?.b2c?.price || 0}</td>
                    <td>${product.inventory?.availableQuantity || 0}</td>
                    <td>
                        <span class="badge ${product.status === 'active' ? 'badge-success' : product.status === 'out_of_stock' ? 'badge-warning' : 'badge-danger'}">
                            ${product.status}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm ${product.status === 'active' ? 'btn-danger' : 'btn-primary'}" 
                                    onclick="toggleProductStatus('${product.id}', '${product.status === 'active' ? 'inactive' : 'active'}')">
                                ${product.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function loadOrders() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const orders = data.orders || [];
        
        const tbody = document.getElementById('ordersTableBody');
        if (tbody) {
            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td><strong>${order.orderNumber}</strong></td>
                    <td>${order.buyer?.name || 'N/A'}</td>
                    <td>${order.farmer?.name || 'N/A'}</td>
                    <td><strong>₵${parseFloat(order.total).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                    <td>
                        <span class="badge badge-info">${order.status}</span>
                    </td>
                    <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                        <select class="filter-select" onchange="updateOrderStatus('${order.id}', this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        allCategories = await response.json();
        
        const grid = document.getElementById('categoriesGrid');
        if (grid) {
            grid.innerHTML = allCategories.map(category => `
                <div class="category-card">
                    <div class="category-card-header">
                        <h4>${category.name}</h4>
                        <div class="category-card-actions">
                            <button class="btn btn-sm btn-edit" onclick="editCategory('${category.id}')">✏️ Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category.id}')">🗑️ Delete</button>
                        </div>
                    </div>
                    <div class="category-card-body">
                        ${category.description || 'No description'}
                    </div>
                    <div class="category-card-footer">
                        <span class="badge ${category.isActive ? 'badge-success' : 'badge-danger'}">
                            ${category.isActive ? 'Active' : 'Inactive'}
                        </span>
                        ${category.parent ? `<span>Parent: ${category.parent.name}</span>` : '<span>Top Level</span>'}
                    </div>
                </div>
            `).join('');
        }
        
        updateCategoryParentSelect();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadBrands() {
    try {
        const response = await fetch(`${API_BASE}/brands`);
        allBrands = await response.json();
        
        const grid = document.getElementById('brandsGrid');
        if (grid) {
            grid.innerHTML = allBrands.map(brand => `
                <div class="brand-card">
                    <div class="brand-card-header">
                        <h4>${brand.name}</h4>
                        <div class="brand-card-actions">
                            <button class="btn btn-sm btn-edit" onclick="editBrand('${brand.id}')">✏️ Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteBrand('${brand.id}')">🗑️ Delete</button>
                        </div>
                    </div>
                    <div class="brand-card-body">
                        ${brand.description || 'No description'}
                        ${brand.website ? `<br><a href="${brand.website}" target="_blank">${brand.website}</a>` : ''}
                    </div>
                    <div class="brand-card-footer">
                        <span class="badge ${brand.isActive ? 'badge-success' : 'badge-danger'}">
                            ${brand.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading brands:', error);
    }
}

function updateCategoryParentSelect() {
    const select = document.getElementById('categoryParent');
    const categoryIdEl = document.getElementById('categoryId');
    if (!select || !categoryIdEl) return;
    
    const currentId = categoryIdEl.value;
    select.innerHTML = '<option value="">None (Top Level)</option>' +
        allCategories
            .filter(cat => cat.id !== currentId)
            .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
            .join('');
}

function openCategoryModal(category = null) {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    const title = document.getElementById('categoryModalTitle');
    
    if (!modal || !form || !title) return;
    
    if (category) {
        title.textContent = 'Edit Category';
        const categoryIdEl = document.getElementById('categoryId');
        const categoryNameEl = document.getElementById('categoryName');
        const categoryDescEl = document.getElementById('categoryDescription');
        const categoryParentEl = document.getElementById('categoryParent');
        const categoryActiveEl = document.getElementById('categoryActive');
        
        if (categoryIdEl) categoryIdEl.value = category.id;
        if (categoryNameEl) categoryNameEl.value = category.name;
        if (categoryDescEl) categoryDescEl.value = category.description || '';
        if (categoryParentEl) categoryParentEl.value = category.parentId || '';
        if (categoryActiveEl) categoryActiveEl.checked = category.isActive;
    } else {
        title.textContent = 'Add Category';
        form.reset();
        const categoryIdEl = document.getElementById('categoryId');
        if (categoryIdEl) categoryIdEl.value = '';
    }
    
    updateCategoryParentSelect();
    modal.style.display = 'block';
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) modal.style.display = 'none';
}

function openBrandModal(brand = null) {
    const modal = document.getElementById('brandModal');
    const form = document.getElementById('brandForm');
    const title = document.getElementById('brandModalTitle');
    
    if (!modal || !form || !title) return;
    
    if (brand) {
        title.textContent = 'Edit Brand';
        const brandIdEl = document.getElementById('brandId');
        const brandNameEl = document.getElementById('brandName');
        const brandDescEl = document.getElementById('brandDescription');
        const brandWebsiteEl = document.getElementById('brandWebsite');
        const brandActiveEl = document.getElementById('brandActive');
        
        if (brandIdEl) brandIdEl.value = brand.id;
        if (brandNameEl) brandNameEl.value = brand.name;
        if (brandDescEl) brandDescEl.value = brand.description || '';
        if (brandWebsiteEl) brandWebsiteEl.value = brand.website || '';
        if (brandActiveEl) brandActiveEl.checked = brand.isActive;
    } else {
        title.textContent = 'Add Brand';
        form.reset();
        const brandIdEl = document.getElementById('brandId');
        if (brandIdEl) brandIdEl.value = '';
    }
    
    modal.style.display = 'block';
}

function closeBrandModal() {
    const modal = document.getElementById('brandModal');
    if (modal) modal.style.display = 'none';
}

async function editCategory(id) {
    const category = allCategories.find(c => c.id === id);
    if (category) {
        openCategoryModal(category);
    }
}

async function editBrand(id) {
    const brand = allBrands.find(b => b.id === id);
    if (brand) {
        openBrandModal(brand);
    }
}

async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showNotification('Category deleted successfully');
            await loadCategories();
        } else {
            showNotification('Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Error deleting category', 'error');
    }
}

async function deleteBrand(id) {
    if (!confirm('Are you sure you want to delete this brand?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/brands/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showNotification('Brand deleted successfully');
            await loadBrands();
        } else {
            showNotification('Failed to delete brand', 'error');
        }
    } catch (error) {
        console.error('Error deleting brand:', error);
        showNotification('Error deleting brand', 'error');
    }
}

async function toggleUserStatus(id, status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/users/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive: status })
        });
        
        if (response.ok) {
            showNotification('User status updated successfully');
            await loadUsers();
            await loadStats();
        } else {
            showNotification('Failed to update user status', 'error');
        }
    } catch (error) {
        console.error('Error updating user status:', error);
        showNotification('Error updating user status', 'error');
    }
}

async function toggleProductStatus(id, status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/products/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showNotification('Product status updated successfully');
            await loadProducts();
        } else {
            showNotification('Failed to update product status', 'error');
        }
    } catch (error) {
        console.error('Error updating product status:', error);
        showNotification('Error updating product status', 'error');
    }
}

async function updateOrderStatus(id, status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showNotification('Order status updated successfully');
            await loadOrders();
            await loadStats();
        } else {
            showNotification('Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Error updating order status', 'error');
    }
}

// Export functions to window for inline handlers
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.editBrand = editBrand;
window.deleteBrand = deleteBrand;
window.toggleUserStatus = toggleUserStatus;
window.toggleProductStatus = toggleProductStatus;
window.updateOrderStatus = updateOrderStatus;
window.closeCategoryModal = closeCategoryModal;
window.closeBrandModal = closeBrandModal;

// Initialize event listeners
function initializeEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        };
    }
    
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.onclick = () => openCategoryModal();
    }
    
    const addBrandBtn = document.getElementById('addBrandBtn');
    if (addBrandBtn) {
        addBrandBtn.onclick = () => openBrandModal();
    }
    
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#usersTableBody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
    
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#productsTableBody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
    
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', (e) => {
            const filterValue = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#ordersTableBody tr');
            rows.forEach(row => {
                if (!filterValue) {
                    row.style.display = '';
                } else {
                    const statusBadge = row.querySelector('.badge');
                    const status = statusBadge ? statusBadge.textContent.toLowerCase() : '';
                    row.style.display = status.includes(filterValue) ? '' : 'none';
                }
            });
        });
    }
    
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                description: formData.get('description'),
                parentId: formData.get('parentId') || null,
                isActive: formData.get('isActive') === 'on'
            };
            
            const categoryIdEl = document.getElementById('categoryId');
            const id = categoryIdEl ? categoryIdEl.value : '';
            const token = localStorage.getItem('token');
            
            try {
                const url = id ? `${API_BASE}/categories/${id}` : `${API_BASE}/categories`;
                const method = id ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    showNotification(id ? 'Category updated successfully' : 'Category created successfully');
                    closeCategoryModal();
                    await loadCategories();
                } else {
                    const error = await response.json();
                    showNotification(error.message || 'Failed to save category', 'error');
                }
            } catch (error) {
                console.error('Error saving category:', error);
                showNotification('Error saving category', 'error');
            }
        });
    }
    
    const brandForm = document.getElementById('brandForm');
    if (brandForm) {
        brandForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                description: formData.get('description'),
                website: formData.get('website'),
                isActive: formData.get('isActive') === 'on'
            };
            
            const brandIdEl = document.getElementById('brandId');
            const id = brandIdEl ? brandIdEl.value : '';
            const token = localStorage.getItem('token');
            
            try {
                const url = id ? `${API_BASE}/brands/${id}` : `${API_BASE}/brands`;
                const method = id ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    showNotification(id ? 'Brand updated successfully' : 'Brand created successfully');
                    closeBrandModal();
                    await loadBrands();
                } else {
                    const error = await response.json();
                    showNotification(error.message || 'Failed to save brand', 'error');
                }
            } catch (error) {
                console.error('Error saving brand:', error);
                showNotification('Error saving brand', 'error');
            }
        });
    }
    
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.onclick = (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        };
    });
    
    window.onclick = (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };
    
    // Navigation links smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Initialize app
function initApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeEventListeners();
            startApp();
        });
    } else {
        initializeEventListeners();
        startApp();
    }
}

async function startApp() {
    const authenticated = await checkAuth();
    if (authenticated) {
        const loadingEl = document.getElementById('loading');
        const contentEl = document.getElementById('adminContent');
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        await loadStats();
        await loadUsers();
        await loadProducts();
        await loadOrders();
        await loadCategories();
        await loadBrands();
    }
}

initApp();
