# מדריך התקנה - אפליקציית מורה נהיגה 🚗

## שיטה 1: שמירת נתונים ב-Google Sheets (מומלץ!)

### חלק א': יצירת Google Apps Script

#### שלב 1: יצירת Google Spreadsheet חדש
1. היכנס ל-[Google Drive](https://drive.google.com)
2. לחץ על **חדש** (New) ← **Google Sheets** ← **גיליון ריק** (Blank spreadsheet)
3. תן לקובץ שם, למשל: **"נתוני תלמידי נהיגה"**

#### שלב 2: פתיחת עורך הסקריפט
1. בגיליון שיצרת, לחץ על **הרחבות** (Extensions) בתפריט העליון
2. בחר **Apps Script**
3. יפתח לך חלון חדש עם עורך קוד

#### שלב 3: הדבקת הקוד
1. מחק את כל הטקסט שכתוב שם (הפונקציה `myFunction`)
2. העתק והדבק את הקוד הבא:

```javascript
// Google Apps Script Backend for DrivingInstructor App
// Deploy this as a Web App and copy the URL to your frontend

// Configuration - Sheet names
const SHEETS = {
  STUDENTS: 'Students',
  LESSONS: 'Lessons'
};

// Main handler for GET requests (reading data)
function doGet(e) {
  try {
    // Check if parameters exist
    if (!e || !e.parameter || !e.parameter.sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Missing required parameter: sheet'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = e.parameter.sheet;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ws = ss.getSheetByName(sheet);
    
    if (!ws) {
      return ContentService.createTextOutput(JSON.stringify({
        error: `Sheet "${sheet}" not found`
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = ws.getDataRange().getValues();
    if (data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString(),
      details: 'Error in doGet function'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Main handler for POST requests (writing data)
function doPost(e) {
  try {
    // Check if post data exists
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Missing post data'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const params = JSON.parse(e.postData.contents);
    
    if (!params.sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Missing required parameter: sheet'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = params.sheet;
    const data = params.data;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let ws = ss.getSheetByName(sheet);
    
    // Create sheet if it doesn't exist
    if (!ws) {
      ws = ss.insertSheet(sheet);
    }
    
    // Clear existing data
    ws.clear();
    
    if (!data || data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Sheet cleared'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Prepare rows
    const rows = [headers];
    data.forEach(item => {
      const row = headers.map(h => item[h] !== undefined ? item[h] : '');
      rows.push(row);
    });
    
    // Write to sheet
    ws.getRange(1, 1, rows.length, headers.length).setValues(rows);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: `${data.length} rows saved to ${sheet}`
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString(),
      details: 'Error in doPost function'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Initialize spreadsheet with headers (run this once manually if needed)
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Students sheet
  let studentsSheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (!studentsSheet) {
    studentsSheet = ss.insertSheet(SHEETS.STUDENTS);
    studentsSheet.appendRow([
      'id', 'name', 'phone', 'email', 'idNumber', 
      'priceLesson', 'priceInternalTest', 'priceExternalTest'
    ]);
  }
  
  // Lessons sheet
  let lessonsSheet = ss.getSheetByName(SHEETS.LESSONS);
  if (!lessonsSheet) {
    lessonsSheet = ss.insertSheet(SHEETS.LESSONS);
    lessonsSheet.appendRow([
      'id', 'studentId', 'date', 'time', 'type', 'status', 
      'isPaid', 'paymentMethod', 'amountPaid', 'paymentReference', 
      'paymentApp', 'paymentBank'
    ]);
  }
  
  Logger.log('Sheets initialized successfully!');
  return 'Sheets initialized successfully!';
}
```

3. לחץ על **שמור** (איקון הדיסקט) או `Ctrl+S`
4. תן לפרויקט שם, למשל: **"DrivingApp Backend"**

#### שלב 4: הרצת פונקציית האתחול (חובה!)
1. בתפריט הנפתח למעלה (ליד כפתור ה-Run), בחר את הפונקציה **`initializeSheets`**
2. לחץ על **Run** (הכפתור עם ה-Play)
3. תתבקש לאשר הרשאות:
   - לחץ **Review permissions**
   - בחר את חשבון ה-Google שלך
   - לחץ **Advanced** (מתקדם)
   - לחץ **Go to [שם הפרויקט] (unsafe)** 
   - לחץ **Allow** (אשר)
4. חכה עד שהפונקציה תסיים לרוץ (יופיע "Execution completed")
5. חזור לגיליון Google Sheets - אמורים להיווצר 2 טאבים חדשים: **Students** ו-**Lessons**

#### שלב 5: פרסום הסקריפט כ-Web App
1. חזור לעורך Apps Script
2. לחץ על **Deploy** (פריסה) בפינה הימנית העליונה
3. בחר **New deployment** (פריסה חדשה)
4. לחץ על **⚙️ סמל הגלגל השיניים** ליד "Select type"
5. בחר **Web app**
6. הגדר את הפרטים הבאים:
   - **Description**: תן שם, למשל "v1.0"
   - **Execute as**: בחר **Me** (אני)
   - **Who has access**: בחר **Anyone** (כל אחד)
7. לחץ **Deploy** (פרסם)
8. **העתק את ה-URL שמופיע!** (זה חשוב מאוד!)
   - הכתובת תיראה כך: `https://script.google.com/macros/s/AKfycby.../exec`

### חלק ב': חיבור האפליקציה ל-Apps Script

#### שלב 6: הדבקת ה-URL באפליקציה
1. פתח את הקובץ: `js/services/sheets.js`
2. מצא את השורה עם `SCRIPT_URL`
3. הדבק את ה-URL שהעתקת בשלב 5:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
```

4. שמור את הקובץ

### חלק ג': בדיקה שהכל עובד
1. פתח את האפליקציה בדפדפן (פתח את הקובץ `index.html`)
2. נסה להוסיף תלמיד חדש
3. חזור לגיליון Google Sheets ורענן - אמור להופיע שם התלמיד!

---

## שיטה 2: שמירה מקומית בדפדפן (פשוט יותר אבל פחות מומלץ)

אם אתה רוצה רק לבדוק את האפליקציה או להשתמש בה במכשיר אחד:
- פשוט פתח את הקובץ `index.html` בדפדפן
- הנתונים יישמרו ב-LocalStorage של הדפדפן
- **חסרון**: הנתונים לא יסתנכרנו בין מכשירים שונים

---

## פתרון בעיות נפוצות

### שגיאה: "Cannot read properties of undefined"
- ודא שהרצת את הפונקציה `initializeSheets` בשלב 4
- ודא שהעתקת את ה-URL המלא מהפריסה

### הנתונים לא נשמרים
- בדוק שה-URL ב-`sheets.js` נכון
- ודא ש-"Who has access" מוגדר ל-"Anyone"
- נסה לפרסם גרסה חדשה (Deploy → Manage deployments → New version)

### האפליקציה לא נפתחת
- ודא שפתחת את `index.html` ולא קובץ אחר
- נסה לפתוח בדפדפן אחר (Chrome מומלץ)

---

**🎉 סיימת! האפליקציה שלך מוכנה לשימוש!**
