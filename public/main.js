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

// 2. UI ELEMENTS (DOM)
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const formView = document.getElementById('form-view');

// Sub Views
const views = {
    dashboard: document.getElementById('dashboard-view'),
    customers: document.getElementById('customers-view'),
    sales: document.getElementById('sales-view'),
    purchases: document.getElementById('purchases-view'),
    settings: document.getElementById('settings-view'),
    drillDown: document.getElementById('drill-down-view')
};

// Forms
const saleForm = document.getElementById('sale-form');
const customerForm = document.getElementById('customer-form');
const purchaseForm = document.getElementById('purchase-form');
const formTitle = document.getElementById('form-title-text');

// Global State
let currentUser = null;
let allSales = [];
let allCustomers = [];
let allPurchases = [];
const DOMAIN = "@steelshop.local";

const loadingOverlay = document.getElementById('loading-overlay');

// 3. AUTHENTICATION LOGIC
auth.onAuthStateChanged(user => {
    // Failsafe: Hide loader after 5s max if something gets stuck
    setTimeout(() => {
         if(loadingOverlay) loadingOverlay.classList.add('hidden');
    }, 5000);

    if (user) {
        currentUser = user;
        showMainView('app');
        initDataListener();
        initNavigation();
        // Hide loader immediately for UI responsiveness
        if(loadingOverlay) loadingOverlay.classList.add('hidden'); 
    } else {
        showMainView('login');
        if(loadingOverlay) loadingOverlay.classList.add('hidden');
    }
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value.trim();
    const pass = document.getElementById('login-pass').value;
    auth.signInWithEmailAndPassword(phone + DOMAIN, pass)
        .catch(err => alert("Login Error: " + err.message));
});

document.getElementById('logout-btn-mobile').addEventListener('click', () => auth.signOut());
document.getElementById('logout-btn-desktop').addEventListener('click', () => auth.signOut());

/**
 * 4. DATA HANDLING (CRUD)
 */
function initDataListener() {
    // Sales Listener
    db.collection('sales')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            allSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allSales.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            renderApp(); 
        });
    
    // Customer Listener
    db.collection('customers')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            allCustomers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            renderApp();
        });

    // Purchases Listener
    db.collection('purchases')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            allPurchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allPurchases.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            renderApp();
        });
}

function renderApp() {
    // Determine active view and render accordingly
    const activeView = document.querySelector('.nav-item.active').dataset.target || 'dashboard';
    
    // Always update dropdowns when data changes
    populateCustomerSelect();

    if (activeView === 'dashboard') renderDashboard();
    if (activeView === 'sales') renderSalesList();
    if (activeView === 'customers') renderCustomers(); 
    if (activeView === 'purchases') renderPurchases();
}

function getDashboardFilteredSales() {
    let filteredSales = [...allSales];
    
    // 1. Date Filter
    const dateFilter = document.getElementById('dash-date-filter').value;
    const customDate = document.getElementById('dash-custom-date').value;
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7); // YYYY-MM

    if (dateFilter === 'today') {
        filteredSales = filteredSales.filter(s => s.date === today);
        document.getElementById('dash-custom-date').classList.add('hidden');
    } else if (dateFilter === 'yesterday') {
        filteredSales = filteredSales.filter(s => s.date === yesterday);
        document.getElementById('dash-custom-date').classList.add('hidden');
    } else if (dateFilter === 'this_month') {
        filteredSales = filteredSales.filter(s => (s.date || '').startsWith(thisMonth));
        document.getElementById('dash-custom-date').classList.add('hidden');
    } else if (dateFilter === 'custom') {
        document.getElementById('dash-custom-date').classList.remove('hidden');
        if (customDate) {
            filteredSales = filteredSales.filter(s => s.date === customDate);
        }
    }

    // 2. Customer Filter
    const custFilter = document.getElementById('dash-customer-filter').value;
    if (custFilter !== 'all') {
        filteredSales = filteredSales.filter(s => s.customerId === custFilter);
    }
    
    return filteredSales;
}

