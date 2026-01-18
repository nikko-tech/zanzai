/**
 * 鋼材残材管理システム - フロントエンド JavaScript
 * Steel Scrap Management System
 */

// ========================================
// グローバル変数と設定
// ========================================

const CONFIG = {
    STORAGE_KEYS: {
        MATERIALS: 'zanzai_materials',
        LOCATIONS: 'zanzai_locations',
        REGISTER_NAME: 'zanzai_register_name',
        USER_NAME: 'zanzai_user_name',
        SCRIPT_URL: 'zanzai_script_url',
        DATA: 'zanzai_data'
    },
    DEFAULT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwwxObsk5wJYS-WDIDmXxvh-wle3NfHKOGCSuCI-guH2knRxoiXBpgyQvX-UP84wAA/exec',
    DEFAULT_MATERIALS: [
        'SUS304 NO1',
        'SUS304 2B',
        '酸洗',
        'SPCC',
        'ZAM',
        'SGC'
    ],
    DEFAULT_LOCATIONS: [
        'コンプレッサー下',
        'コマツ裏',
        '南側',
        'AMADA側'
    ]
};

// アプリケーション状態
let state = {
    materials: [],
    locations: [],
    data: [],
    registerItems: 1,
    selectedItems: new Set(),
    scriptUrl: ''
};

// ========================================
// 初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadFromStorage();
    setupEventListeners();
    renderAll();
    addRegisterRow(); // 最初の1行を追加
}

// ========================================
// LocalStorage 管理
// ========================================

function loadFromStorage() {
    // 材質リスト
    const storedMaterials = localStorage.getItem(CONFIG.STORAGE_KEYS.MATERIALS);
    state.materials = storedMaterials 
        ? JSON.parse(storedMaterials) 
        : [...CONFIG.DEFAULT_MATERIALS];

    // 置き場リスト
    const storedLocations = localStorage.getItem(CONFIG.STORAGE_KEYS.LOCATIONS);
    state.locations = storedLocations 
        ? JSON.parse(storedLocations) 
        : [...CONFIG.DEFAULT_LOCATIONS];

    // 登録者名
    const registerName = localStorage.getItem(CONFIG.STORAGE_KEYS.REGISTER_NAME);
    if (registerName) {
        document.getElementById('register-name').value = registerName;
    }

    // 使用者名
    const userName = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME);
    if (userName) {
        document.getElementById('user-name').value = userName;
    }

    // スクリプトURL
    state.scriptUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.SCRIPT_URL) || CONFIG.DEFAULT_SCRIPT_URL;
    document.getElementById('script-url').value = state.scriptUrl;

    // データ（オフライン用）
    const storedData = localStorage.getItem(CONFIG.STORAGE_KEYS.DATA);
    state.data = storedData ? JSON.parse(storedData) : [];
}

function saveToStorage(key, value) {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
}

// ========================================
// イベントリスナー設定
// ========================================

