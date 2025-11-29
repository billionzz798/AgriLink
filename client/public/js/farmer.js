const API_BASE = '/api';
let currentUser = null;
let myProducts = [];
let orders = [];
let categories = [];

// Helper function to get product image with fallback
function getProductImage(product) {
  if (product.images && product.images.length > 0 && product.images[0].url) {
    return product.images[0].url;
  }
  const productName = encodeURIComponent(product.name);
  return `https://via.placeholder.com/400x400/28a745/ffffff?text=${productName}`;
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
            if (data.user.role !== 'farmer') {
                window.location.href = '/customer';
                return false;
            }
            currentUser = data.user;
            const farmerNameEl = document.getElementById('farmerName');
            if (farmerNameEl) farmerNameEl.textContent = currentUser.name;
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
        
        const productsRes = await fetch(`${API_BASE}/products?farmer=${currentUser.id}`);
        const productsData = await productsRes.json();
        const totalProductsEl = document.getElementById('totalProducts');
        if (totalProductsEl) totalProductsEl.textContent = productsData.products?.length || 0;

        const ordersRes = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ordersData = await ordersRes.json();
        const myOrders = ordersData.orders?.filter(o => o.farmerId === currentUser.id) || [];
        const totalOrdersEl = document.getElementById('totalOrders');
        if (totalOrdersEl) totalOrdersEl.textContent = myOrders.length;
        
        const totalRevenue = myOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
        const totalRevenueEl = document.getElementById('totalRevenue');
        if (totalRevenueEl) totalRevenueEl.textContent = `₵${totalRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        categories = await response.json();
        
        const select = document.getElementById('productCategory');
        if (select) {
            select.innerHTML = '<option value="">Select Category</option>' +
                categories
                    .filter(cat => cat.isActive)
                    .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
                    .join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadMyProducts() {
    try {
        const response = await fetch(`${API_BASE}/products?farmer=${currentUser.id}`);
        const data = await response.json();
        myProducts = data.products || [];
        displayProducts(myProducts);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts(productsToShow) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (productsToShow.length === 0) {
        const noProductsEl = document.getElementById('noProducts');
        if (noProductsEl) noProductsEl.style.display = 'block';
        grid.innerHTML = '';
        return;
    }
    
    const noProductsEl = document.getElementById('noProducts');
    if (noProductsEl) noProductsEl.style.display = 'none';
    
    grid.innerHTML = productsToShow.map(product => {
        const b2cPrice = product.pricing?.b2c?.price || 0;
        const b2bPrice = product.pricing?.b2b?.price || 0;
        const stock = product.inventory?.availableQuantity || 0;
        const imageUrl = getProductImage(product);
        const fallbackUrl = `https://via.placeholder.com/400x400/28a745/ffffff?text=${encodeURIComponent(product.name)}`;
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <img src="${imageUrl}" 
                     alt="${product.name}" 
                     onerror="this.onerror=null; this.src='${fallbackUrl}';">
                <h4>${product.name}</h4>
                <p class="product-price">
                    B2B: ₵${b2bPrice} | B2C: ₵${b2cPrice}
                </p>
                <p class="product-stock ${stock > 10 ? 'in-stock' : stock > 0 ? 'low-stock' : 'out-of-stock'}">
                    Stock: ${stock}
                </p>
                <p style="color: #666; font-size: 0.85rem;">${product.category?.name || 'No category'}</p>
                <div class="product-actions">
                    <button class="btn btn-sm btn-edit" data-action="edit" data-product-id="${product.id}">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-product-id="${product.id}">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

async function loadOrders() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        orders = (data.orders || []).filter(o => o.farmerId === currentUser.id);
        displayOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders(ordersToShow) {
    const list = document.getElementById('ordersList');
    if (!list) return;
    
    if (ordersToShow.length === 0) {
        const noOrdersEl = document.getElementById('noOrders');
        if (noOrdersEl) noOrdersEl.style.display = 'block';
        list.innerHTML = '';
        return;
    }
    
    const noOrdersEl = document.getElementById('noOrders');
    if (noOrdersEl) noOrdersEl.style.display = 'none';
    
    list.innerHTML = ordersToShow.map(order => {
        const statusClass = order.status.toLowerCase().replace('_', '-');
        return `
            <div class="order-card">
                <div class="order-card-header">
                    <div>
                        <h4>Order #${order.orderNumber}</h4>
                        <p style="color: #666; margin: 0.5rem 0 0 0;">${new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <span class="order-status ${statusClass}">${order.status}</span>
                </div>
                <div class="order-card-body">
                    <div>
                        <strong>Buyer:</strong> ${order.buyer?.name || 'N/A'}<br>
                        <strong>Email:</strong> ${order.buyer?.email || 'N/A'}<br>
                        <strong>Phone:</strong> ${order.buyer?.phone || 'N/A'}
                    </div>
                    <div>
                        <strong>Items:</strong>
                        ${(order.items || []).map(item => `
                            <div class="order-item">
                                <span>${item.productName || 'Product'} x ${item.quantity}</span>
                                <span>₵${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div>
                        <p><strong>Total: ₵${parseFloat(order.total || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                        ${order.deliveryAddress ? `
                            <p><strong>Delivery Address:</strong></p>
                            <p>${order.deliveryAddress.street || ''}<br>
                            ${order.deliveryAddress.city || ''}, ${order.deliveryAddress.region || ''}</p>
                        ` : ''}
                    </div>
                </div>
                <div class="order-actions">
                    <select class="filter-select" data-order-id="${order.id}" onchange="updateOrderStatus('${order.id}', this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await response.json();
        
        const profileInfo = document.getElementById('profileInfo');
        if (profileInfo) {
            profileInfo.innerHTML = `
                <div class="profile-field">
                    <span class="profile-field-label">Name:</span>
                    <span class="profile-field-value">${user.name}</span>
                </div>
                <div class="profile-field">
                    <span class="profile-field-label">Email:</span>
                    <span class="profile-field-value">${user.email}</span>
                </div>
                <div class="profile-field">
                    <span class="profile-field-label">Phone:</span>
                    <span class="profile-field-value">${user.phone || 'Not provided'}</span>
                </div>
                ${user.farmDetails ? `
                    <div class="profile-field">
                        <span class="profile-field-label">Farm Name:</span>
                        <span class="profile-field-value">${user.farmDetails.farmName || 'N/A'}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Farm Size:</span>
                        <span class="profile-field-value">${user.farmDetails.farmSize || 0} acres</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Experience:</span>
                        <span class="profile-field-value">${user.farmDetails.yearsOfExperience || 0} years</span>
                    </div>
                ` : ''}
                ${user.address ? `
                    <div class="profile-field">
                        <span class="profile-field-label">Address:</span>
                        <span class="profile-field-value">
                            ${user.address.street || ''}<br>
                            ${user.address.city || ''}, ${user.address.region || ''}<br>
                            ${user.address.postalCode || ''}
                        </span>
                    </div>
                ` : ''}
            `;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function openProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');
    
    if (!modal || !form || !title) return;
    
    if (product) {
        title.textContent = 'Edit Product';
        const productIdEl = document.getElementById('productId');
        const productNameEl = document.getElementById('productName');
        const productDescEl = document.getElementById('productDescription');
        const productCatEl = document.getElementById('productCategory');
        const b2bPriceEl = document.getElementById('b2bPrice');
        const b2bMinQtyEl = document.getElementById('b2bMinQty');
        const b2cPriceEl = document.getElementById('b2cPrice');
        const priceUnitEl = document.getElementById('priceUnit');
        const totalQtyEl = document.getElementById('totalQuantity');
        const marketplaceEl = document.getElementById('productMarketplace');
        const statusEl = document.getElementById('productStatus');
        
        if (productIdEl) productIdEl.value = product.id;
        if (productNameEl) productNameEl.value = product.name;
        if (productDescEl) productDescEl.value = product.description || '';
        if (productCatEl) productCatEl.value = product.categoryId || '';
        if (b2bPriceEl) b2bPriceEl.value = product.pricing?.b2b?.price || 0;
        if (b2bMinQtyEl) b2bMinQtyEl.value = product.pricing?.b2b?.minQuantity || 1;
        if (b2cPriceEl) b2cPriceEl.value = product.pricing?.b2c?.price || 0;
        if (priceUnitEl) priceUnitEl.value = product.pricing?.b2b?.unit || product.pricing?.b2c?.unit || 'kg';
        if (totalQtyEl) totalQtyEl.value = product.inventory?.totalQuantity || 0;
        if (marketplaceEl) marketplaceEl.value = product.marketplace || 'both';
        if (statusEl) statusEl.value = product.status || 'active';
    } else {
        title.textContent = 'Add Product';
        form.reset();
        const productIdEl = document.getElementById('productId');
        const b2bMinQtyEl = document.getElementById('b2bMinQty');
        const priceUnitEl = document.getElementById('priceUnit');
        const marketplaceEl = document.getElementById('productMarketplace');
        const statusEl = document.getElementById('productStatus');
        
        if (productIdEl) productIdEl.value = '';
        if (b2bMinQtyEl) b2bMinQtyEl.value = 1;
        if (priceUnitEl) priceUnitEl.value = 'kg';
        if (marketplaceEl) marketplaceEl.value = 'both';
        if (statusEl) statusEl.value = 'active';
    }
    
    modal.style.display = 'block';
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
}

async function editProduct(id) {
    const product = myProducts.find(p => p.id === id);
    if (product) {
        openProductModal(product);
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            await loadMyProducts();
            await loadStats();
            showNotification('Product deleted successfully!');
        } else {
            showNotification('Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Error deleting product', 'error');
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
            await loadOrders();
            await loadStats();
            showNotification('Order status updated!');
        } else {
            showNotification('Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Error updating order status', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc3545' : '#28a745'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export functions to window
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.closeProductModal = closeProductModal;
window.updateOrderStatus = updateOrderStatus;

// Initialize event listeners
function initializeEventListeners() {
    // Product card actions using event delegation
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        productsGrid.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            const action = button.getAttribute('data-action');
            const productId = button.getAttribute('data-product-id');
            
            if (action === 'edit' && productId) {
                editProduct(productId);
            } else if (action === 'delete' && productId) {
                deleteProduct(productId);
            }
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        };
    }
    
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.onclick = () => openProductModal();
    }
    
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const productIdEl = document.getElementById('productId');
            const productId = productIdEl ? productIdEl.value : '';
            const unit = formData.get('unit');
            
            const data = {
                name: formData.get('name'),
                description: formData.get('description'),
                categoryId: formData.get('categoryId'),
                pricing: {
                    b2b: {
                        price: parseFloat(formData.get('b2bPrice')),
                        minQuantity: parseInt(formData.get('b2bMinQty')) || 1,
                        unit: unit
                    },
                    b2c: {
                        price: parseFloat(formData.get('b2cPrice')),
                        unit: unit
                    }
                },
                inventory: {
                    totalQuantity: parseInt(formData.get('totalQuantity')),
                    availableQuantity: parseInt(formData.get('totalQuantity')),
                    reservedQuantity: 0
                },
                marketplace: formData.get('marketplace'),
                status: formData.get('status')
            };
            
            const token = localStorage.getItem('token');
            
            try {
                const url = productId ? `${API_BASE}/products/${productId}` : `${API_BASE}/products`;
                const method = productId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    closeProductModal();
                    await loadMyProducts();
                    await loadStats();
                    showNotification(productId ? 'Product updated successfully!' : 'Product created successfully!');
                } else {
                    showNotification(result.message || 'Failed to save product', 'error');
                }
            } catch (error) {
                console.error('Error saving product:', error);
                showNotification('Error saving product', 'error');
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
        const contentEl = document.getElementById('dashboardContent');
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        await loadCategories();
        await loadMyProducts();
        await loadOrders();
        await loadProfile();
        await loadStats();
    }
}

initApp();
