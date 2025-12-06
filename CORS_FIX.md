# 🔧 Fix CORS Error - Google Apps Script

## הבעיה
```
Access-Control-Allow-Origin header is missing
```
זו בעיה ידועה של Google Apps Script עם POST requests.

## הפתרון - Deploy חדש!

### שלב 1: במסך Apps Script

1. לחץ **Deploy** → **Manage deployments**
2. **לא** ללחוץ על העיפרון (edit)!
3. במקום, לחץ **New deployment** (שוב)
4. בחר **Web app**
5. הגדרות:
   - Description: "v2 - CORS Fix"
   - Execute as: **Me**
   - Who has access: **Anyone**
6. **Deploy**

### שלב 2: העתק URL החדש

אתה תקבל URL חדש שנראה דומה אבל עם מזהה אחר בסוף.

### שלב 3: עדכן ב-sheets.js

```javascript
SCRIPT_URL: 'YOUR_NEW_URL_HERE',
```

### למה זה קורה?

Google Apps Script לא מוסיף CORS headers אוטומטית ל-deployments קיימים.
רק **deployment חדש** יכלול את ה-headers הנדרשים.

## אם זה עדיין לא עובד

אם גם אחרי deployment חדש יש בעיה, תצטרך להוסיף את הקוד הזה ל-Apps Script:

```javascript
function doPost(e) {
  // Add CORS headers
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Your existing code here...
  
  return output;
}

function doOptions(e) {
  return ContentService
    .createTextOutput()
    .setMimeType(ContentService.MimeType.JSON)
    .setContent(JSON.stringify({result: 'ok'}));
}
```

אבל בדרך כלל deployment חדש מספיק! 🎯
