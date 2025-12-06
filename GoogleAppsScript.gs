/**
 * Driving Instructor App - Google Apps Script Backend
 * Multi-Tab Data Management with Archiving System
 * 
 * Sheets:
 * - Students: Active students
 * - Deleted: Archived deleted students
 * - Test_Pass: Students who passed the test
 * - Legacy: Old/migrated records
 * - Lessons: All lessons data
 * - Audit_Log: Track all operations
 */

// Initialize all required sheets on first run
function initializeAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ['Students', 'Deleted', 'Test_Pass', 'Legacy', 'Lessons', 'Audit_Log'];
  
  sheets.forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      initializeSheetHeaders(sheet, sheetName);
      Logger.log('Created sheet: ' + sheetName);
    }
  });
  
  return 'All sheets initialized successfully!';
}

// Set up headers for each sheet type
function initializeSheetHeaders(sheet, sheetName) {
  if (sheetName === 'Lessons') {
    sheet.getRange('A1:K1').setValues([[
      'id', 'studentId', 'date', 'time', 'type', 'status', 
      'isPaid', 'amount', 'notes', 'createdAt', 'updatedAt'
    ]]);
  } else if (sheetName === 'Audit_Log') {
    sheet.getRange('A1:F1').setValues([[
      'timestamp', 'action', 'studentId', 'fromSheet', 'toSheet', 'details'
    ]]);
  } else {
    // Students, Deleted, Test_Pass, Legacy
    sheet.getRange('A1:J1').setValues([[
      'id', 'name', 'phone', 'price', 'balance', 
      'archivedAt', 'archivedBy', 'archivedReason', 'notes', 'createdAt'
    ]]);
  }
  
  // Style headers
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
}

// Write to audit log
function writeAuditLog(action, studentId, fromSheet, toSheet, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let auditSheet = ss.getSheetByName('Audit_Log');
    
    if (!auditSheet) {
      auditSheet = ss.insertSheet('Audit_Log');
      initializeSheetHeaders(auditSheet, 'Audit_Log');
    }
    
    auditSheet.appendRow([
      new Date().toISOString(),
      action,
      studentId || '',
      fromSheet || '',
      toSheet || '',
      details || ''
    ]);
  } catch(e) {
    Logger.log('Audit log error: ' + e.message);
  }
}

// GET handler - Fetch data from sheets
function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return createErrorResponse('Missing parameters');
    }
    
    const sheetName = e.parameter.sheet || 'Students';
    const validSheets = ['Students', 'Deleted', 'Test_Pass', 'Legacy', 'Lessons'];
    
    if (!validSheets.includes(sheetName)) {
      return createErrorResponse('Invalid sheet name: ' + sheetName);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // Create sheet if doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      initializeSheetHeaders(sheet, sheetName);
      writeAuditLog('SHEET_CREATED', null, null, sheetName, 'Auto-created via doGet');
    }
    
    // Get all data
    const data = getSheetData(sheet);
    
    writeAuditLog('FETCH', null, sheetName, null, `Fetched ${data.length} records`);
    
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    Logger.log('doGet error: ' + error.message);
    return createErrorResponse('Error fetching data: ' + error.message);
  }
}

// POST handler - Save, Move, or Restore data
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createErrorResponse('Missing post data');
    }
    
    const params = JSON.parse(e.postData.contents);
    const action = params.action || 'save';
    
    switch(action) {
      case 'save':
        return handleSave(params);
      case 'move':
        return handleMove(params);
      case 'restore':
        return handleRestore(params);
      default:
        return createErrorResponse('Invalid action: ' + action);
    }
    
  } catch(error) {
    Logger.log('doPost error: ' + error.message);
    return createErrorResponse('Error processing request: ' + error.message);
  }
}

// Handle save operation
function handleSave(params) {
  try {
    const sheetName = params.sheet || 'Students';
    const data = params.data;
    
    if (!data || !Array.isArray(data)) {
      return createErrorResponse('Invalid data format');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      initializeSheetHeaders(sheet, sheetName);
    }
    
    // Clear existing data (except headers)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    
    // Write new data
    if (data.length > 0) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const rows = data.map(item => headers.map(header => item[header] || ''));
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    writeAuditLog('SAVE', null, null, sheetName, `Saved ${data.length} records`);
    
    return createSuccessResponse(`Successfully saved ${data.length} records to ${sheetName}`);
    
  } catch(error) {
    Logger.log('Save error: ' + error.message);
    return createErrorResponse('Save failed: ' + error.message);
  }
}

