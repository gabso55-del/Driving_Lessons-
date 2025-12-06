# 📋 Google Apps Script - Setup Instructions

## Step 1: Open Google Apps Script Editor

1. Open your Google Sheets document
2. Click **Extensions** → **Apps Script**
3. Delete any existing code in `Code.gs`

## Step 2: Paste the Script

1. Copy the entire contents of `GoogleAppsScript.gs`
2. Paste into the Apps Script editor
3. Click **Save** (💾 icon)
4. Name your project: "Driving Instructor Backend"

## Step 3: Initialize Sheets

1. In Apps Script editor, select function: `testInitialize`
2. Click **Run** (▶️ icon)
3. **First time**: Click "Review permissions"
   - Click your Google account
   - Click "Advanced" → "Go to Driving Instructor Backend (unsafe)"
   - Click "Allow"
4. Check execution log - should see "All sheets initialized successfully!"

## Step 4: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click gear icon ⚙️ → **Web app**
3. Fill in settings:
   - **Description**: "Driving Instructor API v1"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click **Deploy**
5. Click **Authorize access** (if prompted)
6. **COPY THE WEB APP URL** (looks like: `https://script.google.com/macros/s/...`)

## Step 5: Update Frontend

1. Open `js/services/sheets.js`
2. Replace `SCRIPT_URL` with your new URL:
```javascript
SCRIPT_URL: 'YOUR_NEW_WEB_APP_URL_HERE',
```

## Step 6: Verify Setup

### Check Google Sheets
You should now see these tabs:
- ✅ **Students** (with sample data)
- ✅ **Deleted**
- ✅ **Test_Pass**
- ✅ **Legacy**
- ✅ **Lessons**
- ✅ **Audit_Log**

### Test in App
1. Refresh your app
2. Console should show: "✅ Connected to Google Sheets!"
3. Try adding a student
4. Check Google Sheets - student should appear in **Students** tab

## Troubleshooting

### Error: "Script function not found"
- Make sure you ran `testInitialize` first
- Redeploy the web app

### Error: "Authorization required"
- Re-run authorization in Apps Script editor
- Make sure "Who has access" is set to "Anyone"

### Sheets not created
- Run `testInitialize` function manually
- Check execution log for errors

## What Each Sheet Does

| Sheet | Purpose |
|-------|---------|
| **Students** | Active students currently taking lessons |
| **Deleted** | Archive of deleted students (not permanently removed) |
| **Test_Pass** | Students who successfully passed the driving test |
| **Legacy** | Old/migrated records from previous systems |
| **Lessons** | All lesson records |
| **Audit_Log** | Track all operations (moves, restores, etc.) |

## API Operations

### Fetch Data
```
GET: ?sheet=Students
GET: ?sheet=Deleted
GET: ?sheet=Test_Pass
```

### Save Data
```
POST: {
  "action": "save",
  "sheet": "Students",
  "data": [...]
}
```

### Move Student (Archive)
```
POST: {
  "action": "move",
  "studentId": "123",
  "fromSheet": "Students",
  "toSheet": "Deleted",
  "reason": "Student requested removal"
}
```

### Restore Student
```
POST: {
  "action": "restore",
  "studentId": "123",
  "fromSheet": "Deleted",
  "toSheet": "Students"
}
```

## Security Note

⚠️ **Important**: The script is set to "Anyone" access because it's a simple app. For production:
1. Add authentication tokens
2. Validate requests
3. Limit who can access
