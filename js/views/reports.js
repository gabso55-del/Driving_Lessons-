import { StorageService } from '../services/storage.js';
import { LogicService } from '../services/logic.js';

export async function renderReports(container) {
    const students = await StorageService.getStudents();
    const lessons = await StorageService.getLessons();

    // Calculations
    let totalIncome = 0;
    let totalDebt = 0;

    // Per Student Map to Aggregate
    const studentFinancials = students.map(s => {
        const sLessons = lessons.filter(l => l.studentId == s.id && l.status !== 'cancelled');
        let sPaid = 0;
        let sDebt = 0;

        sLessons.forEach(l => {
            const price = LogicService.getPrice(s, l.type);
            if (l.isPaid) {
                sPaid += price;
            } else {
                sDebt += price;
            }
        });

        return {
            ...s,
            paid: sPaid,
            debt: sDebt,
            total: sPaid + sDebt
        };
    });

    // Globals
    totalIncome = studentFinancials.reduce((acc, s) => acc + s.paid, 0);
    totalDebt = studentFinancials.reduce((acc, s) => acc + s.debt, 0);

    const html = `
        <div class="reports-view">
             <!-- Summary Cards -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="card stat-card" style="border-top: 4px solid var(--success-color);">
                    <h3>סך הכנסות (שולם)</h3>
                    <p class="stat-number" style="color:var(--success-color)">₪${totalIncome.toLocaleString()}</p>
                </div>
                <div class="card stat-card" style="border-top: 4px solid var(--danger-color);">
                    <h3>חוב פתוח</h3>
                    <p class="stat-number" style="color:var(--danger-color)">₪${totalDebt.toLocaleString()}</p>
                </div>
            </div>
            
            <h3 style="margin-bottom:10px;">פירוט לפי תלמיד</h3>
            <div class="card" style="padding:0; overflow:hidden;">
                <table style="width:100%; border-collapse: collapse; font-size:0.9em;">
                    <thead style="background:var(--surface-color-2);">
                        <tr style="color:#aaa;">
                            <th style="padding:15px; text-align:right;">שם</th>
                            <th style="padding:15px; text-align:center;">שולם</th>
                            <th style="padding:15px; text-align:center;">חוב</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentFinancials.map(s => `
                        <tr style="border-bottom: 1px solid #333;">
                            <td style="padding:15px;">${s.name}</td>
                            <td style="padding:15px; text-align:center; color:var(--success-color);">₪${s.paid}</td>
                            <td style="padding:15px; text-align:center; font-weight:bold; ${s.debt > 0 ? 'color:var(--danger-color);' : 'color:#555;'}">
                                ₪${s.debt}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
}
