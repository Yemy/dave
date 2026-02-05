// js/app.js

// State
let currentUser = null;
let allSales = [];
let salesUnsubscribe = null;

// DOM Elements
const salesListEl = document.getElementById('sales-list');
const fabAdd = document.getElementById('fab-add');
const formView = document.getElementById('form-view');
const appView = document.getElementById('app-view');
const backBtn = document.getElementById('back-btn');
const saleForm = document.getElementById('sale-form');
const formTitle = document.getElementById('form-title');
const deleteBtn = document.getElementById('delete-btn');
const toast = document.getElementById('toast');

// Filter Elements
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const filterDate = document.getElementById('filter-date');

// Dashboard Elements
const dashCount = document.getElementById('dash-count');
const dashPaid = document.getElementById('dash-paid');
const dashCredit = document.getElementById('dash-credit');

// Form Calculation Inputs
const qtyInput = document.getElementById('qty');
const priceInput = document.getElementById('unit-price');
const totalDisplay = document.getElementById('calc-total');
const steelTypeSelect = document.getElementById('steel-type');
const customSteelInput = document.getElementById('custom-steel-input');

// --- INITIALIZATION ---
function initApp(user) {
    currentUser = user;
    // Real-time listener
    salesUnsubscribe = db.collection('sales')
        .where('userId', '==', currentUser.uid)
        .orderBy('date', 'desc')
        .onSnapshot(snapshot => {
            allSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderApp();
        });
}

// --- RENDERING ---
function renderApp() {
    applyFilters();
    updateDashboard();
}

function renderSalesList(sales) {
    salesListEl.innerHTML = '';
    if (sales.length === 0) {
        salesListEl.innerHTML = '<p style="text-align:center; padding:20px; color:#888">No sales found.</p>';
        return;
    }

    sales.forEach(sale => {
        const div = document.createElement('div');
        div.className = `sale-item ${sale.status}`;
        div.innerHTML = `
            <div class="sale-header">
                <span>${sale.customerName}</span>
                <span>$${parseFloat(sale.totalPrice).toFixed(2)}</span>
            </div>
            <div class="sale-sub">
                <span>${sale.steelType} (${sale.quantity})</span>
                <span>${new Date(sale.date).toLocaleDateString()}</span>
            </div>
        `;
        div.addEventListener('click', () => openForm(sale));
        salesListEl.appendChild(div);
    });
}

function updateDashboard() {
    // Calculate based on TODAY
    const today = new Date().toISOString().split('T')[0];
    
    const todaySales = allSales.filter(s => s.date === today);
    dashCount.innerText = todaySales.length;

    const totalPaid = allSales
        .filter(s => s.status === 'Paid')
        .reduce((sum, s) => sum + parseFloat(s.totalPrice), 0);
    
    const totalCredit = allSales
        .filter(s => s.status === 'Credit')
        .reduce((sum, s) => sum + parseFloat(s.totalPrice), 0);

    dashPaid.innerText = '$' + totalPaid.toLocaleString();
    dashCredit.innerText = '$' + totalCredit.toLocaleString();
}

// --- FILTERS ---
function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const status = filterStatus.value;
    const date = filterDate.value;

    const filtered = allSales.filter(sale => {
        const matchesTerm = (sale.customerName || '').toLowerCase().includes(term) || 
                            (sale.customerPhone || '').includes(term);
        const matchesStatus = status === 'all' || sale.status === status;
        const matchesDate = !date || sale.date === date;

        return matchesTerm && matchesStatus && matchesDate;
    });

    renderSalesList(filtered);
}

// Events for filters
searchInput.addEventListener('input', applyFilters);
filterStatus.addEventListener('change', applyFilters);
filterDate.addEventListener('change', applyFilters);

// --- FORM HANDLING ---

// Navigation
fabAdd.addEventListener('click', () => openForm());
backBtn.addEventListener('click', () => {
    formView.classList.add('hidden');
    appView.classList.remove('hidden');
});

// Auto-Calculate Total
const calcTotal = () => {
    const q = parseFloat(qtyInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    totalDisplay.innerText = (q * p).toFixed(2);
};
qtyInput.addEventListener('input', calcTotal);
priceInput.addEventListener('input', calcTotal);

// Custom Steel Toggle
steelTypeSelect.addEventListener('change', (e) => {
    if(e.target.value === 'Custom') {
        customSteelInput.classList.remove('hidden');
        customSteelInput.required = true;
    } else {
        customSteelInput.classList.add('hidden');
        customSteelInput.required = false;
    }
});

function openForm(sale = null) {
    appView.classList.add('hidden');
    formView.classList.remove('hidden');
    
    // Reset Form
    saleForm.reset();
    customSteelInput.classList.add('hidden');
    
    if (sale) {
        // Edit Mode
        formTitle.innerText = "Edit Sale";
        document.getElementById('sale-id').value = sale.id;
        document.getElementById('cust-name').value = sale.customerName;
        document.getElementById('cust-phone').value = sale.customerPhone;
        document.getElementById('steel-size').value = sale.size;
        document.getElementById('qty').value = sale.quantity;
        document.getElementById('unit-price').value = sale.unitPrice;
        document.getElementById('status').value = sale.status;
        document.getElementById('note').value = sale.note || '';
        
        // Handle Steel Type
        if (["L-Shape","O-Shape","U-Shape","T-Shape","Flat Bar"].includes(sale.steelType)) {
             steelTypeSelect.value = sale.steelType;
        } else {
             steelTypeSelect.value = 'Custom';
             customSteelInput.classList.remove('hidden');
             customSteelInput.value = sale.steelType;
        }

        calcTotal();
        deleteBtn.classList.remove('hidden');
    } else {
        // Create Mode
        formTitle.innerText = "New Sale";
        document.getElementById('sale-id').value = '';
        document.getElementById('status').value = 'Paid';
        deleteBtn.classList.add('hidden');
        totalDisplay.innerText = "0.00";
    }
}

// SAVE (Create or Update)
saleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('sale-id').value;
    
    const finalSteelType = steelTypeSelect.value === 'Custom' 
        ? customSteelInput.value 
        : steelTypeSelect.value;

    const data = {
        userId: currentUser.uid,
        customerName: document.getElementById('cust-name').value,
        customerPhone: document.getElementById('cust-phone').value,
        steelType: finalSteelType,
        size: document.getElementById('steel-size').value,
        quantity: parseInt(document.getElementById('qty').value),
        unitPrice: parseFloat(document.getElementById('unit-price').value),
        totalPrice: (parseInt(document.getElementById('qty').value) * parseFloat(document.getElementById('unit-price').value)).toFixed(2),
        status: document.getElementById('status').value,
        note: document.getElementById('note').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (id) {
            await db.collection('sales').doc(id).update(data);
            showToast("Sale Updated");
        } else {
            data.date = new Date().toISOString().split('T')[0]; // Set date only on create
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('sales').add(data);
            showToast("Sale Added");
        }
        backBtn.click();
    } catch (err) {
        alert(err.message);
    }
});

// DELETE
deleteBtn.addEventListener('click', async () => {
    const id = document.getElementById('sale-id').value;
    if (confirm("Are you sure you want to delete this sale?")) {
        await db.collection('sales').doc(id).delete();
        showToast("Sale Deleted");
        backBtn.click();
    }
});

function showToast(msg) {
    toast.innerText = msg;
    toast.classList.remove('hidden');
    toast.style.opacity = 1;
    setTimeout(() => {
        toast.style.opacity = 0;
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}