function renderDashboard() {
    const filteredSales = getDashboardFilteredSales();

    // 3. Calc Totals
    const totalPaid = filteredSales.reduce((sum, s) => sum + parseFloat(s.paid || 0), 0);
    const totalCredit = filteredSales.reduce((sum, s) => {
        const total = parseFloat(s.totalPrice || 0);
        const rem = parseFloat(s.remainder || 0);
        const cred = (s.status === 'Credit') ? (total + rem) : rem;
        return sum + cred;
    }, 0);
    
    document.getElementById('dash-count').innerText = filteredSales.length;
    document.getElementById('dash-paid').innerText = "ETB " + totalPaid.toLocaleString();
    document.getElementById('dash-credit').innerText = "ETB " + totalCredit.toLocaleString();
}

// Dashboard Event Listeners
document.getElementById('dash-date-filter').addEventListener('change', renderDashboard);
document.getElementById('dash-custom-date').addEventListener('change', renderDashboard);
document.getElementById('dash-customer-filter').addEventListener('change', renderDashboard);

function populateCustomerSelect() {
    const select = document.getElementById('sale-customer-select');
    const currentVal = select.value;
    
    // Keep the "Select Customer" option
    select.innerHTML = '<option value="">Select Customer</option>';
    
    allCustomers.forEach(cust => {
        const option = document.createElement('option');
        option.value = cust.id; // Use ID as value
        option.textContent = cust.name;
        select.appendChild(option);
    });
    
    if(currentVal) select.value = currentVal;

    // Also populate dashboard filter
    const dashFilter = document.getElementById('dash-customer-filter');
    if (dashFilter) {
        const dashVal = dashFilter.value;
        dashFilter.innerHTML = '<option value="all">All Customers</option>';
        allCustomers.forEach(cust => {
            const option = document.createElement('option');
            option.value = cust.id;
            option.textContent = cust.name;
            dashFilter.appendChild(option);
        });
        dashFilter.value = dashVal;
    }


    // Also populate purchase customer select
    const pSelect = document.getElementById('purchase-customer-select');
    if (pSelect) {
        const pVal = pSelect.value;
        pSelect.innerHTML = '<option value="">Select Supplier/Customer</option>';
        allCustomers.forEach(cust => {
            const option = document.createElement('option');
            option.value = cust.id;
            option.textContent = cust.name;
            pSelect.appendChild(option);
        });
        pSelect.value = pVal;
    }
}

function renderCustomers() {
    const listEl = document.getElementById('customer-list');
    listEl.innerHTML = allCustomers.map(cust => `
        <div class="sale-item" onclick="showCustomerDetails('${cust.id}')">
             <div class="sale-header">
                <span>${cust.name}</span>
                <span>${cust.phone}</span>
            </div>
             <div class="sale-sub">Tap to view details</div>
        </div>
    `).join('');
}

function renderPurchases() {
    const listEl = document.getElementById('purchase-list');
    const term = (document.getElementById('purchases-search').value || "").toLowerCase();
    
    const filteredCustomers = allCustomers.filter(cust => 
        (cust.name || "").toLowerCase().includes(term) || 
        (cust.phone || "").includes(term)
    );

    listEl.innerHTML = filteredCustomers.map(cust => {
        // Calculate totals for this specific customer
        const custPurchases = allPurchases.filter(p => p.customerId === cust.id);
        const totalAmount = custPurchases.reduce((sum, p) => sum + parseFloat(p.totalPrice || 0), 0);
        const totalPaid = custPurchases.reduce((sum, p) => sum + parseFloat(p.paid || 0), 0);
        const totalCredit = custPurchases.reduce((sum, p) => {
            const t = parseFloat(p.totalPrice || 0);
            const r = parseFloat(p.remainder || 0);
            return sum + (p.status === 'Credit' ? (t + r) : r);
        }, 0);
        
        return `
            <div class="sale-item" onclick="showCustomerDetails('${cust.id}')">
                 <div class="sale-header">
                    <span>${cust.name}</span>
                    <span class="text-accent">${totalAmount.toLocaleString()}</span>
                </div>
                 <div class="sale-sub">
                    <span>${cust.phone}</span>
                    <span class="text-gray">${custPurchases.length} Purchases</span>
                 </div>
                 <div class="sale-sub mt-1">
                    <span class="status-badge Paid">Paid: ${totalPaid.toLocaleString()}</span>
                    <span class="status-badge Credit">Bal: ${totalCredit.toLocaleString()}</span>
                 </div>
            </div>
        `;
    }).join('');

    if(filteredCustomers.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#999">No Customers Found</div>';
    }
}

