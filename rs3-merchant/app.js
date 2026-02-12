/* ==========================================
   RS3 Merchant Pro - Complete Edition
   All Grand Exchange Items
   ========================================== */

// ==========================================
// Configuration & State
// ==========================================
const CONFIG = {
    API_BASE: '/api',
    UPDATE_INTERVAL: 120000, // 2 minutes
    GE_TAX: 0.02, // 2% tax on sales over 10k
    ITEMS_PER_PAGE: 50,
};

const state = {
    items: [],
    displayedItems: [],
    catalog: { loaded: false, count: 0 },
    watchlist: JSON.parse(localStorage.getItem('rs3_watchlist') || '[]'),
    history: JSON.parse(localStorage.getItem('rs3_history') || '[]'),
    currentPage: 'dashboard',
    selectedItem: null,
    priceChart: null,
    searchOffset: 0,
    currentSearch: '',
    currentCategory: 'all',
    currentSort: 'name',
    totalResults: 0,
};

// ==========================================
// API Functions
// ==========================================
async function checkCatalogStatus() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/catalog/status`);
        const data = await response.json();
        state.catalog = data;
        return data;
    } catch (error) {
        console.error('Error checking catalog:', error);
        return { loaded: false, count: 0 };
    }
}

async function searchCatalog(query = '', options = {}) {
    try {
        const params = new URLSearchParams({
            q: query,
            category: options.category || 'all',
            sort: options.sort || 'name',
            limit: options.limit || CONFIG.ITEMS_PER_PAGE,
            offset: options.offset || 0,
            minPrice: options.minPrice || 0,
            maxPrice: options.maxPrice || 999999999999,
        });
        
        const response = await fetch(`${CONFIG.API_BASE}/catalog/search?${params}`);
        return await response.json();
    } catch (error) {
        console.error('Error searching catalog:', error);
        return { items: [], total: 0 };
    }
}

async function fetchItemDetails(itemIds) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/items?ids=${itemIds.join(',')}`);
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching item details:', error);
        return [];
    }
}

async function fetchItemDetail(itemId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/item?id=${itemId}`);
        const data = await response.json();
        return data.item;
    } catch (error) {
        console.error('Error fetching item:', error);
        return null;
    }
}

async function fetchGraphData(itemId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/graph?id=${itemId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching graph:', error);
        return null;
    }
}

async function fetchCategories() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/catalog/categories`);
        const data = await response.json();
        return data.categories || [];
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

// ==========================================
// Data Processing
// ==========================================
function parsePrice(priceStr) {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    
    const str = String(priceStr).toLowerCase().replace(/,/g, '');
    
    if (str.endsWith('b')) {
        return parseFloat(str) * 1000000000;
    } else if (str.endsWith('m')) {
        return parseFloat(str) * 1000000;
    } else if (str.endsWith('k')) {
        return parseFloat(str) * 1000;
    }
    
    return parseInt(str) || 0;
}

function formatPrice(price) {
    if (!price || price === 0) return '0';
    if (price >= 1000000000) {
        return (price / 1000000000).toFixed(2) + 'B';
    } else if (price >= 1000000) {
        return (price / 1000000).toFixed(2) + 'M';
    } else if (price >= 1000) {
        return (price / 1000).toFixed(1) + 'K';
    }
    return price.toLocaleString();
}

function formatPriceGP(price) {
    return formatPrice(price) + ' GP';
}

function calculateMargin(item) {
    const price = parsePrice(item.current?.price || item.price || 0);
    if (price === 0) return { buyPrice: 0, sellPrice: 0, margin: 0, profit: 0 };
    
    let spreadPercent;
    if (price > 10000000) {
        spreadPercent = 1 + Math.random() * 1.5;
    } else if (price > 100000) {
        spreadPercent = 1.5 + Math.random() * 2;
    } else {
        spreadPercent = 2 + Math.random() * 3;
    }
    
    const buyPrice = Math.floor(price * (1 - spreadPercent / 100));
    const sellPrice = Math.ceil(price * (1 + spreadPercent / 100));
    
    const taxedSell = sellPrice > 10000 ? sellPrice * (1 - CONFIG.GE_TAX) : sellPrice;
    const margin = ((taxedSell - buyPrice) / buyPrice) * 100;
    
    return {
        buyPrice,
        sellPrice,
        margin: Math.max(0, margin).toFixed(2),
        profit: Math.floor(taxedSell - buyPrice)
    };
}

