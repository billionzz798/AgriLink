/**
 * Login Page JavaScript
 * 
 * Handles user authentication and login functionality.
 * Redirects users to their appropriate dashboard based on role after successful login.
 * 
 * Main Features:
 * - Form validation and submission
 * - JWT token storage in localStorage
 * - Role-based redirection (admin, farmer, buyer, customer)
 * - Error message display
 * 
 * Key Functions:
 * - initializeLogin(): Sets up login form event listener
 * 
 * Role-based Redirects:
 * - admin -> /admin
 * - farmer -> /farmer
 * - institutional_buyer -> /buyer
 * - consumer -> /customer
 */

/**
 * Initialize Login Form
 * Sets up event listener for form submission and handles authentication
 */
function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    // Handle form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Extract form data
        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        const errorMessageEl = document.getElementById('errorMessage');
        
        try {
            // Send login request to API
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Store authentication token and user data
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                
                // Redirect based on user role
                if (result.user.role === 'admin') {
                    window.location.href = '/admin';
                } else if (result.user.role === 'farmer') {
                    window.location.href = '/farmer';
                } else if (result.user.role === 'institutional_buyer') {
                    window.location.href = '/buyer';
                } else {
                    window.location.href = '/customer';
                }
            } else {
                // Display error message
                if (errorMessageEl) {
                    errorMessageEl.textContent = result.message || 'Login failed';
                    errorMessageEl.style.display = 'block';
                }
            }
        } catch (error) {
            // Handle network or other errors
            if (errorMessageEl) {
                errorMessageEl.textContent = 'An error occurred. Please try again.';
                errorMessageEl.style.display = 'block';
            }
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLogin);
} else {
    initializeLogin();
}