// ... Navigation ... (omitted, existing)

// FORMS SUBMISSION

// 1. SAVE SALE
// 1. SAVE SALE
saleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setBtnLoading(e.submitter, true, "Saving...");
    const id = document.getElementById('sale-id').value;
    const custId = document.getElementById('sale-customer-select').value;
    const custName = document.getElementById('sale-customer-select').options[document.getElementById('sale-customer-select').selectedIndex].text;
    
    if (!custId) {
        alert("Please select a customer");
        return;
    }

    const qty = parseFloat(document.getElementById('qty').value) || 0;
    const price = parseFloat(document.getElementById('unit-price').value) || 0;
    const other = parseFloat(document.getElementById('other-costs').value) || 0;
    const remainder = parseFloat(document.getElementById('remainder').value) || 0;
    
    const total = (qty * price) + other;

    const steelSelect = document.getElementById('steel-type');
    const customInput = document.getElementById('custom-steel-input');
    let steelType = steelSelect.value;
    if (steelType === 'Custom') {
        steelType = customInput.value.trim() || 'Custom';
    }

    const data = {
        userId: currentUser.uid,
        customerId: custId,
        customerName: custName,
        steelType: steelType,
        quantity: qty,
        unitPrice: price,
        otherCosts: other,
        totalPrice: total.toFixed(2),
        paid: parseFloat(document.getElementById('sale-paid').value) || 0,
        remainder: remainder,
        status: document.getElementById('status').value,
        info: document.getElementById('sale-info').value,
        date: document.getElementById('sale-date').value || new Date().toISOString().split('T')[0],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if(id) {
            await db.collection('sales').doc(id).update(data);
        } else {
            await db.collection('sales').add(data);
        }
        formView.classList.add('hidden');
        showToast("Sale Saved!");
        // Redirect to dashboard as requested
        switchSubView('dashboard');
    } catch(err) {
        alert("Error saving sale: " + err.message);
    } finally {
        setBtnLoading(e.submitter, false, "Save Sale");
    }
});

// Auto-Calc Listener for Sales
function updateSaleTotal() {
    const qty = parseFloat(document.getElementById('qty').value) || 0;
    const price = parseFloat(document.getElementById('unit-price').value) || 0;
    const other = parseFloat(document.getElementById('other-costs').value) || 0;
    const paid = parseFloat(document.getElementById('sale-paid').value) || 0;
    const remainder = parseFloat(document.getElementById('remainder').value) || 0;
    
    const total = (qty * price) + other;
    const status = document.getElementById('status').value;
    const balance = (status === 'Credit') ? (total + remainder) : remainder;
    
    document.getElementById('calc-total').innerText = total.toFixed(2);
    document.getElementById('calc-balance').innerText = balance.toFixed(2);
}
['qty', 'unit-price', 'other-costs', 'sale-paid', 'remainder', 'status'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateSaleTotal);
    if(id === 'status') document.getElementById(id).addEventListener('change', updateSaleTotal);
});

// Custom Steel Type Toggle
document.getElementById('steel-type').addEventListener('change', (e) => {
    const customInput = document.getElementById('custom-steel-input');
    if (e.target.value === 'Custom') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
    }
});


