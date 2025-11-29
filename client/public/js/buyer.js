const API_BASE = '/api';
let currentUser = null;
let products = [];
let orders = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('buyerCart')) || [];

// Helper function to get product image with fallback
function getProductImage(product) {
  if (product.images && product.images.length > 0 && product.images[0].url) {
    return product.images[0].url;
  }
  const productName = encodeURIComponent(product.name);
  return `https://via.placeholder.com/400x400/007bff/ffffff?text=${productName}`;
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
            if (data.user.role !== 'institutional_buyer') {
                window.location.href = '/customer';
                return false;
            }
            currentUser = data.user;
            const buyerNameEl = document.getElementById('buyerName');
            if (buyerNameEl) buyerNameEl.textContent = currentUser.name;
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
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>' +
                categories
                    .filter(cat => cat.isActive)
                    .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
                    .join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products?marketplace=b2b`);
        const data = await response.json();
        products = (data.products || []).filter(p => 
            p.status === 'active' && (p.marketplace === 'b2b' || p.marketplace === 'both')
        );
        filterAndDisplayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function filterAndDisplayProducts() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const categoryValue = categoryFilter ? categoryFilter.value : '';
    const sortValue = sortFilter ? sortFilter.value : '';
    
    let filtered = products.filter(product => {
        if (searchTerm && !product.name.toLowerCase().includes(searchTerm) && 
            !product.description.toLowerCase().includes(searchTerm)) return false;
        if (categoryValue && product.categoryId !== categoryValue) return false;
        return true;
    });
    
    filtered.sort((a, b) => {
        switch(sortValue) {
            case 'price-low':
                return (a.pricing?.b2b?.price || 0) - (b.pricing?.b2b?.price || 0);
            case 'price-high':
                return (b.pricing?.b2b?.price || 0) - (a.pricing?.b2b?.price || 0);
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });
    
    displayProducts(filtered);
    const noProductsEl = document.getElementById('noProducts');
    if (noProductsEl) noProductsEl.style.display = filtered.length === 0 ? 'block' : 'none';
}

function displayProducts(productsToShow) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = productsToShow.map(product => {
        const pricing = product.pricing?.b2b || {};
        const stock = product.inventory?.availableQuantity || 0;
        const minQty = pricing.minQuantity || 1;
        const stockClass = stock > 10 ? 'in-stock' : stock > 0 ? 'low-stock' : 'out-of-stock';
        const stockText = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
        const imageUrl = getProductImage(product);
        const fallbackUrl = `https://via.placeholder.com/400x400/007bff/ffffff?text=${encodeURIComponent(product.name)}`;
        
        return `
            <div class="product-card" data-product-id="${product.id}" style="cursor: pointer;">
                <img src="${imageUrl}" 
                     alt="${product.name}" 
                     onerror="this.onerror=null; this.src='${fallbackUrl}';">
                <h4>${product.name}</h4>
                <p class="product-price">B2B: ₵${pricing.price || 0}/${pricing.unit || 'kg'}</p>
                <p style="color: #666; font-size: 0.85rem;">Min Order: ${minQty} ${pricing.unit || 'kg'}</p>
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
    if (!modal || !body) return;
    
    const pricing = product.pricing?.b2b || {};
    const stock = product.inventory?.availableQuantity || 0;
    const minQty = pricing.minQuantity || 1;
    const imageUrl = getProductImage(product);
    const fallbackUrl = `https://via.placeholder.com/400x400/007bff/ffffff?text=${encodeURIComponent(product.name)}`;
    
    body.setAttribute('data-product-id', product.id);
    body.setAttribute('data-product-price', pricing.price || 0);
    body.setAttribute('data-product-unit', pricing.unit || 'kg');
    body.setAttribute('data-product-stock', stock);
    body.setAttribute('data-product-min-qty', minQty);
    
    body.innerHTML = `
        <div class="product-modal-content">
            <div>
                <img src="${imageUrl}" 
                     alt="${product.name}" 
                     class="product-modal-image"
                     onerror="this.onerror=null; this.src='${fallbackUrl}';">
            </div>
            <div class="product-modal-details">
                <h2>${product.name}</h2>
                <p class="product-modal-price">B2B Price: ₵${pricing.price || 0}/${pricing.unit || 'kg'}</p>
                <p><strong>Minimum Order:</strong> ${minQty} ${pricing.unit || 'kg'}</p>
                <p>${product.description || 'No description'}</p>
                <div style="margin: 1.5rem 0;">
                    <p><strong>Available Stock:</strong> ${stock} ${pricing.unit || 'kg'}</p>
                    ${product.category ? `<p><strong>Category:</strong> ${product.category.name}</p>` : ''}
                    ${product.farmer ? `<p><strong>Farmer:</strong> ${product.farmer.name}</p>` : ''}
                </div>
                <div class="form-group">
                    <label><strong>Quantity:</strong></label>
                    <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
                        <button type="button" class="quantity-btn" id="decreaseQtyBtn">-</button>
                        <input type="number" id="orderQuantity" min="${minQty}" max="${stock}" value="${minQty}" class="quantity-input">
                        <button type="button" class="quantity-btn" id="increaseQtyBtn">+</button>
                    </div>
                    <p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem;">Minimum order: ${minQty} ${pricing.unit || 'kg'}</p>
                </div>
                <button id="addToCartBtn" 
                        class="btn btn-primary btn-block" 
                        ${stock === 0 ? 'disabled' : ''}>
                    ${stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `;
    
    const decreaseBtn = document.getElementById('decreaseQtyBtn');
    const increaseBtn = document.getElementById('increaseQtyBtn');
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    if (decreaseBtn) {
        decreaseBtn.onclick = () => {
            const input = document.getElementById('orderQuantity');
            if (!input) return;
            const current = parseInt(input.value) || minQty;
            const minValue = parseInt(input.min) || minQty;
            if (current > minValue) {
                input.value = current - 1;
            }
        };
    }
    
    if (increaseBtn) {
        increaseBtn.onclick = () => {
            const input = document.getElementById('orderQuantity');
            if (!input) return;
            const current = parseInt(input.value) || minQty;
            if (current < stock) {
                input.value = current + 1;
            }
        };
    }
    
    if (addToCartBtn) {
        addToCartBtn.onclick = () => {
            const productId = body.getAttribute('data-product-id');
            const price = parseFloat(body.getAttribute('data-product-price')) || 0;
            const unit = body.getAttribute('data-product-unit') || 'kg';
            const maxStock = parseInt(body.getAttribute('data-product-stock')) || 0;
            const minQtyValue = parseInt(body.getAttribute('data-product-min-qty')) || 1;
            
            addToCart(productId, price, unit, maxStock, minQtyValue);
        };
    }
    
    modal.style.display = 'block';
}