function parseTrend(change) {
    if (!change) return { value: 0, trend: 'neutral' };
    const str = String(change).replace('%', '').replace('+', '');
    const value = parseFloat(str) || 0;
    return {
        value,
        trend: value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
    };
}

// ==========================================
// UI Rendering
// ==========================================
function setLoadingState(message) {
    const tbody = document.getElementById('itemsTableBody');
    tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="7">
                <div class="loading-spinner"></div>
                <span>${message}</span>
            </td>
        </tr>
    `;
}

function renderItemsTable(items, fullDetails = false) {
    const tbody = document.getElementById('itemsTableBody');
    
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="7">
                    <div class="empty-state" style="padding: 40px;">
                        <span class="empty-icon">🔍</span>
                        <h3>Nenhum item encontrado</h3>
                        <p>Tente uma busca diferente</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = items.map(item => {
        const price = parsePrice(item.current?.price || item.price || 0);
        const margins = calculateMargin(item);
        const trend30 = parseTrend(item.day30?.change);
        const isWatched = state.watchlist.some(w => w.id === item.id);
        const hasDetails = !!item.current;
        
        const iconUrl = item.icon || `https://secure.runescape.com/m=itemdb_rs/obj_sprite.gif?id=${item.id}`;
        
        return `
            <tr data-id="${item.id}" onclick="showItemDetail(${item.id})">
                <td>
                    <div class="item-cell">
                        <img src="${iconUrl}" alt="${item.name}" class="item-icon" 
                             loading="lazy" onerror="this.style.display='none'">
                        <div>
                            <div class="item-name">${item.name}</div>
                            <div class="item-id">ID: ${item.id}${item.category ? ` • ${item.category}` : ''}</div>
                        </div>
                    </div>
                </td>
                <td class="price-cell">${formatPrice(price)}</td>
                <td class="price-cell">${hasDetails ? formatPrice(margins.buyPrice) : '-'}</td>
                <td class="price-cell">${hasDetails ? formatPrice(margins.sellPrice) : '-'}</td>
                <td class="${parseFloat(margins.margin) > 0 ? 'margin-positive' : ''}">
                    ${hasDetails ? `${parseFloat(margins.margin) > 0 ? '+' : ''}${margins.margin}%<br><small>(${formatPrice(margins.profit)} GP)</small>` : '-'}
                </td>
                <td>
                    ${item.day30?.change ? `
                        <span class="trend-badge ${trend30.trend}">
                            ${trend30.trend === 'positive' ? '↑' : trend30.trend === 'negative' ? '↓' : '→'}
                            ${item.day30?.change || '0%'}
                        </span>
                    ` : '<span class="trend-badge neutral">-</span>'}
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn ${isWatched ? 'active' : ''}" 
                                onclick="event.stopPropagation(); toggleWatchlist(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${price})"
                                title="${isWatched ? 'Remover da Watchlist' : 'Adicionar à Watchlist'}">
                            ⭐
                        </button>
                        <button class="action-btn" 
                                onclick="event.stopPropagation(); quickCalc(${item.id})"
                                title="Calcular Flip">
                            🧮
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add pagination info
    updatePaginationInfo();
}

function updatePaginationInfo() {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;
    
    const start = state.searchOffset + 1;
    const end = Math.min(state.searchOffset + CONFIG.ITEMS_PER_PAGE, state.totalResults);
    
    paginationEl.innerHTML = `
        <div class="pagination-info">
            Mostrando ${start}-${end} de ${state.totalResults.toLocaleString()} itens
        </div>
        <div class="pagination-buttons">
            <button class="btn-secondary" onclick="loadPreviousPage()" ${state.searchOffset === 0 ? 'disabled' : ''}>
                ← Anterior
            </button>
            <button class="btn-secondary" onclick="loadNextPage()" ${end >= state.totalResults ? 'disabled' : ''}>
                Próximo →
            </button>
        </div>
    `;
}

function updateStats() {
    document.getElementById('totalItems').textContent = state.catalog.count.toLocaleString();
    document.getElementById('opportunities').textContent = state.displayedItems.filter(i => 
        parseFloat(calculateMargin(i).margin) >= 2
    ).length;
    
    let itemsUp = 0, itemsDown = 0, bestMargin = 0, bestItem = null;
    
    state.displayedItems.forEach(item => {
        const trend = parseTrend(item.day30?.change);
        if (trend.value > 0) itemsUp++;
        if (trend.value < 0) itemsDown++;
        
        const margin = parseFloat(calculateMargin(item).margin);
        if (margin > bestMargin) {
            bestMargin = margin;
            bestItem = item;
        }
    });
    
    document.getElementById('itemsUp').textContent = itemsUp;
    document.getElementById('itemsDown').textContent = itemsDown;
    document.getElementById('bestMargin').textContent = bestMargin.toFixed(1) + '%';
    
    const name = bestItem?.name || '-';
    document.getElementById('mostTraded').textContent = name.length > 15 ? name.substring(0, 15) + '...' : name;
}

// ==========================================
// Search & Navigation
// ==========================================
async function performSearch(resetOffset = true) {
    if (resetOffset) {
        state.searchOffset = 0;
    }
    
    const query = document.getElementById('searchInput').value;
    const category = document.getElementById('categoryFilter').value;
    const sort = document.getElementById('sortFilter').value;
    
    state.currentSearch = query;
    state.currentCategory = category;
    state.currentSort = sort;
    
    setLoadingState('Buscando itens...');
    
    // Search in catalog
    const result = await searchCatalog(query, {
        category,
        sort,
        limit: CONFIG.ITEMS_PER_PAGE,
        offset: state.searchOffset,
    });
    
    state.totalResults = result.total;
    
    // Fetch full details for displayed items
    if (result.items.length > 0) {
        setLoadingState(`Carregando detalhes de ${result.items.length} itens...`);
        
        const itemIds = result.items.map(i => i.id);
        const details = await fetchItemDetails(itemIds);
        
        // Merge catalog data with full details
        const itemsWithDetails = result.items.map(catalogItem => {
            const detail = details.find(d => d.id === catalogItem.id);
            return detail ? { ...catalogItem, ...detail } : catalogItem;
        });
        
        state.displayedItems = itemsWithDetails;
        renderItemsTable(itemsWithDetails, true);
    } else {
        state.displayedItems = [];
        renderItemsTable([]);
    }
    
    updateStats();
    
    // Update last refresh time
    const now = new Date();
    document.getElementById('lastUpdate').textContent = 
        `Atualizado ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

async function loadNextPage() {
    state.searchOffset += CONFIG.ITEMS_PER_PAGE;
    await performSearch(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadPreviousPage() {
    state.searchOffset = Math.max(0, state.searchOffset - CONFIG.ITEMS_PER_PAGE);
    await performSearch(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// Opportunities Page
// ==========================================
async function loadOpportunities() {
    const grid = document.getElementById('opportunitiesGrid');
    grid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Buscando oportunidades...</p></div>';
    
    const capital = parseInt(document.getElementById('capitalInput').value) || 999999999999;
    const minMargin = parseFloat(document.getElementById('minMarginFilter').value) || 2;
    
    // Search for items in price range
    const result = await searchCatalog('', {
        sort: 'price-desc',
        limit: 100,
        maxPrice: capital,
    });
    
    if (result.items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <span class="empty-icon">🔍</span>
                <h3>Nenhuma oportunidade encontrada</h3>
            </div>
        `;
        return;
    }
    
    // Fetch details
    const itemIds = result.items.map(i => i.id);
    const details = await fetchItemDetails(itemIds);
    
    const opportunities = details
        .map(item => {
            const price = parsePrice(item.current?.price || 0);
            const margins = calculateMargin(item);
            return { ...item, price, ...margins };
        })
        .filter(item => item.buyPrice <= capital && parseFloat(item.margin) >= minMargin && item.buyPrice > 0)
        .sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin))
        .slice(0, 12);
    
    if (opportunities.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <span class="empty-icon">🔍</span>
                <h3>Nenhuma oportunidade encontrada</h3>
                <p>Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = opportunities.map(item => `
        <div class="opportunity-card" onclick="showItemDetail(${item.id})">
            <div class="opportunity-header">
                <img src="${item.icon}" alt="${item.name}" class="opportunity-icon"
                     onerror="this.style.display='none'">
                <div>
                    <div class="opportunity-name">${item.name}</div>
                    <div class="opportunity-category">${item.type || 'Item'}</div>
                </div>
            </div>
            <div class="opportunity-stats">
                <div class="opp-stat">
                    <span class="opp-stat-label">Comprar por</span>
                    <span class="opp-stat-value">${formatPrice(item.buyPrice)}</span>
                </div>
                <div class="opp-stat">
                    <span class="opp-stat-label">Vender por</span>
                    <span class="opp-stat-value">${formatPrice(item.sellPrice)}</span>
                </div>
                <div class="opp-stat">
                    <span class="opp-stat-label">Lucro/unid</span>
                    <span class="opp-stat-value highlight">${formatPrice(item.profit)}</span>
                </div>
                <div class="opp-stat">
                    <span class="opp-stat-label">Tendência 30d</span>
                    <span class="opp-stat-value">${item.day30?.change || '0%'}</span>
                </div>
            </div>
            <div class="opportunity-margin">
                <span class="margin-label">Margem de Lucro</span>
                <span class="margin-value">${item.margin}%</span>
            </div>
        </div>
    `).join('');
}

// ==========================================
// Item Detail Modal
// ==========================================
async function showItemDetail(itemId) {
    const modal = document.getElementById('itemModal');
    modal.classList.add('active');
    
    // Show loading state
    document.getElementById('modalItemName').textContent = 'Carregando...';
    document.getElementById('modalItemCategory').textContent = '';
    
    const item = await fetchItemDetail(itemId);
    if (!item) {
        closeModal();
        return;
    }
    
    state.selectedItem = item;
    
    const price = parsePrice(item.current?.price || 0);
    const trend30 = parseTrend(item.day30?.change);
    const trend90 = parseTrend(item.day90?.change);
    
    document.getElementById('modalItemIcon').src = item.icon_large || item.icon;
    document.getElementById('modalItemName').textContent = item.name;
    document.getElementById('modalItemCategory').textContent = item.type || 'Item';
    document.getElementById('modalPrice').textContent = formatPriceGP(price);
    document.getElementById('modalToday').textContent = item.today?.price || '0';
    document.getElementById('modal30d').textContent = item.day30?.change || '0%';
    document.getElementById('modal30d').className = `value ${trend30.trend}`;
    document.getElementById('modal90d').textContent = item.day90?.change || '0%';
    document.getElementById('modal90d').className = `value ${trend90.trend}`;
    
    // Fetch and render price chart
    const graphData = await fetchGraphData(itemId);
    if (graphData) {
        renderPriceChart(graphData);
    }
}

function renderPriceChart(graphData) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    if (state.priceChart) {
        state.priceChart.destroy();
    }
    
    const dailyData = graphData.daily || {};
    const timestamps = Object.keys(dailyData).sort((a, b) => parseInt(a) - parseInt(b));
    
    if (timestamps.length === 0) return;
    
    const labels = timestamps.slice(-90).map(ts => {
        const date = new Date(parseInt(ts));
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    
    const data = timestamps.slice(-90).map(ts => dailyData[ts]);
    
    state.priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Preço (GP)',
                data,
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#d4af37',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#16161f',
                    titleColor: '#fff',
                    bodyColor: '#a0a0b0',
                    borderColor: '#d4af37',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => formatPriceGP(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#606070', maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#606070',
                        callback: (value) => formatPrice(value)
                    }
                }
            }
        }
    });
}

function closeModal() {
    document.getElementById('itemModal').classList.remove('active');
    state.selectedItem = null;
}

// ==========================================
// Watchlist Functions
// ==========================================
function toggleWatchlist(itemId, itemName, price) {
    const index = state.watchlist.findIndex(w => w.id === itemId);
    
    if (index >= 0) {
        state.watchlist.splice(index, 1);
    } else {
        state.watchlist.push({
            id: itemId,
            name: itemName,
            price: price,
            addedAt: Date.now()
        });
    }
    
    localStorage.setItem('rs3_watchlist', JSON.stringify(state.watchlist));
    renderItemsTable(state.displayedItems);
    renderWatchlist();
}

async function renderWatchlist() {
    const container = document.getElementById('watchlistContainer');
    
    if (state.watchlist.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <span class="empty-icon">📋</span>
                <h3>Watchlist vazia</h3>
                <p>Adicione itens clicando no ⭐ na tabela do Dashboard</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Atualizando preços...</p></div>';
    
    // Fetch current prices for watchlist items
    const itemIds = state.watchlist.map(w => w.id);
    const details = await fetchItemDetails(itemIds);
    
    const itemsWithDetails = state.watchlist.map(w => {
        const detail = details.find(d => d.id === w.id);
        return detail ? { ...w, ...detail } : w;
    });
    
    container.innerHTML = itemsWithDetails.map(item => {
        const trend = parseTrend(item.day30?.change);
        const price = item.current?.price || item.price || '?';
        return `
            <div class="watchlist-item" onclick="showItemDetail(${item.id})">
                <img src="${item.icon || `https://secure.runescape.com/m=itemdb_rs/obj_sprite.gif?id=${item.id}`}" 
                     alt="${item.name}" class="item-icon" onerror="this.style.display='none'">
                <div class="watchlist-info">
                    <div class="watchlist-name">${item.name}</div>
                    <div class="watchlist-price">${price} GP</div>
                </div>
                <div class="watchlist-trend">
                    <span class="trend-badge ${trend.trend}">
                        ${item.day30?.change || '0%'}
                    </span>
                </div>
                <button class="watchlist-remove" onclick="event.stopPropagation(); toggleWatchlist(${item.id}, '${item.name.replace(/'/g, "\\'")}', 0)">
                    ✕
                </button>
            </div>
        `;
    }).join('');
}

// ==========================================
// Calculator Functions
// ==========================================
async function quickCalc(itemId) {
    navigateTo('calculator');
    
    const item = await fetchItemDetail(itemId);
    if (!item) return;
    
    const margins = calculateMargin(item);
    document.getElementById('calcItem').value = item.name;
    document.getElementById('calcBuyPrice').value = margins.buyPrice;
    document.getElementById('calcSellPrice').value = margins.sellPrice;
    document.getElementById('calcQuantity').value = 1;
    
    calculateProfit();
}

function calculateProfit() {
    const buyPrice = parseInt(document.getElementById('calcBuyPrice').value) || 0;
    const sellPrice = parseInt(document.getElementById('calcSellPrice').value) || 0;
    const quantity = parseInt(document.getElementById('calcQuantity').value) || 1;
    
    const investment = buyPrice * quantity;
    const grossReturn = sellPrice * quantity;
    const tax = grossReturn > 10000 ? Math.floor(grossReturn * CONFIG.GE_TAX) : 0;
    const netReturn = grossReturn - tax;
    const profit = netReturn - investment;
    const margin = investment > 0 ? ((profit / investment) * 100).toFixed(2) : 0;
    
    document.getElementById('resultInvestment').textContent = formatPriceGP(investment);
    document.getElementById('resultReturn').textContent = formatPriceGP(netReturn);
    document.getElementById('resultProfit').textContent = (profit >= 0 ? '+' : '') + formatPriceGP(profit);
    document.getElementById('resultProfit').style.color = profit >= 0 ? '#00c853' : '#ff5252';
    document.getElementById('resultMargin').textContent = margin + '%';
    document.getElementById('resultTax').textContent = formatPriceGP(tax);
}

// ==========================================
// History Functions
// ==========================================
function showAddFlipModal() {
    document.getElementById('addFlipModal').classList.add('active');
}

function closeFlipModal() {
    document.getElementById('addFlipModal').classList.remove('active');
    document.getElementById('flipForm').reset();
}

function addFlip(event) {
    event.preventDefault();
    
    const item = document.getElementById('flipItem').value;
    const buyPrice = parseInt(document.getElementById('flipBuy').value);
    const sellPrice = parseInt(document.getElementById('flipSell').value);
    const quantity = parseInt(document.getElementById('flipQty').value);
    
    const investment = buyPrice * quantity;
    const grossReturn = sellPrice * quantity;
    const tax = grossReturn > 10000 ? Math.floor(grossReturn * CONFIG.GE_TAX) : 0;
    const netReturn = grossReturn - tax;
    const profit = netReturn - investment;
    const margin = ((profit / investment) * 100).toFixed(2);
    
    state.history.unshift({
        item,
        buyPrice,
        sellPrice,
        quantity,
        profit,
        margin,
        date: new Date().toISOString()
    });
    
    localStorage.setItem('rs3_history', JSON.stringify(state.history));
    
    closeFlipModal();
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    const totalProfitEl = document.getElementById('totalProfit');
    const totalFlipsEl = document.getElementById('totalFlips');
    
    if (state.history.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📊</span>
                <h3>Nenhum flip registrado</h3>
                <p>Clique em "Registrar Flip" para começar</p>
            </div>
        `;
        totalProfitEl.textContent = '0 GP';
        totalFlipsEl.textContent = '0';
        return;
    }
    
    const totalProfit = state.history.reduce((sum, flip) => sum + flip.profit, 0);
    totalProfitEl.textContent = formatPriceGP(totalProfit);
    totalFlipsEl.textContent = state.history.length;
    
    list.innerHTML = state.history.map(flip => `
        <div class="history-item">
            <div class="history-item-info">
                <div class="history-item-name">${flip.item}</div>
                <div class="history-item-details">
                    ${flip.quantity}x • Compra: ${formatPrice(flip.buyPrice)} • Venda: ${formatPrice(flip.sellPrice)}
                    • ${new Date(flip.date).toLocaleDateString('pt-BR')}
                </div>
            </div>
            <div class="history-item-profit">
                <div class="profit-value">+${formatPriceGP(flip.profit)}</div>
                <div class="profit-margin">${flip.margin}% margem</div>
            </div>
        </div>
    `).join('');
}

// ==========================================
// Navigation
// ==========================================
function navigateTo(page) {
    state.currentPage = page;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });
    
    if (page === 'opportunities') {
        loadOpportunities();
    } else if (page === 'watchlist') {
        renderWatchlist();
    } else if (page === 'history') {
        renderHistory();
    }
}

// ==========================================
// Event Listeners
// ==========================================
function initEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });
    
    // Search with debounce
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performSearch(), 500);
    });
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            performSearch();
        }
    });
    
    // Filters
    document.getElementById('categoryFilter').addEventListener('change', () => performSearch());
    document.getElementById('sortFilter').addEventListener('change', () => performSearch());
    
    // Opportunities
    document.getElementById('findOpportunities').addEventListener('click', loadOpportunities);
    
    // Calculator
    document.getElementById('calculateBtn').addEventListener('click', calculateProfit);
    ['calcBuyPrice', 'calcSellPrice', 'calcQuantity'].forEach(id => {
        document.getElementById(id).addEventListener('input', calculateProfit);
    });
    
    // History
    document.getElementById('addFlipBtn').addEventListener('click', showAddFlipModal);
    document.getElementById('closeFlipModal').addEventListener('click', closeFlipModal);
    document.getElementById('flipForm').addEventListener('submit', addFlip);
    
    // Modal
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('itemModal').addEventListener('click', (e) => {
        if (e.target.id === 'itemModal') closeModal();
    });
    
    document.getElementById('modalAddWatchlist').addEventListener('click', () => {
        if (state.selectedItem) {
            const price = parsePrice(state.selectedItem.current?.price || 0);
            toggleWatchlist(state.selectedItem.id, state.selectedItem.name, price);
            closeModal();
        }
    });
    
    document.getElementById('modalCalcFlip').addEventListener('click', () => {
        if (state.selectedItem) {
            quickCalc(state.selectedItem.id);
            closeModal();
        }
    });
    
    // Escape to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeFlipModal();
        }
    });
}

// ==========================================
// Initialize
// ==========================================
async function init() {
    initEventListeners();
    
    setLoadingState('Conectando ao servidor...');
    
    // Wait for catalog to load
    let attempts = 0;
    while (attempts < 30) {
        const status = await checkCatalogStatus();
        if (status.loaded) {
            break;
        }
        setLoadingState(`Carregando catálogo de itens... (${status.count || 0} itens)`);
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
    }
    
    // Update catalog count
    document.getElementById('totalItems').textContent = state.catalog.count.toLocaleString();
    
    // Initial search (empty = all items)
    await performSearch();
}

// Start
document.addEventListener('DOMContentLoaded', init);
