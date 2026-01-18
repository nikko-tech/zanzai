/**
 * 鋼材残材管理システム - Google Apps Script
 * このコードをGoogle Apps Scriptにコピーして使用してください
 * 
 * 設定方法:
 * 1. Google スプレッドシートを作成
 * 2. 拡張機能 → Apps Script を開く
 * 3. このコードを貼り付け
 * 4. デプロイ → 新しいデプロイ → ウェブアプリ を選択
 * 5. アクセスできるユーザーを「全員」に設定
 * 6. デプロイしてURLを取得
 */

// スプレッドシートのシート名
const SHEET_NAMES = {
  DATA: '残材データ',
  MATERIALS: '材質マスター',
  LOCATIONS: '置き場マスター'
};

// データシートのヘッダー
const DATA_HEADERS = [
  'ID', '登録日時', '材質', '厚み(mm)', '幅(mm)', '長さ(mm)', 
  '置き場', '登録者', '状態', '使用日時', '使用者'
];

// デフォルト材質
const DEFAULT_MATERIALS = [
  'SUS304 NO1',
  'SUS304 2B',
  '酸洗',
  'SPCC',
  'ZAM',
  'SGC'
];

// デフォルト置き場
const DEFAULT_LOCATIONS = [
  'コンプレッサー下',
  'コマツ裏',
  '南側',
  'AMADA側'
];

/**
 * 初期設定 - 最初に1回実行してください
 */
function initialize() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // データシートの作成
  let dataSheet = ss.getSheetByName(SHEET_NAMES.DATA);
  if (!dataSheet) {
    dataSheet = ss.insertSheet(SHEET_NAMES.DATA);
    dataSheet.getRange(1, 1, 1, DATA_HEADERS.length).setValues([DATA_HEADERS]);
    dataSheet.getRange(1, 1, 1, DATA_HEADERS.length).setFontWeight('bold');
    dataSheet.setFrozenRows(1);
  }
  
  // 材質マスターシートの作成
  let materialSheet = ss.getSheetByName(SHEET_NAMES.MATERIALS);
  if (!materialSheet) {
    materialSheet = ss.insertSheet(SHEET_NAMES.MATERIALS);
    materialSheet.getRange(1, 1).setValue('材質名');
    materialSheet.getRange(1, 1).setFontWeight('bold');
    const materialsData = DEFAULT_MATERIALS.map(m => [m]);
    materialSheet.getRange(2, 1, materialsData.length, 1).setValues(materialsData);
  }
  
  // 置き場マスターシートの作成
  let locationSheet = ss.getSheetByName(SHEET_NAMES.LOCATIONS);
  if (!locationSheet) {
    locationSheet = ss.insertSheet(SHEET_NAMES.LOCATIONS);
    locationSheet.getRange(1, 1).setValue('置き場名');
    locationSheet.getRange(1, 1).setFontWeight('bold');
    const locationsData = DEFAULT_LOCATIONS.map(l => [l]);
    locationSheet.getRange(2, 1, locationsData.length, 1).setValues(locationsData);
  }
  
  Logger.log('初期設定が完了しました');
}

/**
 * GETリクエストの処理
 */