// Handle move operation (archive student)
function handleMove(params) {
  try {
    const studentId = params.studentId;
    const fromSheet = params.fromSheet || 'Students';
    const toSheet = params.toSheet; // 'Deleted', 'Test_Pass', or 'Legacy'
    const reason = params.reason || 'No reason provided';
    
    if (!studentId || !toSheet) {
      return createErrorResponse('Missing studentId or toSheet');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(fromSheet);
    let targetSheet = ss.getSheetByName(toSheet);
    
    if (!sourceSheet) {
      return createErrorResponse('Source sheet not found: ' + fromSheet);
    }
    
    if (!targetSheet) {
      targetSheet = ss.insertSheet(toSheet);
      initializeSheetHeaders(targetSheet, toSheet);
    }
    
    // Find student in source sheet
    const sourceData = getSheetData(sourceSheet);
    const studentIndex = sourceData.findIndex(s => String(s.id) === String(studentId));
    
    if (studentIndex === -1) {
      return createErrorResponse('Student not found: ' + studentId);
    }
    
    const student = sourceData[studentIndex];
    
    // Add archive metadata
    student.archivedAt = new Date().toISOString();
    student.archivedBy = 'system';
    student.archivedReason = reason;
    
    // Add to target sheet
    const targetHeaders = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
    const targetRow = targetHeaders.map(header => student[header] || '');
    targetSheet.appendRow(targetRow);
    
    // Remove from source sheet (row is studentIndex + 2 because of 0-index + header row)
    sourceSheet.deleteRow(studentIndex + 2);
    
    writeAuditLog('MOVE', studentId, fromSheet, toSheet, reason);
    
    return createSuccessResponse(`Student ${studentId} moved from ${fromSheet} to ${toSheet}`);
    
  } catch(error) {
    Logger.log('Move error: ' + error.message);
    return createErrorResponse('Move failed: ' + error.message);
  }
}

// Handle restore operation
function handleRestore(params) {
  try {
    const studentId = params.studentId;
    const fromSheet = params.fromSheet; // 'Deleted', 'Test_Pass', or 'Legacy'
    const toSheet = params.toSheet || 'Students';
    
    if (!studentId || !fromSheet) {
      return createErrorResponse('Missing studentId or fromSheet');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(fromSheet);
    const targetSheet = ss.getSheetByName(toSheet);
    
    if (!sourceSheet) {
      return createErrorResponse('Source sheet not found: ' + fromSheet);
    }
    
    if (!targetSheet) {
      return createErrorResponse('Target sheet not found: ' + toSheet);
    }
    
    // Find student in source sheet
    const sourceData = getSheetData(sourceSheet);
    const studentIndex = sourceData.findIndex(s => String(s.id) === String(studentId));
    
    if (studentIndex === -1) {
      return createErrorResponse('Student not found: ' + studentId);
    }
    
    const student = sourceData[studentIndex];
    
    // Remove archive metadata
    delete student.archivedAt;
    delete student.archivedBy;
    delete student.archivedReason;
    
    // Add to target sheet
    const targetHeaders = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
    const targetRow = targetHeaders.map(header => student[header] || '');
    targetSheet.appendRow(targetRow);
    
    // Remove from source sheet
    sourceSheet.deleteRow(studentIndex + 2);
    
    writeAuditLog('RESTORE', studentId, fromSheet, toSheet, 'Student restored');
    
    return createSuccessResponse(`Student ${studentId} restored from ${fromSheet} to ${toSheet}`);
    
  } catch(error) {
    Logger.log('Restore error: ' + error.message);
    return createErrorResponse('Restore failed: ' + error.message);
  }
}

// Helper: Get all data from a sheet as array of objects
function getSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return []; // No data, only headers
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  return data.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

// Helper: Create success response
function createSuccessResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper: Create error response
function createErrorResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      error: message,
      success: false
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test function - run this to initialize everything
function testInitialize() {
  const result = initializeAllSheets();
  Logger.log(result);
  
  // Add sample data to test
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentsSheet = ss.getSheetByName('Students');
  
  studentsSheet.appendRow([
    '1', 'Test Student', '0501234567', '150', '0',
    '', '', '', 'Test notes', new Date().toISOString()
  ]);
  
  Logger.log('Sample student added');
}
