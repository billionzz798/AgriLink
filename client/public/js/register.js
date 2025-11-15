document.getElementById('role').addEventListener('change', function() {
    const role = this.value;
    document.getElementById('farmerFields').style.display = role === 'farmer' ? 'block' : 'none';
    document.getElementById('buyerFields').style.display = role === 'institutional_buyer' ? 'block' : 'none';
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const role = formData.get('role');
    
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        role: role,
        address: {
            street: formData.get('street'),
            city: formData.get('city'),
            region: formData.get('region'),
            postalCode: formData.get('postalCode')
        }
    };

    if (role === 'farmer') {
        data.farmDetails = {
            farmName: formData.get('farmName'),
            farmSize: parseFloat(formData.get('farmSize')) || 0,
            yearsOfExperience: parseInt(formData.get('yearsExperience')) || 0
        };
    } else if (role === 'institutional_buyer') {
        data.businessDetails = {
            businessName: formData.get('businessName'),
            businessType: formData.get('businessType'),
            taxId: formData.get('taxId')
        };
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('successMessage').textContent = 'Registration successful! Redirecting...';
            document.getElementById('successMessage').style.display = 'block';
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            setTimeout(() => {
                if (result.user.role === 'admin') {
                    window.location.href = '/admin';
                } else if (result.user.role === 'farmer') {
                    window.location.href = '/farmer';
                } else if (result.user.role === 'institutional_buyer') {
                    window.location.href = '/buyer';
                } else {
                    window.location.href = '/customer';
                }
            }, 1500);
        } else {
            document.getElementById('errorMessage').textContent = result.message || 'Registration failed';
            document.getElementById('errorMessage').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('errorMessage').textContent = 'An error occurred. Please try again.';
        document.getElementById('errorMessage').style.display = 'block';
    }
});