function addToCart(productId, price, unit, maxStock, minQty) {
    const quantityInput = document.getElementById('orderQuantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) || minQty : minQty;
    
    if (quantity < minQty) {
        showNotification(`Minimum quantity is ${minQty} ${unit}`, 'error');
        return;
    }
    
    if (quantity > maxStock) {
        showNotification(`Only ${maxStock} ${unit} available`, 'error');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.productId === productId);
    const productImage = getProductImage(product);
    
    if (existingItem) {
        if (existingItem.quantity + quantity > maxStock) {
            showNotification(`Cannot add more. Only ${maxStock} ${unit} available in total.`, 'error');
            return;
        }
        existingItem.quantity += quantity;
    } else {
        cart.push({
            productId: productId,
            productName: product.name,
            productImage: productImage,
            price: price,
            unit: unit,
            quantity: quantity,
            maxStock: maxStock,
            minQty: minQty
        });
    }
    
    saveCart();
    updateCartUI();
    const productModal = document.getElementById('productModal');
    if (productModal) productModal.style.display = 'none';
    
    showNotification('Product added to cart!');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    saveCart();
    updateCartUI();
    showNotification('Item removed from cart');
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.productId === productId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity < item.minQty) {
        showNotification(`Minimum quantity is ${item.minQty} ${item.unit}`, 'error');
        return;
    }
    
    if (newQuantity > item.maxStock) {
        showNotification(`Only ${item.maxStock} ${item.unit} available`, 'error');
        return;
    }
    
    item.quantity = newQuantity;
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('buyerCart', JSON.stringify(cart));
}

