export const Modal = {
    show(title, contentHtml, onConfirm = null) {
        // Remove existing modal if any
        const existing = document.querySelector('.modal-overlay');
        if (existing) existing.remove();

        // Create Overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        // Create Modal Card
        // We inject the HTML into the card
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h3 style="margin:0;">${title}</h3>
                    <button class="btn-icon" id="modal-close-x"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    ${contentHtml}
                </div>
                ${onConfirm ? `
                <div class="form-actions" style="margin-top: 20px; display:flex; justify-content:flex-end; gap:10px;">
                    <button class="btn btn-secondary" id="modal-cancel">ביטול</button>
                    <button class="btn btn-primary" id="modal-confirm">אישור</button>
                </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        // Event Listeners
        const close = () => overlay.remove();

        // Close on X
        overlay.querySelector('#modal-close-x').onclick = close;

        // Close on Overlay Click (optional, but good UX)
        overlay.onclick = (e) => {
            if (e.target === overlay) close();
        };

        if (onConfirm) {
            overlay.querySelector('#modal-cancel').onclick = close;
            overlay.querySelector('#modal-confirm').onclick = async () => {
                // Determine if sync or async
                const result = onConfirm();
                if (result instanceof Promise) {
                    const valid = await result;
                    if (valid) close();
                } else {
                    if (result) close();
                }
            };
        }

        return overlay;
    }
};
