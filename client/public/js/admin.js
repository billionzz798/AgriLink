const API_BASE = '/api';
let currentUser = null;
let allCategories = [];
let allBrands = [];
let allOrders = [];
let refreshInterval = null;
const REFRESH_INTERVAL_MS = 30000;

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
            headers: { 'Authorization': `Bearer ${token}` }
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
        console.error('Auth check error:', error);
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
    } catch (error) {
        console.error('Error loading stats:', error);
        showNotification('Error loading statistics', 'error');
    }
}

async function refreshDashboard() {
    if (!currentUser) return;
    
    try {
        await Promise.all([loadStats(), loadOrders()]);
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
    }
}

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    
    refreshInterval = setInterval(() => {
        refreshDashboard();
    }, REFRESH_INTERVAL_MS);
    
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && currentUser) refreshDashboard();
    });
    
    window.addEventListener('focus', () => {
        if (currentUser) refreshDashboard();
    });
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        const users = await response.json();
        const tbody = document.getElementById('usersTableBody');
        
        if (tbody) {
            tbody.innerHTML = users.map(user => {
                const escapedId = String(user.id).replace(/'/g, "\\'");
                return `
                    <tr>
                        <td><strong>${escapeHtml(user.name)}</strong></td>
                        <td>${escapeHtml(user.email)}</td>
                        <td><span class="badge badge-info">${escapeHtml(user.role)}</span></td>
                        <td>${escapeHtml(user.phone || 'N/A')}</td>
                        <td>
                            <span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">
                                ${user.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-primary'}" 
                                        data-user-id="${escapedId}" 
                                        data-user-status="${!user.isActive}">
                                    ${user.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        attachUserStatusListeners();
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        
        if (!response.ok) throw new Error('Failed to load products');
        
        const data = await response.json();
        const products = data.products || [];
        const tbody = document.getElementById('productsTableBody');
        
        if (tbody) {
            tbody.innerHTML = products.map(product => {
                const escapedId = String(product.id).replace(/'/g, "\\'");
                const newStatus = product.status === 'active' ? 'inactive' : 'active';
                return `
                    <tr>
                        <td><strong>${escapeHtml(product.name)}</strong></td>
                        <td>${escapeHtml(product.farmer?.name || 'N/A')}</td>
                        <td>${escapeHtml(product.category?.name || 'N/A')}</td>
                        <td>₵${product.pricing?.b2c?.price || 0}</td>
                        <td>${product.inventory?.availableQuantity || 0}</td>
                        <td>
                            <span class="badge ${product.status === 'active' ? 'badge-success' : product.status === 'out_of_stock' ? 'badge-warning' : 'badge-danger'}">
                                ${escapeHtml(product.status)}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm ${product.status === 'active' ? 'btn-danger' : 'btn-primary'}" 
                                        data-product-id="${escapedId}" 
                                        data-product-status="${newStatus}">
                                    ${product.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        attachProductStatusListeners();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

async function loadOrders() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load orders');
        
        const data = await response.json();
        allOrders = data.orders || [];
        
        allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const tbody = document.getElementById('ordersTableBody');
        if (tbody) {
            tbody.innerHTML = allOrders.map(order => {
                const escapedId = String(order.id).replace(/'/g, "\\'");
                const itemsCount = order.items?.length || 0;
                const paymentStatus = order.payment?.status || 'pending';
                const paymentStatusClass = paymentStatus === 'success' ? 'badge-success' : 
                                         paymentStatus === 'failed' ? 'badge-danger' : 'badge-warning';
                const paymentStatusText = paymentStatus === 'success' ? 'Paid' : 
                                         paymentStatus === 'failed' ? 'Failed' : 'Pending';
                
                return `
                    <tr>
                        <td><strong>${escapeHtml(order.orderNumber)}</strong></td>
                        <td>${escapeHtml(order.buyer?.name || 'N/A')}</td>
                        <td>${escapeHtml(order.farmer?.name || 'N/A')}</td>
                        <td>${itemsCount} item${itemsCount !== 1 ? 's' : ''}</td>
                        <td><strong>₵${parseFloat(order.total || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                        <td>
                            <span class="badge ${paymentStatusClass}">${paymentStatusText}</span>
                        </td>
                        <td>
                            <span class="badge badge-info">${escapeHtml(order.status)}</span>
                        </td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" data-order-id="${escapedId}" data-action="view">View</button>
                                <select class="filter-select order-status-select" data-order-id="${escapedId}" style="margin-left: 5px;">
                                    <option value="payment_pending" ${order.status === 'payment_pending' ? 'selected' : ''}>Payment Pending</option>
                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    <option value="payment_failed" ${order.status === 'payment_failed' ? 'selected' : ''}>Payment Failed</option>
                                </select>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        attachOrderStatusListeners();
        attachOrderViewListeners();
        filterOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Error loading orders', 'error');
    }
}

function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        showNotification('Order not found', 'error');
        return;
    }
    
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    
    if (!modal || !content) return;
    
    const items = order.items || [];
    const payment = order.payment || {};
    const address = order.deliveryAddress || {};
    
    content.innerHTML = `
        <div style="padding: 1.5rem;">
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 0.5rem;">Order #${escapeHtml(order.orderNumber)}</h3>
                <p style="color: #666;">Placed on ${new Date(order.createdAt).toLocaleString()}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div>
                    <h4 style="margin-bottom: 0.5rem;">Buyer Information</h4>
                    <p><strong>Name:</strong> ${escapeHtml(order.buyer?.name || 'N/A')}</p>
                    <p><strong>Email:</strong> ${escapeHtml(order.buyer?.email || 'N/A')}</p>
                    <p><strong>Phone:</strong> ${escapeHtml(order.buyer?.phone || 'N/A')}</p>
                </div>
                <div>
                    <h4 style="margin-bottom: 0.5rem;">Farmer Information</h4>
                    <p><strong>Name:</strong> ${escapeHtml(order.farmer?.name || 'N/A')}</p>
                    <p><strong>Email:</strong> ${escapeHtml(order.farmer?.email || 'N/A')}</p>
                    <p><strong>Phone:</strong> ${escapeHtml(order.farmer?.phone || 'N/A')}</p>
                </div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Delivery Address</h4>
                <p>${escapeHtml(address.street || '')}</p>
                <p>${escapeHtml(address.city || '')}, ${escapeHtml(address.region || '')}</p>
                <p>${escapeHtml(address.postalCode || '')}</p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Order Items</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #ddd;">
                            <th style="text-align: left; padding: 0.5rem;">Product</th>
                            <th style="text-align: right; padding: 0.5rem;">Quantity</th>
                            <th style="text-align: right; padding: 0.5rem;">Price</th>
                            <th style="text-align: right; padding: 0.5rem;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 0.5rem;">${escapeHtml(item.productName || 'N/A')}</td>
                                <td style="text-align: right; padding: 0.5rem;">${item.quantity} ${escapeHtml(item.unit || '')}</td>
                                <td style="text-align: right; padding: 0.5rem;">₵${parseFloat(item.price || 0).toFixed(2)}</td>
                                <td style="text-align: right; padding: 0.5rem;">₵${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Payment Information</h4>
                <p><strong>Status:</strong> 
                    <span class="badge ${payment.status === 'success' ? 'badge-success' : payment.status === 'failed' ? 'badge-danger' : 'badge-warning'}">
                        ${escapeHtml(payment.status || 'pending')}
                    </span>
                </p>
                ${payment.reference ? `<p><strong>Reference:</strong> ${escapeHtml(payment.reference)}</p>` : ''}
                ${payment.method ? `<p><strong>Method:</strong> ${escapeHtml(payment.method)}</p>` : ''}
                ${payment.paidAt ? `<p><strong>Paid At:</strong> ${new Date(payment.paidAt).toLocaleString()}</p>` : ''}
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Order Summary</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Subtotal:</span>
                    <strong>₵${parseFloat(order.subtotal || 0).toFixed(2)}</strong>
                </div>
                ${order.shipping?.cost ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Shipping:</span>
                        <strong>₵${parseFloat(order.shipping.cost || 0).toFixed(2)}</strong>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 2px solid #ddd; font-size: 1.1rem;">
                    <span><strong>Total:</strong></span>
                    <strong>₵${parseFloat(order.total || 0).toFixed(2)}</strong>
                </div>
            </div>
            
            ${order.notes ? `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 0.5rem;">Order Notes</h4>
                    <p>${escapeHtml(order.notes)}</p>
                </div>
            ` : ''}
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeOrderDetailsModal()">Close</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) modal.style.display = 'none';
}

function filterOrders() {
    const searchInput = document.getElementById('orderSearch');
    const statusFilter = document.getElementById('orderStatusFilter');
    
    if (!searchInput || !statusFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value.toLowerCase();
    
    const rows = document.querySelectorAll('#ordersTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const statusBadge = row.querySelector('.badge-info');
        const status = statusBadge ? statusBadge.textContent.toLowerCase() : '';
        
        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesStatus = !statusValue || status.includes(statusValue);
        
        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        
        if (!response.ok) throw new Error('Failed to load categories');
        
        allCategories = await response.json();
        
        const grid = document.getElementById('categoriesGrid');
        if (grid) {
            grid.innerHTML = allCategories.map(category => {
                const escapedId = String(category.id).replace(/'/g, "\\'");
                return `
                    <div class="category-card">
                        <div class="category-card-header">
                            <h4>${escapeHtml(category.name)}</h4>
                            <div class="category-card-actions">
                                <button class="btn btn-sm btn-edit" data-category-id="${escapedId}" data-action="edit">✏️ Edit</button>
                                <button class="btn btn-sm btn-danger" data-category-id="${escapedId}" data-action="delete">🗑️ Delete</button>
                            </div>
                        </div>
                        <div class="category-card-body">
                            ${escapeHtml(category.description || 'No description')}
                        </div>
                        <div class="category-card-footer">
                            <span class="badge ${category.isActive ? 'badge-success' : 'badge-danger'}">
                                ${category.isActive ? 'Active' : 'Inactive'}
                            </span>
                            ${category.parent ? `<span>Parent: ${escapeHtml(category.parent.name)}</span>` : '<span>Top Level</span>'}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        updateCategoryParentSelect();
        attachCategoryListeners();
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Error loading categories', 'error');
    }
}

async function loadBrands() {
    try {
        const response = await fetch(`${API_BASE}/brands`);
        
        if (!response.ok) throw new Error('Failed to load brands');
        
        allBrands = await response.json();
        
        const grid = document.getElementById('brandsGrid');
        if (grid) {
            grid.innerHTML = allBrands.map(brand => {
                const escapedId = String(brand.id).replace(/'/g, "\\'");
                return `
                    <div class="brand-card">
                        <div class="brand-card-header">
                            <h4>${escapeHtml(brand.name)}</h4>
                            <div class="brand-card-actions">
                                <button class="btn btn-sm btn-edit" data-brand-id="${escapedId}" data-action="edit">✏️ Edit</button>
                                <button class="btn btn-sm btn-danger" data-brand-id="${escapedId}" data-action="delete">🗑️ Delete</button>
                            </div>
                        </div>
                        <div class="brand-card-body">
                            ${escapeHtml(brand.description || 'No description')}
                            ${brand.website ? `<br><a href="${escapeHtml(brand.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(brand.website)}</a>` : ''}
                        </div>
                        <div class="brand-card-footer">
                            <span class="badge ${brand.isActive ? 'badge-success' : 'badge-danger'}">
                                ${brand.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        attachBrandListeners();
    } catch (error) {
        console.error('Error loading brands:', error);
        showNotification('Error loading brands', 'error');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateCategoryParentSelect() {
    const select = document.getElementById('categoryParent');
    const categoryIdEl = document.getElementById('categoryId');
    if (!select || !categoryIdEl) return;
    
    const currentId = categoryIdEl.value;
    select.innerHTML = '<option value="">None (Top Level)</option>' +
        allCategories
            .filter(cat => cat.id !== currentId)
            .map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`)
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
        if (categoryNameEl) categoryNameEl.value = category.name || '';
        if (categoryDescEl) categoryDescEl.value = category.description || '';
        if (categoryParentEl) categoryParentEl.value = category.parentId || '';
        if (categoryActiveEl) categoryActiveEl.checked = category.isActive !== false;
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
        if (brandNameEl) brandNameEl.value = brand.name || '';
        if (brandDescEl) brandDescEl.value = brand.description || '';
        if (brandWebsiteEl) brandWebsiteEl.value = brand.website || '';
        if (brandActiveEl) brandActiveEl.checked = brand.isActive !== false;
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
    if (category) openCategoryModal(category);
}

async function editBrand(id) {
    const brand = allBrands.find(b => b.id === id);
    if (brand) openBrandModal(brand);
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
            const error = await response.json().catch(() => ({ message: 'Failed to delete category' }));
            showNotification(error.message || 'Failed to delete category', 'error');
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
            const error = await response.json().catch(() => ({ message: 'Failed to delete brand' }));
            showNotification(error.message || 'Failed to delete brand', 'error');
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
            await refreshDashboard();
        } else {
            const error = await response.json().catch(() => ({ message: 'Failed to update user status' }));
            showNotification(error.message || 'Failed to update user status', 'error');
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
            await refreshDashboard();
        } else {
            const error = await response.json().catch(() => ({ message: 'Failed to update product status' }));
            showNotification(error.message || 'Failed to update product status', 'error');
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
            await refreshDashboard();
        } else {
            const error = await response.json().catch(() => ({ message: 'Failed to update order status' }));
            showNotification(error.message || 'Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Error updating order status', 'error');
    }
}

function attachUserStatusListeners() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-user-id]');
        if (btn) {
            const userId = btn.getAttribute('data-user-id');
            const status = btn.getAttribute('data-user-status') === 'true';
            toggleUserStatus(userId, status);
        }
    });
}

function attachProductStatusListeners() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-product-id]');
        if (btn) {
            const productId = btn.getAttribute('data-product-id');
            const status = btn.getAttribute('data-product-status');
            toggleProductStatus(productId, status);
        }
    });
}

function attachOrderStatusListeners() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.addEventListener('change', (e) => {
        const select = e.target.closest('.order-status-select');
        if (select) {
            const orderId = select.getAttribute('data-order-id');
            const status = select.value;
            updateOrderStatus(orderId, status);
        }
    });
}

function attachOrderViewListeners() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="view"]');
        if (btn) {
            const orderId = btn.getAttribute('data-order-id');
            viewOrderDetails(orderId);
        }
    });
}

function attachCategoryListeners() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-category-id]');
        if (btn) {
            const categoryId = btn.getAttribute('data-category-id');
            const action = btn.getAttribute('data-action');
            if (action === 'edit') {
                editCategory(categoryId);
            } else if (action === 'delete') {
                deleteCategory(categoryId);
            }
        }
    });
}

function attachBrandListeners() {
    const grid = document.getElementById('brandsGrid');
    if (!grid) return;
    
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-brand-id]');
        if (btn) {
            const brandId = btn.getAttribute('data-brand-id');
            const action = btn.getAttribute('data-action');
            if (action === 'edit') {
                editBrand(brandId);
            } else if (action === 'delete') {
                deleteBrand(brandId);
            }
        }
    });
}

window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.editBrand = editBrand;
window.deleteBrand = deleteBrand;
window.toggleUserStatus = toggleUserStatus;
window.toggleProductStatus = toggleProductStatus;
window.updateOrderStatus = updateOrderStatus;
window.closeCategoryModal = closeCategoryModal;
window.closeBrandModal = closeBrandModal;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.viewOrderDetails = viewOrderDetails;

function initializeEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            stopAutoRefresh();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        });
    }
    
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openCategoryModal());
    }
    
    const addBrandBtn = document.getElementById('addBrandBtn');
    if (addBrandBtn) {
        addBrandBtn.addEventListener('click', () => openBrandModal());
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
    
    const orderSearch = document.getElementById('orderSearch');
    if (orderSearch) {
        orderSearch.addEventListener('input', () => filterOrders());
    }
    
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', () => filterOrders());
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
                    const error = await response.json().catch(() => ({ message: 'Failed to save category' }));
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
                    const error = await response.json().catch(() => ({ message: 'Failed to save brand' }));
                    showNotification(error.message || 'Failed to save brand', 'error');
                }
            } catch (error) {
                console.error('Error saving brand:', error);
                showNotification('Error saving brand', 'error');
            }
        });
    }
    
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
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
        
        try {
            await Promise.all([
                loadStats(),
                loadUsers(),
                loadProducts(),
                loadOrders(),
                loadCategories(),
                loadBrands()
            ]);
            
            startAutoRefresh();
        } catch (error) {
            console.error('Error loading admin data:', error);
            showNotification('Error loading dashboard data', 'error');
        }
    }
}

initApp();
