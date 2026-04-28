// student-fields.js - отображение полей в кабинете слушателя

let cachedFields = null;
let cachedValues = null;
let lastLoadTime = 0;
const CACHE_TTL = 5000; // 5 секунд кэширования

// Принудительная перезагрузка (очищаем кэш)
function forceReloadFields() {
    console.log('🔄 Принудительная очистка кэша полей');
    cachedFields = null;
    cachedValues = null;
    lastLoadTime = 0;
    return loadCustomFields();
}

// Загрузка пользовательских полей (всегда свежие данные)
async function loadCustomFields(force = false) {
    try {
        const userId = window.auth.currentUser?.uid;
        if (!userId) {
            console.log('Пользователь не авторизован');
            return;
        }
        
        const now = Date.now();
        
        // Если не форсируем и кэш свежий - используем его
        if (!force && cachedFields && (now - lastLoadTime) < CACHE_TTL) {
            console.log('📦 Используем кэшированные поля');
            displayCustomFields(cachedFields, cachedValues);
            return;
        }
        
        console.log('🔄 Загрузка свежих данных из Firestore...');
        
        // Получаем все поля напрямую из Firestore
        const snapshot = await window.db.collection('custom_fields').get();
        const allFields = [];
        snapshot.forEach(doc => {
            allFields.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Фильтруем активные поля
        const activeFields = allFields.filter(field => field.isActive !== false);
        activeFields.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Получаем значения пользователя
        const userDoc = await window.db.collection('users').doc(userId).get();
        const userValues = userDoc.exists ? (userDoc.data().customFields || {}) : {};
        
        // Сохраняем в кэш
        cachedFields = activeFields;
        cachedValues = userValues;
        lastLoadTime = now;
        
        console.log(`📋 Загружено полей: ${activeFields.length}`);
        console.log('Поля:', activeFields.map(f => ({ id: f.id, label: f.label, type: f.type, isActive: f.isActive })));
        
        displayCustomFields(activeFields, userValues);
        
        // Проверяем обязательные поля
        const missingFields = activeFields.filter(f => f.isRequired && (!userValues[f.id] || userValues[f.id].trim() === ''));
        if (missingFields.length > 0) {
            showMissingFieldsWarning(missingFields);
        } else {
            hideMissingFieldsWarning();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки полей:', error);
        const container = document.getElementById('customFieldsContainer');
        if (container) {
            container.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">❌ Ошибка загрузки дополнительных полей</p>';
        }
    }
}

// Отображение полей в интерфейсе
function displayCustomFields(fields, values) {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;
    
    if (!fields || fields.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                <p>Нет дополнительных полей для заполнения</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: var(--primary, #2c5f2d); margin-bottom: 5px;">📋 Дополнительная информация</h4>
            <p style="color: #666; font-size: 13px;">Поля, отмеченные <span style="color: #dc3545;">*</span>, обязательны для заполнения</p>
        </div>
    `;
    
    for (const field of fields) {
        const value = values[field.id] || '';
        const isFilled = value && value.trim() !== '';
        const warningClass = (!isFilled && field.isRequired) ? 'required-missing' : '';
        
        html += `
            <div class="custom-field ${warningClass}" data-field-id="${field.id}" style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 10px; background: ${warningClass ? '#fff8e1' : '#fafafa'};">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">
                    ${escapeHtml(field.label)}
                    ${field.isRequired ? '<span style="color: #dc3545; margin-left: 4px;">*</span>' : ''}
                    ${!isFilled && field.isRequired ? '<span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Не заполнено</span>' : ''}
                </label>
                
                ${renderFieldInput(field, value)}
                
                ${field.semantics ? `<small style="display: block; margin-top: 8px; color: #667eea; font-size: 11px;">🔗 Семантика: <a href="${escapeHtml(field.semantics)}" target="_blank">${escapeHtml(field.semantics)}</a></small>` : ''}
                
                ${!isFilled && field.isRequired ? `<small style="display: block; margin-top: 8px; color: #ff9800; font-size: 11px;">⚠️ Это поле обязательно для заполнения</small>` : ''}
            </div>
        `;
    }
    
    html += `<div style="margin-top: 20px;"><button class="save-fields-btn" onclick="saveCustomFields()" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">💾 Сохранить дополнительную информацию</button></div>`;
    
    container.innerHTML = html;
}

// Рендер поля в зависимости от типа
function renderFieldInput(field, value) {
    const fieldId = `field_${field.id}`;
    const isRequired = field.isRequired ? 'required' : '';
    
    switch (field.type) {
        case 'radio':
            if (!field.options || !field.options.length) {
                return '<p style="color: #dc3545;">Ошибка: нет вариантов</p>';
            }
            let radioHtml = `<div class="radio-group" style="display: flex; flex-wrap: wrap; gap: 20px; padding: 10px 0;">`;
            for (const opt of field.options) {
                const checked = (value === opt) ? 'checked' : '';
                radioHtml += `
                    <label style="display: inline-flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="${fieldId}" value="${escapeHtml(opt)}" ${checked} ${isRequired} style="width: 18px; height: 18px; margin-right: 8px;">
                        <span>${escapeHtml(opt)}</span>
                    </label>
                `;
            }
            radioHtml += `</div>`;
            return radioHtml;
            
        case 'select':
            if (!field.options || !field.options.length) {
                return '<p style="color: #dc3545;">Ошибка: нет вариантов</p>';
            }
            let selectHtml = `<select id="${fieldId}" ${isRequired} style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;"><option value="">-- Выберите --</option>`;
            for (const opt of field.options) {
                const selected = (value === opt) ? 'selected' : '';
                selectHtml += `<option value="${escapeHtml(opt)}" ${selected}>${escapeHtml(opt)}</option>`;
            }
            selectHtml += `</select>`;
            return selectHtml;
            
        case 'textarea':
            return `<textarea id="${fieldId}" placeholder="${field.placeholder || ''}" rows="3" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">${escapeHtml(value)}</textarea>`;
            
        case 'date':
            return `<input type="date" id="${fieldId}" value="${escapeHtml(value)}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
            
        case 'number':
            return `<input type="number" id="${fieldId}" placeholder="${field.placeholder || ''}" value="${escapeHtml(value)}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
            
        case 'email':
            return `<input type="email" id="${fieldId}" placeholder="${field.placeholder || ''}" value="${escapeHtml(value)}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
            
        case 'tel':
            return `<input type="tel" id="${fieldId}" placeholder="${field.placeholder || ''}" value="${escapeHtml(value)}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
            
        default:
            return `<input type="text" id="${fieldId}" placeholder="${field.placeholder || ''}" value="${escapeHtml(value)}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">`;
    }
}

// Сохранение полей
async function saveCustomFields() {
    const userId = window.auth.currentUser?.uid;
    if (!userId) return;
    
    if (!cachedFields) {
        await loadCustomFields(true);
    }
    
    const values = {};
    
    for (const field of cachedFields) {
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
        await window.db.collection('users').doc(userId).update({
            customFields: values
        });
        
        // Обновляем кэш
        cachedValues = values;
        
        showSuccessMessage('✅ Данные успешно сохранены!');
        
        // Обновляем отображение
        displayCustomFields(cachedFields, cachedValues);
        
        // Проверяем обязательные поля
        const missingFields = cachedFields.filter(f => f.isRequired && (!values[f.id] || values[f.id].trim() === ''));
        if (missingFields.length > 0) {
            showMissingFieldsWarning(missingFields);
        } else {
            hideMissingFieldsWarning();
        }
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showErrorMessage('❌ Ошибка сохранения: ' + error.message);
    } finally {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// Обновление полей (принудительная перезагрузка)
function refreshCustomFields() {
    console.log('🔄 Принудительное обновление полей');
    return loadCustomFields(true);
}

// Функции для сообщений
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
    const container = document.getElementById('missingFieldsWarning');
    if (!container) return;
    const fieldNames = missingFields.map(f => f.label).join(', ');
    container.innerHTML = `
        <div class="warning-banner" style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <span>⚠️ Внимание! У вас есть незаполненные обязательные поля: ${fieldNames}</span>
            <button onclick="document.getElementById('customFieldsContainer').scrollIntoView({behavior: 'smooth'})" class="warning-btn" style="background: #ffc107; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer;">Заполнить сейчас</button>
        </div>
    `;
    container.style.display = 'block';
}

function hideMissingFieldsWarning() {
    const container = document.getElementById('missingFieldsWarning');
    if (container) {
        container.style.display = 'none';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Слушаем событие возврата на страницу
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'additionalFieldsTab') {
            console.log('🔄 Возврат на вкладку, обновляем поля...');
            refreshCustomFields();
        }
    }
});

// Инициализация
if (document.getElementById('customFieldsContainer')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => loadCustomFields(true), 500);
    });
}