function updateCartUI() {
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) {
        cartCountEl.textContent = cartCount;
        cartCountEl.style.display = cartCount > 0 ? 'inline-block' : 'none';
    }
    
    const cartItems = document.getElementById('cartItems');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (cart.length === 0) {
        if (cartItems) cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }
    
    if (checkoutBtn) checkoutBtn.disabled = false;
    
    let total = 0;
    const fallbackImage = 'https://via.placeholder.com/80x80/007bff/ffffff?text=Product';
    
    if (cartItems) {
        cartItems.innerHTML = cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
                <div class="cart-item" data-product-id="${item.productId}">
                    <img src="${item.productImage}" 
                         alt="${item.productName}" 
                         class="cart-item-image" 
                         onerror="this.onerror=null; this.src='${fallbackImage}';">
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.productName}</div>
                        <div class="cart-item-price">₵${item.price}/${item.unit} (Min: ${item.minQty})</div>
                        <div class="cart-item-actions">
                            <button type="button" class="quantity-btn cart-decrease-btn" data-product-id="${item.productId}" data-change="-1">-</button>
                            <input type="number" value="${item.quantity}" class="quantity-input" readonly>
                            <button type="button" class="quantity-btn cart-increase-btn" data-product-id="${item.productId}" data-change="1">+</button>
                            <button type="button" class="remove-item-btn cart-remove-btn" data-product-id="${item.productId}">Remove</button>
                        </div>
                    </div>
                    <div style="font-weight: 600; color: #2c5530;">₵${itemTotal.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    }
    
    const cartTotalEl = document.getElementById('cartTotal');
    if (cartTotalEl) {
        cartTotalEl.textContent = `₵${total.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function openCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
    updateCartUI();
}

function closeCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

function checkout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    const checkoutItems = document.getElementById('checkoutItems');
    const checkoutTotal = document.getElementById('checkoutTotal');
    
    if (!checkoutItems || !checkoutTotal) {
        showNotification('Checkout form not found', 'error');
        return;
    }
    
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
    
    checkoutTotal.textContent = `₵${total.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (currentUser && currentUser.address) {
        const streetEl = document.getElementById('deliveryStreet');
        const cityEl = document.getElementById('deliveryCity');
        const regionEl = document.getElementById('deliveryRegion');
        const postalEl = document.getElementById('deliveryPostalCode');
        
        if (streetEl) streetEl.value = currentUser.address.street || '';
        if (cityEl) cityEl.value = currentUser.address.city || '';
        if (regionEl) regionEl.value = currentUser.address.region || '';
        if (postalEl) postalEl.value = currentUser.address.postalCode || '';
    }
    
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) {
        checkoutModal.style.display = 'block';
        closeCart();
    }
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadOrders() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
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
            </div>
        `;
    }).join('');
}

async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const user = await response.json();
        
        const profileInfo = document.getElementById('profileInfo');
        if (profileInfo) {
            profileInfo.innerHTML = `
                <div class="profile-field">
                    <span class="profile-field-label">Business Name:</span>
                    <span class="profile-field-value">${user.businessDetails?.businessName || 'N/A'}</span>
                </div>
                <div class="profile-field">
                    <span class="profile-field-label">Business Type:</span>
                    <span class="profile-field-value">${user.businessDetails?.businessType || 'N/A'}</span>
                </div>
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
window.openCart = openCart;
window.closeCart = closeCart;
window.checkout = checkout;
window.closeCheckoutModal = closeCheckoutModal;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;

// Initialize event listeners
function initializeEventListeners() {
    // Product card click handler
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        productsGrid.addEventListener('click', (e) => {
            const productCard = e.target.closest('.product-card');
            if (productCard) {
                const productId = productCard.getAttribute('data-product-id');
                if (productId) {
                    showProductModal(productId);
                }
            }
        });
    }
    
    // Cart sidebar event delegation
    const cartItems = document.getElementById('cartItems');
    if (cartItems) {
        cartItems.addEventListener('click', (e) => {
            const productId = e.target.getAttribute('data-product-id');
            if (!productId) return;
            
            if (e.target.classList.contains('cart-decrease-btn')) {
                const change = parseInt(e.target.getAttribute('data-change')) || -1;
                updateCartQuantity(productId, change);
            } else if (e.target.classList.contains('cart-increase-btn')) {
                const change = parseInt(e.target.getAttribute('data-change')) || 1;
                updateCartQuantity(productId, change);
            } else if (e.target.classList.contains('cart-remove-btn')) {
                removeFromCart(productId);
            }
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('buyerCart');
            window.location.href = '/login';
        };
    }
    
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.onclick = openCart;
    }
    
    const closeCartBtn = document.querySelector('.close-cart');
    if (closeCartBtn) {
        closeCartBtn.onclick = closeCart;
    }
    
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartOverlay) {
        cartOverlay.onclick = closeCart;
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterAndDisplayProducts);
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterAndDisplayProducts);
    }
    
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', filterAndDisplayProducts);
    }
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.onclick = checkout;
    }
    
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (cart.length === 0) {
                showNotification('Your cart is empty', 'error');
                return;
            }
            
            const formData = new FormData(e.target);
            const deliveryAddress = {
                street: formData.get('street'),
                city: formData.get('city'),
                region: formData.get('region'),
                postalCode: formData.get('postalCode')
            };
            
            if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.region) {
                showNotification('Please fill in all required address fields', 'error');
                return;
            }
            
            const items = cart.map(item => ({
                product: item.productId,
                quantity: item.quantity
            }));
            
            const notesEl = document.getElementById('orderNotes');
            const notes = notesEl ? notesEl.value : '';
            
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showNotification('Please login again', 'error');
                    window.location.href = '/login';
                    return;
                }
                
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Placing Order...';
                }
                
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
                    showNotification(result.message || 'Failed to place order', 'error');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Place Order';
                    }
                }
            } catch (error) {
                console.error('Error placing order:', error);
                showNotification('Error placing order. Please try again.', 'error');
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Place Order';
                }
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
        await loadProducts();
        await loadOrders();
        await loadProfile();
        updateCartUI();
    }
}

initApp();
