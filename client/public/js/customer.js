const API_BASE = '/api';
let currentUser = null;
let products = [];
let orders = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

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
            currentUser = data.user;
            document.getElementById('userName').textContent = currentUser.name;
            document.getElementById('userRole').textContent = currentUser.role.replace('_', ' ');
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

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        categories = await response.json();
        
        const categoryFilter = document.getElementById('categoryFilter');
        categoryFilter.innerHTML = '<option value="">All Categories</option>' +
            categories
                .filter(cat => cat.isActive)
                .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
                .join('');
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        products = data.products || [];
        filterAndDisplayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function filterAndDisplayProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const marketplaceFilter = document.getElementById('marketplaceFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    
    let filtered = products.filter(product => {
        if (product.status !== 'active') return false;
        if (searchTerm && !product.name.toLowerCase().includes(searchTerm) && 
            !product.description.toLowerCase().includes(searchTerm)) return false;
        if (categoryFilter && product.categoryId !== categoryFilter) return false;
        if (marketplaceFilter) {
            const marketplace = currentUser.role === 'institutional_buyer' ? 'b2b' : 'b2c';
            if (product.marketplace !== marketplace && product.marketplace !== 'both') return false;
        }
        return true;
    });
    
    filtered.sort((a, b) => {
        switch(sortFilter) {
            case 'price-low':
                const priceA = currentUser.role === 'institutional_buyer' ? a.pricing.b2b.price : a.pricing.b2c.price;
                const priceB = currentUser.role === 'institutional_buyer' ? b.pricing.b2b.price : b.pricing.b2c.price;
                return priceA - priceB;
            case 'price-high':
                const priceA2 = currentUser.role === 'institutional_buyer' ? a.pricing.b2b.price : a.pricing.b2c.price;
                const priceB2 = currentUser.role === 'institutional_buyer' ? b.pricing.b2b.price : b.pricing.b2c.price;
                return priceB2 - priceA2;
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });
    
    displayProducts(filtered);
    document.getElementById('noProducts').style.display = filtered.length === 0 ? 'block' : 'none';
}

function displayProducts(productsToShow) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = productsToShow.map(product => {
        const pricing = currentUser.role === 'institutional_buyer' ? product.pricing.b2b : product.pricing.b2c;
        const stock = product.inventory.availableQuantity;
        const stockClass = stock > 10 ? 'in-stock' : stock > 0 ? 'low-stock' : 'out-of-stock';
        const stockText = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
        
        return `
            <div class="product-card" onclick="showProductModal('${product.id}')">
                <img src="${product.images[0]?.url || '/images/placeholder.jpg'}" 
                     alt="${product.name}" 
                     onerror="this.src='/images/placeholder.jpg'">
                <h4>${product.name}</h4>
                <p class="product-price">₵${pricing.price}/${pricing.unit}</p>
                <p class="product-stock ${stockClass}">${stockText} (${stock} available)</p>
                ${product.category ? `<p style="color: #666; font-size: 0.85rem;">${product.category.name}</p>` : ''}
            </div>
        `;
    }).join('');
}

