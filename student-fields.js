// student-fields.js - для личного кабинета слушателя

// Загрузка полей
async function loadCustomFields() {
    try {
        const userId = window.auth.currentUser?.uid;
        if (!userId) {
            console.log('Пользователь не авторизован');
            return;
        }
        
        console.log('🔄 Загрузка дополнительных полей...');
        
        const fields = await window.fieldsManager.getActiveFields();
        const values = await window.fieldsManager.getFieldValues(userId);
        
        console.log('Найдено полей:', fields.length);
        
        displayCustomFields(fields, values);
        
        const check = await window.fieldsManager.checkRequiredFields(userId);
        if (!check.allFilled) {
            showMissingWarning(check.missingFields);
        } else {
            hideMissingWarning();
        }
    } catch (error) {
        console.error('Ошибка загрузки полей:', error);
        const container = document.getElementById('customFieldsContainer');
        if (container) {
            container.innerHTML = '<p style="color:red; text-align:center; padding:20px;">❌ Ошибка загрузки полей</p>';
        }
    }
}

// Отображение полей
function displayCustomFields(fields, values) {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;
    
    if (!fields || fields.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">📭 Нет дополнительных полей для заполнения</div>';
        return;
    }
    
    let html = '<h4 style="margin-bottom:15px; color:var(--primary);">📋 Дополнительная информация</h4>';
    
    for (const field of fields) {
        const value = values[field.id] || '';
        const isRequired = field.isRequired;
        const isMissing = isRequired && !value;
        
        html += `
            <div class="custom-field" style="margin-bottom:20px; padding:15px; border:1px solid #e0e0e0; border-radius:10px; background:${isMissing ? '#fff8e1' : '#fafafa'}; ${isMissing ? 'border-left:4px solid #ff9800;' : ''}">
                <label style="display:block; margin-bottom:8px; font-weight:500;">
                    ${escapeHtml(field.label)}
                    ${isRequired ? '<span style="color:#dc3545;"> *</span>' : ''}
                    ${isMissing ? '<span style="background:#ff9800; color:white; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:8px;">Не заполнено</span>' : ''}
                </label>
                ${renderFieldInput(field, value)}
                ${field.semantics ? `<small style="display:block; margin-top:5px; color:#667eea;">🔗 ${escapeHtml(field.semantics)}</small>` : ''}
            </div>
        `;
    }
    
    html += `<button class="save-fields-btn" onclick="saveCustomFields()" style="background:#28a745; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; margin-top:10px;">💾 Сохранить</button>`;
    
    container.innerHTML = html;
}

// Рендер поля в зависимости от типа
function renderFieldInput(field, value) {
    const fieldId = `field_${field.id}`;
    
    switch (field.type) {
        case 'radio':
            if (!field.options || !field.options.length) {
                return '<p style="color:red;">Нет вариантов</p>';
            }
            let radioHtml = '<div style="display:flex; flex-wrap:wrap; gap:15px;">';
            for (const opt of field.options) {
                radioHtml += `
                    <label style="display:flex; align-items:center; cursor:pointer;">
                        <input type="radio" name="${fieldId}" value="${escapeHtml(opt)}" ${value === opt ? 'checked' : ''} style="width:16px; height:16px; margin-right:8px;">
                        <span>${escapeHtml(opt)}</span>
                    </label>
                `;
            }
            radioHtml += '</div>';
            return radioHtml;
            
        case 'select':
            if (!field.options || !field.options.length) {
                return '<p style="color:red;">Нет вариантов</p>';
            }
            let selectHtml = `<select id="${fieldId}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;">`;
            selectHtml += `<option value="">-- Выберите --</option>`;
            for (const opt of field.options) {
                selectHtml += `<option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`;
            }
            selectHtml += '</select>';
            return selectHtml;
            
        case 'textarea':
            return `<textarea id="${fieldId}" rows="3" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;">${escapeHtml(value)}</textarea>`;
            
        default:
            return `<input type="${field.type || 'text'}" id="${fieldId}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;">`;
    }
}

// Сохранение полей
async function saveCustomFields() {
    const userId = window.auth.currentUser?.uid;
    if (!userId) return;
    
    const fields = await window.fieldsManager.getActiveFields();
    const values = {};
    
    for (const field of fields) {
        if (field.type === 'radio') {
            const selected = document.querySelector(`input[name="field_${field.id}"]:checked`);
            values[field.id] = selected ? selected.value : '';
        } else {
            const element = document.getElementById(`field_${field.id}`);
            if (element) {
                values[field.id] = element.value;
            }
        }
    }
    
    const btn = document.querySelector('.save-fields-btn');
    const originalText = btn?.textContent;
    if (btn) {
        btn.textContent = '⏳ Сохранение...';
        btn.disabled = true;
    }
    
    try {
        await window.fieldsManager.saveFieldValues(userId, values);
        showMessage('✅ Данные успешно сохранены!', 'success');
        await loadCustomFields(); // Обновляем отображение
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showMessage('❌ Ошибка: ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// Обновление полей (при переключении вкладки)
function refreshCustomFields() {
    console.log('🔄 Обновление полей...');
    loadCustomFields();
}

// Предупреждение о незаполненных полях
function showMissingWarning(missingFields) {
    const container = document.getElementById('missingFieldsWarning');
    if (!container) return;
    const names = missingFields.map(f => f.label).join(', ');
    container.innerHTML = `
        <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px 15px; border-radius:8px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <span>⚠️ Внимание! Обязательные поля: ${names}</span>
            <button onclick="document.getElementById('customFieldsContainer').scrollIntoView({behavior:'smooth'})" style="background:#ffc107; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;">Заполнить</button>
        </div>
    `;
    container.style.display = 'block';
}

function hideMissingWarning() {
    const container = document.getElementById('missingFieldsWarning');
    if (container) {
        container.style.display = 'none';
    }
}

// Вспомогательные функции
function showMessage(message, type) {
    const el = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, 3000);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Инициализация
if (document.getElementById('customFieldsContainer')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(loadCustomFields, 500);
    });
}
