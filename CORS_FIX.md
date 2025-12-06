# 🔧 CRITICAL FIX - CORS Headers

## הבעיה שזיהינו
Google Apps Script לא מטפל ב-OPTIONS requests (CORS preflight) אוטומטית.

## התיקון - עדכן את ה-Apps Script

### הוסף את הפונקציה הזו לסקריפט שלך:

```javascript
// OPTIONS handler - Handle CORS preflight requests
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

**איפה להוסיף?** מיד אחרי `doGet()` ולפני `doPost()`.

### שלבי התיקון:

1. **פתח Apps Script**
   - Extensions → Apps Script

2. **הוסף את `doOptions`**
   - העתק את הפונקציה למעלה
   - הדבק מיד אחרי `doGet()`

3. **שמור** (Ctrl+S)

4. **Deploy חדש שוב!**
   - Deploy → New deployment
   - Web app → Anyone  
   - תקבל URL **חדש** (שלישי)
   - העתק אותו

5. **עדכן `sheets.js`** עם ה-URL החדש

## למה זה קורה?

כשהדפדפן שולח POST request לdomain אחר (Netlify → Google), הוא:
1. **שולח OPTIONS request קודם** (preflight)
2. בודק אם השרת מאפשר CORS
3. רק אז שולח את ה-POST

**בלי `doOptions()`** - Apps Script לא יודע לטפל ב-OPTIONS → CORS נכשל!

## זה התיקון הסופי! 🎯

אחרי זה הכל אמור לעבוד בצורה מושלמת.
