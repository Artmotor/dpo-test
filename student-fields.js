// student-fields.js - для личного кабинета слушателя

async function loadCustomFields() {
    try {
        const userId = window.auth.currentUser?.uid;
        if (!userId) return;
        
        console.log('Загрузка дополнительных полей...');
        
        const fields = await window.fieldsManager.getActiveFields();
        const values = await window.fieldsManager.getFieldValues(userId);
        
        displayCustomFields(fields, values);
        
        const check = await window.fieldsManager.checkRequiredFields(userId);
        if (!check.allFilled) {
            showMissingWarning(check.missingFields);
        } else {
            hideMissingWarning();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        const container = document.getElementById('customFieldsContainer');
        if (container) {
            container.innerHTML = '<p style="color:red; text-align:center;">Ошибка загрузки полей</p>';
        }
    }
}

function displayCustomFields(fields, values) {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;
    
    if (!fields || fields.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">📭 Нет дополнительных полей</div>';
        return;
    }
    
    let html = '<h4 style="margin-bottom:15px;">📋 Дополнительная информация</h4>';
    
    for (const field of fields) {
        const value = values[field.id] || '';
        const isRequired = field.isRequired;
        const isMissing = isRequired && !value;
        
        html += `
            <div class="custom-field" style="margin-bottom:15px; padding:15px; border:1px solid #ddd; border-radius:8px; ${isMissing ? 'border-left:4px solid #ff9800; background:#fff8e1;' : 'background:#fafafa;'}">
                <label style="display:block; margin-bottom:8px; font-weight:500;">
                    ${escapeHtml(field.label)}
                    ${isRequired ? '<span style="color:#dc3545;">*</span>' : ''}
                    ${isMissing ? '<span style="background:#ff9800; color:white; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:8px;">Не заполнено</span>' : ''}
                </label>
                ${renderField(field, value)}
                ${field.semantics ? `<small style="display:block; margin-top:5px; color:#667eea;">🔗 ${escapeHtml(field.semantics)}</small>` : ''}
            </div>
        `;
    }
    
    html += `<button class="save-fields-btn" onclick="saveCustomFields()" style="background:#28a745; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; margin-top:10px;">💾 Сохранить</button>`;
    
    container.innerHTML = html;
}

function renderField(field, value) {
    const id = `field_${field.id}`;
    
    switch (field.type) {
        case 'radio':
            if (!field.options) return '<p style="color:red;">Нет вариантов</p>';
            let html = '<div style="display:flex; flex-wrap:wrap; gap:15px;">';
            for (const opt of field.options) {
                html += `<label style="display:flex; align-items:center; cursor:pointer;"><input type="radio" name="${id}" value="${escapeHtml(opt)}" ${value === opt ? 'checked' : ''}> <span style="margin-left:5px;">${escapeHtml(opt)}</span></label>`;
            }
            html += '</div>';
            return html;
            
        case 'select':
            if (!field.options) return '<p style="color:red;">Нет вариантов</p>';
            let select = `<select id="${id}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;"><option value="">-- Выберите --</option>`;
            for (const opt of field.options) {
                select += `<option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`;
            }
            select += '</select>';
            return select;
            
        case 'textarea':
            return `<textarea id="${id}" rows="3" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;">${escapeHtml(value)}</textarea>`;
            
        default:
            return `<input type="${field.type || 'text'}" id="${id}" value="${escapeHtml(value)}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;" placeholder="${field.placeholder || ''}">`;
    }
}

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
            const el = document.getElementById(`field_${field.id}`);
            if (el) values[field.id] = el.value;
        }
    }
    
    const btn = document.querySelector('.save-fields-btn');
    const originalText = btn?.textContent;
    if (btn) {
        btn.textContent = 'Сохранение...';
        btn.disabled = true;
    }
    
    try {
        await window.fieldsManager.saveFieldValues(userId, values);
        showMessage('✅ Данные сохранены!', 'success');
        loadCustomFields(); // Обновляем отображение
    } catch (error) {
        console.error(error);
        showMessage('❌ Ошибка: ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

function refreshCustomFields() {
    loadCustomFields();
}

function showMissingWarning(fields) {
    const container = document.getElementById('missingFieldsWarning');
    if (!container) return;
    const names = fields.map(f => f.label).join(', ');
    container.innerHTML = `
        <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:8px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
            <span>⚠️ Обязательные поля: ${names}</span>
            <button onclick="document.getElementById('customFieldsContainer').scrollIntoView({behavior:'smooth'})" style="background:#ffc107; border:none; padding:6px 12px; border-radius:5px;">Заполнить</button>
        </div>
    `;
    container.style.display = 'block';
}

function hideMissingWarning() {
    const container = document.getElementById('missingFieldsWarning');
    if (container) container.style.display = 'none';
}

function showMessage(msg, type) {
    const el = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 3000);
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
