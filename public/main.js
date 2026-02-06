/**
 * MAIN.JS - Unified Logic for Steel Shop App
 */

// 1. CONFIGURATION (Your Credentials)
const firebaseConfig = {
    apiKey: "AIzaSyB4aNtPh3OdpZqxis-ainOXa3djBVZeHM8",
    authDomain: "daveteklay23.firebaseapp.com",
    projectId: "daveteklay23",
    storageBucket: "daveteklay23.firebasestorage.app",
    messagingSenderId: "1079200881836",
    appId: "1:1079200881836:web:220d35768dcbed9b0e1309"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable Offline Persistence
db.enablePersistence().catch(err => {
    console.log("Persistence disabled:", err.code);
});

// 2. DOM ELEMENTS
const loadingOverlay = document.getElementById('loading-overlay');
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const formView = document.getElementById('form-view');
const salesListEl = document.getElementById('sales-list');
const toast = document.getElementById('toast');

// Inputs
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const qtyInput = document.getElementById('qty');
const priceInput = document.getElementById('unit-price');
const totalDisplay = document.getElementById('calc-total');
const steelTypeSelect = document.getElementById('steel-type');
const customSteelInput = document.getElementById('custom-steel-input');

// State
let currentUser = null;
let allSales = [];
let unsubscribe = null;
const DOMAIN = "@steelshop.local"; // Workaround for phone auth

// 3. AUTHENTICATION LISTENER
auth.onAuthStateChanged(user => {
    loadingOverlay.classList.add('hidden'); // Hide spinner once Auth checks
    
    if (user) {
        currentUser = user;
        console.log("Logged in as:", user.uid);
        switchView('app');
        initDataListener();
    } else {
        currentUser = null;
        switchView('login');
        if(unsubscribe) unsubscribe();
    }
});

// 4. VIEW SWITCHER
function switchView(viewName) {
    loginView.classList.add('hidden');
    appView.classList.add('hidden');
    formView.classList.add('hidden');

    if (viewName === 'login') loginView.classList.remove('hidden');
    if (viewName === 'app') appView.classList.remove('hidden');
    if (viewName === 'form') formView.classList.remove('hidden');
}

// 5. LOGIN ACTION
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value.trim();
    const pass = document.getElementById('login-pass').value;

    if (!phone || !pass) return alert("Please fill all fields");

    loadingOverlay.classList.remove('hidden'); // Show spinner
    
    // Append fake domain for Email Auth
    const email = phone.includes('@') ? phone : phone + DOMAIN;

    auth.signInWithEmailAndPassword(email, pass)
        .catch(err => {
            loadingOverlay.classList.add('hidden');
            alert("Login Failed: " + err.message);
        });
});

document.getElementById('logout-btn').addEventListener('click', () => {
    if(confirm("Log out?")) auth.signOut();
});

// 6. FIRESTORE DATA LISTENER
function initDataListener() {
    salesListEl.innerHTML = '<div style="text-align:center; padding:20px;">Loading data...</div>';

    // Query: User's sales, ordered by date
    unsubscribe = db.collection('sales')
        .where('userId', '==', currentUser.uid) // SECURITY: Only own data
        .orderBy('date', 'desc')
        .onSnapshot(snapshot => {
            allSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderApp();
        }, error => {
            console.error("Data Error:", error);
            if(error.message.includes("requires an index")) {
                alert("First run! Open Console (F12) and click the link to create Index.");
            }
            salesListEl.innerHTML = '<div style="color:red; text-align:center;">Error loading data. Check console.</div>';
        });
}

// 7. RENDER & CALCULATIONS
function renderApp() {
    // A. Dashboard Stats
    const today = new Date().toISOString().split('T')[0];
    const todaySales = allSales.filter(s => s.date === today);
    
    const totalPaid = allSales
        .filter(s => s.status === 'Paid')
        .reduce((sum, s) => sum + parseFloat(s.totalPrice || 0), 0);
        
    const totalCredit = allSales
        .filter(s => s.status === 'Credit')
        .reduce((sum, s) => sum + parseFloat(s.totalPrice || 0), 0);

    document.getElementById('dash-count').innerText = todaySales.length;
    document.getElementById('dash-paid').innerText = totalPaid.toLocaleString() + " ETB";
    document.getElementById('dash-credit').innerText = totalCredit.toLocaleString() + " ETB";

    // B. Sales List (with filters)
    renderList();
}

