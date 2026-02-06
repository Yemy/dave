/**
 * 1. CONFIGURATION & INITIALIZATION
 */
const firebaseConfig = {
    apiKey: "AIzaSyB4aNtPh3OdpZqxis-ainOXa3djBVZeHM8",
    authDomain: "daveteklay23.firebaseapp.com",
    projectId: "daveteklay23",
    storageBucket: "daveteklay23.firebasestorage.app",
    messagingSenderId: "1079200881836",
    appId: "1:1079200881836:web:220d35768dcbed9b0e1309"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Offline Persistence
db.enablePersistence().catch(err => console.error("Persistence error", err));

/**
 * 2. UI ELEMENTS (DOM)
 */
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const formView = document.getElementById('form-view');
const salesListEl = document.getElementById('sales-list');
const saleForm = document.getElementById('sale-form');

// Global State
let currentUser = null;
let allSales = [];
const DOMAIN = "@steelshop.local";

/**
 * 3. AUTHENTICATION LOGIC
 */
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        showView('app');
        initDataListener();
    } else {
        showView('login');
    }
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value.trim();
    const pass = document.getElementById('login-pass').value;
    auth.signInWithEmailAndPassword(phone + DOMAIN, pass)
        .catch(err => alert("Login Error: " + err.message));
});

document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

/**
 * 4. DATA HANDLING (CRUD)
 */
function initDataListener() {
    db.collection('sales')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            allSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort client-side to avoid permission issues
            allSales.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            renderApp();
        });
}

function renderApp() {
    // 1. Update Dashboard
    const today = new Date().toISOString().split('T')[0];
    const todaySales = allSales.filter(s => s.date === today);
    const totalPaid = allSales.filter(s => s.status === 'Paid').reduce((sum, s) => sum + parseFloat(s.totalPrice), 0);
    const totalCredit = allSales.filter(s => s.status === 'Credit').reduce((sum, s) => sum + parseFloat(s.totalPrice), 0);

    document.getElementById('dash-count').innerText = todaySales.length;
    document.getElementById('dash-paid').innerText = "$" + totalPaid.toLocaleString();
    document.getElementById('dash-credit').innerText = "$" + totalCredit.toLocaleString();

    // 2. Render List
    applyFilters();
}

/**
 * 5. UI VIEW MANAGEMENT
 */
function showView(viewName) {
    [loginView, appView, formView].forEach(v => v.classList.add('hidden'));
    if(viewName === 'login') loginView.classList.remove('hidden');
    if(viewName === 'app') appView.classList.remove('hidden');
    if(viewName === 'form') formView.classList.remove('hidden');
}

// Search and Filter Logic
function applyFilters() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const status = document.getElementById('filter-status').value;
    
    const filtered = allSales.filter(sale => {
        const matchesTerm = sale.customerName.toLowerCase().includes(term);
        const matchesStatus = status === 'all' || sale.status === status;
        return matchesTerm && matchesStatus;
    });

    salesListEl.innerHTML = filtered.map(sale => `
        <div class="sale-item ${sale.status}" onclick="editSale('${sale.id}')">
            <div class="sale-header">
                <span>${sale.customerName}</span>
                <span>$${parseFloat(sale.totalPrice).toFixed(2)}</span>
            </div>
            <div class="sale-sub">${sale.steelType} | ${sale.date}</div>
        </div>
    `).join('');
}

// Expose to global window for onclick events
window.editSale = (id) => {
    const sale = allSales.find(s => s.id === id);
    // Populate form fields here...
    document.getElementById('sale-id').value = sale.id;
    document.getElementById('cust-name').value = sale.customerName;
    document.getElementById('steel-type').value = sale.steelType;
    document.getElementById('qty').value = sale.quantity;
    document.getElementById('unit-price').value = sale.unitPrice;
    document.getElementById('status').value = sale.status;
    document.getElementById('form-title').innerText = "Edit Sale";
    document.getElementById('delete-btn').classList.remove('hidden');
    showView('form');
};

document.getElementById('fab-add').addEventListener('click', () => {
    saleForm.reset();
    document.getElementById('sale-id').value = '';
    document.getElementById('form-title').innerText = "New Sale";
    document.getElementById('delete-btn').classList.add('hidden');
    showView('form');
});

document.getElementById('back-btn').addEventListener('click', () => showView('app'));

// Save Sale
saleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('sale-id').value;
    const qty = parseFloat(document.getElementById('qty').value);
    const price = parseFloat(document.getElementById('unit-price').value);
    
    const data = {
        userId: currentUser.uid,
        customerName: document.getElementById('cust-name').value,
        steelType: document.getElementById('steel-type').value,
        quantity: qty,
        unitPrice: price,
        totalPrice: (qty * price).toFixed(2),
        status: document.getElementById('status').value,
        date: new Date().toISOString().split('T')[0],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if(id) {
        await db.collection('sales').doc(id).update(data);
    } else {
        await db.collection('sales').add(data);
    }
    showView('app');
});