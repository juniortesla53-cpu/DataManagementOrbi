const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3848;
const CACHE_FILE = path.join(__dirname, 'items-cache.json');

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

// Item catalog (loaded on startup)
let itemCatalog = [];
let catalogLoaded = false;

// Fetch from external URL
function fetchExternal(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        const defaultHeaders = {
            'User-Agent': 'RS3-Merchant-Tracker/1.0 (contact@example.com)',
            'Accept': 'application/json',
            ...headers
        };
        
        const req = client.get(url, { headers: defaultHeaders }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, data });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// Load complete item catalog from RuneScape Wiki
async function loadItemCatalog() {
    console.log('📦 Loading item catalog...');
    
    // Try to load from cache first
    if (fs.existsSync(CACHE_FILE)) {
        try {
            const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            const cacheAge = Date.now() - cacheData.timestamp;
            
            // Use cache if less than 24 hours old
            if (cacheAge < 24 * 60 * 60 * 1000) {
                itemCatalog = cacheData.items;
                catalogLoaded = true;
                console.log(`✅ Loaded ${itemCatalog.length} items from cache`);
                return;
            }
        } catch (e) {
            console.log('Cache invalid, fetching fresh data...');
        }
    }
    
    try {
        // Fetch from RuneScape Wiki API - get all tradeable items
        const url = 'https://api.weirdgloop.org/exchange/history/rs/all';
        console.log('Fetching from Wiki API...');
        
        const result = await fetchExternal(url);
        
        if (result.status === 200) {
            const data = JSON.parse(result.data);
            
            // Convert to array format
            itemCatalog = Object.entries(data).map(([name, info]) => ({
                id: info.id,
                name: name,
                price: info.price || 0,
                volume: info.volume || 0
            }));
            
            // Save to cache
            fs.writeFileSync(CACHE_FILE, JSON.stringify({
                timestamp: Date.now(),
                items: itemCatalog
            }));
            
            catalogLoaded = true;
            console.log(`✅ Loaded ${itemCatalog.length} items from Wiki API`);
        }
    } catch (error) {
        console.error('Error loading from Wiki API:', error.message);
        
        // Fallback: try to load item IDs from Jagex API categories
        await loadFromJagexAPI();
    }
}

// Fallback: Load from Jagex catalogue API
async function loadFromJagexAPI() {
    console.log('Trying Jagex API fallback...');
    
    const categories = [
        { id: 0, name: 'Miscellaneous' },
        { id: 1, name: 'Ammo' },
        { id: 2, name: 'Arrows' },
        { id: 3, name: 'Bolts' },
        { id: 4, name: 'Construction materials' },
        { id: 5, name: 'Construction products' },
        { id: 6, name: 'Cooking ingredients' },
        { id: 7, name: 'Costumes' },
        { id: 8, name: 'Crafting materials' },
        { id: 9, name: 'Familiars' },
        { id: 10, name: 'Farming produce' },
        { id: 11, name: 'Fletching materials' },
        { id: 12, name: 'Food and drink' },
        { id: 13, name: 'Herblore materials' },
        { id: 14, name: 'Hunting equipment' },
        { id: 15, name: 'Hunting produce' },
        { id: 16, name: 'Jewellery' },
        { id: 17, name: 'Mage armour' },
        { id: 18, name: 'Mage weapons' },
        { id: 19, name: 'Melee armour - Loss' },
        { id: 20, name: 'Melee armour - mid' },
        { id: 21, name: 'Melee armour - high' },
        { id: 22, name: 'Melee weapons - low' },
        { id: 23, name: 'Melee weapons - mid' },
        { id: 24, name: 'Melee weapons - high' },
        { id: 25, name: 'Mining and smithing' },
        { id: 26, name: 'Potions' },
        { id: 27, name: 'Prayer armour' },
        { id: 28, name: 'Prayer materials' },
        { id: 29, name: 'Range armour' },
        { id: 30, name: 'Range weapons' },
        { id: 31, name: 'Runecrafting' },
        { id: 32, name: 'Runes, Spells and Teleports' },
        { id: 33, name: 'Seeds' },
        { id: 34, name: 'Summoning scrolls' },
        { id: 35, name: 'Tools and containers' },
        { id: 36, name: 'Woodcutting product' },
        { id: 37, name: 'Pocket items' },
        { id: 38, name: 'Stone spirits' },
        { id: 39, name: 'Salvage' },
        { id: 40, name: 'Firemaking products' },
        { id: 41, name: 'Archaeology materials' },
    ];
    
    const allItems = [];
    
    for (const cat of categories) {
        try {
            // Fetch first page to get count
            const url = `https://secure.runescape.com/m=itemdb_rs/api/catalogue/category.json?category=${cat.id}`;
            const result = await fetchExternal(url);
            
            if (result.status === 200) {
                const data = JSON.parse(result.data);
                
                // Fetch items from each alpha section
                if (data.alpha) {
                    for (const alpha of data.alpha) {
                        if (alpha.items > 0) {
                            // Fetch items for this letter
                            const itemsUrl = `https://secure.runescape.com/m=itemdb_rs/api/catalogue/items.json?category=${cat.id}&alpha=${encodeURIComponent(alpha.letter)}&page=1`;
                            const itemsResult = await fetchExternal(itemsUrl);
                            
                            if (itemsResult.status === 200) {
                                const itemsData = JSON.parse(itemsResult.data);
                                if (itemsData.items) {
                                    for (const item of itemsData.items) {
                                        allItems.push({
                                            id: item.id,
                                            name: item.name,
                                            category: cat.name,
                                            icon: item.icon,
                                            price: item.current?.price || 0,
                                            trend: item.today?.trend || 'neutral'
                                        });
                                    }
                                }
                            }
                            
                            // Small delay to avoid rate limiting
                            await new Promise(r => setTimeout(r, 100));
                        }
                    }
                }
            }
            
            console.log(`  Category ${cat.id}: ${cat.name} - Found items so far: ${allItems.length}`);
            
        } catch (e) {
            console.error(`Error loading category ${cat.id}:`, e.message);
        }
    }
    
    if (allItems.length > 0) {
        itemCatalog = allItems;
        
        // Save to cache
        fs.writeFileSync(CACHE_FILE, JSON.stringify({
            timestamp: Date.now(),
            items: itemCatalog
        }));
        
        catalogLoaded = true;
        console.log(`✅ Loaded ${itemCatalog.length} items from Jagex API`);
    }
}

