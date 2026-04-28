// student-fields.js - исправленная версия

let customFieldsData = [];
let customFieldsValues = {};

// Рендер поля в зависимости от типа (ИСПРАВЛЕНАЯ ВЕРСИЯ)
function renderCustomFieldInput(field, value) {
    const fieldId = `field_${field.id}`;
    const isRequired = field.isRequired ? 'required' : '';
    
    switch (field.type) {
        case 'radio':
            if (!field.options || !field.options.length) {
                return '<p style="color: red; font-size: 12px;">Ошибка: нет вариантов для выбора</p>';
            }
            
            let radioHtml = `<div class="radio-group" data-field-id="${field.id}">`;
            field.options.forEach((opt, idx) => {
                const checked = (value === opt) ? 'checked' : '';
                const radioId = `${fieldId}_${idx}`;
                radioHtml += `
                    <label style="display: inline-flex; align-items: center; margin-right: 20px; cursor: pointer;">
                        <input type="radio" 
                               name="${fieldId}" 
                               id="${radioId}"
                               value="${escapeHtml(opt)}" 
                               ${checked} 
                               ${isRequired}>
                        <span style="margin-left: 8px;">${escapeHtml(opt)}</span>
                    </label>
                `;
            });
            radioHtml += `</div>`;
            return radioHtml;
            
        case 'select':
            if (!field.options || !field.options.length) {
                return '<p style="color: red; font-size: 12px;">Ошибка: нет вариантов для выбора</p>';
            }
            
            let selectHtml = `<select id="${fieldId}" data-field-id="${field.id}" ${isRequired} style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
            selectHtml += `<option value="">-- Выберите --</option>`;
            field.options.forEach(opt => {
                const selected = (value === opt) ? 'selected' : '';
                selectHtml += `<option value="${escapeHtml(opt)}" ${selected}>${escapeHtml(opt)}</option>`;
            });
            selectHtml += `</select>`;
            return selectHtml;
            
        case 'textarea':
            return `<textarea id="${fieldId}" placeholder="${field.placeholder || ''}" data-field-id="${field.id}" rows="3" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">${escapeHtml(value)}</textarea>`;
            
        case 'date':
            return `<input type="date" id="${fieldId}" value="${escapeHtml(value)}" data-field-id="${field.id}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
            
        case 'number':
            return `<input type="number" id="${fieldId}" placeholder="${field.placeholder || ''}" value="${escapeHtml(value)}" data-field-id="${field.id}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
            
        case 'email':
            return `<input type="email" id="${fieldId}" placeholder="${field.placeholder || ''}" value="${escapeHtml(value)}" data-field-id="${field.id}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
            
        case 'tel':
            return `<input type="tel" id="${fieldId}" placeholder="${field.placeholder || ''}" value="${escapeHtml(value)}" data-field-id="${field.id}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
            
        default:
            return `<input type="text" id="${fieldId}" placeholder="${field.placeholder || ''}" value="${escapeHtml(value)}" data-field-id="${field.id}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
    }
}

// Сохранение пользовательских полей (ИСПРАВЛЕНАЯ ВЕРСИЯ)
async function saveCustomFields() {
    const userId = window.auth.currentUser?.uid;
    if (!userId) return;
    
    const values = {};
    
    for (const field of customFieldsData) {
        if (field.type === 'radio') {
            // Для radio - ищем выбранный option
            const selected = document.querySelector(`input[name="field_${field.id}"]:checked`);
            values[field.id] = selected ? selected.value : '';
            console.log(`Radio поле ${field.id}:`, values[field.id]);
        } else {
            const element = document.getElementById(`field_${field.id}`);
            if (element) {
                values[field.id] = element.value;
                console.log(`Поле ${field.id}:`, values[field.id]);
            }
        }
    }
    
    // Показываем индикатор загрузки
    const btn = document.querySelector('.save-fields-btn');
    const originalText = btn?.textContent;
    if (btn) {
        btn.textContent = '⏳ Сохранение...';
        btn.disabled = true;
    }
    
    try {
        await window.fieldsManager.saveFieldValues(userId, values);
        customFieldsValues = { ...customFieldsValues, ...values };
        
        showSuccessMessage('✅ Дополнительная информация сохранена!');
        
        // Обновляем отображение (убираем предупреждения)
        displayCustomFields();
        
        // Проверяем обязательные поля
        const check = await window.fieldsManager.checkRequiredFields(userId);
        if (!check.allFilled) {
            showMissingFieldsWarning(check.missingFields);
        } else {
            hideMissingFieldsWarning();
        }
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showErrorMessage('Ошибка сохранения данных: ' + error.message);
    } finally {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// Загрузка пользовательских полей
async function loadCustomFields() {
    try {
        const userId = window.auth.currentUser?.uid;
        if (!userId) return;
        
        console.log('Загрузка полей для пользователя:', userId);
        
        // Получаем активные поля
        customFieldsData = await window.fieldsManager.getActiveFields();
        console.log('Найдено полей:', customFieldsData.length);
        console.log('Поля:', customFieldsData);
        
        // Получаем сохраненные значения
        customFieldsValues = await window.fieldsManager.getFieldValues(userId);
        console.log('Сохраненные значения:', customFieldsValues);
        
        // Отображаем поля
        displayCustomFields();
        
        // Проверяем незаполненные обязательные поля
        const check = await window.fieldsManager.checkRequiredFields(userId);
        if (!check.allFilled) {
            showMissingFieldsWarning(check.missingFields);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки полей:', error);
        showErrorMessage('Ошибка загрузки дополнительных полей');
    }
}

// Отображение полей в интерфейсе
function displayCustomFields() {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;
    
    if (customFieldsData.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 40px;">📭 Нет дополнительных полей для заполнения</p>';
        return;
    }
    
    let html = '<div style="margin-bottom: 20px;"><h4 style="color: var(--primary);">📋 Дополнительная информация</h4><p style="color: #666; font-size: 13px;">Поля, отмеченные <span style="color: #dc3545;">*</span>, обязательны для заполнения</p></div>';
    
    customFieldsData.forEach(field => {
        const value = customFieldsValues[field.id] || '';
        const isFilled = value && value.trim() !== '';
        const warningClass = (!isFilled && field.isRequired) ? 'required-missing' : '';
        
        html += `
            <div class="custom-field ${warningClass}" data-field-id="${field.id}" style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 10px; background: ${warningClass ? '#fff8e1' : '#fafafa'};">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">
                    ${escapeHtml(field.label)}
                    ${field.isRequired ? '<span style="color: #dc3545; margin-left: 4px;">*</span>' : ''}
                    ${(!isFilled && field.isRequired) ? '<span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Не заполнено</span>' : ''}
                </label>
                
                ${renderCustomFieldInput(field, value)}
                
                ${field.semantics ? `
                    <small style="display: block; margin-top: 8px; color: #667eea; font-size: 11px;">
                        🔗 Семантика: <a href="${escapeHtml(field.semantics)}" target="_blank" style="color: #667eea;">${escapeHtml(field.semantics)}</a>
                    </small>
                ` : ''}
                
                ${(!isFilled && field.isRequired) ? `
                    <small style="display: block; margin-top: 8px; color: #ff9800; font-size: 11px;">
                        ⚠️ Это поле обязательно для заполнения
                    </small>
                ` : ''}
            </div>
        `;
    });
    
    html += `
        <div style="margin-top: 20px;">
            <button class="save-fields-btn" onclick="saveCustomFields()" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">💾 Сохранить дополнительную информацию</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// Вспомогательные функции
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showSuccessMessage(message) {
    const el = document.getElementById('successMessage');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 3000);
    }
}

