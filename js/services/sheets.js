// Simple Google Sheets Service using Apps Script Web App
export const GoogleSheetsService = {
    // PASTE YOUR APPS SCRIPT WEB APP URL HERE
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby8gvVoPaL7k7uZRZ73gIJeSK-Xr1qAvwy-2GtEFXXie1XZ0n73VDOxPLoElPpPQQGA/exec',

    isConnected: false,

    async init() {
        // Check if we have a valid URL
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

        try {
            const url = `${this.SCRIPT_URL}?sheet=${tableName}`;
            const response = await fetch(url);
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

        try {
            const response = await fetch(this.SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    sheet: tableName,
                    data: data
                })
            });

            const result = await response.json();

            if (result.error) {
                console.error('Error saving data:', result.error);
            } else {
                console.log('Data saved successfully:', result.message);
            }
        } catch (error) {
            console.error(`Error saving ${tableName}:`, error);
        }
    },

    // For compatibility with storage.js
    login() {
        // Not needed with Apps Script approach
        alert('Apps Script is already connected! Just make sure you pasted the URL in sheets.js');
    }
};
