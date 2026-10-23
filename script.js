// NEXORA — navegação SPA, integração com API e cadastro de produtos
"use strict";

const API_URL = "https://fakestoreapi.com/products?limit=12";
const STORAGE_KEY = "nexora_custom_products_v1";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80";

const categoryNames = {
  "electronics": "Eletrônicos",
  "jewelery": "Acessórios",
  "men's clothing": "Moda masculina",
  "women's clothing": "Moda feminina",
  "eletronicos": "Eletrônicos",
  "acessorios": "Acessórios",
  "informatica": "Informática",
  "casa": "Casa & lifestyle",
  "outros": "Outros"
};

const state = {
  apiProducts: [],
  customProducts: loadCustomProducts(),
  activeCategory: "todos",
  search: "",
  sort: "default",
  apiError: false
};

const fallbackImage = "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80";
const featuredGrid = document.querySelector("#featuredGrid");
const catalogGrid = document.querySelector("#catalogGrid");
const productCount = document.querySelector("#productCount");
const categoryFilters = document.querySelector("#categoryFilters");
const catalogMessage = document.querySelector("#catalogMessage");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const productForm = document.querySelector("#productForm");
const formFeedback = document.querySelector("#formFeedback");
const toast = document.querySelector("#toast");
let toastTimer;

document.querySelectorAll(".current-year").forEach(el => {
  el.textContent = new Date().getFullYear();
});

function loadCustomProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Não foi possível ler os produtos salvos:", error);
    return [];
  }
}

function saveCustomProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customProducts));
    return true;
  } catch (error) {
    console.warn("Não foi possível salvar no armazenamento local:", error);
    return false;
  }
}

function allProducts() {
  return [...state.customProducts, ...state.apiProducts];
}

function formatPrice(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function categoryLabel(category) {
  return categoryNames[String(category || "").toLowerCase()] || "Outros";
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : fallbackImage;
  } catch {
    return fallbackImage;
  }
}

function productCard(product) {
  const name = safeText(product.title);
  const description = safeText(product.description || "Um produto selecionado pela NEXORA.");
  const image = safeImageUrl(product.image || fallbackImage);
  const category = safeText(categoryLabel(product.category));
  const price = formatPrice(product.price);
  const source = product.isCustom ? "Cadastro próprio" : "API externa";
  return `
    <article class="product-card">
      <div class="product-image-wrap">
        <span class="product-tag">${product.isCustom ? "Novo item" : "Seleção NEXORA"}</span>
        <a class="card-link" href="#produto/${safeText(product.id)}" data-route="produto/${safeText(product.id)}" aria-label="Ver ${name}"></a>
        <img class="product-image" src="${image}" alt="${name}" loading="lazy"
             onerror="this.onerror=null;this.src='${fallbackImage}'">
      </div>
      <div class="product-card-body">
        <p class="product-category">${category}</p>
        <h3 class="product-title"><a href="#produto/${safeText(product.id)}" data-route="produto/${safeText(product.id)}">${name}</a></h3>
        <p class="product-description">${description.length > 92 ? description.slice(0, 89) + "..." : description}</p>
        <div class="product-card-bottom">
          <div><div class="product-price">${price}</div><div class="product-origin">${source}</div></div>
          <a class="product-add" href="#produto/${safeText(product.id)}" data-route="produto/${safeText(product.id)}" aria-label="Ver produto ${name}" title="Ver produto">↗</a>
        </div>
      </div>
    </article>`;
}

function renderFeatured() {
  const products = allProducts().slice(0, 4);
  featuredGrid.innerHTML = products.length
    ? products.map(productCard).join("")
    : '<div class="loading-card">Nenhum produto disponível no momento.</div>';
}

function renderCategories() {
  const categories = [...new Set(allProducts().map(product => String(product.category || "outros").toLowerCase()))];
  const buttons = [{ value: "todos", label: "Todos" }, ...categories.map(value => ({
    value, label: categoryLabel(value)
  }))];
  categoryFilters.innerHTML = buttons.map(item => `
    <button class="category-chip ${state.activeCategory === item.value ? "selected" : ""}"
      type="button" data-category="${safeText(item.value)}">${safeText(item.label)}</button>
  `).join("");
}

