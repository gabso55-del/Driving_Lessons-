import { StorageService } from '../services/storage.js';
import { StatsService } from '../services/stats.js';

export async function renderDashboard(container) {
    const students = await StorageService.getStudents();
    const lessons = await StorageService.getLessons();
    const today = new Date().toISOString().split('T')[0];

    // Core Stats
    const lessonsToday = lessons.filter(l => l.date === today).length;

    // Advanced Stats
    const anomalies = await StatsService.getAnomalies();
    const allStats = await StatsService.getAllStats();

    // Calculate global averages
    const totalTests = allStats.reduce((acc, s) => acc + s.totalInternal + s.totalExternal, 0);

    // Connection Button
    const isCloud = StorageService.useCloud;
    const connectBtn = isCloud
        ? `<div style="display:flex; gap:10px; justify-content:center; align-items:center;">
             <span style="color:var(--success-color); font-size:0.9em; display:inline-flex; align-items:center; gap:5px;">
               <i class="fas fa-check-circle"></i> מחובר לדרייב
             </span>
             <button id="btn-sync-now" class="btn btn-sm btn-secondary" style="background:white; color:#333; font-size:0.85em;">
               <i class="fas fa-sync"></i> סנכרן עכשיו
             </button>
           </div>`
        : `<button id="btn-connect-cloud" class="btn btn-sm btn-secondary" style="background:white; color:#333;"><i class="fab fa-google-drive" style="color:#34a853;"></i> התחבר לגיבוי</button>`;

    const html = `
        <div class="dashboard-view" style="padding:15px;">
            <!-- Header -->
            <div style="text-align:center; margin-bottom:20px;">
                <h1 style="margin:0; background:var(--primary-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:2.5rem;">DriveMaster</h1>
                <div style="margin-top:5px;">${connectBtn}</div>
            </div>

            <!-- Stats Grid -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="card stat-card" style="margin:0;">
                    <h3>היום</h3>
                    <p class="stat-number">${lessonsToday}</p>
                </div>
                <div class="card stat-card" style="margin:0;">
                    <h3>טסטים</h3>
                    <p class="stat-number" style="color:var(--accent-color)">${totalTests}</p>
                </div>
            </div>

            <!-- Shortcuts -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="btn btn-secondary" onclick="document.querySelector('[data-view=schedule]').click()">
                    <i class="fas fa-calendar-alt"></i> יומן
                </button>
                <button class="btn btn-secondary" onclick="document.querySelector('[data-view=students]').click()">
                    <i class="fas fa-user-friends"></i> תלמידים
                </button>
            </div>
            
            <!-- Logout Button -->
            <div style="text-align:center; margin-bottom:20px;">
                <button id="btn-logout" class="btn btn-secondary" style="background:#fff; color:#666; font-size:0.85em;">
                    <i class="fas fa-sign-out-alt"></i> התנתק
                </button>
            </div>

            <!-- Alerts -->
            ${anomalies.gaps.length > 0 ? `
            <div class="card" style="border-right: 4px solid var(--danger-color);">
                <h3 style="margin-top:0; color:var(--danger-color); font-size:1rem;"><i class="fas fa-bed"></i> תלמידים רדומים</h3>
                <ul style="padding-right: 20px; margin:0; font-size:0.9em;">
                    ${anomalies.gaps.map(s => `<li><strong>${s.student.name}</strong> (${s.daysSinceLastActivity} ימים)</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <!-- Recent Activity Table -->
            <h3 style="margin-bottom:10px;">סטטוס תלמידים</h3>
            <div class="card" style="padding:0; overflow:hidden;">
                <table style="width:100%; border-collapse: collapse; font-size:0.9em;">
                    <thead style="background:var(--surface-color-2); border-bottom:1px solid rgba(0,0,0,0.1);">
                        <tr>
                            <th style="padding:10px;">שם</th>
                            <th style="padding:10px; text-align:center;">ש'</th>
                            <th style="padding:10px; text-align:center;">מאזן</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allStats.slice(0, 5).map(s => `
                        <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <td style="padding:10px;">${s.student.name}</td>
                            <td style="padding:10px; text-align:center; font-weight:bold;">${s.totalLessons}</td>
                            <td style="padding:10px; text-align:center; color:${s.balance > 0 ? 'var(--danger-color)' : 'var(--success-color)'}">${s.balance > 0 ? '-' + s.balance : 'OK'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="text-align:center; padding:10px; font-size:0.8em; color:#888;">מציג 5 פעילים אחרונים</div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Attach Events
    const btnConnect = document.getElementById('btn-connect-cloud');
    if (btnConnect) {
        btnConnect.onclick = () => StorageService.connectCloud();
    }

    const btnSync = document.getElementById('btn-sync-now');
    if (btnSync) {
        btnSync.onclick = async () => {
            btnSync.disabled = true;
            btnSync.innerHTML = '<i class="fas fa-sync fa-spin"></i> מסנכרן...';
            await StorageService.forceSyncNow();
            btnSync.disabled = false;
            btnSync.innerHTML = '<i class="fas fa-sync"></i> סנכרן עכשיו';
        };
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.onclick = () => {
            if (confirm('בטוח שאתה רוצה להתנתק?')) {
                import('../services/auth.js').then(module => {
                    module.AuthService.logout();
                });
            }
        };
    }
}
