import { StorageService } from './services/storage.js';

// Placeholder renders until files are created
const renderDashboard = (container) => container.innerHTML = '<h2>Dashboard Loading...</h2>';
const renderStudents = (container) => container.innerHTML = '<h2>Students Loading...</h2>';
const renderSchedule = (container) => container.innerHTML = '<h2>Schedule Loading...</h2>';
const renderReports = (container) => container.innerHTML = '<h2>Reports Loading...</h2>';

document.addEventListener('DOMContentLoaded', async () => {
    const contentArea = document.getElementById('content-area');
    const navItems = document.querySelectorAll('.nav-item');

    // Initialize Storage Service (connects to Google Sheets if configured)
    await StorageService.init();

    // Navigation logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;
            loadView(view);
        });
    });

    async function loadView(viewName) {
        contentArea.innerHTML = ''; // Clear current view

        switch (viewName) {
            case 'dashboard':
                await import('./views/dashboard.js').then(module => module.renderDashboard(contentArea)).catch(() => renderDashboard(contentArea));
                break;
            case 'students':
                await import('./views/students.js').then(module => module.renderStudents(contentArea)).catch(() => renderStudents(contentArea));
                break;
            case 'schedule':
                await import('./views/schedule.js').then(module => module.renderSchedule(contentArea)).catch(() => renderSchedule(contentArea));
                break;
            case 'reports':
                await import('./views/reports.js').then(module => module.renderReports(contentArea)).catch(() => renderReports(contentArea));
                break;
        }
    }

    // Initial Load
    loadView('dashboard');
});