function showErrorMessage(message) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    }
}

function showMissingFieldsWarning(missingFields) {
    const warningContainer = document.getElementById('missingFieldsWarning');
    if (!warningContainer) return;
    
    const fieldNames = missingFields.map(f => f.label).join(', ');
    
    warningContainer.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <span>⚠️ Внимание! У вас есть незаполненные обязательные поля: ${fieldNames}</span>
            <button onclick="scrollToCustomFields()" style="background: #ffc107; color: #856404; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer;">Заполнить сейчас</button>
        </div>
    `;
    warningContainer.style.display = 'block';
}

function hideMissingFieldsWarning() {
    const warningContainer = document.getElementById('missingFieldsWarning');
    if (warningContainer) {
        warningContainer.style.display = 'none';
    }
}

function scrollToCustomFields() {
    const container = document.getElementById('customFieldsContainer');
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.required-missing').forEach(field => {
            field.style.transition = 'background 0.5s';
            field.style.background = '#fff3cd';
            setTimeout(() => {
                field.style.background = '';
            }, 2000);
        });
    }
}

// Добавляем стили
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .radio-group {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            padding: 10px 0;
        }
        
        .radio-group label {
            display: inline-flex;
            align-items: center;
            cursor: pointer;
            font-weight: normal;
            margin-bottom: 0;
        }
        
        .radio-group input[type="radio"] {
            width: 18px;
            height: 18px;
            margin-right: 8px;
            cursor: pointer;
            accent-color: var(--primary, #2c5f2d);
        }
        
        .custom-field.required-missing {
            border-left: 4px solid #ff9800;
            background: #fff8e1;
        }
        
        select, input, textarea {
            font-family: inherit;
        }
        
        select:focus, input:focus, textarea:focus {
            outline: none;
            border-color: var(--primary, #2c5f2d);
            box-shadow: 0 0 0 3px rgba(44, 95, 45, 0.1);
        }
    `;
    document.head.appendChild(style);
}

// Инициализация
if (document.getElementById('customFieldsContainer')) {
    addCustomStyles();
    // Ждем загрузку страницы
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => loadCustomFields(), 500);
    });
}
