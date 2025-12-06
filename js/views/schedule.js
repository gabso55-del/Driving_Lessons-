import { StorageService } from '../services/storage.js';
import { LogicService } from '../services/logic.js';
import { Modal } from '../components/modal.js';

export async function renderSchedule(container) {
    const today = new Date().toISOString().split('T')[0];
    let currentDate = today;
    let currentView = 'week'; // Default to week grid

    await refreshSchedule();

    async function refreshSchedule() {
        const lessons = await StorageService.getLessons();
        const studentsRaw = await StorageService.getStudents();
        const students = studentsRaw.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        const timeSlots = LogicService.generateTimeSlots(6, 20); // 06:00 to 20:00 (8 PM)

        // Header
        let headerHtml = `
            <div class="schedule-header">
                <div class="view-switcher">
                    <button class="btn btn-sm ${currentView === 'day' ? 'btn-primary' : 'btn-secondary'}" id="view-day">יום</button>
                    <button class="btn btn-sm ${currentView === 'week' ? 'btn-primary' : 'btn-secondary'}" id="view-week">שבוע</button>
                    <button class="btn btn-sm ${currentView === 'month' ? 'btn-primary' : 'btn-secondary'}" id="view-month">חודש</button>
                </div>
                <div class="date-navigator card">
                    <button class="btn-icon" id="prev-nav"><i class="fas fa-chevron-right"></i></button>
                    <input type="date" id="date-picker" value="${currentDate}">
                    <button class="btn-icon" id="next-nav"><i class="fas fa-chevron-left"></i></button>
                </div>
            </div>
        `;

        let contentHtml = '';
        if (currentView === 'day') contentHtml = renderDayList(lessons, students, timeSlots);
        else if (currentView === 'week') contentHtml = renderWeekGrid(lessons, students, timeSlots);
        else if (currentView === 'month') contentHtml = renderMonthView(lessons, students);

        container.innerHTML = headerHtml + contentHtml + `<button class="btn-fab" id="add-lesson-fab"><i class="fas fa-plus"></i></button>`;
        attachEvents(container, students);

        // Auto-scroll to current time
        setTimeout(() => {
            const now = new Date();
            const currentHour = now.getHours();
            const scrollEl = container.querySelector('.week-grid-container') || container.querySelector('.day-list-container');
            if (scrollEl) {
                // Approximate scroll: each slot is approx 80px. (CurrentHour - 6) * (80 * 1.5)
                scrollEl.scrollTop = (currentHour - 6) * 100;
            }
        }, 100);
    }

    // --- Renderers ---

    function renderDayList(lessons, students, slots) {
        const dayLessons = lessons.filter(l => l.date === currentDate);

        let html = `<div class="day-list-container" style="padding-bottom:100px;">`;

        slots.forEach(time => {
            // Find lesson STARTING at this time (approximate match could be added if needed)
            const lesson = dayLessons.find(l => l.time === time);

            if (lesson) {
                const student = students.find(s => s.id == lesson.studentId);
                const colorClass = lesson.isPaid ? 'border-success' : 'border-danger';
                const bgClass = lesson.isPaid ? 'bg-success-light' : 'bg-danger-light';

                html += `
                <div class="time-slot active ${bgClass}" data-id="${lesson.id}" data-type="lesson">
                    <div class="slot-time">${time}</div>
                    <div class="slot-content">
                        <strong>${student ? student.name : '?'}</strong>
                        <div class="slot-details">
                            ${lesson.type === 'internal_test' ? 'פנימי' : lesson.type === 'external_test' ? 'טסט' : 'שיעור'}
                            ${lesson.isPaid ? '<i class="fas fa-check-circle success-text"></i>' : ''}
                        </div>
                    </div>
                </div>`;
            } else {
                // Empty Slot
                html += `
                <div class="time-slot empty" data-time="${time}" data-date="${currentDate}" data-type="empty">
                    <div class="slot-time">${time}</div>
                    <div class="slot-content action-hint">
                        <i class="fas fa-plus"></i> שיעור פנוי
                    </div>
                </div>`;
            }
        });

        html += `</div>`;
        return html;
    }

    function renderWeekGrid(lessons, students, slots) {
        // Calculate Week Dates
        const start = new Date(currentDate);
        const dayOfWeek = start.getDay(); // 0 = Sunday
        start.setDate(start.getDate() - dayOfWeek);

        const weekDates = [];
        for (let i = 0; i < 6; i++) { // Sun to Fri
            const d = new Date(start); d.setDate(start.getDate() + i);
            weekDates.push({
                iso: d.toISOString().split('T')[0],
                label: d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' })
            });
        }

        let html = `<div class="week-grid-wrapper">
            <div class="week-grid-header">
                <div class="header-cell time-col"></div>
                ${weekDates.map(d => `<div class="header-cell day-col ${d.iso === today ? 'today' : ''}">${d.label}</div>`).join('')}
            </div>
            <div class="week-grid-body">`;

        // Rows
        slots.forEach(time => {
            html += `<div class="grid-row">
                <div class="time-cell sticky-col">${time}</div>`;

            weekDates.forEach(d => {
                const lesson = lessons.find(l => l.date === d.iso && l.time === time);

                if (lesson) {
                    const student = students.find(s => s.id == lesson.studentId);
                    const isPaid = lesson.isPaid;
                    const statusClass = isPaid ? 'status-paid' : 'status-unpaid';

                    html += `
                    <div class="grid-cell filled ${statusClass}" data-id="${lesson.id}" data-type="lesson">
                        <span class="cell-name">${student ? student.name.split(' ')[0] : '?'}</span>
                    </div>`;
                } else {
                    html += `
                    <div class="grid-cell empty" data-date="${d.iso}" data-time="${time}" data-type="empty">
                        <i class="fas fa-plus-circle"></i>
                    </div>`;
                }
            });

            html += `</div>`; // End Row
        });

        html += `</div></div>`;
        return html;
    }

    // Month View (Kept simple)
    function renderMonthView(lessons, students) {
        // ... Same logic as before if user didn't request check ...
        // For brevity using the previous logic
        const date = new Date(currentDate);
        const y = date.getFullYear(); const m = date.getMonth();
        const firstDay = new Date(y, m, 1); const lastDay = new Date(y, m + 1, 0);

        let html = `<div class="month-grid-header">
                        <div>א</div><div>ב</div><div>ג</div><div>ד</div><div>ה</div><div>ו</div><div>ש</div>
                    </div>
                    <div class="month-grid-body">`;

        for (let i = 0; i < firstDay.getDay(); i++) html += `<div></div>`;
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const check = new Date(y, m, d, 12, 0);
            const iso = check.toISOString().split('T')[0];
            const count = lessons.filter(l => l.date === iso).length;
            html += `<div class="calendar-day" data-date="${iso}">${d} ${count > 0 ? '•' : ''}</div>`;
        }
        html += '</div>';
        return html;
    }

    // --- Events ---
    function attachEvents(container, students) {
        // Nav
        container.querySelector('#prev-nav').onclick = () => moveDate(-1);
        container.querySelector('#next-nav').onclick = () => moveDate(1);
        container.querySelector('#date-picker').onchange = (e) => { currentDate = e.target.value; refreshSchedule(); };
        container.querySelector('#view-day').onclick = () => { currentView = 'day'; refreshSchedule(); };
        container.querySelector('#view-week').onclick = () => { currentView = 'week'; refreshSchedule(); };
        container.querySelector('#view-month').onclick = () => { currentView = 'month'; refreshSchedule(); };
        container.querySelector('#add-lesson-fab').onclick = () => showLessonForm(students);

        // Grid Interactions

        // 1. Edit existing lesson
        container.querySelectorAll('[data-type="lesson"]').forEach(el => {
            el.onclick = async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                const l = (await StorageService.getLessons()).find(x => x.id === id);
                if (l) showLessonForm(students, l);
            };
        });

        // 2. Add new lesson (Click on empty slot)
        container.querySelectorAll('[data-type="empty"]').forEach(el => {
            el.onclick = () => {
                const date = el.dataset.date;
                const time = el.dataset.time;
                // Pre-fill form
                showLessonForm(students, null, { date, time });
            };
        });

        // Month click
        container.querySelectorAll('.calendar-day').forEach(el => {
            el.onclick = () => { currentDate = el.dataset.date; currentView = 'day'; refreshSchedule(); };
        });
    }

    function moveDate(dir) {
        const d = new Date(currentDate);
        if (currentView === 'day') d.setDate(d.getDate() + dir);
        if (currentView === 'week') d.setDate(d.getDate() + (dir * 7));
        if (currentView === 'month') d.setMonth(d.getMonth() + dir);
        currentDate = d.toISOString().split('T')[0];
        refreshSchedule();
    }

    // --- Form Modal ---
    function showLessonForm(students, existingLesson = null, prefill = null) {
        const studentOptions = students.map(s => `<option value="${s.id}" ${existingLesson && existingLesson.studentId == s.id ? 'selected' : ''}>${s.name}</option>`).join('');

        const type = existingLesson ? existingLesson.type : 'lesson';
        const dateVal = existingLesson ? existingLesson.date : (prefill?.date || currentDate);
        const timeVal = existingLesson ? existingLesson.time : (prefill?.time || '');

        let formHtml = `
            <form id="lesson-form">
                <input type="hidden" name="id" value="${existingLesson ? existingLesson.id : ''}">
                
                <div class="form-group">
                    <label>תאריך</label>
                    <input type="date" name="date" value="${dateVal}" required>
                </div>
                
                <div class="form-group">
                    <label>שעה</label>
                    <input type="time" name="time" value="${timeVal}" step="1200" required>
                </div>

                <div class="form-group">
                    <label>תלמיד</label>
                    <select name="studentId" required>
                        <option value="">בחר תלמיד...</option>
                        ${studentOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label>סוג שיעור</label>
                    <select name="type">
                        <option value="lesson" ${type == 'lesson' ? 'selected' : ''}>שיעור רגיל (40 דק')</option>
                        <option value="internal_test" ${type == 'internal_test' ? 'selected' : ''}>מבחן פנימי</option>
                        <option value="external_test" ${type == 'external_test' ? 'selected' : ''}>טסט חיצוני</option>
                    </select>
                </div>

                ${existingLesson ? `
                <div class="quick-actions-bar">
                    <button type="button" class="btn btn-action-done" id="action-pay-open"><i class="fas fa-hand-holding-usd"></i> בוצע ותקבול</button>
                    <button type="button" class="btn btn-action-debt" id="action-debt"><i class="fas fa-file-invoice-dollar"></i> בוצע וחיוב</button>
                    <button type="button" class="btn btn-action-delete" id="action-delete"><i class="fas fa-trash"></i> מחיקת שיעור</button>
                </div>` : ''}
            </form>
        `;

        Modal.show(existingLesson ? 'עריכת שיעור' : 'שיעור חדש', formHtml, async () => {
            const form = document.getElementById('lesson-form');
            if (!form.reportValidity()) return false;
            const fd = new FormData(form);

            await saveLesson({
                id: existingLesson ? parseInt(fd.get('id')) : Date.now(),
                date: fd.get('date'),
                time: fd.get('time'),
                studentId: fd.get('studentId'),
                type: fd.get('type'),
                status: 'scheduled',
                isPaid: existingLesson ? existingLesson.isPaid : false
            });
            return true;
        });

        // Attach Logic for Quick Actions
        if (existingLesson) {
            // 1. Done & Receive Payment -> Opens Payment Modal
            document.getElementById('action-pay-open').onclick = () => {
                showPaymentModal(existingLesson, students.find(s => s.id == existingLesson.studentId));
            };

            // 2. Done & Charge -> Just mark completed, unpaid
            document.getElementById('action-debt').onclick = async () => {
                existingLesson.isPaid = false;
                existingLesson.status = 'completed';
                await saveLesson(existingLesson);
                document.querySelector('#modal-close-x').click();
            };

            // 3. Delete
            document.getElementById('action-delete').onclick = async () => {
                if (confirm('האם למחוק את השיעור?')) {
                    let all = await StorageService.getLessons();
                    await StorageService.saveLessons(all.filter(l => l.id !== existingLesson.id));
                    refreshSchedule();
                    document.querySelector('#modal-close-x').click();
                }
            };
        }
    }

    function showPaymentModal(lesson, student) {
        const price = LogicService.getPrice(lesson.type, student);

        const html = `
            <div style="text-align:center;">
                <h3>תשלום עבור ${student.name}</h3>
                
                <div style="margin-bottom:15px;">
                    <label>סכום לתשלום:</label>
                    <input type="number" id="payment-amount" class="payment-amount-display" value="${price}">
                </div>

                <label>אמצעי תשלום:</label>
                <div class="payment-methods-grid">
                    <div class="payment-method-card" data-method="cash"><i class="fas fa-money-bill-wave" style="color:#4caf50;"></i> מזומן</div>
                    <div class="payment-method-card" data-method="check"><i class="fas fa-money-check" style="color:#2196f3;"></i> צ'ק</div>
                    <div class="payment-method-card" data-method="transfer"><i class="fas fa-university" style="color:#ff9800;"></i> העברה</div>
                </div>

                <div id="transfer-options" style="display:none; margin-top:20px; border-top:1px solid rgba(0,0,0,0.05); padding-top:10px;">
                    <label>בחר אפליקציה / בנק:</label>
                    <div class="payment-methods-grid">
                        <div class="payment-method-card brand-bit" data-app="bit">Bit</div>
                        <div class="payment-method-card brand-paybox" data-app="paybox">Paybox</div>
                        <div class="payment-method-card brand-bank" data-app="bank">בנק</div>
                    </div>
                </div>

                <button class="btn btn-primary" id="confirm-payment" style="width:100%; margin-top:20px;">אישור תשלום</button>
            </div>
        `;

        Modal.show('קבלת תשלום', html, () => false); // Manual handling

        const cards = document.querySelectorAll('.payment-method-card[data-method]');
        let selectedMethod = '';
        let selectedApp = '';

        cards.forEach(c => c.onclick = () => {
            cards.forEach(x => x.classList.remove('selected'));
            c.classList.add('selected');
            selectedMethod = c.dataset.method;
            document.getElementById('transfer-options').style.display = selectedMethod === 'transfer' ? 'block' : 'none';
        });

        const appCards = document.querySelectorAll('[data-app]');
        appCards.forEach(c => c.onclick = () => {
            appCards.forEach(x => x.classList.remove('selected'));
            c.classList.add('selected');
            selectedApp = c.dataset.app;
        });

        document.getElementById('confirm-payment').onclick = async () => {
            if (!selectedMethod) { alert('בחר אמצעי תשלום'); return; }
            if (selectedMethod === 'transfer' && !selectedApp) { alert('בחר אפליקציה או בנק'); return; }

            const amount = document.getElementById('payment-amount').value;

            lesson.isPaid = true;
            lesson.status = 'completed';
            lesson.paymentMethod = selectedMethod;
            lesson.amountPaid = amount;

            if (selectedMethod === 'transfer') { lesson.paymentApp = selectedApp; }

            await saveLesson(lesson);
            // Close both modals (hacky but works if modal replaces content, usually we close top)
            document.querySelector('#modal-close-x').click();
        };
    }

    async function saveLesson(lesson) {
        const lessons = await StorageService.getLessons();
        const idx = lessons.findIndex(l => l.id === lesson.id);
        if (idx > -1) lessons[idx] = lesson; else lessons.push(lesson);
        await StorageService.saveLessons(lessons);
        refreshSchedule();
    }
}