async function showProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('productModal');
    const body = document.getElementById('productModalBody');
    const pricing = currentUser.role === 'institutional_buyer' ? product.pricing.b2b : product.pricing.b2c;
    const stock = product.inventory.availableQuantity;
    const minQty = currentUser.role === 'institutional_buyer' ? pricing.minQuantity : 1;
    
    body.innerHTML = `
        <div class="product-modal-content">
            <div>
                <img src="${product.images[0]?.url || '/images/placeholder.jpg'}" 
                     alt="${product.name}" 
                     class="product-modal-image"
                     onerror="this.src='/images/placeholder.jpg'">
            </div>
            <div class="product-modal-details">
                <h2>${product.name}</h2>
                <p class="product-modal-price">₵${pricing.price}/${pricing.unit}</p>
                <p>${product.description}</p>
                <div style="margin: 1.5rem 0;">
                    <p><strong>Available Stock:</strong> ${stock} ${pricing.unit}</p>
                    ${product.category ? `<p><strong>Category:</strong> ${product.category.name}</p>` : ''}
                    ${product.farmer ? `<p><strong>Farmer:</strong> ${product.farmer.name}</p>` : ''}
                </div>
                <div class="form-group">
                    <label><strong>Quantity:</strong></label>
                    <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
                        <button class="quantity-btn" onclick="decreaseQuantity()">-</button>
                        <input type="number" id="orderQuantity" min="${minQty}" max="${stock}" value="${minQty}" class="quantity-input">
                        <button class="quantity-btn" onclick="increaseQuantity(${stock})">+</button>
                    </div>
                    ${currentUser.role === 'institutional_buyer' && pricing.minQuantity > 1 ? 
                        `<p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem;">Minimum order: ${pricing.minQuantity} ${pricing.unit}</p>` : ''}
                </div>
                <button onclick="addToCart('${product.id}', ${pricing.price}, '${pricing.unit}', ${stock}, ${minQty})" 
                        class="btn btn-primary btn-block" 
                        ${stock === 0 ? 'disabled' : ''}>
                    ${stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function increaseQuantity(max) {
    const input = document.getElementById('orderQuantity');
    const current = parseInt(input.value);
    if (current < max) {
        input.value = current + 1;
    }
}

function decreaseQuantity() {
    const input = document.getElementById('orderQuantity');
    const current = parseInt(input.value);
    const min = parseInt(input.min);
    if (current > min) {
        input.value = current - 1;
    }
}

function addToCart(productId, price, unit, maxStock, minQty) {
    const quantity = parseInt(document.getElementById('orderQuantity').value) || minQty;
    
    if (quantity < minQty) {
        alert(`Minimum quantity is ${minQty} ${unit}`);
        return;
    }
    
    if (quantity > maxStock) {
        alert(`Only ${maxStock} ${unit} available`);
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        if (existingItem.quantity + quantity > maxStock) {
            alert(`Cannot add more. Only ${maxStock} ${unit} available in total.`);
            return;
        }
        existingItem.quantity += quantity;
    } else {
        cart.push({
            productId: productId,
            productName: product.name,
            productImage: product.images[0]?.url || '/images/placeholder.jpg',
            price: price,
            unit: unit,
            quantity: quantity,
            maxStock: maxStock
        });
    }
    
    saveCart();
    updateCartUI();
    document.getElementById('productModal').style.display = 'none';
    
    showNotification('Product added to cart!');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    saveCart();
    updateCartUI();
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.productId === productId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > item.maxStock) {
        alert(`Only ${item.maxStock} ${item.unit} available`);
        return;
    }
    
    item.quantity = newQuantity;
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = cartCount;
    document.getElementById('cartCount').style.display = cartCount > 0 ? 'inline-block' : 'none';
    
    const cartItems = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        document.getElementById('checkoutBtn').disabled = true;
        return;
    }
    
    document.getElementById('checkoutBtn').disabled = false;
    
    let total = 0;
    cartItems.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <img src="${item.productImage}" alt="${item.productName}" class="cart-item-image" onerror="this.src='/images/placeholder.jpg'">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.productName}</div>
                    <div class="cart-item-price">₵${item.price}/${item.unit}</div>
                    <div class="cart-item-actions">
                        <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', -1)">-</button>
                        <input type="number" value="${item.quantity}" class="quantity-input" readonly>
                        <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', 1)">+</button>
                        <button class="remove-item-btn" onclick="removeFromCart('${item.productId}')">Remove</button>
                    </div>
                </div>
                <div style="font-weight: 600; color: #2c5530;">₵${itemTotal.toFixed(2)}</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cartTotal').textContent = `₵${total.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function openCart() {
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('show');
    updateCartUI();
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('show');
}

function checkout() {
    if (cart.length === 0) return;
    
    const checkoutItems = document.getElementById('checkoutItems');
    let total = 0;
    
    checkoutItems.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="checkout-item">
                <span>${item.productName} x ${item.quantity} ${item.unit}</span>
                <span>₵${itemTotal.toFixed(2)}</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('checkoutTotal').textContent = `₵${total.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (currentUser.address) {
        document.getElementById('deliveryStreet').value = currentUser.address.street || '';
        document.getElementById('deliveryCity').value = currentUser.address.city || '';
        document.getElementById('deliveryRegion').value = currentUser.address.region || '';
        document.getElementById('deliveryPostalCode').value = currentUser.address.postalCode || '';
    }
    
    document.getElementById('checkoutModal').style.display = 'block';
    closeCart();
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

async function loadOrders() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        orders = data.orders || [];
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
                        <strong>Items:</strong>
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span>${item.productName || 'Product'} x ${item.quantity}</span>
                                <span>₵${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div>
                        <p><strong>Total:</strong> ₵${parseFloat(order.total).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        ${order.deliveryAddress ? `
                            <p><strong>Delivery Address:</strong></p>
                            <p>${order.deliveryAddress.street || ''}<br>
                            ${order.deliveryAddress.city || ''}, ${order.deliveryAddress.region || ''}</p>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
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
            <div class="profile-field">
                <span class="profile-field-label">Role:</span>
                <span class="profile-field-value">${user.role.replace('_', ' ')}</span>
            </div>
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
        animation: slideIn 0.3s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    window.location.href = '/login';
});

document.getElementById('cartBtn').addEventListener('click', openCart);

document.getElementById('searchInput').addEventListener('input', filterAndDisplayProducts);
document.getElementById('categoryFilter').addEventListener('change', filterAndDisplayProducts);
document.getElementById('marketplaceFilter').addEventListener('change', filterAndDisplayProducts);
document.getElementById('sortFilter').addEventListener('change', filterAndDisplayProducts);

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const deliveryAddress = {
        street: formData.get('street'),
        city: formData.get('city'),
        region: formData.get('region'),
        postalCode: formData.get('postalCode')
    };
    
    const items = cart.map(item => ({
        product: item.productId,
        quantity: item.quantity
    }));
    
    const notes = document.getElementById('orderNotes').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items,
                deliveryAddress,
                notes
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            cart = [];
            saveCart();
            updateCartUI();
            closeCheckoutModal();
            showNotification('Order placed successfully!');
            await loadOrders();
            await loadProducts();
        } else {
            alert(result.message || 'Failed to place order');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Error placing order. Please try again.');
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
        await loadProducts();
        await loadOrders();
        await loadProfile();
        updateCartUI();
    }
})();