function renderList() {
    const term = searchInput.value.toLowerCase();
    const status = filterStatus.value;

    const filtered = allSales.filter(sale => {
        const name = (sale.customerName || "").toLowerCase();
        const matchesTerm = name.includes(term);
        const matchesStatus = status === 'all' || sale.status === status;
        return matchesTerm && matchesStatus;
    });

    salesListEl.innerHTML = '';
    if (filtered.length === 0) {
        salesListEl.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">No sales found.</div>';
        return;
    }

    filtered.forEach(sale => {
        const div = document.createElement('div');
        div.className = `sale-item ${sale.status}`;
        div.innerHTML = `
            <div class="sale-header">
                <span>${sale.customerName}</span>
                <span>${parseFloat(sale.totalPrice).toFixed(2)}  ETB</span>
            </div>
            <div class="sale-sub">
                ${sale.steelType} (${sale.quantity}) | ${sale.date}
            </div>
        `;
        div.onclick = () => openEditForm(sale);
        salesListEl.appendChild(div);
    });
}

// Event Listeners for Filters
searchInput.addEventListener('input', renderList);
filterStatus.addEventListener('change', renderList);

// 8. ADD / EDIT LOGIC
const fabAdd = document.getElementById('fab-add');
const backBtn = document.getElementById('back-btn');

fabAdd.addEventListener('click', () => {
    document.getElementById('sale-form').reset();
    document.getElementById('sale-id').value = '';
    document.getElementById('form-title').innerText = "New Sale";
    document.getElementById('delete-btn').classList.add('hidden');
    customSteelInput.classList.add('hidden');
    totalDisplay.innerText = "0.00";
    switchView('form');
});

backBtn.addEventListener('click', () => switchView('app'));

function openEditForm(sale) {
    document.getElementById('sale-id').value = sale.id;
    document.getElementById('cust-name').value = sale.customerName;
    document.getElementById('qty').value = sale.quantity;
    document.getElementById('unit-price').value = sale.unitPrice;
    document.getElementById('status').value = sale.status;
    document.getElementById('form-title').innerText = "Edit Sale";
    
    // Handle Custom Steel Type
    const defaultTypes = ["L-Shape","O-Shape","U-Shape","T-Shape","Flat Bar"];
    if(defaultTypes.includes(sale.steelType)) {
        steelTypeSelect.value = sale.steelType;
        customSteelInput.classList.add('hidden');
    } else {
        steelTypeSelect.value = 'Custom';
        customSteelInput.value = sale.steelType;
        customSteelInput.classList.remove('hidden');
    }

    calcTotal();
    document.getElementById('delete-btn').classList.remove('hidden');
    switchView('form');
}

// Auto-Calc Total
const calcTotal = () => {
    const q = parseFloat(qtyInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    totalDisplay.innerText = (q * p).toFixed(2);
};
qtyInput.addEventListener('input', calcTotal);
priceInput.addEventListener('input', calcTotal);

// Custom Type Toggle
steelTypeSelect.addEventListener('change', (e) => {
    if(e.target.value === 'Custom') {
        customSteelInput.classList.remove('hidden');
        customSteelInput.required = true;
    } else {
        customSteelInput.classList.add('hidden');
        customSteelInput.required = false;
    }
});

// 9. SAVE & DELETE
document.getElementById('sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingOverlay.classList.remove('hidden');

    const id = document.getElementById('sale-id').value;
    const finalSteel = steelTypeSelect.value === 'Custom' ? customSteelInput.value : steelTypeSelect.value;
    const q = parseFloat(qtyInput.value);
    const p = parseFloat(priceInput.value);

    const data = {
        userId: currentUser.uid, // IMPORTANT FOR SECURITY RULES
        customerName: document.getElementById('cust-name').value,
        steelType: finalSteel,
        quantity: q,
        unitPrice: p,
        totalPrice: (q * p).toFixed(2),
        status: document.getElementById('status').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if(id) {
            await db.collection('sales').doc(id).update(data);
            showToast("Sale Updated");
        } else {
            data.date = new Date().toISOString().split('T')[0];
            await db.collection('sales').add(data);
            showToast("Sale Added");
        }
        switchView('app');
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

document.getElementById('delete-btn').addEventListener('click', async () => {
    if(!confirm("Delete this sale permanently?")) return;
    
    const id = document.getElementById('sale-id').value;
    loadingOverlay.classList.remove('hidden');
    
    try {
        await db.collection('sales').doc(id).delete();
        showToast("Sale Deleted");
        switchView('app');
    } catch(err) {
        alert("Error: " + err.message);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

function showToast(msg) {
    toast.innerText = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
}