function renderCatalog() {
  let products = allProducts().filter(product => {
    const matchesCategory = state.activeCategory === "todos" ||
      String(product.category || "outros").toLowerCase() === state.activeCategory;
    const query = state.search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !query ||
      `${product.title} ${product.description || ""} ${categoryLabel(product.category)}`
        .toLocaleLowerCase("pt-BR").includes(query);
    return matchesCategory && matchesSearch;
  });

  if (state.sort === "price-asc") products.sort((a, b) => Number(a.price) - Number(b.price));
  if (state.sort === "price-desc") products.sort((a, b) => Number(b.price) - Number(a.price));
  if (state.sort === "title") products.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  productCount.textContent = products.length;
  catalogGrid.innerHTML = products.length
    ? products.map(productCard).join("")
    : '<div class="empty-state">Nenhum produto corresponde à sua busca. Tente outro termo ou categoria.</div>';

  if (state.apiError) {
    catalogMessage.hidden = false;
    catalogMessage.textContent = "Não foi possível conectar à API externa agora. Você ainda pode visualizar e cadastrar produtos neste navegador. Use a opção de recarregar a página para tentar novamente.";
  } else {
    catalogMessage.hidden = true;
  }
}

async function fetchProducts() {
  featuredGrid.innerHTML = '<div class="loading-card">Carregando produtos da API...</div>';
  catalogGrid.innerHTML = '<div class="loading-card">Consultando a API externa...</div>';
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`A API respondeu com status ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Formato inesperado recebido da API.");

    state.apiProducts = data.map(product => ({
      id: `api-${product.id}`,
      title: product.title,
      price: Number(product.price) * 5.2,
      category: product.category,
      description: product.description,
      image: product.image,
      isCustom: false
    }));
    state.apiError = false;
  } catch (error) {
    console.error("Erro ao consultar API:", error);
    state.apiError = true;
    state.apiProducts = [];
  }
  state.ready = true;
  renderFeatured();
  renderCategories();
  renderCatalog();
  refreshDynamic();
}

document.addEventListener("click", event => {
  const routeLink = event.target.closest("[data-route]");
  if (routeLink) {
    event.preventDefault();
    navigateTo(routeLink.dataset.route);
    return;
  }

  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    state.activeCategory = categoryButton.dataset.category;
    renderCategories();
    renderCatalog();
    return;
  }
});

document.querySelector("#mobileMenu").addEventListener("click", event => {
  const nav = document.querySelector(".main-nav");
  const isOpen = nav.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
  event.currentTarget.textContent = isOpen ? "×" : "☰";
});

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  renderCatalog();
});

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  renderCatalog();
});

function setFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);
  field.classList.toggle("invalid", Boolean(message));
  field.setAttribute("aria-invalid", String(Boolean(message)));
  error.textContent = message;
}

function validateForm(values) {
  let valid = true;
  const name = values.name.trim();
  const price = Number(values.price);
  const category = values.category;
  const image = values.image.trim();

  const nameError = name.length < 2 ? "Informe um nome com pelo menos 2 caracteres." : "";
  const priceError = !values.price || !Number.isFinite(price) || price <= 0 ? "Informe um preço maior que zero." : "";
  const categoryError = !category ? "Selecione uma categoria." : "";
  let imageError = "";
  if (image) {
    try {
      const url = new URL(image);
      if (!["http:", "https:"].includes(url.protocol)) imageError = "Use uma URL que comece com http:// ou https://.";
    } catch {
      imageError = "Informe uma URL válida ou deixe o campo vazio.";
    }
  }

  setFieldError("productName", "nameError", nameError);
  setFieldError("productPrice", "priceError", priceError);
  setFieldError("productCategory", "categoryError", categoryError);
  setFieldError("productImage", "imageError", imageError);
  valid = !nameError && !priceError && !categoryError && !imageError;
  return valid;
}

productForm.addEventListener("submit", event => {
  event.preventDefault();
  const user = currentUser();
  if (!user) { showToast("Entre na sua conta para cadastrar produtos."); navigateTo("cadastro"); return; }
  formFeedback.textContent = "";
  formFeedback.className = "form-feedback";

  const values = {
    name: document.querySelector("#productName").value,
    price: document.querySelector("#productPrice").value,
    category: document.querySelector("#productCategory").value,
    image: document.querySelector("#productImage").value,
    description: document.querySelector("#productDescription").value
  };

  if (!validateForm(values)) {
    formFeedback.textContent = "Revise os campos destacados antes de continuar.";
    formFeedback.classList.add("error");
    return;
  }

  const newProduct = {
    id: `custom-${Date.now()}`,
    title: values.name.trim(),
    price: Number(values.price),
    category: values.category,
    description: values.description.trim() || "Produto cadastrado na loja NEXORA.",
    image: values.image.trim() || fallbackImage,
    isCustom: true,
    owner: user.id
  };

  state.customProducts.unshift(newProduct);
  const saved = saveCustomProducts();
  renderCategories();
  renderCatalog();
  renderFeatured();
  productForm.reset();

  formFeedback.textContent = saved
    ? "Produto cadastrado e salvo neste navegador. Ele já está disponível na listagem."
    : "Produto adicionado à listagem desta sessão, mas o navegador não permitiu salvá-lo permanentemente.";
  formFeedback.classList.add("success");
  showToast("Produto adicionado ao catálogo.");
});

productForm.addEventListener("reset", () => {
  setTimeout(() => {
    ["productName", "productPrice", "productCategory", "productImage"].forEach(id => {
      const field = document.getElementById(id);
      field.classList.remove("invalid");
      field.removeAttribute("aria-invalid");
    });
    ["nameError", "priceError", "categoryError", "imageError"].forEach(id => {
      document.getElementById(id).textContent = "";
    });
    formFeedback.textContent = "";
    formFeedback.className = "form-feedback";
  }, 0);
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

/* ===== Banco local (localStorage): usuários, sessão, carrinho e pedidos ===== */
const KEYS = { users: "nexora_users_v1", session: "nexora_session_v1", cart: "nexora_cart_v1", orders: "nexora_orders_v1" };
const db = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
};
const $ = selector => document.querySelector(selector);
const digits = value => String(value).replace(/\D/g, "");
const ROUTES = ["inicio", "produtos", "cadastro", "login", "produto", "carrinho", "checkout", "pedido"];
let current = { base: "inicio", param: "" };
let loginNext = "";
let cart = db.get(KEYS.cart, []);

/* ---------- Autenticação ---------- */
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + password);
  if (window.crypto && crypto.subtle) {
    const buffer = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381; // alternativa simples quando o navegador não oferece SubtleCrypto
  for (const b of data) h = ((h << 5) + h + b) >>> 0;
  return "f" + h.toString(16);
}
function currentUser() {
  const id = db.get(KEYS.session, null);
  return db.get(KEYS.users, []).find(user => user.id === id) || null;
}
async function registerUser({ name, email, password }) {
  const users = db.get(KEYS.users, []);
  email = email.trim().toLowerCase();
  if (users.some(user => user.email === email)) throw new Error("Já existe uma conta com este e-mail.");
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const user = { id: `u-${Date.now()}`, name: name.trim(), email, salt, hash: await hashPassword(password, salt) };
  db.set(KEYS.users, [...users, user]);
  db.set(KEYS.session, user.id);
  return user;
}
async function loginUser(email, password) {
  const user = db.get(KEYS.users, []).find(item => item.email === email.trim().toLowerCase());
  if (!user || user.hash !== await hashPassword(password, user.salt)) throw new Error("E-mail ou senha incorretos.");
  db.set(KEYS.session, user.id);
  return user;
}
function afterAuth(user, form) {
  form.reset();
  showToast(`Olá, ${user.name.split(" ")[0]}! Você está conectado.`);
  const next = loginNext || "produtos";
  loginNext = "";
  navigateTo(next);
}
$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.target, data = new FormData(form), msg = $("#loginMsg");
  msg.textContent = "";
  try { afterAuth(await loginUser(data.get("email"), data.get("password")), form); }
  catch (error) { msg.textContent = error.message; }
});
$("#registerForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.target, data = Object.fromEntries(new FormData(form)), msg = $("#registerMsg");
  msg.textContent = "";
  if (data.name.trim().length < 2) { msg.textContent = "Informe seu nome."; return; }
  if (!/^\S+@\S+\.\S+$/.test(data.email)) { msg.textContent = "Informe um e-mail válido."; return; }
  if (data.password.length < 6) { msg.textContent = "A senha precisa ter pelo menos 6 caracteres."; return; }
  if (data.password !== data.password2) { msg.textContent = "As senhas não conferem."; return; }
  try { afterAuth(await registerUser(data), form); }
  catch (error) { msg.textContent = error.message; }
});

/* ---------- Carrinho ---------- */
function saveCart() { db.set(KEYS.cart, cart); updateHeader(); }
function addToCart(product, qty = 1) {
  const item = cart.find(i => i.id === String(product.id));
  if (item) item.qty = Math.min(item.qty + qty, 99);
  else cart.push({ id: String(product.id), title: product.title, price: Number(product.price), image: product.image || fallbackImage, qty });
  saveCart();
}
function totals() {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = !cart.length || subtotal >= 200 ? 0 : 19.9;
  return { subtotal, shipping, total: subtotal + shipping };
}
function summaryHtml() {
  const t = totals();
  return `<div class="sum-line"><span>Subtotal</span><span>${formatPrice(t.subtotal)}</span></div>
    <div class="sum-line"><span>Frete</span><span>${t.shipping ? formatPrice(t.shipping) : "Grátis"}</span></div>
    <div class="sum-line total"><span>Total</span><span>${formatPrice(t.total)}</span></div>`;
}
function updateHeader() {
  const user = currentUser();
  $("#cartCount").textContent = cart.reduce((sum, i) => sum + i.qty, 0);
  $("#authArea").innerHTML = user
    ? `<span class="tool-btn who">Olá, ${safeText(user.name.split(" ")[0])}</span><button class="tool-btn" type="button" data-act="logout">Sair</button>`
    : '<a class="tool-btn" href="#login" data-route="login">Entrar</a>';
  $("#navCadastro").hidden = !user;
}

/* ---------- Telas ---------- */
function renderProduct(id) {
  const el = $("#productDetail");
  const p = allProducts().find(item => String(item.id) === id);
  if (!p) { el.innerHTML = `<div class="empty-state">${state.ready ? "Produto não encontrado." : "Carregando produto..."}</div>`; return; }
  const user = currentUser(), name = safeText(p.title), pid = safeText(p.id), cat = safeText(categoryLabel(p.category));
  const canDelete = p.isCustom && user && (!p.owner || p.owner === user.id);
  el.innerHTML = `
    <nav class="crumbs"><a href="#produtos" data-route="produtos">Produtos</a> / ${cat}</nav>
    <div class="pd">
      <div class="pd-img"><img src="${safeImageUrl(p.image || fallbackImage)}" alt="${name}" onerror="this.onerror=null;this.src='${fallbackImage}'"></div>
      <div class="pd-info">
        <p class="eyebrow">${cat}</p>
        <h1>${name}</h1>
        <div class="pd-price">${formatPrice(p.price)}</div>
        <p class="pd-inst">ou 10x de ${formatPrice(p.price / 10)} sem juros</p>
        <p class="pd-desc">${safeText(p.description || "Um produto selecionado pela NEXORA.")}</p>
        <div class="pd-actions">
          <button class="button button-light" type="button" data-act="add" data-id="${pid}">Adicionar ao carrinho</button>
          <button class="button button-dark" type="button" data-act="buy" data-id="${pid}">Comprar agora <span>↗</span></button>
        </div>
        <ul class="pd-perks"><li>Frete grátis em compras acima de R$ 200,00</li><li>Pagamento por cartão, Pix ou boleto</li><li>Compra protegida na NEXORA</li></ul>
        ${canDelete ? `<button class="danger-link" type="button" data-act="delproduct" data-id="${pid}">Excluir este produto</button>` : ""}
      </div>
    </div>`;
}
function renderCart() {
  const el = $("#cartPage");
  if (!cart.length) { el.innerHTML = '<div class="empty-state">Seu carrinho está vazio. <a class="text-link" href="#produtos" data-route="produtos">Ver produtos →</a></div>'; return; }
  el.innerHTML = `<div class="cart-layout"><div class="cart-items">${cart.map(i => {
    const id = safeText(i.id);
    return `<div class="cart-item">
      <img src="${safeImageUrl(i.image)}" alt="" onerror="this.onerror=null;this.src='${fallbackImage}'">
      <div class="ci-info"><a href="#produto/${id}" data-route="produto/${id}">${safeText(i.title)}</a><span>${formatPrice(i.price)}</span></div>
      <div class="qty"><button type="button" data-act="dec" data-id="${id}" aria-label="Diminuir">−</button><span>${i.qty}</span><button type="button" data-act="inc" data-id="${id}" aria-label="Aumentar">+</button></div>
      <strong>${formatPrice(i.price * i.qty)}</strong>
      <button class="rm" type="button" data-act="rm" data-id="${id}" aria-label="Remover">×</button></div>`;
  }).join("")}</div>
  <aside class="summary"><h3>Resumo do pedido</h3>${summaryHtml()}
    <a class="button button-dark" href="#checkout" data-route="checkout">Finalizar compra <span>↗</span></a>
    <a class="text-link" href="#produtos" data-route="produtos">Continuar comprando</a></aside></div>`;
}
function renderCheckout() {
  if (!cart.length) return;
  const u = currentUser();
  const f = (id, label, attrs = "", val = "") => `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${id}" ${attrs} value="${safeText(val)}"><small class="field-error" id="${id}Err"></small></div>`;
  $("#checkoutPage").innerHTML = `<form id="checkoutForm" class="checkout-layout" novalidate>
    <div class="checkout-main">
      <div class="form-card"><h2 class="co-h">1. Seus dados</h2>${f("coName", "Nome completo", "autocomplete=name", u?.name)}
        <div class="field-row">${f("coEmail", "E-mail", "type=email autocomplete=email", u?.email)}${f("coCpf", "CPF", 'inputmode=numeric placeholder="000.000.000-00" maxlength=14')}</div></div>
      <div class="form-card"><h2 class="co-h">2. Entrega</h2>
        <div class="field-row">${f("coCep", "CEP", 'inputmode=numeric placeholder="00000-000" maxlength=9')}${f("coCity", "Cidade")}</div>
        ${f("coStreet", "Endereço")}
        <div class="field-row">${f("coNumber", "Número")}${f("coState", "UF", 'maxlength=2 placeholder="SP"')}</div></div>
      <div class="form-card"><h2 class="co-h">3. Pagamento</h2>
        <div class="pay-options">${[["card", "Cartão"], ["pix", "Pix"], ["boleto", "Boleto"]].map(([v, l], i) => `<label class="pay-opt"><input type="radio" name="pay" value="${v}" ${i ? "" : "checked"}><span>${l}</span></label>`).join("")}</div>
        <div id="cardFields">${f("ccNumber", "Número do cartão", 'inputmode=numeric placeholder="0000 0000 0000 0000" maxlength=19 autocomplete=off')}${f("ccName", "Nome impresso no cartão")}
          <div class="field-row">${f("ccExp", "Validade", 'placeholder="MM/AA" maxlength=5 autocomplete=off')}${f("ccCvv", "CVV", "inputmode=numeric maxlength=4 autocomplete=off")}</div>
          <div class="field"><label for="ccInst">Parcelas</label><select id="ccInst" name="ccInst">${[1, 2, 3, 6, 10].map(n => `<option value="${n}">${n}x de ${formatPrice(totals().total / n)} sem juros</option>`).join("")}</select></div></div>
        <p id="payHint" class="field-hint" hidden></p></div>
    </div>
    <aside class="summary"><h3>Resumo</h3>
      ${cart.map(i => `<div class="sum-line"><span>${i.qty}× ${safeText(i.title.slice(0, 30))}</span><span>${formatPrice(i.price * i.qty)}</span></div>`).join("")}<hr>${summaryHtml()}
      <button class="button button-dark" type="submit">Pagar agora <span>↗</span></button>
      <p class="field-hint">Ambiente de demonstração: nenhum pagamento real é feito e os dados do cartão não são salvos.</p>
      <p id="coFeedback" class="form-feedback error"></p></aside></form>`;
}
function renderOrder(id) {
  const el = $("#orderPage");
  const o = db.get(KEYS.orders, []).find(order => order.id === id);
  if (!o) { el.innerHTML = '<div class="empty-state">Pedido não encontrado neste navegador.</div>'; return; }
  const m = o.payment.method;
  const pay = m === "card" ? `Cartão final ${safeText(o.payment.last4)} em ${o.payment.installments}x sem juros — <strong>aprovado</strong>`
    : m === "pix" ? `Pix — <strong>aguardando pagamento</strong> (simulado)<div class="fake-qr" aria-hidden="true"></div><code>00020126580014BR.GOV.BCB.PIX0136nexora-demo-${safeText(o.id)}5204000053039865802BR6006NEXORA</code>`
    : `Boleto — <strong>aguardando pagamento</strong> (simulado)<code>00190.00009 01234.567890 12345.678901 1 00000000000000</code>`;
  el.innerHTML = `<div class="order-box"><div class="order-check">✓</div>
    <p class="eyebrow">PEDIDO CONFIRMADO</p><h1>Obrigado, ${safeText(o.customer.name.split(" ")[0])}!</h1>
    <p>Seu pedido <strong>${safeText(o.id)}</strong> foi registrado em ${new Date(o.date).toLocaleString("pt-BR")}. Uma confirmação seria enviada para ${safeText(o.customer.email)} (simulação).</p>
    <div class="order-grid"><div><h3>Itens</h3>${o.items.map(i => `<div class="sum-line"><span>${i.qty}× ${safeText(i.title.slice(0, 34))}</span><span>${formatPrice(i.price * i.qty)}</span></div>`).join("")}
      <div class="sum-line"><span>Frete</span><span>${o.shipping ? formatPrice(o.shipping) : "Grátis"}</span></div><div class="sum-line total"><span>Total</span><span>${formatPrice(o.total)}</span></div></div>
      <div><h3>Entrega</h3><p>${safeText(o.address)}</p><h3>Pagamento</h3><p>${pay}</p></div></div>
    <a class="button button-dark" href="#produtos" data-route="produtos">Continuar comprando <span>↗</span></a></div>`;
}

