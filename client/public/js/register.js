/**
 * Registration Page JavaScript
 * 
 * Handles new user registration with role-based form fields.
 * Supports registration for farmers, institutional buyers, and consumers.
 * 
 * Main Features:
 * - Dynamic form fields based on selected role
 * - Role-specific data collection (farm details, business details)
 * - Form validation and submission
 * - Automatic redirection after successful registration
 * 
 * Key Functions:
 * - Role change handler: Shows/hides role-specific fields
 * - Form submission: Collects data and sends registration request
 * 
 * Role-specific Fields:
 * - farmer: farmName, farmSize, yearsOfExperience
 * - institutional_buyer: businessName, businessType, taxId
 * - consumer: No additional fields
 */

/**
 * Handle Role Selection Change
 * Shows/hides role-specific form fields based on selected role
 */
document.getElementById('role').addEventListener('change', function() {
    const role = this.value;
    // Show farmer-specific fields if farmer role selected
    document.getElementById('farmerFields').style.display = role === 'farmer' ? 'block' : 'none';
    // Show buyer-specific fields if institutional buyer role selected
    document.getElementById('buyerFields').style.display = role === 'institutional_buyer' ? 'block' : 'none';
});

/**
 * Handle Registration Form Submission
 * Collects form data, includes role-specific fields, and submits to API
 */
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Extract form data
    const formData = new FormData(e.target);
    const role = formData.get('role');
    
    // Build registration data object
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

    // Add role-specific fields
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
        // Send registration request to API
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            // Show success message
            document.getElementById('successMessage').textContent = 'Registration successful! Redirecting...';
            document.getElementById('successMessage').style.display = 'block';
            
            // Store authentication token and user data
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            // Redirect to appropriate dashboard after short delay
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
            // Display error message
            document.getElementById('errorMessage').textContent = result.message || 'Registration failed';
            document.getElementById('errorMessage').style.display = 'block';
        }
    } catch (error) {
        // Handle network or other errors
        document.getElementById('errorMessage').textContent = 'An error occurred. Please try again.';
        document.getElementById('errorMessage').style.display = 'block';
    }
});
