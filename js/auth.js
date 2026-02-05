// js/auth.js
const loginForm = document.getElementById('login-form');
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const logoutBtn = document.getElementById('logout-btn');

// Technical workaround: Append a fake domain to phone number to use Email Auth
const DOMAIN = "@steelshop.local";

auth.onAuthStateChanged(user => {
    if (user) {
        loginView.classList.remove('active');
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');
        appView.classList.add('active');
        initApp(user); // Call main app logic
    } else {
        appView.classList.remove('active');
        appView.classList.add('hidden');
        loginView.classList.remove('hidden');
        loginView.classList.add('active');
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-pass').value;

    const email = phone + DOMAIN;

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            alert("Login Failed: " + error.message);
        });
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});