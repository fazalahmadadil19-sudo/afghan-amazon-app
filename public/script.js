let currentUser = null;
let locations = [];
let currentCity = null;
let currentCategory = null;

async function fetchLocations() {
  try {
    const response = await fetch('/locations');
    locations = await response.json();
    populateLocationSelect('product-location');
    populateLocationSelect('pickup-location');
  } catch (error) {
    console.error('Error fetching locations:', error);
  }
}

function populateLocationSelect(selectId) {
  const select = document.getElementById(selectId);
  if (select) {
    select.innerHTML = '';
    locations.forEach(loc => {
      const option = document.createElement('option');
      option.value = loc.id;
      option.textContent = `${loc.name} (${loc.city})`;
      select.appendChild(option);
    });
  }
}

function showCityProducts(city) {
  const cityMap = {
    'جلاال اباد': 'Jalalabad',
    'کابل': 'Kabul',
    'کندهار': 'Kandahar',
    'هرات': 'Herat',
    'بلخ': 'Balkh',
    'Jalalabad': 'Jalalabad',
    'Kabul': 'Kabul',
    'Kandahar': 'Kandahar',
    'Herat': 'Herat',
    'Balkh': 'Balkh'
  };
  currentCity = cityMap[city] || city;
  currentCategory = null;
  loadProducts();
  window.open(`/categories.html?city=${encodeURIComponent(currentCity)}`, '_blank', 'width=800,height=600');
  document.getElementById('debug-output').innerHTML = `<p>Selected City: ${currentCity}</p>`;
}

window.onload = async () => {
  await fetchLocations();
  if (window.location.pathname.includes('pashto')) {
    loadProducts();
  } else {
    loadProducts();
  }
  document.getElementById('toggle-content').addEventListener('click', function() {
    const content = document.querySelectorAll('.hidden-content');
    content.forEach(section => {
      section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });
  });
};

async function loadProducts() {
  const response = await fetch('/products');
  const products = await response.json();
  let filteredProducts = products;
  if (currentCity) {
    filteredProducts = filteredProducts.filter(p => p.location_city === currentCity);
  }
  if (currentCategory) {
    filteredProducts = filteredProducts.filter(p => p.category === currentCategory);
  }
  const list = document.getElementById('product-list');
  list.innerHTML = '';
  const debugOutput = document.getElementById('debug-output');
  debugOutput.innerHTML = `<p>Selected City: ${currentCity || 'None'}</p><p>Selected Category: ${currentCategory || 'None'}</p><p>Filtered Products Count: ${filteredProducts.length}</p>`;
  if (filteredProducts.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No products available for this city/category.';
    list.appendChild(li);
  } else {
    filteredProducts.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} - $${p.price} by ${p.seller} (Hub: ${p.location_name}, ${p.location_city})`;
      if (currentUser && currentUser.role === 'buyer') {
        const select = document.createElement('select');
        select.id = `pickup-${p.id}`;
        locations.forEach(loc => {
          if (loc.city === currentCity) {
            const option = document.createElement('option');
            option.value = loc.id;
            option.textContent = `${loc.name} (${loc.city})`;
            select.appendChild(option);
          }
        });
        li.appendChild(select);
        const btn = document.createElement('button');
        btn.textContent = 'Add to Cart';
        btn.onclick = () => addToCart(p.id, select.value);
        li.appendChild(btn);
      }
      list.appendChild(li);
    });
  }
}

function filterProducts(category) {
  currentCategory = category;
  loadProducts();
  document.getElementById('debug-output').innerHTML += `<p>Filtered by Category: ${currentCategory}</p>`;
}

async function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const response = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role })
  });
  const data = await response.json();
  alert(data.error || 'Registered! ID: ' + data.id);
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (data.error) return alert(data.error);
  currentUser = data;
  document.getElementById('auth').style.display = 'none';
  if (data.role === 'seller') {
    document.getElementById('seller-panel').style.display = 'block';
  }
  if (data.role === 'buyer') {
    document.getElementById('cart').style.display = 'block';
    loadCart();
  }
  loadProducts();
}

async function addProduct() {
  if (!currentUser || currentUser.role !== 'seller') return alert('Not a seller');
  const name = document.getElementById('product-name').value;
  const price = parseFloat(document.getElementById('product-price').value);
  const location_id = document.getElementById('product-location').value;
  const response = await fetch('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, seller_id: currentUser.id, location_id, category: prompt('Enter category (Grocery, Wearing Stuff, Electronic, Sports):') || 'Grocery' })
  });
  await response.json();
  loadProducts();
}

async function addToCart(productId, pickupLocationId) {
  if (!currentUser || currentUser.role !== 'buyer') return alert('Not a buyer');
  const response = await fetch('/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyer_id: currentUser.id, product_id: productId, quantity: 1, pickup_location_id: pickupLocationId })
  });
  await response.json();
  loadCart();
}

async function loadCart() {
  if (!currentUser) return;
  const response = await fetch(`/cart/${currentUser.id}`);
  const items = await response.json();
  const list = document.getElementById('cart-list');
  list.innerHTML = '';
  let total = 0;
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name} - $${item.price} x ${item.quantity} (Pickup: ${item.pickup_location}, ${item.pickup_city})`;
    total += item.price * item.quantity;
    list.appendChild(li);
  });
}

function checkout() {
  alert('Checkout complete! (This is mock - no real payment.)');
}