function setupEventListeners() {
    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 登録タブ
    document.getElementById('add-row-btn').addEventListener('click', addRegisterRow);
    document.getElementById('remove-row-btn').addEventListener('click', removeRegisterRow);
    document.getElementById('register-btn').addEventListener('click', registerItems);
    
    // 名前の記憶
    document.getElementById('register-name').addEventListener('blur', () => {
        if (document.getElementById('remember-register-name').checked) {
            saveToStorage(CONFIG.STORAGE_KEYS.REGISTER_NAME, document.getElementById('register-name').value);
        }
    });

    document.getElementById('user-name').addEventListener('blur', () => {
        if (document.getElementById('remember-user-name').checked) {
            saveToStorage(CONFIG.STORAGE_KEYS.USER_NAME, document.getElementById('user-name').value);
        }
    });

    // 検索タブ
    document.getElementById('search-btn').addEventListener('click', searchItems);
    document.getElementById('use-selected-btn').addEventListener('click', useSelectedItems);

    // 一覧タブ
    document.getElementById('apply-filter-btn').addEventListener('click', applyFilter);

    // 設定タブ
    document.getElementById('add-material-btn').addEventListener('click', addMaterial);
    document.getElementById('add-location-btn').addEventListener('click', addLocation);
    document.getElementById('save-url-btn').addEventListener('click', saveScriptUrl);
    document.getElementById('test-connection-btn').addEventListener('click', testConnection);

    // 新しい材質・置き場のEnterキー対応
    document.getElementById('new-material').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addMaterial();
    });
    document.getElementById('new-location').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addLocation();
    });

    // モーダル
    document.getElementById('close-edit-modal').addEventListener('click', () => closeModal('edit-modal'));
    document.getElementById('cancel-edit-btn').addEventListener('click', () => closeModal('edit-modal'));
    document.getElementById('save-edit-btn').addEventListener('click', saveEdit);

    document.getElementById('close-move-modal').addEventListener('click', () => closeModal('move-modal'));
    document.getElementById('cancel-move-btn').addEventListener('click', () => closeModal('move-modal'));
    document.getElementById('confirm-move-btn').addEventListener('click', confirmMove);

    // モーダル外クリックで閉じる
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
}

// ========================================
// タブ切り替え
// ========================================

function switchTab(tabId) {
    // タブボタンのアクティブ状態を更新
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // タブコンテンツの表示を更新
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });

    // タブ切り替え時の追加処理
    if (tabId === 'list') {
        loadDataList();
    }
}

// ========================================
// 登録機能
// ========================================

