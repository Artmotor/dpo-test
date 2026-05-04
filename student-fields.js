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

        // Получаем все активные поля из Firestore
        const fields = await window.fieldsManager.getActiveFields();

        // Получаем сохраненные значения пользователя
        const values = await window.fieldsManager.getFieldValues(userId);

        // ОЧИЩАЕМ значения для полей, которые больше не существуют (если поле было удалено администратором)
        const cleanedValues = {};
        let hasOrphanedFields = false;

        for (const [key, value] of Object.entries(values)) {
            const fieldExists = fields.some(f => f.id === key);
            if (fieldExists) {
                cleanedValues[key] = value;
            } else {
                console.log(`🧹 Очистка устаревшего значения для поля ${key}`);
                hasOrphanedFields = true;
            }
        }

        // Если были удалены устаревшие поля, обновляем данные пользователя
        if (hasOrphanedFields) {
            await window.db.collection('users').doc(userId).update({
                customFields: cleanedValues
            });
            console.log('✅ Устаревшие поля очищены');
        }

        console.log('Найдено полей:', fields.length);

        displayCustomFields(fields, cleanedValues);

        // Проверяем обязательные поля
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
        if (typeof showError === 'function') {
            showError('errorMessage', 'Ошибка загрузки полей: ' + error.message);
        }
    }
}

// Отображение полей (с семантикой)
function displayCustomFields(fields, values) {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;

    if (!fields || fields.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">📭 Нет дополнительных полей для заполнения</div>';
        return;
    }

    let html = '<h4 style="margin-bottom:15px; color:var(--primary);">📋 Дополнительная информация</h4>';
    html += '<div style="margin-bottom:20px; padding:10px; background:#e8f5e9; border-radius:8px; font-size:13px; color:#555;">';
    html += 'ℹ️ Поля, отмеченные <span style="color:#dc3545;">*</span>, обязательны для заполнения.';
    html += '</div>';

    for (const field of fields) {
        const value = values[field.id] || '';
        const isRequired = field.isRequired;
        const isMissing = isRequired && (!value || (typeof value === 'string' && value.trim() === ''));

        html += `
            <div class="custom-field" data-field-id="${field.id}" style="margin-bottom:20px; padding:15px; border:1px solid #e0e0e0; border-radius:10px; background:${isMissing ? '#fff8e1' : '#fafafa'}; ${isMissing ? 'border-left:4px solid #ff9800;' : ''}">
                <label style="display:block; margin-bottom:8px; font-weight:500;">
                    ${escapeHtml(field.label)}
                    ${isRequired ? '<span style="color:#dc3545;"> *</span>' : ''}
                    ${isMissing ? '<span style="background:#ff9800; color:white; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:8px;">Не заполнено</span>' : ''}
                </label>
                ${renderFieldInput(field, value)}
                ${field.semantics ? `
                    <div style="margin-top:8px; padding:8px 12px; background:#e3f2fd; border-radius:6px; font-size:12px;">
                        🔗 <strong>Семантика:</strong> <a href="${escapeHtml(field.semantics)}" target="_blank" style="color:#1976d2; text-decoration:none;">${escapeHtml(field.semantics)}</a>
                        <span style="display:block; font-size:11px; color:#666; margin-top:4px;">Ссылка на схему данных поля</span>
                    </div>
                ` : ''}
                ${field.placeholder ? `<small style="display:block; margin-top:5px; color:#999;">💡 ${escapeHtml(field.placeholder)}</small>` : ''}
            </div>
        `;
    }

    html += `<button class="save-fields-btn" onclick="saveCustomFields()" style="background:#28a745; color:white; border:none; padding:12px 24px; border-radius:8px; cursor:pointer; margin-top:10px; font-weight:500; transition:all 0.3s;">💾 Сохранить все данные</button>`;

    container.innerHTML = html;
}

// Рендер поля в зависимости от типа
function renderFieldInput(field, value) {
    const fieldId = `field_${field.id}`;

    switch (field.type) {
        case 'radio':
            if (!field.options || !field.options.length) {
                return '<p style="color:red; font-size:12px;">❌ Нет вариантов для выбора. Обратитесь к администратору.</p>';
            }
            let radioHtml = '<div style="display:flex; flex-wrap:wrap; gap:15px;">';
            for (const opt of field.options) {
                radioHtml += `
                    <label style="display:flex; align-items:center; cursor:pointer;">
                        <input type="radio" name="${fieldId}" value="${escapeHtml(opt)}" ${value === opt ? 'checked' : ''} style="width:16px; height:16px; margin-right:8px; cursor:pointer;">
                        <span>${escapeHtml(opt)}</span>
                    </label>
                `;
            }
            radioHtml += '</div>';
            return radioHtml;

        case 'select':
            if (!field.options || !field.options.length) {
                return '<p style="color:red; font-size:12px;">❌ Нет вариантов для выбора. Обратитесь к администратору.</p>';
            }
            let selectHtml = `<select id="${fieldId}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px; font-size:14px;">`;
            selectHtml += `<option value="">-- Выберите --</option>`;
            for (const opt of field.options) {
                selectHtml += `<option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`;
            }
            selectHtml += '</select>';
            return selectHtml;

        case 'textarea':
            return `<textarea id="${fieldId}" rows="3" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px; font-family:inherit; font-size:14px; resize:vertical;" placeholder="${escapeHtml(field.placeholder || '')}">${escapeHtml(value)}</textarea>`;

        case 'email':
            return `<input type="email" id="${fieldId}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px; font-size:14px;">`;

        case 'tel':
            return `<input type="tel" id="${fieldId}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px; font-size:14px;">`;

        case 'date':
            return `<input type="date" id="${fieldId}" value="${escapeHtml(value)}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px; font-size:14px;">`;

        case 'number':
            return `<input type="number" id="${fieldId}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px; font-size:14px;">`;

        default:
            return `<input type="text" id="${fieldId}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px; font-size:14px;">`;
    }
}