// 2. SAVE CUSTOMER
// 2. SAVE CUSTOMER
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setBtnLoading(e.submitter, true, "Saving...");
    const id = document.getElementById('customer-id').value;
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();

    // Unique Phone Validation
    const exists = allCustomers.find(c => c.phone === phone && c.id !== id);
    if(exists) {
        alert("Customer with this phone number already exists!");
        return;
    }

    const data = {
        userId: currentUser.uid,
        name: name,
        phone: phone,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if(id) {
            await db.collection('customers').doc(id).update(data);
        } else {
            await db.collection('customers').add(data);
        }
        formView.classList.add('hidden');
        showToast("Customer Saved!");
        // Redirect to dashboard
        switchSubView('dashboard');
    } catch(err) {
        alert("Error: " + err.message);
    } finally {
        setBtnLoading(e.submitter, false, "Save Customer");
    }
});

// 3. SAVE PURCHASE
// 3. SAVE PURCHASE
purchaseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setBtnLoading(e.submitter, true, "Saving...");
    const id = document.getElementById('purchase-id').value;
    const custId = document.getElementById('purchase-customer-select').value;
    const custName = document.getElementById('purchase-customer-select').options[document.getElementById('purchase-customer-select').selectedIndex].text;
    
    if (!custId) {
        alert("Please select a supplier/customer");
        setBtnLoading(e.submitter, false, "Save Purchase");
        return;
    }

    const qty = parseFloat(document.getElementById('purchase-qty').value) || 0;
    const price = parseFloat(document.getElementById('purchase-cost').value) || 0;
    const other = parseFloat(document.getElementById('purchase-other-costs').value) || 0;
    const total = (qty * price) + other;

    const data = {
        userId: currentUser.uid,
        customerId: custId,
        itemName: document.getElementById('purchase-item').value,
        source: custName,
        quantity: qty,
        unitPrice: price,
        otherCosts: other,
        totalPrice: total.toFixed(2),
        paid: parseFloat(document.getElementById('purchase-paid').value) || 0,
        remainder: parseFloat(document.getElementById('purchase-remainder').value) || 0,
        status: document.getElementById('purchase-status').value,
        date: document.getElementById('purchase-date').value || new Date().toISOString().split('T')[0],
        notes: document.getElementById('purchase-notes').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if(id) {
            await db.collection('purchases').doc(id).update(data);
        } else {
            await db.collection('purchases').add(data);
        }
        formView.classList.add('hidden');
        showToast("Purchase Saved!");
        // Redirect to dashboard
        switchSubView('dashboard');
    } catch(err) {
        alert("Error: " + err.message);
    } finally {
        setBtnLoading(e.submitter, false, "Save Purchase");
    }
});

// Auto-Calc Listener for Purchases
function updatePurchaseTotal() {
    const qty = parseFloat(document.getElementById('purchase-qty').value) || 0;
    const price = parseFloat(document.getElementById('purchase-cost').value) || 0;
    const other = parseFloat(document.getElementById('purchase-other-costs').value) || 0;
    const paid = parseFloat(document.getElementById('purchase-paid').value) || 0;
    const remainder = parseFloat(document.getElementById('purchase-remainder').value) || 0;

    const total = (qty * price) + other;
    const status = document.getElementById('purchase-status').value;
    const balance = (status === 'Credit') ? (total + remainder) : remainder;

    document.getElementById('purchase-total-display').innerText = total.toFixed(2);
    document.getElementById('purchase-balance-display').innerText = balance.toFixed(2);
}
['purchase-qty', 'purchase-cost', 'purchase-other-costs', 'purchase-paid', 'purchase-remainder', 'purchase-status'].forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', updatePurchaseTotal);
        if(id === 'purchase-status') el.addEventListener('change', updatePurchaseTotal);
    }
});


// EDIT HANDLERS

