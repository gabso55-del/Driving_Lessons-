import { StorageService } from './storage.js';

export const StatsService = {
    async getStudentStats(studentId) {
        const lessons = await StorageService.getLessons();
        const studentLessons = lessons.filter(l => l.studentId == studentId);

        // Count Scheduled or Completed (ignore cancelled without charge for progress, but maybe keep for history)
        // For simplicity, we count anything that isn't 'cancelled' (so including scheduled future ones as "planned")
        // But for "Done", we should filter by status/date.
        // Let's count "Total Booked" vs "Completed".

        const validLessons = studentLessons.filter(l => l.status !== 'cancelled');

        const typeLessons = validLessons.filter(l => l.type === 'lesson' || !l.type);
        const typeInternal = validLessons.filter(l => l.type === 'internal_test');
        const typeExternal = validLessons.filter(l => l.type === 'external_test');

        // Anomaly Check: Last lesson date
        const sorted = validLessons.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
        const lastActivity = sorted.length > 0 ? sorted[0] : null;

        let daysSinceLast = -1;
        if (lastActivity) {
            const today = new Date();
            const last = new Date(lastActivity.date);
            const diffTime = Math.abs(today - last);
            daysSinceLast = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // If future, returns 0 or negative roughly, handle that
            if (new Date(lastActivity.date) > today) daysSinceLast = 0;
        }

        return {
            totalLessons: typeLessons.length,
            totalInternal: typeInternal.length,
            totalExternal: typeExternal.length,
            lastActivityDate: lastActivity ? lastActivity.date : null,
            daysSinceLastActivity: daysSinceLast,
            nextLesson: sorted.find(l => new Date(l.date) >= new Date()) // Simple find
        };
    },

    async getAllStats() {
        const students = await StorageService.getStudents();
        const stats = await Promise.all(students.map(async s => {
            const stat = await this.getStudentStats(s.id);
            return {
                student: s,
                ...stat
            };
        }));
        return stats;
    },

    async getAnomalies() {
        const all = await this.getAllStats();
        // Definition of anomaly: Gap > 14 days OR High lesson count (>30) without test?
        // User asked for "Gaps".

        const gaps = all.filter(s => s.daysSinceLastActivity > 14 && s.daysSinceLastActivity !== -1);

        // High count warning
        const readyForTest = all.filter(s => s.totalLessons > 28 && s.totalInternal === 0 && s.totalExternal === 0);

        return {
            gaps,
            readyForTest
        };
    }
};
