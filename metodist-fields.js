// metodist-fields.js - Управление полями для методиста
// Подключается после основного metodist.js

let allFields = [];

// Загрузка всех полей
async function loadFields() {
    try {
        allFields = await window.fieldsManager.getAllFields();
        displayFieldsList();
    } catch (error) {
        console.error('Ошибка загрузки полей:', error);
        showError('errorMessage', 'Ошибка загрузки полей');
    }
}

// Отображение списка полей в отдельной вкладке
function displayFieldsList() {
    const container = document.getElementById('fieldsListContainer');
    if (!container) return;
    
    if (allFields.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                📭 Нет созданных полей<br>
                Нажмите "➕ Создать поле", чтобы добавить новое поле для слушателей
            </div>
        `;
        return;
    }
    
    container.innerHTML = allFields.map(field => `
        <div class="field-item" data-field-id="${field.id}">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <strong>${escapeHtml(field.label)}</strong>
                    <span style="color: ${field.isRequired ? '#e74c3c' : '#28a745'}; font-size: 12px; margin-left: 10px;">
                        ${field.isRequired ? '⚠️ Обязательное' : '✓ Необязательное'}
                    </span>
                    <span style="color: ${field.isActive !== false ? '#28a745' : '#999'}; font-size: 12px; margin-left: 10px;">
                        ${field.isActive !== false ? '✅ Активно' : '⛔ Отключено'}
                    </span>
                    <div style="margin-top: 8px; font-size: 13px; color: #666;">
                        <div><strong>Тип поля:</strong> ${getFieldTypeName(field.type)}</div>
                        <div><strong>ID поля:</strong> <code>${escapeHtml(field.id)}</code></div>
                        ${field.semantics ? `<div><strong>Семантика:</strong> <a href="${escapeHtml(field.semantics)}" target="_blank" style="color: #667eea;">${escapeHtml(field.semantics)}</a></div>` : ''}
                        ${field.placeholder ? `<div><strong>Плейсхолдер:</strong> ${escapeHtml(field.placeholder)}</div>` : ''}
                        <div><strong>Порядок отображения:</strong> ${field.order || 0}</div>
                    </div>
                </div>
                <div class="field-actions">
                    <button class="edit-field-btn" onclick="editField('${field.id}')">✏️</button>
                    <button class="delete-field-btn" onclick="deleteField('${field.id}')">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Получение названия типа поля
function getFieldTypeName(type) {
    const types = {
        'text': '📝 Текстовое поле',
        'textarea': '📄 Многострочный текст',
        'email': '📧 Email',
        'tel': '📞 Телефон',
        'date': '📅 Дата',
        'number': '#️⃣ Число'
    };
    return types[type] || '📝 Текст';
}

// Открытие модального окна для создания/редактирования поля
function openFieldEditor(fieldId = null) {
    const isEdit = fieldId !== null;
    const field = isEdit ? allFields.find(f => f.id === fieldId) : null;
    
    const modal = document.getElementById('fieldEditorModal');
    const title = document.getElementById('fieldEditorTitle');
    const form = document.getElementById('fieldEditorForm');
    
    title.textContent = isEdit ? '✏️ Редактирование поля' : '➕ Создание нового поля';
    
    // Заполняем форму
    document.getElementById('fieldLabel').value = field?.label || '';
    document.getElementById('fieldId').value = field?.id || '';
    document.getElementById('fieldId').disabled = isEdit; // ID нельзя менять при редактировании
    document.getElementById('fieldType').value = field?.type || 'text';
    document.getElementById('fieldRequired').checked = field?.isRequired || false;
    document.getElementById('fieldActive').checked = field?.isActive !== false;
    document.getElementById('fieldSemantics').value = field?.semantics || '';
    document.getElementById('fieldPlaceholder').value = field?.placeholder || '';
    document.getElementById('fieldOrder').value = field?.order || allFields.length;
    
    // Сохраняем ID поля для редактирования
    form.dataset.editId = fieldId || '';
    
    modal.style.display = 'block';
}

// Сохранение поля
async function saveField() {
    const isEdit = document.getElementById('fieldEditorForm').dataset.editId !== '';
    const fieldId = document.getElementById('fieldId').value.trim();
    const label = document.getElementById('fieldLabel').value.trim();
    const type = document.getElementById('fieldType').value;
    const isRequired = document.getElementById('fieldRequired').checked;
    const isActive = document.getElementById('fieldActive').checked;
    const semantics = document.getElementById('fieldSemantics').value.trim();
    const placeholder = document.getElementById('fieldPlaceholder').value.trim();
    const order = parseInt(document.getElementById('fieldOrder').value) || 0;
    
    if (!label) {
        alert('Введите название поля');
        return;
    }
    
    if (!isEdit && !fieldId) {
        alert('Введите ID поля (латиницей, без пробелов)');
        return;
    }
    
    if (!isEdit && allFields.some(f => f.id === fieldId)) {
        alert('Поле с таким ID уже существует');
        return;
    }
    
    try {
        const fieldData = {
            label: label,
            type: type,
            isRequired: isRequired,
            isActive: isActive,
            semantics: semantics,
            placeholder: placeholder,
            order: order
        };
        
        if (isEdit) {
            await window.fieldsManager.updateField(document.getElementById('fieldEditorForm').dataset.editId, fieldData);
            showSuccess('✅ Поле успешно обновлено!', 'successMessage');
        } else {
            await window.fieldsManager.addField({ id: fieldId, ...fieldData });
            showSuccess('✅ Поле успешно создано!', 'successMessage');
        }
        
        closeFieldEditor();
        await loadFields();
        
    } catch (error) {
        console.error('Ошибка сохранения поля:', error);
        showError('errorMessage', 'Ошибка сохранения поля');
    }
}

// Редактирование поля
function editField(fieldId) {
    openFieldEditor(fieldId);
}

// Удаление поля
async function deleteField(fieldId) {
    const field = allFields.find(f => f.id === fieldId);
    if (!confirm(`Удалить поле "${field?.label}"?\n\nВнимание! Все данные слушателей для этого поля будут потеряны.`)) {
        return;
    }
    
    try {
        await window.fieldsManager.deleteField(fieldId);
        showSuccess('✅ Поле удалено', 'successMessage');
        await loadFields();
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showError('errorMessage', 'Ошибка удаления поля');
    }
}

// Закрытие модального окна
function closeFieldEditor() {
    document.getElementById('fieldEditorModal').style.display = 'none';
}

// Инициализация вкладки управления полями
function initFieldsTab() {
    // Добавляем вкладку в панель методиста
    const tabsContainer = document.querySelector('.tabs');
    if (tabsContainer && !document.getElementById('fieldsTabBtn')) {
        const fieldsTabBtn = document.createElement('button');
        fieldsTabBtn.className = 'tab-btn';
        fieldsTabBtn.id = 'fieldsTabBtn';
        fieldsTabBtn.innerHTML = '⚙️ Управление полями';
        fieldsTabBtn.onclick = () => switchToFieldsTab();
        tabsContainer.appendChild(fieldsTabBtn);
        
        // Создаем контент для вкладки полей
        const fieldsTabContent = document.createElement('div');
        fieldsTabContent.id = 'fieldsTab';
        fieldsTabContent.className = 'tab-content';
        fieldsTabContent.innerHTML = `
            <div class="info-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>⚙️ Управление дополнительными полями</h3>
                    <button class="add-field-btn" onclick="openFieldEditor()">➕ Создать поле</button>
                </div>
                <p style="color: #666; margin-bottom: 20px;">
                    Здесь вы можете создавать, редактировать и удалять поля, которые будут отображаться у слушателей.<br>
                    Каждое поле имеет свою семантику (ссылка на схему данных) и уникальный идентификатор.
                </p>
                <div id="fieldsListContainer"></div>
            </div>
        `;
        
        // Добавляем после существующих вкладок
        const container = document.querySelector('.container');
        container.appendChild(fieldsTabContent);
    }
}

// Переключение на вкладку полей
function switchToFieldsTab() {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем вкладку полей
    document.getElementById('fieldsTab').classList.add('active');
    document.getElementById('fieldsTabBtn').classList.add('active');
    
    // Загружаем поля
    loadFields();
}

// Модальное окно для редактирования полей (добавляем в HTML)
function addFieldEditorModal() {
    if (document.getElementById('fieldEditorModal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'fieldEditorModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 id="fieldEditorTitle">Создание поля</h3>
                <span class="close" onclick="closeFieldEditor()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="fieldEditorForm">
                    <div class="form-group">
                        <label>Название поля *</label>
                        <input type="text" id="fieldLabel" placeholder="Например: Отчество" required>
                    </div>
                    <div class="form-group">
                        <label>ID поля (латиницей) *</label>
                        <input type="text" id="fieldId" placeholder="Например: patronymic" required>
                        <small style="color: #666;">Уникальный идентификатор, только латиница и без пробелов</small>
                    </div>
                    <div class="form-group">
                        <label>Тип поля</label>
                        <select id="fieldType">
                            <option value="text">Текстовое поле</option>
                            <option value="textarea">Многострочный текст</option>
                            <option value="email">Email</option>
                            <option value="tel">Телефон</option>
                            <option value="date">Дата</option>
                            <option value="number">Число</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Семантика (URL схемы)</label>
                        <input type="url" id="fieldSemantics" placeholder="http://schemas.titul24.ru/simplex/отчество">
                        <small style="color: #666;">Ссылка на схему данных (например, http://schemas.titul24.ru/simplex/...</small>
                    </div>
                    <div class="form-group">
                        <label>Placeholder (подсказка)</label>
                        <input type="text" id="fieldPlaceholder" placeholder="Пример ввода...">
                    </div>
                    <div class="form-group">
                        <label>Порядок отображения</label>
                        <input type="number" id="fieldOrder" value="0">
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="fieldRequired"> Обязательное поле
                        </label>
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="fieldActive" checked> Поле активно (видно слушателям)
                        </label>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="save-btn" onclick="saveField()">💾 Сохранить</button>
                        <button type="button" class="cancel-btn" onclick="closeFieldEditor()">❌ Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Добавляем стили для новой вкладки
function addFieldManagerStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .add-field-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .edit-field-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
        }
        
        .delete-field-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
        }
        
        .field-item {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 8px;
            border-left: 3px solid #667eea;
        }
        
        .field-actions {
            display: flex;
            gap: 8px;
        }
    `;
    document.head.appendChild(style);
}

// Инициализация
if (document.querySelector('.tabs')) {
    addFieldEditorModal();
    addFieldManagerStyles();
    initFieldsTab();
}