function doGet(e) {
  const action = e.parameter.action;
  let result;
  
  try {
    switch (action) {
      case 'test':
        result = { success: true, message: '接続成功' };
        break;
      case 'getData':
        result = getData();
        break;
      case 'getMaterials':
        result = getMaterials();
        break;
      case 'getLocations':
        result = getLocations();
        break;
      default:
        result = { success: false, message: '不明なアクション' };
    }
  } catch (error) {
    result = { success: false, message: error.message };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POSTリクエストの処理
 */
function doPost(e) {
  let result;
  
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const data = requestData.data;
    
    switch (action) {
      case 'register':
        result = registerItems(data);
        break;
      case 'update':
        result = updateItem(data);
        break;
      case 'delete':
        result = deleteItem(data);
        break;
      case 'move':
        result = moveItem(data);
        break;
      case 'use':
        result = useItems(data);
        break;
      case 'addMaterial':
        result = addMaterial(data);
        break;
      case 'addLocation':
        result = addLocation(data);
        break;
      default:
        result = { success: false, message: '不明なアクション' };
    }
  } catch (error) {
    result = { success: false, message: error.message };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 全データを取得
 */
function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DATA);
  
  if (!sheet) {
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, DATA_HEADERS.length).getValues();
  
  return data.map(row => ({
    id: row[0],
    registeredAt: row[1] ? new Date(row[1]).toISOString() : '',
    material: row[2],
    thickness: row[3],
    width: row[4],
    length: row[5],
    location: row[6],
    registeredBy: row[7],
    status: row[8] || 'available',
    usedAt: row[9] ? new Date(row[9]).toISOString() : null,
    usedBy: row[10] || null
  }));
}

/**
 * 残材を登録
 */
function registerItems(items) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DATA);
  
  if (!sheet) {
    throw new Error('データシートが見つかりません。initialize()を実行してください。');
  }
  
  const rows = items.map(item => [
    item.id,
    new Date(item.registeredAt),
    item.material,
    item.thickness,
    item.width,
    item.length,
    item.location,
    item.registeredBy,
    item.status || 'available',
    item.usedAt ? new Date(item.usedAt) : '',
    item.usedBy || ''
  ]);
  
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, DATA_HEADERS.length).setValues(rows);
  
  return { success: true, message: `${items.length}件を登録しました` };
}

/**
 * 残材を更新
 */
function updateItem(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DATA);
  
  const rowIndex = findRowById(sheet, data.id);
  if (rowIndex === -1) {
    throw new Error('データが見つかりません');
  }
  
  sheet.getRange(rowIndex, 3).setValue(data.material);  // 材質
  sheet.getRange(rowIndex, 4).setValue(data.thickness); // 厚み
  sheet.getRange(rowIndex, 5).setValue(data.width);     // 幅
  sheet.getRange(rowIndex, 6).setValue(data.length);    // 長さ
  sheet.getRange(rowIndex, 7).setValue(data.location);  // 置き場
  
  return { success: true, message: '更新しました' };
}

/**
 * 残材を削除
 */
function deleteItem(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DATA);
  
  const rowIndex = findRowById(sheet, data.id);
  if (rowIndex === -1) {
    throw new Error('データが見つかりません');
  }
  
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: '削除しました' };
}

/**
 * 置き場を移動
 */
function moveItem(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DATA);
  
  const rowIndex = findRowById(sheet, data.id);
  if (rowIndex === -1) {
    throw new Error('データが見つかりません');
  }
  
  sheet.getRange(rowIndex, 7).setValue(data.location);
  
  return { success: true, message: '移動しました' };
}

/**
 * 残材を使用済みにする
 */
function useItems(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DATA);
  
  const usedAt = new Date(data.usedAt);
  
  data.ids.forEach(id => {
    const rowIndex = findRowById(sheet, id);
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 9).setValue('used');      // 状態
      sheet.getRange(rowIndex, 10).setValue(usedAt);     // 使用日時
      sheet.getRange(rowIndex, 11).setValue(data.usedBy); // 使用者
    }
  });
  
  return { success: true, message: `${data.ids.length}件を使用済みにしました` };
}

/**
 * 材質リストを取得
 */
function getMaterials() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MATERIALS);
  
  if (!sheet) {
    return DEFAULT_MATERIALS;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return DEFAULT_MATERIALS;
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return data.map(row => row[0]).filter(m => m);
}

/**
 * 材質を追加
 */
function addMaterial(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MATERIALS);
  
  if (!sheet) {
    throw new Error('材質シートが見つかりません');
  }
  
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1).setValue(data.material);
  
  return { success: true, message: '材質を追加しました' };
}

/**
 * 置き場リストを取得
 */
function getLocations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LOCATIONS);
  
  if (!sheet) {
    return DEFAULT_LOCATIONS;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return DEFAULT_LOCATIONS;
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return data.map(row => row[0]).filter(l => l);
}

/**
 * 置き場を追加
 */
function addLocation(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LOCATIONS);
  
  if (!sheet) {
    throw new Error('置き場シートが見つかりません');
  }
  
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1).setValue(data.location);
  
  return { success: true, message: '置き場を追加しました' };
}

/**
 * IDで行を検索
 */
function findRowById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      return i + 2; // ヘッダー行を考慮
    }
  }
  return -1;
}