/* ---------- Checkout: máscaras, validação e pagamento simulado ---------- */
function validExp(v) {
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(v);
  if (!m) return false;
  const now = new Date();
  return +m[2] > now.getFullYear() % 100 || (+m[2] === now.getFullYear() % 100 && +m[1] >= now.getMonth() + 1);
}
function validateCheckout(v) {
  const rules = [
    ["coName", v.coName.trim().split(/\s+/).length < 2, "Informe nome e sobrenome."],
    ["coEmail", !/^\S+@\S+\.\S+$/.test(v.coEmail), "E-mail inválido."],
    ["coCpf", digits(v.coCpf).length !== 11, "O CPF deve ter 11 dígitos."],
    ["coCep", digits(v.coCep).length !== 8, "O CEP deve ter 8 dígitos."],
    ["coCity", v.coCity.trim().length < 2, "Informe a cidade."],
    ["coStreet", v.coStreet.trim().length < 3, "Informe o endereço."],
    ["coNumber", !v.coNumber.trim(), "Informe o número."],
    ["coState", !/^[A-Za-z]{2}$/.test(v.coState.trim()), "UF inválida."]
  ];
  if (v.pay === "card") rules.push(
    ["ccNumber", digits(v.ccNumber).length < 13, "Número de cartão inválido."],
    ["ccName", v.ccName.trim().length < 3, "Informe o nome do cartão."],
    ["ccExp", !validExp(v.ccExp), "Validade inválida."],
    ["ccCvv", digits(v.ccCvv).length < 3, "CVV inválido."]);
  const form = $("#checkoutForm");
  form.querySelectorAll(".invalid").forEach(x => x.classList.remove("invalid"));
  form.querySelectorAll(".field-error").forEach(x => { x.textContent = ""; });
  let ok = true;
  rules.forEach(([id, bad, msg]) => { if (bad) { ok = false; $(`#${id}Err`).textContent = msg; $(`#${id}`).classList.add("invalid"); } });
  return ok;
}
$("#checkoutPage").addEventListener("input", event => {
  const input = event.target, d = digits(input.value);
  const masks = {
    coCpf: () => d.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
    coCep: () => d.slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"),
    ccNumber: () => d.slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "),
    ccExp: () => d.slice(0, 4).replace(/(\d{2})(\d)/, "$1/$2"),
    ccCvv: () => d.slice(0, 4)
  };
  if (masks[input.id]) input.value = masks[input.id]();
});
$("#checkoutPage").addEventListener("change", event => {
  if (event.target.name !== "pay") return;
  const pay = event.target.value, hint = $("#payHint");
  $("#cardFields").hidden = pay !== "card";
  hint.hidden = pay === "card";
  hint.textContent = pay === "pix" ? "Após confirmar, você verá um QR Code e um código Pix de demonstração." : "Após confirmar, você verá um boleto de demonstração.";
});
$("#checkoutPage").addEventListener("submit", async event => {
  event.preventDefault();
  const v = Object.fromEntries(new FormData(event.target)), feedback = $("#coFeedback");
  if (!validateCheckout(v)) { feedback.textContent = "Revise os campos destacados."; return; }
  feedback.textContent = "";
  $("#payOverlay").hidden = false;
  await new Promise(resolve => setTimeout(resolve, 1800));
  const card = v.pay === "card";
  const order = {
    id: "NX-" + Math.floor(100000 + Math.random() * 900000), date: new Date().toISOString(),
    userId: currentUser()?.id || null, items: cart.map(i => ({ ...i })), ...totals(),
    customer: { name: v.coName.trim(), email: v.coEmail.trim() },
    address: `${v.coStreet.trim()}, ${v.coNumber.trim()} — ${v.coCity.trim()}/${v.coState.trim().toUpperCase()} — CEP ${v.coCep}`,
    payment: { method: v.pay, last4: card ? digits(v.ccNumber).slice(-4) : null, installments: card ? Number(v.ccInst) : 1 }
  };
  db.set(KEYS.orders, [order, ...db.get(KEYS.orders, [])]);
  cart = [];
  saveCart();
  $("#payOverlay").hidden = true;
  navigateTo(`pedido/${order.id}`);
});

