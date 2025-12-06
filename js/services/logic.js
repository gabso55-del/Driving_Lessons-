export const LogicService = {
    // Return duration in minutes
    getLessonDuration(type) {
        switch (type) {
            case 'internal_test': return 15;
            case 'external_test': return 30; // Usually short
            default: return 40; // Standard lesson
        }
    },

    // Default prices
    getPrice(type, student) {
        if (!student) return 0;
        switch (type) {
            case 'internal_test': return parseInt(student.priceInternalTest) || 200;
            case 'external_test': return parseInt(student.priceExternalTest) || 500;
            default: return parseInt(student.priceLesson) || 200;
        }
    },

    // Generate 40-min intervals between start and end hour
    // Returns array: ["07:00", "07:40", "08:20", ...]
    generateTimeSlots(startHour = 6, endHour = 20) {
        const slots = [];
        let currentMin = startHour * 60;
        const endMin = endHour * 60;

        while (currentMin < endMin) {
            const h = Math.floor(currentMin / 60);
            const m = currentMin % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            slots.push(timeStr);
            currentMin += 40;
        }
        return slots;
    }
};
