document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('.login-form')

    loginForm?.addEventListener('submit', async function(e) {
        e.preventDefault()

        const username = loginForm.querySelector('#username').value
        const password = loginForm.querySelector('#password').value
        const data = { username, password }

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        const body = await response.json()

        if (response.status === 200) {
            localStorage.setItem('token', body.token)
            localStorage.setItem('user', JSON.stringify(body.user))
            window.location.href = '/'
        } else {
            alert(body.error ?? "Unknown error")
        }
    })
})