/* ---------- Ações (carrinho, conta, produtos) ---------- */
document.addEventListener("click", event => {
  const btn = event.target.closest("[data-act]");
  if (!btn) return;
  const { act, id } = btn.dataset;
  if (act === "add" || act === "buy") {
    const product = allProducts().find(item => String(item.id) === id);
    if (!product) return;
    addToCart(product);
    if (act === "buy") navigateTo("checkout"); else showToast("Produto adicionado ao carrinho.");
  } else if (act === "inc" || act === "dec" || act === "rm") {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty = act === "inc" ? Math.min(item.qty + 1, 99) : act === "dec" ? item.qty - 1 : 0;
    cart = cart.filter(i => i.qty > 0);
    saveCart();
    renderCart();
  } else if (act === "logout") {
    db.set(KEYS.session, null);
    showToast("Você saiu da conta.");
    if (current.base === "cadastro") navigateTo("inicio"); else refreshDynamic();
  } else if (act === "tab") {
    const isLogin = btn.dataset.tab === "login";
    $("#loginForm").hidden = !isLogin;
    $("#registerForm").hidden = isLogin;
    document.querySelectorAll(".auth-tabs .category-chip").forEach(c => c.classList.toggle("selected", c === btn));
  } else if (act === "delproduct") {
    if (!confirm("Excluir este produto do catálogo?")) return;
    state.customProducts = state.customProducts.filter(item => String(item.id) !== id);
    saveCustomProducts();
    cart = cart.filter(i => i.id !== id);
    saveCart();
    renderFeatured(); renderCategories();
    navigateTo("produtos");
  }
});