window.editCustomer = (id) => {
    const cust = allCustomers.find(c => c.id === id);
    if (!cust) return;
    
    window.openForm('customer', id); // Open and reset first
    
    document.getElementById('customer-id').value = cust.id;
    document.getElementById('customer-name').value = cust.name;
    document.getElementById('customer-phone').value = cust.phone;
    
    document.getElementById('delete-customer-btn').classList.remove('hidden');
};

window.editPurchase = (id) => {
    const p = allPurchases.find(x => x.id === id);
    if (!p) return;

    window.openForm('purchase', id); // Open and reset first

    document.getElementById('purchase-id').value = p.id;
    document.getElementById('purchase-item').value = p.itemName;
    document.getElementById('purchase-qty').value = p.quantity;
    document.getElementById('purchase-cost').value = p.unitPrice || p.cost;
    
    if (p.customerId) {
        document.getElementById('purchase-customer-select').value = p.customerId;
    }

    document.getElementById('purchase-other-costs').value = p.otherCosts || 0;
    document.getElementById('purchase-paid').value = p.paid || 0;
    document.getElementById('purchase-remainder').value = p.remainder || 0;
    document.getElementById('purchase-status').value = p.status || 'Paid';
    document.getElementById('purchase-notes').value = p.notes || '';
    document.getElementById('purchase-date').value = p.date || '';
    
    updatePurchaseTotal();
    document.getElementById('delete-purchase-btn').classList.remove('hidden');
};

// Override existing editSale to fix field mapping
// Override existing editSale to fix field mapping
window.editSale = (id) => {
    const sale = allSales.find(s => s.id === id);
    if (!sale) return;
    
    window.openForm('sale', id); // Open and reset first
    
    document.getElementById('sale-id').value = sale.id;
    
    if (sale.customerId) {
        document.getElementById('sale-customer-select').value = sale.customerId;
    }

    document.getElementById('qty').value = sale.quantity;
    document.getElementById('unit-price').value = sale.unitPrice;
    document.getElementById('other-costs').value = sale.otherCosts || 0;
    document.getElementById('sale-paid').value = sale.paid || 0;
    document.getElementById('remainder').value = sale.remainder || 0;
    
    const steelSelect = document.getElementById('steel-type');
    const customInput = document.getElementById('custom-steel-input');
    const standardOptions = Array.from(steelSelect.options).map(opt => opt.value);
    
    if (standardOptions.includes(sale.steelType)) {
        steelSelect.value = sale.steelType;
        customInput.classList.add('hidden');
    } else {
        steelSelect.value = 'Custom';
        customInput.value = sale.steelType;
        customInput.classList.remove('hidden');
    }

    document.getElementById('status').value = sale.status;
    document.getElementById('sale-info').value = sale.info || '';
    document.getElementById('sale-date').value = sale.date || '';

    updateSaleTotal();
    document.getElementById('delete-sale-btn').classList.remove('hidden');
};

// DELETE HANDLERS
document.getElementById('delete-sale-btn').addEventListener('click', () => deleteItem('sales', document.getElementById('sale-id').value));
document.getElementById('delete-customer-btn').addEventListener('click', () => deleteItem('customers', document.getElementById('customer-id').value));
document.getElementById('delete-purchase-btn').addEventListener('click', () => deleteItem('purchases', document.getElementById('purchase-id').value));

async function deleteItem(collection, id) {
    if(!id) return;
    if(!confirm("Are you sure you want to delete this?")) return;
    
    try {
        await db.collection(collection).doc(id).delete();
        formView.classList.add('hidden');
        showToast("Deleted Successfully");
    } catch(err) {
        alert("Error deleting: " + err.message);
    }
}

// UTILS
function setBtnLoading(btn, isLoading, originalText) {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalContent = btn.innerHTML;
        btn.innerHTML = `<i class="material-icons rotating" style="font-size:1.2rem; vertical-align:middle;">sync</i> ${originalText || 'Saving...'}`;
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalContent || originalText || 'Save';
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('hidden');
    t.classList.add('visible');
    setTimeout(() => {
        t.classList.remove('visible');
        setTimeout(() => t.classList.add('hidden'), 300);
    }, 3000);
}

