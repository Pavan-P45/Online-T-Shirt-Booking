// public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/products')
    .then(r => r.json())
    .then(products => {
      const container = document.getElementById('products');
      if (!products.length) container.innerHTML = '<p>No products yet</p>';
      products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <img src="${p.image || 'https://via.placeholder.com/200'}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p>₹${p.price}</p>
          <p>${p.description || ''}</p>
          <a href="/product.html?id=${p._id}">View & Order</a>
        `;
        container.appendChild(card);
      });
    });
});
