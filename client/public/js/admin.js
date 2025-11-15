const API_BASE = '/api';
let currentUser = null;
let allCategories = [];
let allBrands = [];

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
            document.getElementById('adminName').textContent = currentUser.name;
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
        document.getElementById('totalUsers').textContent = users.length || 0;

        const productsRes = await fetch(`${API_BASE}/products`);
        const products = await productsRes.json();
        document.getElementById('totalProducts').textContent = products.products?.length || 0;

        const ordersRes = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await ordersRes.json();
        document.getElementById('totalOrders').textContent = orders.orders?.length || 0;
        
        const totalRevenue = orders.orders?.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) || 0;
        document.getElementById('totalRevenue').textContent = `₵${totalRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        allCategories = await response.json();
        
        const grid = document.getElementById('categoriesGrid');
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
    } catch (error) {
        console.error('Error loading brands:', error);
    }
}

function updateCategoryParentSelect() {
    const select = document.getElementById('categoryParent');
    const currentId = document.getElementById('categoryId').value;
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
    
    if (category) {
        title.textContent = 'Edit Category';
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categoryParent').value = category.parentId || '';
        document.getElementById('categoryActive').checked = category.isActive;
    } else {
        title.textContent = 'Add Category';
        form.reset();
        document.getElementById('categoryId').value = '';
    }
    
    updateCategoryParentSelect();
    modal.style.display = 'block';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

function openBrandModal(brand = null) {
    const modal = document.getElementById('brandModal');
    const form = document.getElementById('brandForm');
    const title = document.getElementById('brandModalTitle');
    
    if (brand) {
        title.textContent = 'Edit Brand';
        document.getElementById('brandId').value = brand.id;
        document.getElementById('brandName').value = brand.name;
        document.getElementById('brandDescription').value = brand.description || '';
        document.getElementById('brandWebsite').value = brand.website || '';
        document.getElementById('brandActive').checked = brand.isActive;
    } else {
        title.textContent = 'Add Brand';
        form.reset();
        document.getElementById('brandId').value = '';
    }
    
    modal.style.display = 'block';
}

function closeBrandModal() {
    document.getElementById('brandModal').style.display = 'none';
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
            await loadCategories();
        } else {
            alert('Failed to delete category');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category');
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
            await loadBrands();
        } else {
            alert('Failed to delete brand');
        }
    } catch (error) {
        console.error('Error deleting brand:', error);
        alert('Error deleting brand');
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
            await loadUsers();
            await loadStats();
        }
    } catch (error) {
        console.error('Error updating user status:', error);
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
            await loadProducts();
        }
    } catch (error) {
        console.error('Error updating product status:', error);
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
        }
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
});

document.getElementById('addCategoryBtn').addEventListener('click', () => {
    openCategoryModal();
});

document.getElementById('addBrandBtn').addEventListener('click', () => {
    openBrandModal();
});

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        parentId: formData.get('parentId') || null,
        isActive: formData.get('isActive') === 'on'
    };
    
    const id = document.getElementById('categoryId').value;
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
            closeCategoryModal();
            await loadCategories();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to save category');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Error saving category');
    }
});

document.getElementById('brandForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        website: formData.get('website'),
        isActive: formData.get('isActive') === 'on'
    };
    
    const id = document.getElementById('brandId').value;
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
            closeBrandModal();
            await loadBrands();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to save brand');
        }
    } catch (error) {
        console.error('Error saving brand:', error);
        alert('Error saving brand');
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
        document.getElementById('adminContent').style.display = 'block';
        await loadStats();
        await loadUsers();
        await loadProducts();
        await loadOrders();
        await loadCategories();
        await loadBrands();
    }
})();
