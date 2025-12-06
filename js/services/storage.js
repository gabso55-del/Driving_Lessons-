import { GoogleSheetsService } from './sheets.js';

export const StorageService = {
    useCloud: false,

    async init() {
        // Try to initialize Google Sheets automatically
        try {
            await GoogleSheetsService.init();
            this.useCloud = GoogleSheetsService.isConnected;
            if (this.useCloud) {
                console.log('✅ Connected to Google Sheets!');
            } else {
                console.log('⚠️ Google Sheets not configured, using LocalStorage');
            }
        } catch (e) {
            console.warn('Cloud init failed, using LocalStorage', e);
        }
    },

    async getStudents() {
        let students = [];
        if (this.useCloud) {
            const data = await GoogleSheetsService.fetchTable('Students');
            students = data.map(s => ({ ...s, id: parseInt(s.id), price: parseInt(s.price), balance: parseInt(s.balance) }));
        } else {
            students = JSON.parse(localStorage.getItem('students')) || [];
        }
        return students.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    },

    async saveStudents(students) {
        if (this.useCloud) {
            await GoogleSheetsService.saveTable('Students', students);
        }
        localStorage.setItem('students', JSON.stringify(students));
    },

    async getLessons() {
        if (this.useCloud) {
            const data = await GoogleSheetsService.fetchTable('Lessons');
            return data.map(l => ({
                ...l,
                id: parseInt(l.id),
                isPaid: l.isPaid === 'true' || l.isPaid === true
            }));
        }
        return JSON.parse(localStorage.getItem('lessons')) || [];
    },

    async saveLessons(lessons) {
        if (this.useCloud) {
            await GoogleSheetsService.saveTable('Lessons', lessons);
        }
        localStorage.setItem('lessons', JSON.stringify(lessons));
    },

    async connectCloud() {
        await GoogleSheetsService.init();
        GoogleSheetsService.login();
        // Listener for success event
        window.addEventListener('google-auth-success', () => {
            this.useCloud = true;
            alert('מחובר לגוגל דרייב בהצלחה!');
            location.reload(); // Reload to fetch fresh data
        });
    }
};