// Сохранение полей
async function saveCustomFields() {
    const userId = window.auth.currentUser?.uid;
    if (!userId) {
        if (typeof showError === 'function') {
            showError('errorMessage', 'Пользователь не авторизован');
        }
        return;
    }

    const fields = await window.fieldsManager.getActiveFields();
    const values = {};

    // Собираем значения
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

    // Проверка обязательных полей на клиенте
    const requiredFields = fields.filter(f => f.isRequired);
    const missingRequired = [];

    for (const field of requiredFields) {
        const value = values[field.id];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            missingRequired.push(field.label);
        }
    }

    if (missingRequired.length > 0) {
        const message = `⚠️ Заполните обязательные поля: ${missingRequired.join(', ')}`;
        if (typeof showError === 'function') {
            showError('errorMessage', message);
        } else {
            alert(message);
        }

        // Подсвечиваем и прокручиваем к первому незаполненному полю
        const firstMissingField = fields.find(f => missingRequired.includes(f.label));
        if (firstMissingField) {
            const container = document.querySelector(`.custom-field[data-field-id="${firstMissingField.id}"]`);
            if (container) {
                container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                container.style.transition = 'all 0.3s';
                container.style.boxShadow = '0 0 0 3px #ff9800';
                setTimeout(() => {
                    container.style.boxShadow = '';
                }, 2000);
            }
        }
        return;
    }

    const btn = document.querySelector('.save-fields-btn');
    const originalText = btn?.textContent;
    if (btn) {
        btn.textContent = '⏳ Сохранение...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
    }

    try {
        await window.fieldsManager.saveFieldValues(userId, values);

        if (typeof showSuccess === 'function') {
            showSuccess('✅ Данные успешно сохранены!');
        } else {
            const successDiv = document.getElementById('successMessage');
            if (successDiv) {
                successDiv.textContent = '✅ Данные успешно сохранены!';
                successDiv.style.display = 'block';
                setTimeout(() => {
                    successDiv.style.display = 'none';
                }, 3000);
            }
        }

        // Обновляем отображение
        await loadCustomFields();

    } catch (error) {
        console.error('Ошибка сохранения:', error);
        if (typeof showError === 'function') {
            showError('errorMessage', '❌ Ошибка: ' + error.message);
        } else {
            alert('❌ Ошибка: ' + error.message);
        }
    } finally {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.opacity = '1';
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
        <div style="background:#fff3cd; border-left:4px solid #ff9800; padding:12px 15px; border-radius:8px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:20px;">⚠️</span>
                <span><strong>Внимание!</strong> Обязательные поля: ${names}</span>
            </div>
            <button onclick="document.getElementById('customFieldsContainer').scrollIntoView({behavior:'smooth'})" style="background:#ff9800; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;">Заполнить</button>
        </div>
    `;
    container.style.display = 'block';
}

function hideMissingWarning() {
    const container = document.getElementById('missingFieldsWarning');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

// Вспомогательная функция для показа сообщений
function showMessage(message, type) {
    const el = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, 3000);
    } else if (type === 'success' && typeof showSuccess === 'function') {
        showSuccess(message);
    } else if (type === 'error' && typeof showError === 'function') {
        showError('errorMessage', message);
    }
}

// Функция экранирования HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Функция для ручной очистки устаревших полей (вызывается из консоли)
async function cleanupOrphanedCustomFields() {
    const userId = window.auth.currentUser?.uid;
    if (!userId) {
        console.log('Пользователь не авторизован');
        return;
    }

    try {
        const fields = await window.fieldsManager.getActiveFields();
        const values = await window.fieldsManager.getFieldValues(userId);
        const existingFieldIds = new Set(fields.map(f => f.id));

        let cleanedCount = 0;
        const cleanedValues = {};

        for (const [key, value] of Object.entries(values)) {
            if (existingFieldIds.has(key)) {
                cleanedValues[key] = value;
            } else {
                console.log(`🧹 Удаление устаревшего поля: ${key}`);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            await window.db.collection('users').doc(userId).update({
                customFields: cleanedValues
            });
            console.log(`✅ Очищено ${cleanedCount} устаревших полей`);
            await loadCustomFields();
        } else {
            console.log('✅ Нет устаревших полей для очистки');
        }

        return { cleaned: cleanedCount };
    } catch (error) {
        console.error('Ошибка очистки полей:', error);
        throw error;
    }
}

// Экспортируем функции в глобальную область
window.loadCustomFields = loadCustomFields;
window.refreshCustomFields = refreshCustomFields;
window.saveCustomFields = saveCustomFields;
window.showMissingWarning = showMissingWarning;
window.hideMissingWarning = hideMissingWarning;
window.cleanupOrphanedCustomFields = cleanupOrphanedCustomFields;

// Инициализация при загрузке DOM
if (document.getElementById('customFieldsContainer')) {
    document.addEventListener('DOMContentLoaded', () => {
        // Небольшая задержка для полной загрузки Firebase
        setTimeout(() => {
            if (window.auth && window.auth.currentUser) {
                loadCustomFields();
            }
        }, 500);
    });
}

// Слушатель авторизации для повторной загрузки полей
if (window.auth) {
    window.auth.onAuthStateChanged((user) => {
        if (user && user.emailVerified && document.getElementById('customFieldsContainer')) {
            setTimeout(() => {
                loadCustomFields();
            }, 500);
        }
    });
}

console.log('✅ student-fields.js загружен');
