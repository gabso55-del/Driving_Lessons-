document.addEventListener('DOMContentLoaded', () => {
    console.log('DriveMaster App Initialized');

    // Navigation Logic
    const navItems = document.querySelectorAll('.main-nav li[data-view]');
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.querySelector('.top-bar h1');
    const updatePricesBtn = document.getElementById('nav-update-prices');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            const view = item.dataset.view;
            loadView(view);
        });
    });

    if (updatePricesBtn) {
        updatePricesBtn.addEventListener('click', () => {
            showGlobalPriceUpdateModal();
        });
    }

    function loadView(viewName) {
        switch (viewName) {
            case 'dashboard':
                pageTitle.textContent = 'לוח בקרה';
                renderDashboard();
                break;
            case 'students':
                pageTitle.textContent = 'ניהול תלמידים';
                renderStudents();
                break;
            case 'schedule':
                pageTitle.textContent = 'יומן שיעורים';
                renderSchedule();
                break;
            case 'reports':
                pageTitle.textContent = 'דוחות והכנסות';
                renderReports();
                break;
        }
    }

    // --- Data Helpers ---

    function getStudents() {
        const students = localStorage.getItem('students');
        return students ? JSON.parse(students) : [];
    }

    function saveStudents(students) {
        localStorage.setItem('students', JSON.stringify(students));
    }

    function getLessons() {
        const lessons = localStorage.getItem('lessons');
        return lessons ? JSON.parse(lessons) : [];
    }

    function saveLessons(lessons) {
        localStorage.setItem('lessons', JSON.stringify(lessons));
    }

    function getInvoices() {
        const invoices = localStorage.getItem('invoices');
        return invoices ? JSON.parse(invoices) : [];
    }

    function saveInvoice(invoice) {
        const invoices = getInvoices();
        invoices.push(invoice);
        localStorage.setItem('invoices', JSON.stringify(invoices));
    }

    // --- Dynamic Calculations ---

    function getStudentLessonCount(studentId) {
        const lessons = getLessons();
        const today = new Date().toISOString().split('T')[0];

        // Count only COMPLETED lessons (or cancelled_charged)
        // AND exclude future dates just in case, though status usually implies past
        return lessons.filter(l =>
            l.studentId == studentId &&
            (l.type === 'lesson' || !l.type) &&
            (l.status === 'completed' || l.status === 'cancelled_charged')
        ).length;
    }

    function getStudentTestStats(studentId) {
        const lessons = getLessons();
        const externalTests = lessons.filter(l => l.studentId == studentId && l.type === 'external_test' && l.status === 'completed');

        const passed = externalTests.filter(l => l.testResult === 'passed').length;
        const failed = externalTests.filter(l => l.testResult === 'failed').length;

        return {
            total: externalTests.length,
            passed,
            failed
        };
    }

    function getAverageTestsPerStudent() {
        const lessons = getLessons();
        const allExternalTests = lessons.filter(l => l.type === 'external_test' && l.status === 'completed');

        if (allExternalTests.length === 0) return 0;

        // Get unique students who have taken tests
        const studentIds = [...new Set(allExternalTests.map(l => l.studentId))];

        if (studentIds.length === 0) return 0;

        const average = allExternalTests.length / studentIds.length;
        return average.toFixed(1); // Return with 1 decimal place
    }

    // --- Views ---

    function renderDashboard() {
        const students = getStudents();
        const lessons = getLessons();

        const today = new Date().toISOString().split('T')[0];
        const lessonsToday = lessons.filter(l => l.date === today).length;
        const activeStudents = students.length;
        const avgTests = getAverageTestsPerStudent();

        // Calculate estimated income (simple estimation based on standard price)
        // For accurate income, we should use the reports, but this is a dashboard estimate
        const totalLessons = lessons.length; // All time
        const estimatedIncome = totalLessons * 190; // Avg price

        contentArea.innerHTML = `
            <div class="dashboard-view">
                <div class="stat-card">
                    <h3>שיעורים היום</h3>
                    <p class="stat-number">${lessonsToday}</p>
                </div>
                <div class="stat-card">
                    <h3>תלמידים פעילים</h3>
                    <p class="stat-number">${activeStudents}</p>
                </div>
                <div class="stat-card">
                    <h3>ממוצע טסטים לתלמיד</h3>
                    <p class="stat-number" style="color: var(--accent-color)">${avgTests}</p>
                </div>
            </div>
            
            <div style="margin-top: var(--spacing-xl);">
                <h3>שיעורים קרובים</h3>
                <div class="lesson-list" id="dashboard-upcoming-lessons"></div>
            </div>
        `;

        const upcomingLessons = lessons
            .filter(l => new Date(l.date + ' ' + l.time) >= new Date())
            .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time))
            .slice(0, 3);

        const upcomingContainer = document.getElementById('dashboard-upcoming-lessons');

        if (upcomingLessons.length === 0) {
            upcomingContainer.innerHTML = '<p>אין שיעורים קרובים.</p>';
        } else {
            upcomingContainer.innerHTML = upcomingLessons.map(lesson => {
                const student = students.find(s => s.id == lesson.studentId);
                return `
                <div class="lesson-card">
                    <div class="lesson-time">
                        ${lesson.date} | ${lesson.time}
                    </div>
                    <div class="lesson-details">
                        <h4>${student ? student.name : 'Unknown'}</h4>
                    </div>
                </div>
                `;
            }).join('');
        }
    }

    function renderStudents() {
        const students = getStudents().sort((a, b) => a.name.localeCompare(b.name));

        let studentsHtml = students.map(student => {
            const lessonCount = getStudentLessonCount(student.id);
            const testStats = getStudentTestStats(student.id);

            // Store student data for click handler
            const studentData = encodeURIComponent(JSON.stringify(student));

            return `
            <div class="student-card" onclick="showStudentDetailsModal(${student.id})" style="cursor: pointer;">
                <div class="student-info">
                    <h4>${student.name}</h4>
                    <p>${student.phone}</p>
                    <div style="display: flex; gap: 15px; margin-top: 5px; font-size: 0.9em;">
                        <span><i class="fas fa-book"></i> שיעורים: ${lessonCount}</span>
                        <span><i class="fas fa-flag-checkered"></i> טסטים: ${testStats.total}</span>
                    </div>
                </div>
                <div class="student-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); editStudent(${student.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="event.stopPropagation(); if(confirm('למחוק את התלמיד?')) deleteStudent(${student.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            `;
        }).join('');

        if (students.length === 0) {
            studentsHtml = '<p>אין תלמידים רשומים עדיין.</p>';
        }

        contentArea.innerHTML = `
            <div class="students-view">
                <div class="students-header">
                    <h2>רשימת תלמידים</h2>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-secondary" onclick="showGlobalPriceUpdateModal()">עדכון מחירים גורף</button>
                        <button class="btn-primary" id="add-student-btn">
                            <i class="fas fa-plus"></i> הוסף תלמיד
                        </button>
                    </div>
                </div>
                <div class="student-list">
                    ${studentsHtml}
                </div>
            </div>
        `;

        document.getElementById('add-student-btn').addEventListener('click', showAddStudentModal);
    }

    // --- Modals ---

    window.showStudentDetailsModal = function (studentId) {
        const student = getStudents().find(s => s.id === studentId);
        const lessons = getLessons().filter(l => l.studentId == studentId).sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));

        let totalBalance = 0;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>כרטיס תלמיד - ${student.name}</h3>
                    <button class="btn-secondary" id="close-student-details">סגור</button>
                </div>
                
                <div style="max-height: 60vh; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; color: white;">
                        <thead>
                            <tr style="border-bottom: 1px solid #444;">
                                <th style="padding: 10px; text-align: right;">פרטי האירוע</th>
                                <th style="padding: 10px; text-align: right;">סכום לתשלום</th>
                                <th style="padding: 10px; text-align: right;">שולם</th>
                                <th style="padding: 10px; text-align: right;">יתרה</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lessons.map(l => {
            let amount = 0;
            if (l.type === 'lesson') {
                const basePrice = parseInt(student.priceLesson) || 200;
                const duration = parseInt(l.duration) || 40;
                amount = (duration / 40) * basePrice;
            } else if (l.type === 'internal_test') {
                amount = parseInt(student.priceInternalTest) || 200;
            } else if (l.type === 'external_test') {
                amount = parseInt(student.priceExternalTest) || 231;
            }

            // If cancelled with no charge, amount is 0
            if (l.status === 'cancelled' || l.status === 'completed_free') amount = 0;

            const isPaid = l.isPaid;
            const paidAmount = isPaid ? amount : 0;
            const balance = amount - paidAmount;
            totalBalance += balance;

            const typeLabel = l.type === 'internal_test' ? 'מבחן פנימי' : l.type === 'external_test' ? 'מבחן חיצוני' : 'שיעור';

            // Format balance for display: if positive (debt), show as negative red. If 0 or negative (credit), show normal.
            let balanceDisplay = '';
            let balanceStyle = '';

            if (balance > 0) {
                balanceDisplay = `-₪${balance}`;
                balanceStyle = 'color: var(--danger-color); font-weight: bold;'; // Red
            } else {
                balanceDisplay = `₪${Math.abs(balance)}`;
                balanceStyle = 'color: var(--success-color);'; // Green
            }

            return `
                                    <tr style="border-bottom: 1px solid #333;">
                                        <td style="padding: 10px;">
                                            <div style="font-weight: bold;">${l.date} | ${l.time}</div>
                                            <div style="font-size: 0.9em; color: #aaa;">${typeLabel} (${l.duration} דק')</div>
                                        </td>
                                        <td style="padding: 10px;">₪${amount}</td>
                                        <td style="padding: 10px; color: ${isPaid ? 'var(--success-color)' : ''};">${isPaid ? '₪' + amount : ''}</td>
                                        <td style="padding: 10px; ${balanceStyle}" dir="ltr">${balanceDisplay}</td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="border-top: 2px solid #555; background: rgba(255,255,255,0.05);">
                                <td style="padding: 15px; font-weight: bold;">סה"כ</td>
                                <td></td>
                                <td></td>
                                <td style="padding: 15px; font-weight: bold; color: ${totalBalance > 0 ? 'var(--danger-color)' : 'var(--success-color)'};" dir="ltr">${totalBalance > 0 ? '-₪' + totalBalance : '₪' + Math.abs(totalBalance)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button class="btn-primary" onclick="openReceiptModal(${student.id})">תקבול</button>
                        <button class="btn-secondary" id="close-student-details-btn">סגור</button>
                    </div>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('close-student-details').addEventListener('click', () => modal.remove());
    }

    function showAddStudentModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-height: 90vh; overflow-y: auto;">
                <h3>הוסף תלמיד חדש</h3>
                <form id="add-student-form">
                    <div class="form-group"><label>שם מלא</label><input type="text" name="name" required></div>
                    <div class="form-group"><label>תעודת זהות</label><input type="text" name="tz"></div>
                    <div class="form-group"><label>טלפון</label><input type="tel" name="phone" required></div>
                    <div class="form-group"><label>כתובת</label><input type="text" name="address"></div>
                    <div class="form-group"><label>מייל</label><input type="email" name="email"></div>
                    
                    <h4 style="margin-top: 20px; margin-bottom: 10px;">מחירים (השאר ריק לברירת מחדל)</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="form-group"><label>מחיר שיעור</label><input type="number" name="priceLesson" placeholder="200"></div>
                        <div class="form-group"><label>מבחן פנימי</label><input type="number" name="priceInternalTest" placeholder="200"></div>
                        <div class="form-group"><label>מבחן חיצוני</label><input type="number" name="priceExternalTest" placeholder="231"></div>
                        <div class="form-group"><label>דמי רישום</label><input type="number" name="priceRegistration" placeholder="0"></div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-secondary" id="cancel-modal">ביטול</button>
                        <button type="submit" class="btn-primary">שמור</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('cancel-modal').addEventListener('click', () => modal.remove());

        document.getElementById('add-student-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const newStudent = {
                id: Date.now(),
                name: formData.get('name'),
                tz: formData.get('tz'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                email: formData.get('email'),
                priceLesson: formData.get('priceLesson'),
                priceInternalTest: formData.get('priceInternalTest'),
                priceExternalTest: formData.get('priceExternalTest'),
                priceRegistration: formData.get('priceRegistration')
            };

            const students = getStudents();
            students.push(newStudent);
            saveStudents(students);
            modal.remove();
            renderStudents();
        });
    }

    window.editStudent = function (id) {
        const students = getStudents();
        const student = students.find(s => s.id === id);
        if (!student) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-height: 90vh; overflow-y: auto;">
                <h3>עריכת תלמיד</h3>
                <form id="edit-student-form">
                    <div class="form-group"><label>שם מלא</label><input type="text" name="name" value="${student.name}" required></div>
                    <div class="form-group"><label>תעודת זהות</label><input type="text" name="tz" value="${student.tz || ''}"></div>
                    <div class="form-group"><label>טלפון</label><input type="tel" name="phone" value="${student.phone}" required></div>
                    <div class="form-group"><label>כתובת</label><input type="text" name="address" value="${student.address || ''}"></div>
                    <div class="form-group"><label>מייל</label><input type="email" name="email" value="${student.email || ''}"></div>
                    
                    <h4 style="margin-top: 20px; margin-bottom: 10px;">מחירים</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="form-group"><label>מחיר שיעור</label><input type="number" name="priceLesson" value="${student.priceLesson || ''}"></div>
                        <div class="form-group"><label>מבחן פנימי</label><input type="number" name="priceInternalTest" value="${student.priceInternalTest || ''}"></div>
                        <div class="form-group"><label>מבחן חיצוני</label><input type="number" name="priceExternalTest" value="${student.priceExternalTest || ''}"></div>
                        <div class="form-group"><label>דמי רישום</label><input type="number" name="priceRegistration" value="${student.priceRegistration || ''}"></div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-secondary" id="cancel-edit-student">ביטול</button>
                        <button type="submit" class="btn-primary">עדכן</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('cancel-edit-student').addEventListener('click', () => modal.remove());

        document.getElementById('edit-student-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            student.name = formData.get('name');
            student.tz = formData.get('tz');
            student.phone = formData.get('phone');
            student.address = formData.get('address');
            student.email = formData.get('email');
            student.priceLesson = formData.get('priceLesson');
            student.priceInternalTest = formData.get('priceInternalTest');
            student.priceExternalTest = formData.get('priceExternalTest');
            student.priceRegistration = formData.get('priceRegistration');

            saveStudents(students);
            modal.remove();
            renderStudents();
        });
    }

    function showGlobalPriceUpdateModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>עדכון מחירים גורף</h3>
                <p style="color: #aaa; font-size: 0.9em; margin-bottom: 20px;">הזן מחיר חדש רק בשדות שברצונך לעדכן לכל התלמידים. שדות ריקים לא ישונו.</p>
                <form id="global-price-form">
                    <div class="form-group"><label>מחיר שיעור</label><input type="number" name="priceLesson"></div>
                    <div class="form-group"><label>מבחן פנימי</label><input type="number" name="priceInternalTest"></div>
                    <div class="form-group"><label>מבחן חיצוני</label><input type="number" name="priceExternalTest"></div>
                    <div class="form-group"><label>דמי רישום</label><input type="number" name="priceRegistration"></div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" id="cancel-global-price">ביטול</button>
                        <button type="submit" class="btn-primary">עדכן את כל התלמידים</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('cancel-global-price').addEventListener('click', () => modal.remove());

        document.getElementById('global-price-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updates = {};

            if (formData.get('priceLesson')) updates.priceLesson = formData.get('priceLesson');
            if (formData.get('priceInternalTest')) updates.priceInternalTest = formData.get('priceInternalTest');
            if (formData.get('priceExternalTest')) updates.priceExternalTest = formData.get('priceExternalTest');
            if (formData.get('priceRegistration')) updates.priceRegistration = formData.get('priceRegistration');

            if (Object.keys(updates).length === 0) {
                alert('לא הוזנו מחירים לעדכון.');
                return;
            }

            if (confirm('האם אתה בטוח? פעולה זו תעדכן את המחירים לכל התלמידים במערכת.')) {
                const students = getStudents();
                students.forEach(student => {
                    Object.assign(student, updates);
                });
                saveStudents(students);
                alert('המחירים עודכנו בהצלחה.');
                modal.remove();
                // Refresh view if needed
                if (document.querySelector('.students-view')) renderStudents();
            }
        });
    }

    // --- Schedule & Lessons ---

    function renderSchedule() {
        try {
            const lessons = getLessons();
            const timeSlots = [];
            let currentTime = new Date();
            currentTime.setHours(6, 0, 0, 0);
            const endTime = new Date();
            endTime.setHours(20, 0, 0, 0);

            while (currentTime < endTime) {
                timeSlots.push(currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
                currentTime.setMinutes(currentTime.getMinutes() + 20);
            }

            const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
            const curr = new Date();
            const first = curr.getDate() - curr.getDay();
            const weekStart = new Date(curr.setDate(first));

            // Helper to get YYYY-MM-DD in LOCAL time
            const getLocalDateStr = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            let headerHtml = '<div class="calendar-header-cell">שעה</div>';
            days.forEach((day, index) => {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + index);
                const dateStr = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
                const dateIso = getLocalDateStr(date);

                // Debugging Schedule
                // console.log('Checking date:', dateIso);
                const dailyLessons = lessons.filter(l => {
                    const match = l.date === dateIso && (!l.status || l.status === 'scheduled' || l.status === 'completed' || l.status === 'cancelled_charged');
                    // if (l.date === dateIso) console.log('Found lesson for date:', l, 'Match:', match);
                    return match;
                });
                const totalCount = dailyLessons.reduce((acc, l) => acc + ((parseInt(l.duration) || 40) / 40), 0);

                headerHtml += `
                    <div class="calendar-header-cell">
                        <div>${day}' ${dateStr}</div>
                        <div style="font-size: 0.8em; color: #aaa; margin-top: 2px;">${totalCount} שיעורים</div>
                    </div>
                `;
            });

            let gridHtml = headerHtml;

            timeSlots.forEach(time => {
                gridHtml += `<div class="time-slot-label">${time}</div>`;
                days.forEach((day, index) => {
                    const date = new Date(weekStart);
                    date.setDate(weekStart.getDate() + index);
                    const dateStr = getLocalDateStr(date);

                    const lesson = lessons.find(l => l.date === dateStr && l.time === time);
                    const isOccupied = isSlotOccupied(dateStr, time, lessons);

                    let contentHtml = '';
                    if (lesson) {
                        const student = getStudents().find(s => s.id == lesson.studentId);
                        const duration = parseInt(lesson.duration) || 40;
                        const slots = Math.ceil(duration / 20);
                        const height = (slots * 50) + (slots - 1);

                        let amountDisplay = '';
                        if (lesson.type === 'lesson' || !lesson.type) {
                            if (duration === 40) amountDisplay = '1 שיעור';
                            if (duration === 60) amountDisplay = '1.5 שיעורים';
                            if (duration === 80) amountDisplay = '2 שיעורים';
                        }

                        let typeLabel = '';
                        if (lesson.type === 'internal_test') typeLabel = ' | <span style="color: #FFD700;">מבחן פנימי</span>';
                        if (lesson.type === 'external_test') typeLabel = ' | <span style="color: #FF4500;">מבחן חיצוני</span>';

                        let statusStyle = '';
                        let statusIcon = '';
                        switch (lesson.status) {
                            case 'scheduled':
                            case undefined: // Default for old lessons
                                statusStyle = 'border-right: 4px solid var(--secondary-color); background: var(--primary-color);';
                                statusIcon = '';
                                break;
                            case 'completed':
                                if (lesson.isPaid) {
                                    statusStyle = 'border-right: 4px solid #4CAF50; background: rgba(76, 175, 80, 0.2);'; // Green for Paid
                                    statusIcon = '<i class="fas fa-check" style="color: #4CAF50; margin-left: 5px;"></i>';
                                } else {
                                    statusStyle = 'border-right: 4px solid #F44336; background: rgba(244, 67, 54, 0.2);'; // Red for Unpaid
                                    statusIcon = '<i class="fas fa-exclamation-circle" style="color: #F44336; margin-left: 5px;"></i>';
                                }
                                break;
                            case 'completed_free':
                                statusStyle = 'border-right: 4px solid #2196F3; background: rgba(33, 150, 243, 0.2);';
                                statusIcon = '<i class="fas fa-check-double" style="color: #2196F3; margin-left: 5px;"></i>';
                                break;
                            case 'cancelled_charged':
                                statusStyle = 'border-right: 4px solid #FF9800; background: rgba(255, 152, 0, 0.2); text-decoration: line-through;';
                                statusIcon = '<i class="fas fa-ban" style="color: #FF9800; margin-left: 5px;"></i>';
                                break;
                            case 'cancelled':
                                statusStyle = 'border-right: 4px solid #9E9E9E; background: rgba(158, 158, 158, 0.2); text-decoration: line-through; opacity: 0.7;';
                                statusIcon = '<i class="fas fa-times" style="color: #9E9E9E; margin-left: 5px;"></i>';
                                break;
                            default:
                                statusStyle = 'border-right: 4px solid var(--secondary-color); background: var(--primary-color);';
                                statusIcon = '';
                        }

                        // Helper to update status and close
                        window.updateLessonStatus = (status, isPaid) => {
                            const lessons = getLessons();
                            const idx = lessons.findIndex(l => l.id === lesson.id);
                            if (idx > -1) {
                                lessons[idx].status = status;
                                lessons[idx].isPaid = isPaid;

                                // If external test, save result if selected
                                if (lessons[idx].type === 'external_test') {
                                    const result = document.querySelector('input[name="testResult"]:checked');
                                    if (result) lessons[idx].testResult = result.value;
                                }

                                saveLessons(lessons);
                                modal.remove();
                                renderSchedule();

                                // If paid, offer invoice
                                if (isPaid && status !== 'completed_free') {
                                    // Directly show invoice modal without confirm
                                    showInvoiceModal(lessons[idx]);
                                }
                            }
                        };

                        document.getElementById('cancel-edit-lesson').addEventListener('click', () => modal.remove());

                        document.getElementById('edit-lesson-form').addEventListener('submit', (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            const lessons = getLessons();
                            const idx = lessons.findIndex(l => l.id === lesson.id);

                            if (idx !== -1) {
                                const updates = {
                                    studentId: formData.get('studentId'),
                                    type: formData.get('type'),
                                    duration: parseInt(formData.get('duration')) || 40,
                                    status: formData.get('status'),
                                    isPaid: formData.get('isPaid') === 'true'
                                };

                                // Handle test result
                                if (updates.type === 'external_test') {
                                    updates.testResult = formData.get('testResult');
                                } else {
                                    updates.testResult = null; // Clear result if not external test
                                }

                                lessons[idx] = { ...lessons[idx], ...updates };
                                saveLessons(lessons);
                                renderSchedule();
                            }
                            modal.remove();
                        });
                    }

                    function updateLessonStatus(id, status, testResult = null) {
                        const lessons = getLessons();
                        const idx = lessons.findIndex(l => l.id === id);
                        if (idx !== -1) {
                            lessons[idx].status = status;
                            if (testResult) lessons[idx].testResult = testResult;
                            saveLessons(lessons);
                            renderSchedule();
                            return lessons[idx];
                        }
                    }

                    // --- Invoices ---

                    function showInvoiceModal(lesson) {
                        const students = getStudents();
                        const student = students.find(s => s.id == lesson.studentId);

                        let amount = 0;
                        // Use student specific price if available, otherwise default
                        if (lesson.type === 'lesson') {
                            const basePrice = parseInt(student.priceLesson) || 200;
                            const duration = parseInt(lesson.duration) || 40;
                            amount = (duration / 40) * basePrice;
                        } else if (lesson.type === 'internal_test') {
                            amount = parseInt(student.priceInternalTest) || 200;
                        } else if (lesson.type === 'external_test') {
                            amount = parseInt(student.priceExternalTest) || 231;
                        }

                        const today = new Date().toISOString().split('T')[0];

                        const modal = document.createElement('div');
                        modal.className = 'modal';
                        modal.innerHTML = `
            <div class="modal-content">
                <h3>הפקת חשבונית</h3>
                <p>עבור: ${student ? student.name : 'תלמיד'}</p>
                <form id="invoice-form">
                    <div class="form-group"><label>תאריך תשלום</label><input type="date" name="date" value="${today}" required></div>
                    <div class="form-group"><label>סכום לתשלום</label><input type="number" name="amount" value="${amount}" required></div>
                    <div class="form-group">
                        <label>אמצעי תשלום</label>
                        <select name="method" required style="width: 100%; padding: 10px; background: #222; color: white; border: 1px solid #444; border-radius: 5px;">
                            <option value="cash">מזומן</option>
                            <option value="bit">ביט / אפליקציה</option>
                            <option value="transfer">העברה בנקאית</option>
                            <option value="check">צ'ק</option>
                        </select>
                    </div>
                    <div class="form-group"><label>פרטים נוספים</label><input type="text" name="details" placeholder="מספר אסמכתא / הערות"></div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" id="cancel-invoice-modal">ביטול</button>
                        <button type="submit" class="btn-primary">הפק ושלח</button>
                    </div>
                </form>
            </div>
            `;
                        document.body.appendChild(modal);
                        document.getElementById('cancel-invoice-modal').addEventListener('click', () => modal.remove());

                        document.getElementById('invoice-form').addEventListener('submit', (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            const invoice = {
                                id: Date.now(),
                                lessonId: lesson.id,
                                studentId: lesson.studentId,
                                date: formData.get('date'), // Use the selected date
                                amount: formData.get('amount'),
                                method: formData.get('method'),
                                details: formData.get('details')
                            };
                            saveInvoice(invoice);
                            modal.remove();
                            showInvoiceViewModal(invoice);
                        });
                    }

                    window.showInvoiceViewModal = function (invoice) {
                        if (typeof invoice === 'string') invoice = JSON.parse(invoice);
                        const students = getStudents();
                        const student = students.find(s => s.id == invoice.studentId);

                        // VAT Calculations
                        const totalAmount = parseFloat(invoice.amount);
                        const vatRate = 0.17;
                        const subtotal = totalAmount / (1 + vatRate);
                        const vatAmount = totalAmount - subtotal;

                        const modal = document.createElement('div');
                        modal.className = 'modal';
                        modal.style.zIndex = '2000';
                        modal.innerHTML = `
            <div class="modal-content" style="background: white; color: #333; max-width: 700px; padding: 0; overflow: hidden; border-radius: 4px;">
                <div style="padding: 40px; position: relative;">
                    <button id="close-invoice-view" style="position: absolute; top: 10px; left: 10px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: #666;">&times;</button>
                    
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px;">
                        <div style="text-align: right;">
                            <h2 style="margin: 0; color: #1a237e;">גבי הוראת נהיגה</h2>
                        </div>
                        <div style="text-align: left;">
                            <h4 style="margin: 0; color: #666;">עוסק מורשה 068795079</h4>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="margin: 0; color: #1a237e; font-size: 1.8em;">חשבונית מס / קבלה</h1>
                        <p style="color: #666; margin-top: 5px;">מספר ${invoice.id}</p>
                        <p style="color: #666; font-size: 0.9em;">מקור</p>
                    </div>

                    <!-- Details -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                        <div style="text-align: right;">
                            <h3 style="color: #1a237e; margin-bottom: 10px;">לכבוד</h3>
                            <div style="font-size: 1.1em; font-weight: bold;">${student ? student.name : ''}</div>
                            <div>${student ? student.phone : ''}</div>
                            <div>${student && student.address ? student.address : ''}</div>
                        </div>
                        <div style="text-align: left;">
                            <div style="margin-bottom: 5px;"><strong>תאריך:</strong> ${invoice.date}</div>
                            <div><strong>אמצעי תשלום:</strong> ${invoice.method === 'cash' ? 'מזומן' : invoice.method === 'bit' ? 'ביט/אפליקציה' : invoice.method === 'transfer' ? 'העברה' : "צ'ק"}</div>
                        </div>
                    </div>

                    <!-- Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 15px; text-align: right; border-bottom: 1px solid #ddd; color: #555;">תיאור השירות</th>
                                <th style="padding: 15px; text-align: left; border-bottom: 1px solid #ddd; color: #555;">סה"כ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 15px; border-bottom: 1px solid #eee;">
                                    ${invoice.details || 'שירותי הוראת נהיגה'}
                                </td>
                                <td style="padding: 15px; text-align: left; border-bottom: 1px solid #eee;">₪${subtotal.toFixed(2)}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style="padding: 10px 15px; text-align: right; color: #666;">סכום לפני מע"מ</td>
                                <td style="padding: 10px 15px; text-align: left; color: #666;">₪${subtotal.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 15px; text-align: right; color: #666;">מע"מ (17%)</td>
                                <td style="padding: 10px 15px; text-align: left; color: #666;">₪${vatAmount.toFixed(2)}</td>
                            </tr>
                            <tr style="background: #1a237e; color: white;">
                                <td style="padding: 15px; font-weight: bold;">סה"כ לתשלום</td>
                                <td style="padding: 15px; text-align: left; font-weight: bold; font-size: 1.2em;">₪${totalAmount.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Footer & Signature -->
                    <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <div style="text-align: center; width: 200px;">
                            <div style="border-bottom: 1px solid #ccc; margin-bottom: 10px; height: 60px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-family: 'Brush Script MT', cursive; font-size: 1.5em; color: #1a237e; transform: rotate(-5deg);">DriveMaster</span>
                            </div>
                            <div style="color: #888; font-size: 0.9em;">חתימה וחותמת דיגיטלית</div>
                        </div>
                        <div style="color: #999; font-size: 0.8em;">
                            הופק באמצעות מערכת DriveMaster
                        </div>
                    </div>
                </div>
                <div style="background: #f9f9f9; padding: 15px; border-top: 1px solid #eee; display: flex; justify-content: center; gap: 10px;">
                    <button class="btn-primary" onclick="window.print()" style="min-width: 120px;"><i class="fas fa-print"></i> הדפס</button>
                    <button class="btn-secondary" id="close-invoice-modal-btn" style="min-width: 120px; border-color: #ccc; color: #333;">סגור</button>
                </div>
            </div>
            `;
                        document.body.appendChild(modal);
                        const close = () => modal.remove();
                        document.getElementById('close-invoice-view').addEventListener('click', close);
                        document.getElementById('close-invoice-modal-btn').addEventListener('click', close);
                    }

                    function renderReports() {
                        contentArea.innerHTML = `
            <div class="reports-view">
                <div class="reports-header" style="background: var(--surface-dark); padding: 20px; border-radius: 10px; margin-bottom: 20px; display: flex; gap: 20px; align-items: end;">
                    <div class="form-group" style="margin-bottom: 0;"><label>מתאריך</label><input type="date" id="report-start-date"></div>
                    <div class="form-group" style="margin-bottom: 0;"><label>עד תאריך</label><input type="date" id="report-end-date"></div>
                    <button class="btn-primary" id="generate-report-btn">הפק דוח</button>
                </div>
                <div id="report-results" style="display: none;">
                    <div class="dashboard-view" style="margin-bottom: 30px;">
                        <div class="stat-card"><h3>סה"כ הכנסות</h3><p class="stat-number" id="report-total-income">₪0</p></div>
                        <div class="stat-card"><h3>מספר פעולות</h3><p class="stat-number" id="report-total-lessons">0</p></div>
                    </div>
                    <h3>פירוט תשלומים</h3>
                    <div class="student-list" id="report-payments-list" style="grid-template-columns: 1fr;"></div>
                </div>
            </div>
            `;

                        const date = new Date();
                        document.getElementById('report-start-date').valueAsDate = new Date(date.getFullYear(), date.getMonth(), 1);
                        document.getElementById('report-end-date').valueAsDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                        document.getElementById('generate-report-btn').addEventListener('click', () => {
                            const start = new Date(document.getElementById('report-start-date').value);
                            const end = new Date(document.getElementById('report-end-date').value);
                            const invoices = getInvoices().filter(inv => {
                                const d = new Date(inv.date);
                                return d >= start && d <= end;
                            });

                            document.getElementById('report-total-income').textContent = `₪${invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0).toLocaleString()}`;
                            document.getElementById('report-total-lessons').textContent = invoices.length;

                            const students = getStudents();
                            const methodMap = { 'cash': 'מזומן', 'bit': 'אפליקציה', 'transfer': 'העברה', 'check': "צ'ק" };

                            document.getElementById('report-payments-list').innerHTML = invoices.length === 0 ? '<p>לא נמצאו נתונים</p>' : invoices.map(inv => {
                                const s = students.find(st => st.id == inv.studentId);
                                return `
                    <div class="student-card" style="flex-direction: row; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 20px; align-items: center;">
                            <div style="font-weight: bold; min-width: 100px;">${inv.date}</div>
                            <div style="font-weight: bold;">${s ? s.name : 'לא ידוע'}</div>
                            <div style="color: #888;">${methodMap[inv.method] || inv.method}</div>
                            <div style="color: #888; font-size: 0.9em;">${inv.details || ''}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="font-weight: bold; font-size: 1.2em; color: var(--success-color);">₪${inv.amount}</div>
                            <button class="btn-icon" style="background: none; border: none; color: white; cursor: pointer;" onclick="window.showInvoiceViewModal(decodeURIComponent('${encodeURIComponent(JSON.stringify(inv))}'))"><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                `;
                            }).join('');
                            document.getElementById('report-results').style.display = 'block';
                        });
                    }

                    window.markLessonAsPaid = function (lessonId) {
                        if (!confirm('האם לסמן את השיעור כשולם?')) return;

                        const lessons = getLessons();
                        const lessonIndex = lessons.findIndex(l => l.id === lessonId);

                        if (lessonIndex > -1) {
                            lessons[lessonIndex].isPaid = true;
                            // Ensure status is completed if it wasn't already
                            if (lessons[lessonIndex].status === 'scheduled') {
                                lessons[lessonIndex].status = 'completed';
                            }
                            saveLessons(lessons);

                            // Refresh views
                            const studentId = lessons[lessonIndex].studentId;
                            // If the modal is open, refresh it
                            if (document.querySelector('.modal') && document.querySelector('.modal').style.display !== 'none') {
                                renderStudentDetailsModal(studentId);
                            }
                            renderSchedule();
                            renderDashboard();
                        }
                    };

                    window.openReceiptModal = function (studentId) {
                        const lessons = getLessons();
                        const studentLessons = lessons.filter(l => l.studentId === studentId && !l.isPaid && (l.status === 'completed' || l.status === 'cancelled_charged'));

                        if (studentLessons.length === 0) {
                            alert('אין שיעורים לתשלום עבור תלמיד זה.');
                            return;
                        }

                        const totalDebt = studentLessons.reduce((sum, l) => sum + (parseInt(l.price) || 190), 0); // Assuming 190 if price missing

                        const amountToPay = prompt(`יתרה לתשלום: ₪${totalDebt}\nהכנס סכום לתשלום (יסגור שיעורים מהישן לחדש):`, totalDebt);

                        if (amountToPay === null) return; // Cancelled

                        let remainingPayment = parseInt(amountToPay);
                        if (isNaN(remainingPayment) || remainingPayment <= 0) {
                            alert('סכום לא תקין');
                            return;
                        }

                        // Sort lessons by date (oldest first) to pay off debt in order
                        studentLessons.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

                        let paidCount = 0;
                        studentLessons.forEach(l => {
                            const price = parseInt(l.price) || 190;
                            if (remainingPayment >= price) {
                                const lessonIndex = lessons.findIndex(item => item.id === l.id);
                                if (lessonIndex > -1) {
                                    lessons[lessonIndex].isPaid = true;
                                    remainingPayment -= price;
                                    paidCount++;
                                }
                            }
                        });

                        saveLessons(lessons);
                        alert(`בוצע תשלום עבור ${paidCount} שיעורים.\nיתרה שנותרה מהתשלום: ₪${remainingPayment}`);

                        // Refresh views
                        renderStudentDetailsModal(studentId);
                        renderDashboard();
                    };
                });
