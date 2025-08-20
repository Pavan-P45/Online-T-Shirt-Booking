// public/js/admin.js
// Handles admin-login.html and admin-dashboard.html behavior
// Include in both pages: <script src="/js/admin.js" defer></script>

(() => {
  const api = {
    login: '/api/admin/login',
    logout: '/api/admin/logout',
    addProduct: '/api/admin/products',
    adminOrders: '/api/admin/orders'
  };

  // Helper: show message in an element id
  function showMsg(id, text, isError = false, timeout = 4000) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? 'crimson' : 'green';
    if (timeout) {
      setTimeout(() => { if (el) el.textContent = ''; }, timeout);
    }
  }

  // Helper: redirect to login if unauthorized
  async function checkAuthResponse(res) {
    if (res.status === 401) {
      // session expired / not logged in
      location.href = '/admin-login.html';
      return false;
    }
    return true;
  }

  // ---------- Admin Login Page ----------
  async function initAdminLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = (document.getElementById('username') || {}).value || '';
      const password = (document.getElementById('password') || {}).value || '';
      if (!username || !password) {
        showMsg('msg', 'Please enter username and password', true);
        return;
      }

      try {
        const res = await fetch(api.login, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          credentials: 'same-origin',
          body: JSON.stringify({ username, password })
        });

        if (res.ok) {
          // logged in
          location.href = '/admin-dashboard.html';
        } else {
          const data = await res.json().catch(()=>({}));
          showMsg('msg', data.message || 'Login failed', true);
        }
      } catch (err) {
        console.error('Login error', err);
        showMsg('msg', 'Network error', true);
      }
    });
  }

  // ---------- Admin Dashboard Page ----------
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch { return iso; }
  }

  async function fetchOrdersAndRender() {
    const container = document.getElementById('orders');
    if (!container) return;
    container.innerHTML = 'Loading orders...';

    try {
      const res = await fetch(api.adminOrders, { credentials: 'same-origin' });
      if (!await checkAuthResponse(res)) return;
      if (!res.ok) {
        container.innerText = 'Failed to load orders';
        return;
      }
      const orders = await res.json();
      if (!orders.length) {
        container.innerHTML = '<p>No orders found.</p>';
        return;
      }

      container.innerHTML = '';
      orders.forEach(o => {
        const itemsHtml = (o.items || o.cart || []).map(it => {
          // support both shapes: {name, qty, price} or older {name, price}
          const name = it.name || it.product || 'Item';
          const qty = it.qty || it.quantity || 1;
          const price = it.price || it.amount || 0;
          return `<li>${escapeHtml(name)} x ${qty} — ₹${escapeHtml(price)}</li>`;
        }).join('');

        const orderHtml = document.createElement('div');
        orderHtml.className = 'order-card';
        orderHtml.innerHTML = `
          <p><strong>${escapeHtml(o.name)}</strong> — ${escapeHtml(o.contact)}</p>
          <p>${escapeHtml(o.address || o.location || '')}</p>
          <p><strong>Total:</strong> ₹${escapeHtml(o.total || o.amount || 0)}</p>
          <p><strong>Date:</strong> ${formatDate(o.createdAt || o.created_at || o.updatedAt)}</p>
          <p><strong>Items:</strong></p>
          <ul>${itemsHtml}</ul>
        `;
        container.appendChild(orderHtml);
      });
    } catch (err) {
      console.error('Fetch orders error', err);
      container.innerText = 'Error loading orders';
    }
  }

  // basic XSS-safe text escape
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function initAdminDashboard() {
    // attach logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await fetch(api.logout, { method: 'POST', credentials: 'same-origin' });
        } catch (err) { console.warn('logout failed', err); }
        location.href = '/admin-login.html';
      });
    }

    // handle add product form
    const addForm = document.getElementById('addForm');
    if (addForm) {
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = (document.getElementById('pname') || {}).value || '';
        const price = (document.getElementById('pprice') || {}).value || '';
        const image = (document.getElementById('pimage') || {}).value || '';
        const description = (document.getElementById('pdesc') || {}).value || '';

        if (!name || !price) {
          showMsg('addMsg', 'Name and price are required', true);
          return;
        }

        try {
          const res = await fetch(api.addProduct, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ name, price, image, description })
          });

          if (!await checkAuthResponse(res)) return;
          const data = await res.json();
          if (res.ok) {
            showMsg('addMsg', 'Product added');
            addForm.reset();
          } else {
            showMsg('addMsg', data.message || 'Failed to add product', true);
          }
        } catch (err) {
          console.error('Add product error', err);
          showMsg('addMsg', 'Network error', true);
        }
      });
    }

    // initial fetch orders
    await fetchOrdersAndRender();

    // auto-refresh orders every 12 seconds (optional)
    setInterval(fetchOrdersAndRender, 12000);
  }

  // ---------- Initialize depending on page ----------
  document.addEventListener('DOMContentLoaded', () => {
    const path = (location.pathname || '').toLowerCase();

    if (path.includes('admin-login')) {
      initAdminLogin();
      return;
    }

    if (path.includes('admin-dashboard')) {
      initAdminDashboard();
      return;
    }

    // if someone included admin.js on other pages, do nothing
  });
})();