// CUSTOMER DETAILS LOGIC
const customerDetailView = document.getElementById('customer-detail-view');
let currentDetailCustomerId = null;
let detailBackTarget = 'customers'; // Default back target

window.showCustomerDetails = (id) => {
    currentDetailCustomerId = id;
    const cust = allCustomers.find(c => c.id === id);
    if (!cust) return;

    // Determine where we came from to set the back button behavior
    const activeView = document.querySelector('.nav-item.active');
    if (activeView) detailBackTarget = activeView.dataset.target;

    // View Switching
    Object.values(views).forEach(el => el.classList.add('hidden'));
    customerDetailView.classList.remove('hidden');

    // Populate Info
    document.getElementById('cust-detail-name').innerText = cust.name;
    
    // Determine context: Sales or Purchases
    const isPurchaseContext = detailBackTarget === 'purchases';
    const records = isPurchaseContext 
        ? allPurchases.filter(p => p.customerId === id)
        : allSales.filter(s => s.customerId === id);

    // Update Header
    const historyHeader = document.querySelector('#customer-detail-view h4');
    if(historyHeader) historyHeader.innerText = isPurchaseContext ? "Purchase History" : "Sales History";

    const totalCount = records.length;
    const totalPaid = records.reduce((sum, r) => sum + parseFloat(r.paid || 0), 0);
    const totalCredit = records.reduce((sum, r) => {
        const t = parseFloat(r.totalPrice || 0);
        const rem = parseFloat(r.remainder || 0);
        return sum + (r.status === 'Credit' ? (t + rem) : rem);
    }, 0);

    // Update Dashboard Cards
    document.getElementById('cd-total-sales').innerText = totalCount;
    // Also update the card label for Purchases
    const totalSalesCardLabel = document.querySelector('#customer-detail-view .card span');
    if(totalSalesCardLabel) totalSalesCardLabel.innerText = isPurchaseContext ? "Total Purchases" : "Total Sales";

    document.getElementById('cd-paid').innerText = "ETB " + totalPaid.toLocaleString();
    document.getElementById('cd-credit').innerText = "ETB " + totalCredit.toLocaleString();

    // Render List
    const listEl = document.getElementById('cust-detail-list');
    listEl.innerHTML = records.map(rec => `
        <div class="sale-item ${rec.status}" onclick="${isPurchaseContext ? `editPurchase('${rec.id}')` : `editSale('${rec.id}')`}">
            <div class="sale-header">
                <span>${isPurchaseContext ? rec.itemName : rec.steelType}</span>
                <span>${parseFloat(rec.totalPrice).toFixed(2)}</span>
            </div>
            <div class="sale-sub">
                <span>${rec.date}</span>
                <span class="status-badge ${rec.status}">${rec.status}</span>
            </div>
            ${rec.remainder > 0 ? `<div class="sale-sub mt-1 text-red font-bold">Unpaid: ETB ${parseFloat(rec.remainder).toLocaleString()}</div>` : ''}
        </div>
    `).join('');

    if(records.length === 0) listEl.innerHTML = `<div style="text-align:center; padding:20px; color:#999">No ${isPurchaseContext ? 'Purchases' : 'Sales'} Recorded</div>`;
};

document.getElementById('cust-detail-back-btn').addEventListener('click', () => {
    customerDetailView.classList.add('hidden');
    switchSubView(detailBackTarget);
});

// Customer Detail CRUD
const editCustBtn = document.getElementById('edit-customer-profile-btn');
if (editCustBtn) {
    editCustBtn.addEventListener('click', () => {
        if(currentDetailCustomerId) editCustomer(currentDetailCustomerId);
    });
}

