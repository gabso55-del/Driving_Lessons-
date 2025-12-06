import { FirebaseService } from './firebase.js';

export const StorageService = {
    useCloud: false,
    syncTimeout: null,
    isSyncing: false,
    lastSyncTime: null,

    async init() {
        // Try to initialize Firebase automatically
        try {
            await FirebaseService.init();
            this.useCloud = FirebaseService.isConnected;
            if (this.useCloud) {
                console.log('✅ Connected to Firebase!');
                this.lastSyncTime = localStorage.getItem('last_sync_time');
            } else {
                console.log('⚠️ Firebase not configured, using LocalStorage');
            }
        } catch (e) {
            console.warn('Firebase init failed, using LocalStorage', e);
        }
    },

    updateSyncStatus(status) {
        const indicator = document.getElementById('sync-indicator');
        if (indicator) {
            switch (status) {
                case 'saving':
                    indicator.innerHTML = '<i class="fas fa-sync fa-spin"></i> שומר...';
                    indicator.style.color = '#ffa500';
                    break;
                case 'synced':
                    indicator.innerHTML = '<i class="fas fa-check-circle"></i> סונכרן';
                    indicator.style.color = '#4caf50';
                    this.lastSyncTime = new Date().toLocaleString('he-IL');
                    localStorage.setItem('last_sync_time', this.lastSyncTime);
                    break;
                case 'error':
                    indicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> שגיאה';
                    indicator.style.color = '#f44336';
                    break;
            }
        }
    },

    debouncedSync(syncFunction) {
        // Clear existing timeout
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        // Set new timeout for 2 seconds
        this.updateSyncStatus('saving');
        this.syncTimeout = setTimeout(async () => {
            const maxRetries = 3;
            let retryCount = 0;

            while (retryCount < maxRetries) {
                try {
                    this.isSyncing = true;
                    await syncFunction();
                    this.updateSyncStatus('synced');
                    return; // Success!
                } catch (e) {
                    retryCount++;
                    console.error(`Sync error (attempt ${retryCount}/${maxRetries}):`, e);

                    if (retryCount < maxRetries) {
                        // Exponential backoff: wait 1s, 2s, 4s
                        const waitTime = Math.pow(2, retryCount - 1) * 1000;
                        console.log(`Retrying in ${waitTime}ms...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    } else {
                        // Max retries reached
                        this.updateSyncStatus('error');
                        console.error('Max retries reached, sync failed');
                    }
                } finally {
                    this.isSyncing = false;
                }
            }
        }, 2000);
    },

    async getStudents() {
        // Always read from LocalStorage (instant)
        let students = JSON.parse(localStorage.getItem('students')) || [];
        return students.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    },

    async saveStudents(students) {
        // Save to localStorage immediately (instant feedback)
        localStorage.setItem('students', JSON.stringify(students));

        // Debounce cloud sync (wait 2 seconds)
        if (this.useCloud) {
            this.debouncedSync(async () => {
                await FirebaseService.saveStudents(students);
            });
        }
    },

    async getLessons() {
        // Always read from LocalStorage (instant)
        return JSON.parse(localStorage.getItem('lessons')) || [];
    },

    async saveLessons(lessons) {
        // Save to localStorage immediately (instant feedback)
        localStorage.setItem('lessons', JSON.stringify(lessons));

        // Debounce cloud sync (wait 2 seconds)
        if (this.useCloud) {
            this.debouncedSync(async () => {
                await FirebaseService.saveLessons(lessons);
            });
        }
    },

    async forceSyncNow() {
        // Manual sync - bypass debouncing
        if (!this.useCloud) {
            alert('⚠️ לא מחובר ל-Firebase');
            return;
        }

        try {
            this.updateSyncStatus('saving');
            const students = JSON.parse(localStorage.getItem('students')) || [];
            const lessons = JSON.parse(localStorage.getItem('lessons')) || [];

            await Promise.all([
                FirebaseService.saveStudents(students),
                FirebaseService.saveLessons(lessons)
            ]);

            this.updateSyncStatus('synced');
            alert('✅ סונכרן בהצלחה!');
        } catch (e) {
            console.error('Force sync error:', e);
            this.updateSyncStatus('error');
            alert('❌ שגיאה בסנכרון');
        }
    },

    async refreshFromCloud() {
        // Manually fetch fresh data from Firebase
        if (!this.useCloud) {
            alert('⚠️ לא מחובר ל-Firebase');
            return;
        }

        try {
            const students = await FirebaseService.getStudents();
            const lessons = await FirebaseService.getLessons();

            localStorage.setItem('students', JSON.stringify(students));
            localStorage.setItem('lessons', JSON.stringify(lessons));

            alert('✅ נתונים עודכנו מהענן!');
            location.reload();
        } catch (e) {
            console.error('Refresh error:', e);
            alert('❌ שגיאה בטעינת נתונים');
        }
    },

    async connectCloud() {
        await FirebaseService.init();
        if (FirebaseService.isConnected) {
            this.useCloud = true;
            alert('מחובר ל-Firebase בהצלחה!');
            location.reload(); // Reload to fetch fresh data
        } else {
            alert('שגיאה בהתחברות ל-Firebase');
        }
    }
};
