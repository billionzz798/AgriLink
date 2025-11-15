document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };

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
            
            // Redirect based on role
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
            document.getElementById('errorMessage').textContent = result.message || 'Login failed';
            document.getElementById('errorMessage').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('errorMessage').textContent = 'An error occurred. Please try again.';
        document.getElementById('errorMessage').style.display = 'block';
    }
});