// Serve static files
function serveStatic(res, filePath) {
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

// Main server
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // API routes
    if (url.pathname.startsWith('/api/')) {
        try {
            // Get catalog status
            if (url.pathname === '/api/catalog/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    loaded: catalogLoaded,
                    count: itemCatalog.length
                }));
                return;
            }
            
            // Search items in catalog
            if (url.pathname === '/api/catalog/search') {
                const query = (url.searchParams.get('q') || '').toLowerCase();
                const category = url.searchParams.get('category') || 'all';
                const limit = parseInt(url.searchParams.get('limit')) || 50;
                const offset = parseInt(url.searchParams.get('offset')) || 0;
                const sort = url.searchParams.get('sort') || 'name';
                const minPrice = parseInt(url.searchParams.get('minPrice')) || 0;
                const maxPrice = parseInt(url.searchParams.get('maxPrice')) || Infinity;
                
                let results = itemCatalog;
                
                // Filter by search query
                if (query) {
                    results = results.filter(item => 
                        item.name.toLowerCase().includes(query) ||
                        String(item.id).includes(query)
                    );
                }
                
                // Filter by category
                if (category !== 'all') {
                    results = results.filter(item => 
                        (item.category || '').toLowerCase().includes(category.toLowerCase())
                    );
                }
                
                // Filter by price range
                results = results.filter(item => {
                    const price = typeof item.price === 'number' ? item.price : 0;
                    return price >= minPrice && price <= maxPrice;
                });
                
                // Sort
                results.sort((a, b) => {
                    switch (sort) {
                        case 'price-asc':
                            return (a.price || 0) - (b.price || 0);
                        case 'price-desc':
                            return (b.price || 0) - (a.price || 0);
                        case 'name':
                        default:
                            return a.name.localeCompare(b.name);
                    }
                });
                
                const total = results.length;
                results = results.slice(offset, offset + limit);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    total,
                    offset,
                    limit,
                    items: results
                }));
                return;
            }
            
            // Get all categories
            if (url.pathname === '/api/catalog/categories') {
                const categories = [...new Set(itemCatalog.map(i => i.category).filter(Boolean))];
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ categories }));
                return;
            }
            
            // Get single item details from Jagex API
            if (url.pathname === '/api/item') {
                const itemId = url.searchParams.get('id');
                const apiUrl = `https://secure.runescape.com/m=itemdb_rs/api/catalogue/detail.json?item=${itemId}`;
                
                const result = await fetchExternal(apiUrl);
                res.writeHead(result.status, { 'Content-Type': 'application/json' });
                res.end(result.data);
                return;
            }
            
            // Get multiple items
            if (url.pathname === '/api/items') {
                const ids = url.searchParams.get('ids');
                if (ids) {
                    const itemIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                    const results = [];
                    
                    for (const id of itemIds) {
                        try {
                            const itemUrl = `https://secure.runescape.com/m=itemdb_rs/api/catalogue/detail.json?item=${id}`;
                            const result = await fetchExternal(itemUrl);
                            if (result.status === 200) {
                                const parsed = JSON.parse(result.data);
                                if (parsed.item) {
                                    results.push(parsed.item);
                                }
                            }
                            await new Promise(r => setTimeout(r, 50));
                        } catch (e) {
                            console.error(`Error fetching item ${id}:`, e.message);
                        }
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ items: results }));
                    return;
                }
            }
            
            // Get price graph
            if (url.pathname === '/api/graph') {
                const itemId = url.searchParams.get('id');
                const apiUrl = `https://secure.runescape.com/m=itemdb_rs/api/graph/${itemId}.json`;
                
                const result = await fetchExternal(apiUrl);
                res.writeHead(result.status, { 'Content-Type': 'application/json' });
                res.end(result.data);
                return;
            }
            
            // Get latest prices from Wiki
            if (url.pathname === '/api/prices/latest') {
                const apiUrl = 'https://api.weirdgloop.org/exchange/history/rs/latest';
                const result = await fetchExternal(apiUrl);
                res.writeHead(result.status, { 'Content-Type': 'application/json' });
                res.end(result.data);
                return;
            }
            
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid API request' }));
            
        } catch (error) {
            console.error('API Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }
    
    // Static files
    let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
    serveStatic(res, filePath);
});

// Start server
server.listen(PORT, async () => {
    console.log(`\n🎮 RS3 Merchant Pro running at http://localhost:${PORT}\n`);
    
    // Load item catalog in background
    await loadItemCatalog();
    
    console.log('\nAPI Endpoints:');
    console.log('  GET /api/catalog/status         - Get catalog loading status');
    console.log('  GET /api/catalog/search?q=...   - Search all items');
    console.log('  GET /api/catalog/categories     - Get all categories');
    console.log('  GET /api/item?id=<itemId>       - Get single item details');
    console.log('  GET /api/items?ids=1,2,3        - Get multiple items');
    console.log('  GET /api/graph?id=<itemId>      - Get price history\n');
});
