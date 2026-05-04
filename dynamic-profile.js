// dynamic-profile.js - полностью динамический профиль

class DynamicProfile {
    constructor() {
        this.fieldDefinitions = [];     // все поля
        this.tabs = [];                 // сгруппированные вкладки
        this.userData = null;
        this.userId = null;
        this.currentTab = null;
        this.editMode = false;
        this.currentEditField = null;
    }

    // Инициализация
    async init(userId) {
        this.userId = userId;
        await this.loadFieldDefinitions();
        await this.loadUserData();
        this.renderTabs();
    }

    // Загрузка всех полей из Firestore
    async loadFieldDefinitions() {
        try {
            const snapshot = await window.db.collection('field_definitions')
                .where('isActive', '==', true)
                .orderBy('tabOrder', 'asc')
                .orderBy('fieldOrder', 'asc')
                .get();
            
            this.fieldDefinitions = [];
            snapshot.forEach(doc => {
                this.fieldDefinitions.push({ id: doc.id, ...doc.data() });
            });

            // Группируем по вкладкам
            this.groupFieldsByTabs();
            
            console.log(`✅ Загружено ${this.fieldDefinitions.length} полей, ${this.tabs.length} вкладок`);
        } catch (error) {
            console.error('Ошибка загрузки полей:', error);
        }
    }