const deleteCustBtn = document.getElementById('delete-customer-profile-btn');
if (deleteCustBtn) {
    deleteCustBtn.addEventListener('click', async () => {
        if(!currentDetailCustomerId) return;
        if(!confirm("Delete this customer and all their records?")) return;
        try {
            await db.collection('customers').doc(currentDetailCustomerId).delete();
            customerDetailView.classList.add('hidden');
            switchSubView('customers');
            showToast("Customer Deleted");
        } catch(err) {
            alert("Error: " + err.message);
        }
    });
}


// SETTINGS
document.getElementById('change-password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newPass = document.getElementById('new-password').value;
    if(newPass.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }
    
    currentUser.updatePassword(newPass).then(() => {
        showToast("Password Updated");
        document.getElementById('change-password-form').reset();
    }).catch((error) => {
        alert("Error: " + error.message);
    });
});

// DRILL DOWN LOGIC
function showDrillDown() {
    const records = getDashboardFilteredSales();
    const listEl = document.getElementById('drill-down-list');
    const titleEl = document.getElementById('drill-down-title');
    
    const dateFilter = document.getElementById('dash-date-filter').value;
    titleEl.innerText = (dateFilter === 'today' ? "Today's" : "Filtered") + " Sales";

    // Switch View
    Object.values(views).forEach(el => el.classList.add('hidden'));
    document.getElementById('drill-down-view').classList.remove('hidden');

    listEl.innerHTML = records.map(rec => `
        <div class="sale-item ${rec.status}" onclick="editSale('${rec.id}')">
            <div class="sale-header">
                <span>${rec.customerName || 'Customer'}</span>
                <span>${parseFloat(rec.totalPrice).toFixed(2)}</span>
            </div>
            <div class="sale-sub">
                <span>${rec.steelType}</span>
                <span class="status-badge ${rec.status}">${rec.status}</span>
            </div>
        </div>
    `).join('');

    if(records.length === 0) listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#999">No Records Found</div>';
}

// View Navigation Logic
function showMainView(viewId) {
    if(viewId === 'login') {
        loginView.classList.remove('hidden');
        appView.classList.add('hidden');
    } else {
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');
    }
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if(item.dataset.target) {
            item.addEventListener('click', () => {
                switchSubView(item.dataset.target);
            });
        }
    });

    // FAB (Sales specific since it's in sales view)
    const fab = document.getElementById('fab-add-sale');
    if(fab) {
        fab.addEventListener('click', () => {
            window.openForm('sale');
        });
    }

    // Specific Add Buttons
    const addCustBtn = document.getElementById('add-customer-btn');
    if(addCustBtn) addCustBtn.addEventListener('click', () => window.openForm('customer'));

    const addPurchBtn = document.getElementById('add-purchase-btn-fab');
    if(addPurchBtn) addPurchBtn.addEventListener('click', () => window.openForm('purchase'));

    // Quick Add
    document.getElementById('quick-add-supplier').addEventListener('click', () => window.openForm('customer'));
    const saleQuickAdd = document.getElementById('quick-add-customer');
    if(saleQuickAdd) saleQuickAdd.addEventListener('click', () => window.openForm('customer'));

    // Dashboard Drill-Down
    const dashSalesCard = document.getElementById('dash-sales-card');
    if(dashSalesCard) dashSalesCard.addEventListener('click', () => showDrillDown());

    // Drill-Down Back Button
    const drillBackBtn = document.getElementById('drill-down-back-btn');
    if(drillBackBtn) drillBackBtn.addEventListener('click', () => switchSubView('dashboard'));
}

