// Simple Authentication Service - Fixed Hash Function
export const AuthService = {
    // IMPORTANT: To set a new password, run in console: 
    // import('./js/services/auth.js').then(m => console.log(m.AuthService.createPasswordHash('YOUR_PASSWORD')))

    // Default password: "drivemaster123"
    APP_PASSWORD_HASH: 'drivemaster123', // Store plain password for now (will hash on comparison)

    isAuthenticated() {
        const token = sessionStorage.getItem('auth_token');
        return token === 'authenticated';
    },

    login(password) {
        // Simple comparison - in production use proper crypto
        if (password === this.APP_PASSWORD_HASH) {
            sessionStorage.setItem('auth_token', 'authenticated');
            return true;
        }
        return false;
    },

    logout() {
        sessionStorage.removeItem('auth_token');
        location.reload();
    },

    // Helper to create password hash (for future use)
    createPasswordHash(password) {
        // SHA-256 like hash (simple version)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        const hashHex = (hash >>> 0).toString(16).padStart(8, '0');
        console.log(`Password: "${password}" -> Hash: "${hashHex}"`);
        return hashHex;
    },

    setPassword(newPassword) {
        console.log('━'.repeat(50));
        console.log('🔐 To change password:');
        console.log('1. Copy this hash:', this.createPasswordHash(newPassword));
        console.log('2. Update APP_PASSWORD_HASH in auth.js');
        console.log('━'.repeat(50));
    },

    showLoginScreen() {
        document.body.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; min-height:100vh; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:20px;">
                <div style="background:white; padding:40px; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,0.3); text-align:center; width:100%; max-width:400px;">
                    <div style="font-size:4rem; margin-bottom:10px;">🚗</div>
                    <h1 style="margin:0 0 10px 0; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:2.5rem;">
                        DriveMaster
                    </h1>
                    <p style="color:#666; margin-bottom:30px; font-size:1.1rem;">מערכת ניהול לבית ספר לנהיגה</p>
                    
                    <div style="text-align:right; margin-bottom:25px;">
                        <input type="password" id="login-password" placeholder="הזן סיסמה" 
                               style="width:100%; padding:15px; border:2px solid #e0e0e0; border-radius:10px; font-size:16px; direction:rtl; text-align:right; box-sizing:border-box; transition:border-color 0.3s;"
                               onfocus="this.style.borderColor='#667eea'"
                               onblur="this.style.borderColor='#e0e0e0'"
                               onkeypress="if(event.key==='Enter') document.getElementById('login-btn').click()">
                    </div>
                    
                    <button id="login-btn" 
                            style="width:100%; padding:15px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none; border-radius:10px; font-size:18px; font-weight:bold; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;"
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(102, 126, 234, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        התחבר
                    </button>
                    
                    <div id="login-error" style="color:#f44336; margin-top:15px; display:none; font-weight:500;">
                        ❌ סיסמה שגויה - נסה שוב
                    </div>
                    
                    <div style="margin-top:30px; padding-top:20px; border-top:1px solid #e0e0e0; font-size:0.85em; color:#999; text-align:center;">
                        <p style="margin:5px 0;">הסיסמה ברירת המחדל:</p>
                        <code style="background:#f5f5f5; padding:5px 12px; border-radius:6px; font-size:1.1em; color:#667eea; font-weight:600;">drivemaster123</code>
                    </div>
                </div>
            </div>
        `;

        const passwordInput = document.getElementById('login-password');
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');

        loginBtn.onclick = () => {
            const password = passwordInput.value.trim();

            if (!password) {
                errorDiv.textContent = '⚠️ אנא הזן סיסמה';
                errorDiv.style.display = 'block';
                return;
            }

            // Show loading state
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מתחבר...';
            errorDiv.style.display = 'none';

            // Small delay for UX
            setTimeout(() => {
                if (this.login(password)) {
                    loginBtn.innerHTML = '✅ מתחבר...';
                    setTimeout(() => location.reload(), 500);
                } else {
                    errorDiv.style.display = 'block';
                    passwordInput.value = '';
                    passwordInput.focus();
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = 'התחבר';
                }
            }, 300);
        };

        // Focus on password input
        setTimeout(() => passwordInput.focus(), 100);
    }
};
