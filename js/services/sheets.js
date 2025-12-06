// Optimized Google Sheets Service with request deduplication and caching
export const GoogleSheetsService = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx46JrXN8_PnrrOE_QRMW0KptJ9NHY1gp9OWglaFQwfKOXNMjDXFEmQdqYDWIS3kvdw/exec',
    isConnected: false,

    // Request deduplication
    pendingRequests: new Map(),
    cache: new Map(),
    CACHE_TTL: 30000, // 30 seconds

    async init() {
        console.log('GoogleSheetsService.init() - SCRIPT_URL:', this.SCRIPT_URL);
        if (this.SCRIPT_URL && this.SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE') {
            this.isConnected = true;
            console.log('✅ GoogleSheetsService.isConnected set to TRUE');
        } else {
            console.log('⚠️ GoogleSheetsService.isConnected remains FALSE');
        }
        return Promise.resolve();
    },

    async fetchTable(tableName) {
        if (!this.isConnected) return [];

        // Check cache first
        const cacheKey = `fetch_${tableName}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            console.log(`📦 Using cached data for ${tableName}`);
            return cached.data;
        }

        // Check if request is already pending  
        if (this.pendingRequests.has(cacheKey)) {
            console.log(`⏳ Waiting for pending request: ${tableName}`);
            return this.pendingRequests.get(cacheKey);
        }

        // Make new request
        const requestPromise = this._fetchTableInternal(tableName);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const data = await requestPromise;
            // Cache the result
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            return data;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    },

    async _fetchTableInternal(tableName) {
        try {
            const url = `${this.SCRIPT_URL}?sheet=${tableName}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                console.error('Error fetching data:', data.error);
                return [];
            }

            return data;
        } catch (error) {
            console.error(`Error fetching ${tableName}:`, error);
            return [];
        }
    },

    async saveTable(tableName, data) {
        if (!this.isConnected) return;

        // Invalidate cache for this table
        const cacheKey = `fetch_${tableName}`;
        this.cache.delete(cacheKey);

        try {
            const response = await fetch(this.SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sheet: tableName,
                    data: data
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.error) {
                console.error('Error saving data:', result.error);
                throw new Error(result.error);
            } else {
                console.log('Data saved successfully:', result.message);
            }
        } catch (error) {
            console.error(`Error saving ${tableName}:`, error);
            throw error; // Re-throw so caller can handle
        }
    },

    // Clear all caches
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    },

    // For compatibility with storage.js
    login() {
        alert('Apps Script is already connected! Just make sure you pasted the URL in sheets.js');
    }
};