function switchSubView(viewId) {
    if(!views[viewId]) return;

    // Hide all sub-views
    Object.values(views).forEach(el => el.classList.add('hidden'));
    // Show target
    views[viewId].classList.remove('hidden');

    // Update Nav Active State
    document.querySelectorAll('.nav-item').forEach(btn => {
        if(btn.dataset.target === viewId) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Re-render
    renderApp();
}

window.openForm = (type, id = null) => {
    formView.classList.remove('hidden');
    
    // Hide all forms first
    saleForm.classList.add('hidden');
    customerForm.classList.add('hidden');
    purchaseForm.classList.add('hidden');
    
    // Reset inputs
    saleForm.reset();
    customerForm.reset();
    purchaseForm.reset();

    // Reset delete buttons
    document.getElementById('delete-sale-btn').classList.add('hidden');
    document.getElementById('delete-customer-btn').classList.add('hidden');
    document.getElementById('delete-purchase-btn').classList.add('hidden');

    if (type === 'sale') {
        formTitle.innerText = id ? "Edit Sale" : "New Sale";
        saleForm.classList.remove('hidden');
        populateCustomerSelect();
        // Auto-populate if in customer detail
        if (!id && currentDetailCustomerId && customerDetailView.classList.contains('hidden')) {
            // Wait, if we are opening form, we shouldn't check if hidden, we should check if we CAME from detail
            // Actually simpler: if currentDetailCustomerId is set, pre-select it
        }
        if (!id && currentDetailCustomerId) {
            document.getElementById('sale-customer-select').value = currentDetailCustomerId;
        }
        document.getElementById('custom-steel-input').classList.add('hidden');
    } else if (type === 'customer') {
        formTitle.innerText = id ? "Edit Customer" : "New Customer";
        customerForm.classList.remove('hidden');
    } else if (type === 'purchase') {
        formTitle.innerText = id ? "Edit Purchase" : "New Purchase";
        purchaseForm.classList.remove('hidden');
        populateCustomerSelect(); // Also populate purchase customer select
        if (!id && currentDetailCustomerId) {
            document.getElementById('purchase-customer-select').value = currentDetailCustomerId;
        }
    }
};

const closeBtn = document.getElementById('form-back-btn');
if(closeBtn) {
    closeBtn.addEventListener('click', () => {
        formView.classList.add('hidden');
    });
}

// Render Sales List
function renderSalesList() {
    const listEl = document.getElementById('sales-list');
    const term = (document.getElementById('sales-search').value || "").toLowerCase();
    
    const filteredCustomers = allCustomers.filter(cust => 
        (cust.name || "").toLowerCase().includes(term) || 
        (cust.phone || "").includes(term)
    );

    listEl.innerHTML = filteredCustomers.map(cust => {
        const custSales = allSales.filter(s => s.customerId === cust.id);
        const totalAmount = custSales.reduce((sum, s) => sum + parseFloat(s.totalPrice || 0), 0);
        const totalPaid = custSales.reduce((sum, s) => sum + parseFloat(s.paid || 0), 0);
        const totalCredit = custSales.reduce((sum, s) => {
            const t = parseFloat(s.totalPrice || 0);
            const r = parseFloat(s.remainder || 0);
            return sum + (s.status === 'Credit' ? (t + r) : r);
        }, 0);
        
        return `
            <div class="sale-item" onclick="showCustomerDetails('${cust.id}')">
                 <div class="sale-header">
                    <span>${cust.name}</span>
                    <span class="text-accent">${totalAmount.toLocaleString()}</span>
                </div>
                 <div class="sale-sub">
                    <span>${cust.phone}</span>
                    <span class="text-gray">${custSales.length} Sales</span>
                 </div>
                 <div class="sale-sub mt-1">
                    <span class="status-badge Paid">Paid: ${totalPaid.toLocaleString()}</span>
                    <span class="status-badge Credit">Bal: ${totalCredit.toLocaleString()}</span>
                 </div>
            </div>
        `;
    }).join('');

    if(filteredCustomers.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#999">No Customers Found</div>';
    }
}

// Add listeners for sale/purchase list filters
const salesSearch = document.getElementById('sales-search');
if(salesSearch) salesSearch.addEventListener('input', renderSalesList);

const purchasesSearch = document.getElementById('purchases-search');
if(purchasesSearch) purchasesSearch.addEventListener('input', renderPurchases);
