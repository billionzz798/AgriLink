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
            document.getElementById('farmerName').textContent = currentUser.name;
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
        document.getElementById('totalProducts').textContent = productsData.products?.length || 0;

        const ordersRes = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ordersData = await ordersRes.json();
        const myOrders = ordersData.orders?.filter(o => o.farmerId === currentUser.id) || [];
        document.getElementById('totalOrders').textContent = myOrders.length;
        
        const totalRevenue = myOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
        document.getElementById('totalRevenue').textContent = `₵${totalRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        categories = await response.json();
        
        const select = document.getElementById('productCategory');
        select.innerHTML = '<option value="">Select Category</option>' +
            categories
                .filter(cat => cat.isActive)
                .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
                .join('');
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
    
    if (productsToShow.length === 0) {
        document.getElementById('noProducts').style.display = 'block';
        grid.innerHTML = '';
        return;
    }
    
    document.getElementById('noProducts').style.display = 'none';
    
    grid.innerHTML = productsToShow.map(product => {
        const b2cPrice = product.pricing?.b2c?.price || 0;
        const b2bPrice = product.pricing?.b2b?.price || 0;
        const stock = product.inventory?.availableQuantity || 0;
        const imageUrl = getProductImage(product);
        const fallbackUrl = `https://via.placeholder.com/400x400/28a745/ffffff?text=${encodeURIComponent(product.name)}`;
        
        return `
            <div class="product-card">
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
                    <button class="btn btn-sm btn-edit" onclick="editProduct('${product.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')">🗑️ Delete</button>
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
    
    if (ordersToShow.length === 0) {
        document.getElementById('noOrders').style.display = 'block';
        list.innerHTML = '';
        return;
    }
    
    document.getElementById('noOrders').style.display = 'none';
    
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
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span>${item.productName || 'Product'} x ${item.quantity}</span>
                                <span>₵${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div>
                        <p><strong>Total: ₵${parseFloat(order.total).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                        ${order.deliveryAddress ? `
                            <p><strong>Delivery Address:</strong></p>
                            <p>${order.deliveryAddress.street || ''}<br>
                            ${order.deliveryAddress.city || ''}, ${order.deliveryAddress.region || ''}</p>
                        ` : ''}
                    </div>
                </div>
                <div class="order-actions">
                    <select class="filter-select" onchange="updateOrderStatus('${order.id}', this.value)">
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
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function openProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');
    
    if (product) {
        title.textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productCategory').value = product.categoryId;
        document.getElementById('b2bPrice').value = product.pricing?.b2b?.price || 0;
        document.getElementById('b2bMinQty').value = product.pricing?.b2b?.minQuantity || 1;
        document.getElementById('b2cPrice').value = product.pricing?.b2c?.price || 0;
        document.getElementById('priceUnit').value = product.pricing?.b2b?.unit || product.pricing?.b2c?.unit || 'kg';
        document.getElementById('totalQuantity').value = product.inventory?.totalQuantity || 0;
        document.getElementById('productMarketplace').value = product.marketplace || 'both';
        document.getElementById('productStatus').value = product.status || 'active';
    } else {
        title.textContent = 'Add Product';
        form.reset();
        document.getElementById('productId').value = '';
        document.getElementById('b2bMinQty').value = 1;
        document.getElementById('priceUnit').value = 'kg';
        document.getElementById('productMarketplace').value = 'both';
        document.getElementById('productStatus').value = 'active';
    }
    
    modal.style.display = 'block';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
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
            alert('Failed to delete product');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product');
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
        }
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 3000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
});

document.getElementById('addProductBtn').addEventListener('click', () => {
    openProductModal();
});

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productId = document.getElementById('productId').value;
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
            alert(result.message || 'Failed to save product');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product');
    }
});

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
    });
});

window.onclick = (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};

(async () => {
    const authenticated = await checkAuth();
    if (authenticated) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        await loadCategories();
        await loadMyProducts();
        await loadOrders();
        await loadProfile();
        await loadStats();
    }
})();