/* ---------- Rotas (SPA) ---------- */
function navigateTo(route) {
  let [base, param = ""] = String(route).split("/");
  if (!ROUTES.includes(base)) base = "inicio";
  if (base === "cadastro" && !currentUser()) {
    loginNext = "cadastro";
    showToast("Entre na sua conta para cadastrar produtos.");
    base = "login"; param = "";
  }
  if (base === "checkout" && !cart.length) { showToast("Seu carrinho está vazio."); base = "produtos"; param = ""; }
  current = { base, param };
  document.querySelectorAll(".page").forEach(page => page.classList.toggle("active", page.dataset.page === base));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.route === base));
  $(".main-nav").classList.remove("open");
  $("#mobileMenu").setAttribute("aria-expanded", "false");
  $("#mobileMenu").textContent = "☰";
  const hash = param ? `${base}/${param}` : base;
  if (window.location.hash !== `#${hash}`) history.pushState({ route: hash }, "", `#${hash}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
  refreshDynamic();
}
function refreshDynamic() {
  const { base, param } = current;
  if (base === "produtos") renderCatalog();
  if (base === "produto") renderProduct(param);
  if (base === "carrinho") renderCart();
  if (base === "checkout") renderCheckout();
  if (base === "pedido") renderOrder(param);
  updateHeader();
}
window.addEventListener("popstate", () => navigateTo(window.location.hash.slice(1) || "inicio"));
["login", "produto", "carrinho", "checkout", "pedido"].forEach(name =>
  $(`#page-${name}`).append($("#page-inicio .site-footer").cloneNode(true)));

navigateTo(window.location.hash.slice(1) || "inicio");
fetchProducts();
