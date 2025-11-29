function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        const errorMessageEl = document.getElementById('errorMessage');
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                
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
                if (errorMessageEl) {
                    errorMessageEl.textContent = result.message || 'Login failed';
                    errorMessageEl.style.display = 'block';
                }
            }
        } catch (error) {
            if (errorMessageEl) {
                errorMessageEl.textContent = 'An error occurred. Please try again.';
                errorMessageEl.style.display = 'block';
            }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLogin);
} else {
    initializeLogin();
}
