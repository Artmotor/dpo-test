// student-fields.js - Отображение полей в кабинете слушателя
// Подключается после основного student.js

let customFieldsData = [];
let customFieldsValues = {};

// Загрузка пользовательских полей
async function loadCustomFields() {
    try {
        const userId = window.auth.currentUser?.uid;
        if (!userId) return;
        
        // Получаем активные поля
        customFieldsData = await window.fieldsManager.getActiveFields();
        
        // Получаем сохраненные значения
        customFieldsValues = await window.fieldsManager.getFieldValues(userId);
        
        // Отображаем поля в личном кабинете
        displayCustomFields();
        
        // Проверяем незаполненные обязательные поля
        const check = await window.fieldsManager.checkRequiredFields(userId);
        if (!check.allFilled) {
            showMissingFieldsWarning(check.missingFields);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки пользовательских полей:', error);
    }
}

// Отображение полей в интерфейсе
function displayCustomFields() {
    const container = document.getElementById('customFieldsContainer');
    if (!container || customFieldsData.length === 0) {
        if (container && customFieldsData.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center;">Нет дополнительных полей для заполнения</p>';
        }
        return;
    }
    
    let html = '<h3 style="margin-top: 20px;">📋 Дополнительная информация</h3>';
    
    customFieldsData.forEach(field => {
        const value = customFieldsValues[field.id] || '';
        const isFilled = value && value.trim() !== '';
        const warningClass = !isFilled && field.isRequired ? 'required-missing' : '';
        
        html += `
            <div class="custom-field ${warningClass}" data-field-id="${field.id}" data-required="${field.isRequired}">
                <label>
                    ${field.label}
                    ${field.isRequired ? '<span class="required-star">*</span>' : ''}
                    ${!isFilled && field.isRequired ? '<span class="missing-badge">Не заполнено</span>' : ''}
                </label>
                
                ${field.type === 'textarea' ? `
                    <textarea id="field_${field.id}" 
                              placeholder="${field.placeholder || ''}"
                              data-field-id="${field.id}"
                              data-semantics="${field.semantics || ''}">${escapeHtml(value)}</textarea>
                ` : `
                    <input type="${field.type || 'text'}" 
                           id="field_${field.id}"
                           value="${escapeHtml(value)}"
                           placeholder="${field.placeholder || ''}"
                           data-field-id="${field.id}"
                           data-semantics="${field.semantics || ''}">
                `}
                
                ${field.semantics ? `
                    <small class="field-semantics">
                        🔗 Семантика: <a href="${field.semantics}" target="_blank">${field.semantics}</a>
                    </small>
                ` : ''}
                
                ${!isFilled && field.isRequired ? `
                    <small class="field-warning">⚠️ Это поле обязательно для заполнения</small>
                ` : ''}
            </div>
        `;
    });
    
    html += `
        <div class="form-actions" style="margin-top: 20px;">
            <button class="save-fields-btn" onclick="saveCustomFields()">💾 Сохранить дополнительную информацию</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// Сохранение пользовательских полей
async function saveCustomFields() {
    const userId = window.auth.currentUser?.uid;
    if (!userId) return;
    
    const values = {};
    
    customFieldsData.forEach(field => {
        const element = document.getElementById(`field_${field.id}`);
        if (element) {
            values[field.id] = element.value;
        }
    });
    
    try {
        await window.fieldsManager.saveFieldValues(userId, values);
        customFieldsValues = { ...customFieldsValues, ...values };
        
        showSuccess('✅ Дополнительная информация сохранена!', 'successMessage');
        
        // Обновляем отображение
        displayCustomFields();
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('errorMessage', 'Ошибка сохранения данных');
    }
}

// Предупреждение о незаполненных полях
function showMissingFieldsWarning(missingFields) {
    const warningContainer = document.getElementById('missingFieldsWarning');
    if (!warningContainer) return;
    
    const fieldNames = missingFields.map(f => f.label).join(', ');
    
    warningContainer.innerHTML = `
        <div class="warning-banner">
            ⚠️ Внимание! У вас есть незаполненные обязательные поля: ${fieldNames}
            <button onclick="scrollToCustomFields()" class="warning-btn">Заполнить сейчас</button>
        </div>
    `;
    warningContainer.style.display = 'block';
}

// Прокрутка к полям
function scrollToCustomFields() {
    const container = document.getElementById('customFieldsContainer');
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Подсвечиваем незаполненные поля
        document.querySelectorAll('.required-missing').forEach(field => {
            field.style.transition = 'background 0.5s';
            field.style.background = '#fff3cd';
            setTimeout(() => {
                field.style.background = '';
            }, 2000);
        });
    }
}

// Экранирование HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Добавляем стили для новых элементов
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .custom-field {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: #fafafa;
            transition: all 0.3s;
        }
        
        .custom-field.required-missing {
            border-left: 4px solid #ff9800;
            background: #fff8e1;
        }
        
        .required-star {
            color: #e74c3c;
            margin-left: 5px;
        }
        
        .missing-badge {
            background: #ff9800;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            margin-left: 10px;
        }
        
        .field-warning {
            color: #ff9800;
            font-size: 11px;
            display: block;
            margin-top: 5px;
        }
        
        .field-semantics {
            font-size: 11px;
            color: #667eea;
            display: block;
            margin-top: 5px;
        }
        
        .field-semantics a {
            color: #667eea;
            text-decoration: none;
        }
        
        .field-semantics a:hover {
            text-decoration: underline;
        }
        
        .warning-banner {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .warning-btn {
            background: #ffc107;
            color: #856404;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            width: auto;
        }
        
        .save-fields-btn {
            background: #28a745;
            width: auto;
            padding: 10px 20px;
        }
        
        .fields-editor {
            margin-top: 30px;
            border-top: 2px solid #e0e0e0;
            padding-top: 20px;
        }
        
        .field-item {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 8px;
            border-left: 3px solid #667eea;
        }
        
        .field-actions {
            margin-top: 10px;
            display: flex;
            gap: 10px;
        }
        
        .field-actions button {
            width: auto;
            padding: 5px 10px;
            font-size: 12px;
        }
        
        .add-field-btn {
            background: #28a745;
            margin-bottom: 20px;
            width: auto;
            padding: 10px 20px;
        }
    `;
    document.head.appendChild(style);
}

// Инициализация при загрузке страницы слушателя
if (document.getElementById('customFieldsContainer')) {
    addCustomStyles();
    
    // Ждем загрузку основного скрипта
    setTimeout(() => {
        loadCustomFields();
    }, 500);
}