function addRegisterRow() {
    const container = document.getElementById('register-items');
    const rowIndex = container.children.length + 1;
    
    // 前の行の材質と置き場を取得
    let previousMaterial = '';
    let previousLocation = '';
    if (rowIndex > 1) {
        const prevRow = container.children[rowIndex - 2];
        previousMaterial = prevRow.querySelector('.material-select').value;
        previousLocation = prevRow.querySelector('.location-select').value;
    }

    const row = document.createElement('div');
    row.className = 'register-item';
    row.innerHTML = `
        <div class="register-item-header">
            <span class="register-item-title">残材 ${rowIndex}</span>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>材質</label>
                <select class="material-select">
                    <option value="">選択してください</option>
                    ${state.materials.map(m => `<option value="${m}" ${m === previousMaterial ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>置き場</label>
                <select class="location-select">
                    <option value="">選択してください</option>
                    ${state.locations.map(l => `<option value="${l}" ${l === previousLocation ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="dimension-inputs">
            <div class="dimension-input">
                <label>厚み (mm)</label>
                <input type="number" class="thickness-input" placeholder="0.0" step="0.1" min="0">
            </div>
            <div class="dimension-input">
                <label>幅 (mm)</label>
                <input type="number" class="width-input" placeholder="0" min="0">
            </div>
            <div class="dimension-input">
                <label>長さ (mm)</label>
                <input type="number" class="length-input" placeholder="0" min="0">
            </div>
        </div>
    `;

    // 材質変更時に次の行に引き継ぐ
    row.querySelector('.material-select').addEventListener('change', (e) => {
        updateFollowingMaterials(row, e.target.value);
    });

    row.querySelector('.location-select').addEventListener('change', (e) => {
        updateFollowingLocations(row, e.target.value);
    });

    container.appendChild(row);
    state.registerItems = rowIndex;
    updateRowNumbers();
}

function updateFollowingMaterials(currentRow, value) {
    // 現在の行以降の行の材質を更新（空の場合のみ）
    let foundCurrent = false;
    document.querySelectorAll('.register-item').forEach(row => {
        if (row === currentRow) {
            foundCurrent = true;
            return;
        }
        if (foundCurrent) {
            const select = row.querySelector('.material-select');
            if (!select.value) {
                select.value = value;
            }
        }
    });
}

function updateFollowingLocations(currentRow, value) {
    let foundCurrent = false;
    document.querySelectorAll('.register-item').forEach(row => {
        if (row === currentRow) {
            foundCurrent = true;
            return;
        }
        if (foundCurrent) {
            const select = row.querySelector('.location-select');
            if (!select.value) {
                select.value = value;
            }
        }
    });
}

function removeRegisterRow() {
    const container = document.getElementById('register-items');
    if (container.children.length > 1) {
        container.removeChild(container.lastChild);
        state.registerItems--;
        updateRowNumbers();
    } else {
        showToast('最低1行は必要です', 'warning');
    }
}

function updateRowNumbers() {
    document.querySelectorAll('.register-item').forEach((item, index) => {
        item.querySelector('.register-item-title').textContent = `残材 ${index + 1}`;
    });
}

async function registerItems() {
    const registerName = document.getElementById('register-name').value.trim();
    if (!registerName) {
        showToast('登録者名を入力してください', 'error');
        return;
    }

    // 名前を記憶
    if (document.getElementById('remember-register-name').checked) {
        saveToStorage(CONFIG.STORAGE_KEYS.REGISTER_NAME, registerName);
    }

    const items = [];
    const rows = document.querySelectorAll('.register-item');

    rows.forEach(row => {
        const material = row.querySelector('.material-select').value;
        const location = row.querySelector('.location-select').value;
        const thickness = parseFloat(row.querySelector('.thickness-input').value);
        const width = parseInt(row.querySelector('.width-input').value);
        const length = parseInt(row.querySelector('.length-input').value);

        // 必須項目がすべて入力されている行のみ追加
        if (material && location && thickness && width && length) {
            items.push({
                id: generateId(),
                registeredAt: new Date().toISOString(),
                material,
                thickness,
                width,
                length,
                location,
                registeredBy: registerName,
                status: 'available',
                usedAt: null,
                usedBy: null
            });
        }
    });

    if (items.length === 0) {
        showToast('登録するデータがありません。すべての項目を入力してください', 'error');
        return;
    }

    // データを保存
    try {
        if (state.scriptUrl) {
            await sendToServer('register', items);
        }
        
        // ローカルにも保存
        state.data = [...state.data, ...items];
        saveToStorage(CONFIG.STORAGE_KEYS.DATA, state.data);

        showToast(`${items.length}件の残材を登録しました`, 'success');
        clearRegisterForm();
    } catch (error) {
        console.error('Registration error:', error);
        showToast('登録中にエラーが発生しました', 'error');
    }
}

function clearRegisterForm() {
    const container = document.getElementById('register-items');
    container.innerHTML = '';
    addRegisterRow();
}

// ========================================
// 検索・使用機能
// ========================================

async function searchItems() {
    const material = document.getElementById('search-material').value;
    const location = document.getElementById('search-location').value;
    const thicknessMin = parseFloat(document.getElementById('thickness-min').value) || 0;
    const thicknessMax = parseFloat(document.getElementById('thickness-max').value) || Infinity;
    const widthMin = parseInt(document.getElementById('width-min').value) || 0;
    const widthMax = parseInt(document.getElementById('width-max').value) || Infinity;
    const lengthMin = parseInt(document.getElementById('length-min').value) || 0;
    const lengthMax = parseInt(document.getElementById('length-max').value) || Infinity;
    const statusFilter = document.querySelector('input[name="search-status"]:checked').value;

    // サーバーからデータを取得（または ローカルデータを使用）
    let data = state.data;
    if (state.scriptUrl) {
        try {
            data = await fetchFromServer('getData');
            state.data = data;
            saveToStorage(CONFIG.STORAGE_KEYS.DATA, data);
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('サーバーからデータを取得できませんでした。ローカルデータを使用します', 'warning');
        }
    }

    // フィルタリング
    const results = data.filter(item => {
        if (statusFilter === 'available' && item.status !== 'available') return false;
        if (material && item.material !== material) return false;
        if (location && item.location !== location) return false;
        if (item.thickness < thicknessMin || item.thickness > thicknessMax) return false;
        if (item.width < widthMin || item.width > widthMax) return false;
        if (item.length < lengthMin || item.length > lengthMax) return false;
        return true;
    });

    renderSearchResults(results);
}

function renderSearchResults(results) {
    const container = document.getElementById('search-results');
    const card = document.getElementById('search-results-card');
    const countSpan = document.getElementById('result-count');
    const useBtn = document.getElementById('use-selected-btn');

    card.style.display = 'block';
    countSpan.textContent = results.length;
    state.selectedItems.clear();

    if (results.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>条件に一致する残材が見つかりませんでした</p>
            </div>
        `;
        useBtn.style.display = 'none';
        return;
    }

    container.innerHTML = results.map(item => `
        <div class="result-item" data-id="${item.id}">
            <div class="result-checkbox">
                <input type="checkbox" ${item.status !== 'available' ? 'disabled' : ''}>
            </div>
            <div class="result-info">
                <div class="result-material">${escapeHtml(item.material)}</div>
                <div class="result-dimensions">${item.thickness}t × ${item.width}W × ${item.length}L</div>
                <div class="result-meta">
                    <span class="result-location">📍 ${escapeHtml(item.location)}</span>
                    <span class="result-status ${item.status === 'available' ? 'status-available' : 'status-used'}">
                        ${item.status === 'available' ? '🟢 在庫' : '🔴 使用済'}
                    </span>
                    <span>登録: ${formatDate(item.registeredAt)} ${escapeHtml(item.registeredBy)}</span>
                    ${item.usedAt ? `<span>使用: ${formatDate(item.usedAt)} ${escapeHtml(item.usedBy)}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    // チェックボックスのイベント
    container.querySelectorAll('.result-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.disabled) {
            checkbox.addEventListener('change', () => {
                const id = item.dataset.id;
                if (checkbox.checked) {
                    state.selectedItems.add(id);
                    item.classList.add('selected');
                } else {
                    state.selectedItems.delete(id);
                    item.classList.remove('selected');
                }
                useBtn.style.display = state.selectedItems.size > 0 ? 'block' : 'none';
            });

            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        }
    });

    useBtn.style.display = 'none';
}

async function useSelectedItems() {
    const userName = document.getElementById('user-name').value.trim();
    if (!userName) {
        showToast('使用者名を入力してください', 'error');
        return;
    }

    if (state.selectedItems.size === 0) {
        showToast('使用する残材を選択してください', 'error');
        return;
    }

    // 名前を記憶
    if (document.getElementById('remember-user-name').checked) {
        saveToStorage(CONFIG.STORAGE_KEYS.USER_NAME, userName);
    }

    const usedAt = new Date().toISOString();
    const ids = Array.from(state.selectedItems);

    try {
        if (state.scriptUrl) {
            await sendToServer('use', { ids, usedBy: userName, usedAt });
        }

        // ローカルデータも更新
        state.data = state.data.map(item => {
            if (ids.includes(item.id)) {
                return { ...item, status: 'used', usedAt, usedBy: userName };
            }
            return item;
        });
        saveToStorage(CONFIG.STORAGE_KEYS.DATA, state.data);

        showToast(`${ids.length}件の残材を使用済みにしました`, 'success');
        searchItems(); // 結果を更新
    } catch (error) {
        console.error('Use error:', error);
        showToast('処理中にエラーが発生しました', 'error');
    }
}

// ========================================
// 一覧機能
// ========================================

async function loadDataList() {
    if (state.scriptUrl) {
        try {
            const data = await fetchFromServer('getData');
            state.data = data;
            saveToStorage(CONFIG.STORAGE_KEYS.DATA, data);
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }
    applyFilter();
}

function applyFilter() {
    const material = document.getElementById('filter-material').value;
    const location = document.getElementById('filter-location').value;
    const status = document.getElementById('filter-status').value;
    const sortBy = document.getElementById('sort-by').value;

    let filtered = [...state.data];

    // フィルター適用
    if (material) {
        filtered = filtered.filter(item => item.material === material);
    }
    if (location) {
        filtered = filtered.filter(item => item.location === location);
    }
    if (status === 'available') {
        filtered = filtered.filter(item => item.status === 'available');
    } else if (status === 'used') {
        filtered = filtered.filter(item => item.status === 'used');
    }

    // ソート適用
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'date-desc':
                return new Date(b.registeredAt) - new Date(a.registeredAt);
            case 'date-asc':
                return new Date(a.registeredAt) - new Date(b.registeredAt);
            case 'material':
                return a.material.localeCompare(b.material, 'ja');
            case 'location':
                return a.location.localeCompare(b.location, 'ja');
            case 'thickness':
                return a.thickness - b.thickness;
            default:
                return 0;
        }
    });

    renderDataList(filtered);
}

function renderDataList(data) {
    const container = document.getElementById('data-list');

    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>データがありません</p>
            </div>
        `;
        return;
    }

    container.innerHTML = data.map(item => `
        <div class="data-item" data-id="${item.id}">
            <div class="data-status">${item.status === 'available' ? '🟢' : '🔴'}</div>
            <div class="data-content">
                <div class="data-material">${escapeHtml(item.material)}</div>
                <div class="data-dimensions">${item.thickness}t × ${item.width}W × ${item.length}L</div>
                <div class="data-meta">
                    <span>📍 ${escapeHtml(item.location)}</span>
                    <span>📅 ${formatDate(item.registeredAt)}</span>
                    <span>👤 ${escapeHtml(item.registeredBy)}</span>
                    ${item.usedAt ? `<span>使用: ${formatDate(item.usedAt)} ${escapeHtml(item.usedBy)}</span>` : ''}
                </div>
            </div>
            <div class="data-actions">
                ${item.status === 'available' ? `
                    <button class="btn btn-secondary btn-small" onclick="openEditModal('${item.id}')">編集</button>
                    <button class="btn btn-secondary btn-small" onclick="openMoveModal('${item.id}')">移動</button>
                    <button class="btn btn-danger btn-small" onclick="deleteItem('${item.id}')">削除</button>
                ` : `
                    <button class="btn btn-secondary btn-small" onclick="viewDetail('${item.id}')">詳細</button>
                `}
            </div>
        </div>
    `).join('');
}

// ========================================
// 編集機能
// ========================================

function openEditModal(id) {
    const item = state.data.find(d => d.id === id);
    if (!item) return;

    document.getElementById('edit-id').value = id;
    
    // 材質セレクトボックスを更新
    const materialSelect = document.getElementById('edit-material');
    materialSelect.innerHTML = state.materials.map(m => 
        `<option value="${m}" ${m === item.material ? 'selected' : ''}>${m}</option>`
    ).join('');

    // 置き場セレクトボックスを更新
    const locationSelect = document.getElementById('edit-location');
    locationSelect.innerHTML = state.locations.map(l => 
        `<option value="${l}" ${l === item.location ? 'selected' : ''}>${l}</option>`
    ).join('');

    document.getElementById('edit-thickness').value = item.thickness;
    document.getElementById('edit-width').value = item.width;
    document.getElementById('edit-length').value = item.length;

    openModal('edit-modal');
}

async function saveEdit() {
    const id = document.getElementById('edit-id').value;
    const material = document.getElementById('edit-material').value;
    const thickness = parseFloat(document.getElementById('edit-thickness').value);
    const width = parseInt(document.getElementById('edit-width').value);
    const length = parseInt(document.getElementById('edit-length').value);
    const location = document.getElementById('edit-location').value;

    if (!material || !thickness || !width || !length || !location) {
        showToast('すべての項目を入力してください', 'error');
        return;
    }

    try {
        if (state.scriptUrl) {
            await sendToServer('update', { id, material, thickness, width, length, location });
        }

        // ローカルデータも更新
        state.data = state.data.map(item => {
            if (item.id === id) {
                return { ...item, material, thickness, width, length, location };
            }
            return item;
        });
        saveToStorage(CONFIG.STORAGE_KEYS.DATA, state.data);

        closeModal('edit-modal');
        showToast('更新しました', 'success');
        applyFilter();
    } catch (error) {
        console.error('Update error:', error);
        showToast('更新中にエラーが発生しました', 'error');
    }
}

// ========================================
// 置き場移動機能
// ========================================

function openMoveModal(id) {
    const item = state.data.find(d => d.id === id);
    if (!item) return;

    document.getElementById('move-id').value = id;
    document.getElementById('move-target-info').textContent = `${item.material} ${item.thickness}t × ${item.width}W × ${item.length}L`;
    document.getElementById('move-current-location').textContent = item.location;

    // 置き場セレクトボックスを更新
    const locationSelect = document.getElementById('move-new-location');
    locationSelect.innerHTML = state.locations.map(l => 
        `<option value="${l}" ${l === item.location ? 'selected' : ''}>${l}</option>`
    ).join('');

    openModal('move-modal');
}

async function confirmMove() {
    const id = document.getElementById('move-id').value;
    const newLocation = document.getElementById('move-new-location').value;

    try {
        if (state.scriptUrl) {
            await sendToServer('move', { id, location: newLocation });
        }

        // ローカルデータも更新
        state.data = state.data.map(item => {
            if (item.id === id) {
                return { ...item, location: newLocation };
            }
            return item;
        });
        saveToStorage(CONFIG.STORAGE_KEYS.DATA, state.data);

        closeModal('move-modal');
        showToast('置き場を変更しました', 'success');
        applyFilter();
    } catch (error) {
        console.error('Move error:', error);
        showToast('移動中にエラーが発生しました', 'error');
    }
}

// ========================================
// 削除機能
// ========================================

async function deleteItem(id) {
    if (!confirm('この残材を削除しますか？')) return;

    try {
        if (state.scriptUrl) {
            await sendToServer('delete', { id });
        }

        // ローカルデータからも削除
        state.data = state.data.filter(item => item.id !== id);
        saveToStorage(CONFIG.STORAGE_KEYS.DATA, state.data);

        showToast('削除しました', 'success');
        applyFilter();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('削除中にエラーが発生しました', 'error');
    }
}

function viewDetail(id) {
    const item = state.data.find(d => d.id === id);
    if (!item) return;

    alert(`
材質: ${item.material}
寸法: ${item.thickness}t × ${item.width}W × ${item.length}L
置き場: ${item.location}
登録: ${formatDate(item.registeredAt)} ${item.registeredBy}
使用: ${formatDate(item.usedAt)} ${item.usedBy}
    `.trim());
}

// ========================================
// 設定機能
// ========================================

function addMaterial() {
    const input = document.getElementById('new-material');
    const value = input.value.trim();
    
    if (!value) {
        showToast('材質名を入力してください', 'error');
        return;
    }

    if (state.materials.includes(value)) {
        showToast('この材質は既に登録されています', 'warning');
        return;
    }

    state.materials.push(value);
    saveToStorage(CONFIG.STORAGE_KEYS.MATERIALS, state.materials);
    input.value = '';
    renderMaterialList();
    updateAllMaterialSelects();
    showToast(`「${value}」を追加しました`, 'success');
}

function removeMaterial(material) {
    if (state.materials.length <= 1) {
        showToast('最低1つの材質が必要です', 'warning');
        return;
    }

    state.materials = state.materials.filter(m => m !== material);
    saveToStorage(CONFIG.STORAGE_KEYS.MATERIALS, state.materials);
    renderMaterialList();
    updateAllMaterialSelects();
    showToast(`「${material}」を削除しました`, 'success');
}

function addLocation() {
    const input = document.getElementById('new-location');
    const value = input.value.trim();
    
    if (!value) {
        showToast('置き場名を入力してください', 'error');
        return;
    }

    if (state.locations.includes(value)) {
        showToast('この置き場は既に登録されています', 'warning');
        return;
    }

    state.locations.push(value);
    saveToStorage(CONFIG.STORAGE_KEYS.LOCATIONS, state.locations);
    input.value = '';
    renderLocationList();
    updateAllLocationSelects();
    showToast(`「${value}」を追加しました`, 'success');
}

function removeLocation(location) {
    if (state.locations.length <= 1) {
        showToast('最低1つの置き場が必要です', 'warning');
        return;
    }

    state.locations = state.locations.filter(l => l !== location);
    saveToStorage(CONFIG.STORAGE_KEYS.LOCATIONS, state.locations);
    renderLocationList();
    updateAllLocationSelects();
    showToast(`「${location}」を削除しました`, 'success');
}

function saveScriptUrl() {
    const url = document.getElementById('script-url').value.trim();
    state.scriptUrl = url;
    saveToStorage(CONFIG.STORAGE_KEYS.SCRIPT_URL, url);
    showToast('URLを保存しました', 'success');
}

async function testConnection() {
    if (!state.scriptUrl) {
        showToast('URLを入力してください', 'error');
        return;
    }

    try {
        showToast('接続テスト中...', 'warning');
        const response = await fetchFromServer('test');
        if (response.success) {
            showToast('接続成功！', 'success');
        } else {
            showToast('接続失敗: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Connection test error:', error);
        showToast('接続エラー: ' + error.message, 'error');
    }
}

// ========================================
// レンダリング
// ========================================

function renderAll() {
    renderMaterialList();
    renderLocationList();
    updateAllMaterialSelects();
    updateAllLocationSelects();
}

function renderMaterialList() {
    const container = document.getElementById('material-list');
    container.innerHTML = state.materials.map(m => `
        <span class="tag">
            ${escapeHtml(m)}
            <button class="tag-remove" onclick="removeMaterial('${escapeHtml(m)}')">&times;</button>
        </span>
    `).join('');
}

function renderLocationList() {
    const container = document.getElementById('location-list');
    container.innerHTML = state.locations.map(l => `
        <span class="tag">
            ${escapeHtml(l)}
            <button class="tag-remove" onclick="removeLocation('${escapeHtml(l)}')">&times;</button>
        </span>
    `).join('');
}

function updateAllMaterialSelects() {
    const options = `<option value="">すべて</option>` + 
        state.materials.map(m => `<option value="${m}">${m}</option>`).join('');
    
    document.getElementById('search-material').innerHTML = options;
    document.getElementById('filter-material').innerHTML = options;
}

function updateAllLocationSelects() {
    const options = `<option value="">すべて</option>` + 
        state.locations.map(l => `<option value="${l}">${l}</option>`).join('');
    
    document.getElementById('search-location').innerHTML = options;
    document.getElementById('filter-location').innerHTML = options;
}

// ========================================
// モーダル
// ========================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ========================================
// トースト通知
// ========================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// ユーティリティ
// ========================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========================================
// サーバー通信
// ========================================

async function sendToServer(action, data) {
    if (!state.scriptUrl) {
        throw new Error('スクリプトURLが設定されていません');
    }

    const response = await fetch(state.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, data })
    });

    // no-cors モードではレスポンスを読めないため、成功と仮定
    return { success: true };
}

async function fetchFromServer(action) {
    if (!state.scriptUrl) {
        throw new Error('スクリプトURLが設定されていません');
    }

    const url = `${state.scriptUrl}?action=${action}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('サーバーエラー');
    }

    return await response.json();
}

// グローバルスコープに関数を公開
window.removeMaterial = removeMaterial;
window.removeLocation = removeLocation;
window.openEditModal = openEditModal;
window.openMoveModal = openMoveModal;
window.deleteItem = deleteItem;
window.viewDetail = viewDetail;