    // Группировка полей по вкладкам
    groupFieldsByTabs() {
        const tabMap = new Map();
        
        for (const field of this.fieldDefinitions) {
            const tabKey = field.category || 'general';
            const tabName = field.tabName || 'Основная информация';
            const tabOrder = field.tabOrder || 999;
            
            if (!tabMap.has(tabKey)) {
                tabMap.set(tabKey, {
                    id: tabKey,
                    name: tabName,
                    order: tabOrder,
                    fields: []
                });
            }
            tabMap.get(tabKey).fields.push(field);
        }
        
        // Сортируем поля внутри вкладок
        for (const [_, tab] of tabMap) {
            tab.fields.sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0));
        }
        
        // Сортируем вкладки
        this.tabs = Array.from(tabMap.values()).sort((a, b) => a.order - b.order);
    }

    // Загрузка данных пользователя
    async loadUserData() {
        try {
            const doc = await window.db.collection('users').doc(this.userId).get();
            this.userData = doc.data() || {};
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    // Рендер всех вкладок
    renderTabs() {
        const container = document.getElementById('dynamicProfileContainer');
        if (!container) return;

        // Создаём HTML для вкладок
        let tabsHtml = '<div class="dynamic-tabs">';
        let contentHtml = '<div class="dynamic-tab-content">';
        
        this.tabs.forEach((tab, index) => {
            const isActive = index === 0;
            tabsHtml += `
                <button class="dynamic-tab-btn ${isActive ? 'active' : ''}" 
                        onclick="dynamicProfile.switchTab('${tab.id}')">
                    ${this.escapeHtml(tab.name)}
                </button>
            `;
            
            contentHtml += `
                <div id="tab-${tab.id}" class="dynamic-tab-pane ${isActive ? 'active' : ''}">
                    ${this.renderFields(tab.fields)}
                </div>
            `;
        });
        
        tabsHtml += '</div>';
        contentHtml += '</div>';
        
        container.innerHTML = tabsHtml + contentHtml;
    }

    // Рендер полей во вкладке
    renderFields(fields) {
        if (!fields || fields.length === 0) {
            return '<div class="empty-state">Нет полей для отображения</div>';
        }

        let html = '<div class="dynamic-fields-grid">';
        
        for (const field of fields) {
            const value = this.getUserFieldValue(field.id);
            const isRequired = field.isRequired;
            const isMissing = isRequired && (!value || value === '');
            
            html += `
                <div class="dynamic-field-card ${isMissing ? 'field-missing' : ''}" data-field-id="${field.id}">
                    <div class="field-header">
                        <label class="field-label">
                            ${this.escapeHtml(field.label)}
                            ${isRequired ? '<span class="required-star">*</span>' : ''}
                        </label>
                        ${!field.readOnly && this.editMode ? `
                            <button class="field-edit-btn" onclick="dynamicProfile.editField('${field.id}')">
                                ✏️
                            </button>
                        ` : ''}
                    </div>
                    <div class="field-value" id="field-display-${field.id}">
                        ${this.renderFieldValue(field, value)}
                    </div>
                    ${field.semantics ? `
                        <div class="field-semantics">
                            🔗 <a href="${this.escapeHtml(field.semantics)}" target="_blank">${this.escapeHtml(field.semantics)}</a>
                        </div>
                    ` : ''}
                    ${field.placeholder && !value ? `
                        <div class="field-placeholder">💡 ${this.escapeHtml(field.placeholder)}</div>
                    ` : ''}
                </div>
            `;
        }
        
        html += '</div>';
        
        if (this.editMode) {
            html += `
                <div class="edit-actions">
                    <button class="save-all-btn" onclick="dynamicProfile.saveAllFields()">💾 Сохранить все изменения</button>
                    <button class="cancel-edit-btn" onclick="dynamicProfile.cancelEdit()">❌ Отмена</button>
                </div>
            `;
        } else {
            html += `
                <div class="edit-actions">
                    <button class="edit-all-btn" onclick="dynamicProfile.enableEditMode()">✏️ Редактировать профиль</button>
                </div>
            `;
        }
        
        return html;
    }

    // Отображение значения поля
    renderFieldValue(field, value) {
        if (this.editMode && !field.readOnly) {
            // Режим редактирования
            return this.renderFieldInput(field, value);
        } else {
            // Режим просмотра
            if (!value || value === '') {
                return '<span class="empty-value">—</span>';
            }
            
            switch (field.type) {
                case 'date':
                    return this.formatDate(value);
                case 'email':
                    return `<a href="mailto:${this.escapeHtml(value)}">${this.escapeHtml(value)}</a>`;
                case 'tel':
                    return `<a href="tel:${this.escapeHtml(value)}">${this.escapeHtml(value)}</a>`;
                case 'textarea':
                    return `<div class="multiline-value">${this.escapeHtml(value)}</div>`;
                default:
                    return this.escapeHtml(value);
            }
        }
    }

    // Рендер поля для редактирования
    renderFieldInput(field, value) {
        const fieldId = `field_${field.id}`;
        
        switch (field.type) {
            case 'textarea':
                return `<textarea id="${fieldId}" class="field-input" rows="3" placeholder="${this.escapeHtml(field.placeholder || '')}">${this.escapeHtml(value)}</textarea>`;
                
            case 'radio':
                if (!field.options || !field.options.length) {
                    return '<span class="error">Нет вариантов</span>';
                }
                let radioHtml = '<div class="radio-group">';
                for (const opt of field.options) {
                    radioHtml += `
                        <label class="radio-label">
                            <input type="radio" name="${fieldId}" value="${this.escapeHtml(opt)}" ${value === opt ? 'checked' : ''}>
                            <span>${this.escapeHtml(opt)}</span>
                        </label>
                    `;
                }
                radioHtml += '</div>';
                return radioHtml;
                
            case 'select':
                if (!field.options || !field.options.length) {
                    return '<span class="error">Нет вариантов</span>';
                }
                let selectHtml = `<select id="${fieldId}" class="field-input">`;
                selectHtml += `<option value="">-- Выберите --</option>`;
                for (const opt of field.options) {
                    selectHtml += `<option value="${this.escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${this.escapeHtml(opt)}</option>`;
                }
                selectHtml += '</select>';
                return selectHtml;
                
            default:
                return `<input type="${field.type || 'text'}" id="${fieldId}" class="field-input" value="${this.escapeHtml(value)}" placeholder="${this.escapeHtml(field.placeholder || '')}">`;
        }
    }

    // Получить значение поля пользователя
    getUserFieldValue(fieldId) {
        // Проверяем в корне документа
        if (this.userData && this.userData[fieldId] !== undefined) {
            return this.userData[fieldId];
        }
        // Проверяем в customFields
        if (this.userData.customFields && this.userData.customFields[fieldId] !== undefined) {
            return this.userData.customFields[fieldId];
        }
        return '';
    }

    // Включить режим редактирования
    enableEditMode() {
        this.editMode = true;
        this.renderTabs();
    }

    // Отменить редактирование
    cancelEdit() {
        this.editMode = false;
        this.renderTabs();
    }

    // Редактирование отдельного поля (модальное окно)
    async editField(fieldId) {
        const field = this.fieldDefinitions.find(f => f.id === fieldId);
        if (!field || field.readOnly) return;
        
        this.currentEditField = field;
        const currentValue = this.getUserFieldValue(fieldId);
        
        this.showFieldModal(field, currentValue);
    }

    // Показать модальное окно для редактирования поля
    showFieldModal(field, currentValue) {
        let modal = document.getElementById('fieldEditModal');
        if (!modal) {
            modal = this.createFieldModal();
        }
        
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="form-group">
                <label>${this.escapeHtml(field.label)} ${field.isRequired ? '<span class="required-star">*</span>' : ''}</label>
                ${this.renderFieldInput(field, currentValue)}
                ${field.semantics ? `<small class="field-hint">🔗 Семантика: ${this.escapeHtml(field.semantics)}</small>` : ''}
                ${field.placeholder ? `<small class="field-hint">💡 ${this.escapeHtml(field.placeholder)}</small>` : ''}
            </div>
        `;
        
        modal.querySelector('.modal-header h3').textContent = `Редактирование: ${field.label}`;
        modal.style.display = 'block';
        
        // Сохраняем обработчик
        const saveBtn = modal.querySelector('.save-field-btn');
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.onclick = () => this.saveSingleField(field);
        
        const closeBtn = modal.querySelector('.close-field-modal');
        closeBtn.onclick = () => modal.style.display = 'none';
    }

    createFieldModal() {
        const modal = document.createElement('div');
        modal.id = 'fieldEditModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Редактирование поля</h3>
                    <span class="close-field-modal">&times;</span>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer">
                    <button class="btn-secondary close-field-modal">Отмена</button>
                    <button class="btn-primary save-field-btn">Сохранить</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Закрытие по клику вне
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        return modal;
    }

    // Сохранить одно поле
    async saveSingleField(field) {
        const fieldId = `field_${field.id}`;
        let newValue;
        
        if (field.type === 'radio') {
            const selected = document.querySelector(`input[name="${fieldId}"]:checked`);
            newValue = selected ? selected.value : '';
        } else {
            const input = document.getElementById(fieldId);
            if (input) {
                newValue = input.type === 'checkbox' ? input.checked : input.value;
            } else {
                newValue = '';
            }
        }
        
        // Валидация
        if (field.isRequired && (!newValue || newValue === '')) {
            this.showToast(`Поле "${field.label}" обязательно для заполнения`, 'warning');
            return;
        }
        
        await this.saveFieldValue(field.id, newValue);
        
        document.getElementById('fieldEditModal').style.display = 'none';
        this.renderTabs();
        this.showToast(`✅ Поле "${field.label}" сохранено`, 'success');
    }

    // Сохранить все поля
    async saveAllFields() {
        const updates = {};
        
        for (const field of this.fieldDefinitions) {
            if (field.readOnly) continue;
            
            const fieldId = `field_${field.id}`;
            let newValue;
            
            if (field.type === 'radio') {
                const selected = document.querySelector(`input[name="${fieldId}"]:checked`);
                newValue = selected ? selected.value : '';
            } else {
                const input = document.getElementById(fieldId);
                if (input) {
                    newValue = input.type === 'checkbox' ? input.checked : input.value;
                } else {
                    newValue = '';
                }
            }
            
            updates[field.id] = newValue;
        }
        
        // Проверка обязательных полей
        const missingFields = [];
        for (const field of this.fieldDefinitions) {
            if (field.isRequired && !updates[field.id]) {
                missingFields.push(field.label);
            }
        }
        
        if (missingFields.length > 0) {
            this.showToast(`Заполните обязательные поля: ${missingFields.join(', ')}`, 'warning');
            return;
        }
        
        try {
            await window.db.collection('users').doc(this.userId).update({
                ...updates,
                customFields: updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.editMode = false;
            await this.loadUserData();
            this.renderTabs();
            this.showToast('✅ Все данные сохранены', 'success');
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showToast('❌ Ошибка сохранения', 'error');
        }
    }

    async saveFieldValue(fieldId, value) {
        try {
            await window.db.collection('users').doc(this.userId).update({
                [fieldId]: value,
                [`customFields.${fieldId}`]: value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            if (this.userData) {
                this.userData[fieldId] = value;
                if (!this.userData.customFields) this.userData.customFields = {};
                this.userData.customFields[fieldId] = value;
            }
        } catch (error) {
            console.error('Ошибка сохранения поля:', error);
            throw error;
        }
    }

    // Переключение вкладки
    switchTab(tabId) {
        // Обновляем кнопки
        document.querySelectorAll('.dynamic-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.dynamic-tab-btn[onclick*="${tabId}"]`)?.classList.add('active');
        
        // Обновляем панели
        document.querySelectorAll('.dynamic-tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`tab-${tabId}`)?.classList.add('active');
    }

    // Вспомогательные функции
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    formatDate(value) {
        if (!value) return '—';
        try {
            const date = new Date(value);
            return date.toLocaleDateString('ru-RU');
        } catch {
            return value;
        }
    }

    showToast(message, type) {
        const toast = document.getElementById('toastMessage');
        if (toast) {
            toast.textContent = message;
            toast.className = `toast toast-${type}`;
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }
}

// Глобальный экземпляр
window.dynamicProfile = null;