// Firebase Service - Replaces Google Sheets
export const FirebaseService = {
    db: null,
    auth: null,
    isConnected: false,

    async init() {
        try {
            // Firebase config
            const firebaseConfig = {
                apiKey: "AIzaSyC1v78oPHnCcaHrEOJr-0vtMR-U_BKznq8",
                authDomain: "driving-lessons-a65b7.firebaseapp.com",
                databaseURL: "https://driving-lessons-a65b7-default-rtdb.firebaseio.com",
                projectId: "driving-lessons-a65b7",
                storageBucket: "driving-lessons-a65b7.firebasestorage.app",
                messagingSenderId: "701517776062",
                appId: "1:701517776062:web:8eab6ae50cf8a1ef250aef"
            };

            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            this.db = firebase.database();
            this.auth = firebase.auth();

            // Sign in anonymously
            await this.auth.signInAnonymously();

            this.isConnected = true;
            console.log('✅ Firebase connected!');

            return Promise.resolve();
        } catch (error) {
            console.error('Firebase init error:', error);
            this.isConnected = false;
            return Promise.reject(error);
        }
    },

    // Students
    async saveStudents(students) {
        if (!this.isConnected) throw new Error('Not connected to Firebase');
        await this.db.ref('students').set(students);
    },

    async getStudents() {
        if (!this.isConnected) return [];
        const snapshot = await this.db.ref('students').once('value');
        return snapshot.val() || [];
    },

    // Lessons
    async saveLessons(lessons) {
        if (!this.isConnected) throw new Error('Not connected to Firebase');
        await this.db.ref('lessons').set(lessons);
    },

    async getLessons() {
        if (!this.isConnected) return [];
        const snapshot = await this.db.ref('lessons').once('value');
        return snapshot.val() || [];
    },

    // Archive operations
    async archiveStudent(studentId, targetTab, student) {
        if (!this.isConnected) throw new Error('Not connected to Firebase');
        const archivePath = `archives/${targetTab.toLowerCase()}`;
        const studentRef = this.db.ref(archivePath).push();
        await studentRef.set({
            ...student,
            archivedAt: new Date().toISOString(),
            archivedBy: 'system'
        });
    },

    async getArchived(tab) {
        if (!this.isConnected) return [];
        const archivePath = `archives/${tab.toLowerCase()}`;
        const snapshot = await this.db.ref(archivePath).once('value');
        const data = snapshot.val();
        if (!data) return [];

        // Convert object to array
        return Object.keys(data).map(key => ({
            firebaseKey: key,
            ...data[key]
        }));
    }
};
