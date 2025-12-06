import { StorageService } from '../services/storage.js';
import { Modal } from '../components/modal.js';
import { LogicService } from '../services/logic.js'; // Ensure we can calculate prices

export async function renderStudents(container) {
    const studentsData = await StorageService.getStudents();
    const students = studentsData.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    const lessons = await StorageService.getLessons();

    // Default: Render List
    renderList();

    function renderList() {
        const html = `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2>רשימת תלמידים</h2>
                <button class="btn btn-primary" id="add-student-btn">
                    <i class="fas fa-plus"></i> הוסף
                </button>
            </div>
            
            <div class="student-list" style="display:grid; gap:15px;">
                ${students.length === 0 ? '<p style="text-align:center; color:#888;">אין תלמידים רשומים.</p>' : ''}
                ${students.map(s => {
            // Quick Balance Calc (Optional - can be removed if slow)
            const studentLessons = lessons.filter(l => l.studentId == s.id && !l.isPaid && l.status !== 'cancelled');
            const balance = studentLessons.reduce((sum, l) => sum + LogicService.getPrice(l.type, s), 0);

            return `
                    <div class="card student-card" data-id="${s.id}" style="cursor:pointer;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <h3 style="margin:0 0 5px 0;">${s.name}</h3>
                                <div style="color:var(--text-secondary); font-size:0.9em;">${s.phone}</div>
                            </div>
                            <div style="text-align:left;">
                                <div style="font-weight:bold; color:${balance > 0 ? 'var(--danger-color)' : 'var(--success-color)'}">
                                    ${balance > 0 ? `חוב: ₪${balance}` : 'הכל שולם'}
                                </div>
                                <button class="btn-icon edit-student-btn" data-id="${s.id}" style="margin-top:5px;"><i class="fas fa-edit"></i></button>
                            </div>
                        </div>
                    </div>`;
        }).join('')}
            </div>
        `;

        container.innerHTML = html;

        // Events
        container.querySelector('#add-student-btn').onclick = () => showStudentForm();

        // Card Click -> Details
        container.querySelectorAll('.student-card').forEach(card => {
            card.onclick = (e) => {
                // Determine if Edit button was clicked
                if (e.target.closest('.edit-student-btn')) {
                    e.stopPropagation();
                    const id = parseInt(e.target.closest('.edit-student-btn').dataset.id);
                    showStudentForm(students.find(s => s.id === id));
                } else {
                    const id = parseInt(card.dataset.id);
                    renderDetails(students.find(s => s.id === id));
                }
            };
        });
    }

    function renderDetails(student) {
        const studentLessons = lessons.filter(l => l.studentId == student.id).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
        const unpaidLessons = studentLessons.filter(l => !l.isPaid && l.status !== 'cancelled');
        const balance = unpaidLessons.reduce((sum, l) => sum + LogicService.getPrice(l.type, student), 0);

        let balanceLabel = 'יתרה';
        let balanceColor = 'var(--text-primary)';
        let balanceText = '₪0';

        if (balance > 0) {
            balanceLabel = 'חוב לתשלום';
            balanceColor = 'var(--danger-color)';
            balanceText = `₪${balance}`;
        } else if (balance < 0) {
            balanceLabel = 'יתרת זכות';
            balanceColor = 'var(--success-color)';
            balanceText = `₪${Math.abs(balance)}`;
        } else {
            balanceLabel = 'סטטוס חשבון';
            balanceColor = 'var(--success-color)'; // Green for balanced
            balanceText = 'מאוזן (0)';
        }

        const html = `
            <div class="view-header" style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
                <button class="btn-icon" id="back-btn"><i class="fas fa-arrow-right"></i></button>
                <h2 style="margin:0;">${student.name}</h2>
            </div>
            
            <div class="card stat-card" style="flex-direction:row; justify-content:space-between; align-items:center;">
                <div>
                    <div style="color:var(--text-secondary); font-size:0.9rem;">${balanceLabel}</div>
                    <div class="stat-number" style="color:${balanceColor}">${balanceText}</div>
                </div>
                <div style="text-align:left; font-size:0.9rem;">
                    <div><i class="fas fa-phone"></i> ${student.phone}</div>
                    ${student.email ? `<div><i class="fas fa-envelope"></i> ${student.email}</div>` : ''}
                    ${student.idNumber ? `<div><i class="fas fa-id-card"></i> ${student.idNumber}</div>` : ''}
                    <button class="btn btn-sm btn-secondary" id="edit-curr-student" style="margin-top:10px;">עריכה</button>
                </div>
            </div>

            <h3>היסטוריית שיעורים</h3>
            <div class="lesson-history-list" style="display:grid; gap:10px;">
                ${studentLessons.map(l => {
            const price = LogicService.getPrice(l.type, student);
            const isPaid = l.isPaid;
            return `
                    <div class="card" style="padding:10px; margin:0; border-right: 4px solid ${isPaid ? 'var(--success-color)' : 'var(--danger-color)'};">
                        <div style="display:flex; justify-content:space-between;">
                            <div>
                                <strong>${l.date} | ${l.time}</strong>
                                <div>${l.type === 'lesson' ? 'שיעור' : (l.type === 'internal_test' ? 'פנימי' : 'טסט')}</div>
                            </div>
                            <div style="text-align:left;">
                                <div>₪${price}</div>
                                <div style="font-size:0.8em; color:${isPaid ? 'var(--success-color)' : 'var(--danger-color)'}">
                                    ${isPaid ? 'שולם' : 'לא שולם'}
                                </div>
                            </div>
                        </div>
                    </div>`;
        }).join('')}
                ${studentLessons.length === 0 ? '<p>אין שיעורים עדיין.</p>' : ''}
            </div>
        `;

        container.innerHTML = html;

        container.querySelector('#back-btn').onclick = () => renderList();
        container.querySelector('#edit-curr-student').onclick = () => showStudentForm(student);
    }

    // Helper: Form Modal
    function showStudentForm(student = null) {
        const isEdit = !!student;
        const formHtml = `
            <form id="student-form">
                ${!isEdit && ('contacts' in navigator && 'ContactsManager' in window) ? `
                <div style="margin-bottom:15px;">
                    <button type="button" class="btn btn-secondary" id="import-contact-btn" style="width:100%;">
                        <i class="fas fa-address-book"></i> ייבא מאנשי הקשר
                    </button>
                </div>` : ''}

                <div class="form-group"><label>שם מלא</label><input type="text" name="name" id="field-name" value="${student?.name || ''}" required></div>
                <div class="form-group"><label>תעודת זהות</label><input type="text" name="idNumber" value="${student?.idNumber || ''}" placeholder="מספר זהות"></div>
                <div class="form-group"><label>אימייל (לחשבוניות)</label><input type="email" name="email" value="${student?.email || ''}" placeholder="email@example.com"></div>
                <div class="form-group"><label>טלפון</label><input type="tel" name="phone" id="field-phone" value="${student?.phone || ''}" required></div>
                <div class="form-group"><label>מחיר לשיעור</label><input type="number" name="priceLesson" value="${student?.priceLesson || ''}" placeholder="200"></div>
                <div class="form-group"><label>מחיר פנימי</label><input type="number" name="priceInternalTest" value="${student?.priceInternalTest || ''}" placeholder="200"></div>
                <div class="form-group"><label>מחיר טסט</label><input type="number" name="priceExternalTest" value="${student?.priceExternalTest || ''}" placeholder="500"></div>
            </form>
        `;

        Modal.show(isEdit ? 'עריכת תלמיד' : 'תלמיד חדש', formHtml, async () => {
            const form = document.getElementById('student-form');
            if (!form.reportValidity()) return false;
            const formData = new FormData(form);
            const newStudent = {
                id: student?.id || Date.now(),
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                idNumber: formData.get('idNumber'),
                priceLesson: formData.get('priceLesson'),
                priceInternalTest: formData.get('priceInternalTest'),
                priceExternalTest: formData.get('priceExternalTest'),
            };

            let allStudents = await StorageService.getStudents();
            if (isEdit) {
                const idx = allStudents.findIndex(s => s.id === student.id);
                allStudents[idx] = newStudent;
            } else {
                allStudents.push(newStudent);
            }
            await StorageService.saveStudents(allStudents);
            renderStudents(container); // Full Refresh
            return true;
        });

        // Contact Picker Logic
        const importBtn = document.getElementById('import-contact-btn');
        if (importBtn) {
            importBtn.onclick = async () => {
                try {
                    const props = ['name', 'tel'];
                    const contacts = await navigator.contacts.select(props, { multiple: false });

                    if (contacts.length) {
                        const contact = contacts[0];
                        if (contact.name && contact.name.length) {
                            document.getElementById('field-name').value = contact.name[0];
                        }
                        if (contact.tel && contact.tel.length) {
                            // Simple normalize - remove spaces/dashes if you want, or keep raw
                            document.getElementById('field-phone').value = contact.tel[0];
                        }
                    }
                } catch (ex) {
                    console.error('Contact picker failed', ex);
                    // Fallback or alert if needed
                    alert('לא ניתן לגשת לאנשי הקשר (נתמך רק בטלפון)');
                }
            };
        }
    }
}
