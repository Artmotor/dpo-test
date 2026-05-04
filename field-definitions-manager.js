// field-definitions-manager.js - управление полями и вкладками

class FieldDefinitionsManager {
    constructor() {
        this.fields = [];
        this.tabs = new Map();
    }

    async init() {
        await this.loadFields();
        this.renderTabsManager();
        this.renderFieldsList();
    }

    async loadFields() {
        try {
            const snapshot = await window.db.collection('field_definitions')
                .orderBy('tabOrder', 'asc')
                .orderBy('fieldOrder', 'asc')
                .get();
            
            this.fields = [];
            snapshot.forEach(doc => {
                this.fields.push({ id: doc.id, ...doc.data() });
            });
            
            // Группируем по вкладкам для отображения
            this.tabs.clear();
            for (const field of this.fields) {
                const tabKey = field.category || 'general';
                if (!this.tabs.has(tabKey)) {
                    this.tabs.set(tabKey, {
                        id: tabKey,
                        name: field.tabName || 'Основная',
                        order: field.tabOrder || 999,
                        fields: []
                    });
                }
                this.tabs.get(tabKey).fields.push(field);
            }
        } catch (error) {
            console.error('Ошибка загрузки полей:', error);
        }
    }

    renderTabsManager() {
        const container = document.getElementById('tabsManagerContainer');
        if (!container) return;
        
        let html = `
            <div class="manager-header">
                <h3>📑 Управление вкладками</h3>
                <button class="btn-primary" onclick="fieldManager.openTabEditor()">➕ Создать вкладку</button>
            </div>
            <div class="tabs-list">
        `;
        
        const sortedTabs = Array.from(this.tabs.values()).sort((a, b) => a.order - b.order);
        
        for (const tab of sortedTabs) {
            html += `
                <div class="tab-manager-item" data-tab-id="${tab.id}">
                    <div class="tab-info">
                        <strong>${this.escapeHtml(tab.name)}</strong>
                        <span class="tab-badge">ID: ${this.escapeHtml(tab.id)}</span>
                        <span class="tab-badge">Порядок: ${tab.order}</span>
                        <span class="tab-badge">Полей: ${tab.fields.length}</span>
                    </div>
                    <div class="tab-actions">
                        <button class="btn-sm" onclick="fieldManager.editTab('${tab.id}')">✏️</button>
                        <button class="btn-sm btn-danger" onclick="fieldManager.deleteTab('${tab.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        container.innerHTML = html;
    }

    renderFieldsList() {
        const container = document.getElementById('fieldsListContainer');
        if (!container) return;
        
        if (this.fields.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Нет созданных полей</div>';
            return;
        }
        
        let html = `
            <div class="manager-header">
                <h3>📋 Управление полями</h3>
                <button class="btn-primary" onclick="fieldManager.openFieldEditor()">➕ Создать поле</button>
            </div>
            <div class="fields-list">
        `;
        
        const sortedFields = [...this.fields].sort((a, b) => {
            if (a.tabOrder !== b.tabOrder) return (a.tabOrder || 0) - (b.tabOrder || 0);
            return (a.fieldOrder || 0) - (b.fieldOrder || 0);
        });
        
        for (const field of sortedFields) {
            const typeIcon = this.getTypeIcon(field.type);
            const requiredBadge = field.isRequired ? '<span class="badge-required">Обязательное</span>' : '<span class="badge-optional">Необязательное</span>';
            const activeBadge = field.isActive !== false ? '<span class="badge-active">Активно</span>' : '<span class="badge-inactive">Отключено</span>';
            
            html += `
                <div class="field-manager-item" data-field-id="${field.id}">
                    <div class="field-header">
                        <div class="field-title">
                            <strong>${this.escapeHtml(field.label)}</strong>
                            ${typeIcon}
                            ${requiredBadge}
                            ${activeBadge}
                        </div>
                        <div class="field-actions">
                            <button class="btn-sm" onclick="fieldManager.editField('${field.id}')">✏️</button>
                            <button class="btn-sm btn-danger" onclick="fieldManager.deleteField('${field.id}')">🗑️</button>
                        </div>
                    </div>
                    <div class="field-details">
                        <div class="detail-row">
                            <span class="detail-label">ID:</span>
                            <code>${this.escapeHtml(field.id)}</code>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Вкладка:</span>
                            <span>${this.escapeHtml(field.tabName || 'Основная')}</span>
                            <span class="detail-hint">(${field.category || 'general'})</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Порядок:</span>
                            <span>${field.fieldOrder || 0}</span>
                            <span class="detail-hint">| Порядок вкладки: ${field.tabOrder || 0}</span>
                        </div>
                        ${field.semantics ? `<div class="detail-row"><span class="detail-label">Семантика:</span><a href="${this.escapeHtml(field.semantics)}" target="_blank">${this.escapeHtml(field.semantics)}</a></div>` : ''}
                        ${field.placeholder ? `<div class="detail-row"><span class="detail-label">Подсказка:</span>${this.escapeHtml(field.placeholder)}</div>` : ''}
                        ${field.options && field.options.length ? `<div class="detail-row"><span class="detail-label">Варианты:</span>${field.options.join(', ')}</div>` : ''}
                        ${field.validation ? `<div class="detail-row"><span class="detail-label">Валидация:</span><pre>${JSON.stringify(field.validation, null, 2)}</pre></div>` : ''}
                    </div>
                    <div class="field-preview">
                        <div class="preview-label">Предпросмотр:</div>
                        ${this.renderFieldPreview(field)}
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        container.innerHTML = html;
    }

    renderFieldPreview(field) {
        const placeholder = field.placeholder || 'Пример ввода';
        
        switch (field.type) {
            case 'textarea':
                return `<textarea class="preview-input" rows="2" placeholder="${this.escapeHtml(placeholder)}" disabled></textarea>`;
            case 'radio':
                if (!field.options || !field.options.length) return '<span class="error">Нет вариантов</span>';
                let radioHtml = '<div class="preview-radio-group">';
                field.options.slice(0, 3).forEach(opt => {
                    radioHtml += `<label><input type="radio" name="preview" disabled> ${this.escapeHtml(opt)}</label>`;
                });
                if (field.options.length > 3) radioHtml += `<span>+${field.options.length - 3}</span>`;
                radioHtml += '</div>';
                return radioHtml;
            case 'select':
                if (!field.options || !field.options.length) return '<span class="error">Нет вариантов</span>';
                let selectHtml = `<select class="preview-input" disabled>`;
                selectHtml += `<option>-- Выберите --</option>`;
                field.options.slice(0, 3).forEach(opt => {
                    selectHtml += `<option>${this.escapeHtml(opt)}</option>`;
                });
                selectHtml += `</select>`;
                return selectHtml;
            default:
                return `<input type="${field.type || 'text'}" class="preview-input" placeholder="${this.escapeHtml(placeholder)}" disabled>`;
        }
    }

    getTypeIcon(type) {
        const icons = {
            text: '📝',
            textarea: '📄',
            email: '📧',
            tel: '📞',
            date: '📅',
            number: '#️⃣',
            radio: '🔘',
            select: '📋'
        };
        return `<span class="type-icon" title="${type}">${icons[type] || '📝'}</span>`;
    }

    // Открыть редактор вкладки
    openTabEditor(tabId = null) {
        const tab = tabId ? this.tabs.get(tabId) : null;
        
        const modal = this.createTabEditorModal();
        const title = modal.querySelector('.modal-header h3');
        title.textContent = tab ? '✏️ Редактирование вкладки' : '➕ Создание вкладки';
        
        const idInput = modal.querySelector('#tabId');
        const nameInput = modal.querySelector('#tabName');
        const orderInput = modal.querySelector('#tabOrder');
        
        if (tab) {
            idInput.value = tab.id;
            idInput.disabled = true;
            nameInput.value = tab.name;
            orderInput.value = tab.order;
        } else {
            idInput.value = '';
            idInput.disabled = false;
            nameInput.value = '';
            orderInput.value = this.tabs.size;
        }
        
        modal.style.display = 'block';
        
        const saveBtn = modal.querySelector('.save-tab-btn');
        saveBtn.onclick = async () => {
            const newId = idInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const newName = nameInput.value.trim();
            const newOrder = parseInt(orderInput.value) || 0;
            
            if (!newName) {
                this.showToast('Введите название вкладки', 'warning');
                return;
            }
            
            if (!tab && !newId) {
                this.showToast('Введите ID вкладки', 'warning');
                return;
            }
            
            try {
                if (tab) {
                    // Обновляем существующие поля с этой вкладкой
                    const fieldsToUpdate = this.fields.filter(f => f.category === tab.id);
                    for (const field of fieldsToUpdate) {
                        await window.db.collection('field_definitions').doc(field.id).update({
                            tabName: newName,
                            tabOrder: newOrder
                        });
                    }
                    this.showToast('✅ Вкладка обновлена', 'success');
                } else {
                    // Вкладка создаётся автоматически при создании поля с этой категорией
                    this.showToast('Вкладка будет создана при добавлении первого поля', 'info');
                }
                modal.style.display = 'none';
                await this.init();
            } catch (error) {
                this.showToast('Ошибка: ' + error.message, 'error');
            }
        };
        
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.onclick = () => modal.style.display = 'none';
    }

    createTabEditorModal() {
        let modal = document.getElementById('tabEditorModal');
        if (modal) return modal;
        
        modal = document.createElement('div');
        modal.id = 'tabEditorModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3>Редактирование вкладки</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>ID вкладки (латиницей)</label>
                        <input type="text" id="tabId" placeholder="personal_info">
                        <small>Только латиница, без пробелов</small>
                    </div>
                    <div class="form-group">
                        <label>Название вкладки *</label>
                        <input type="text" id="tabName" placeholder="Личные данные">
                    </div>
                    <div class="form-group">
                        <label>Порядок отображения</label>
                        <input type="number" id="tabOrder" value="0">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-modal">Отмена</button>
                    <button class="btn-primary save-tab-btn">Сохранить</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    // Открыть редактор поля
    openFieldEditor(fieldId = null) {
        const field = fieldId ? this.fields.find(f => f.id === fieldId) : null;
        
        const modal = this.createFieldEditorModal();
        const title = modal.querySelector('.modal-header h3');
        title.textContent = field ? '✏️ Редактирование поля' : '➕ Создание поля';
        
        // Заполняем форму
        document.getElementById('fieldLabel').value = field?.label || '';
        document.getElementById('fieldId').value = field?.id || '';
        document.getElementById('fieldId').disabled = !!field;
        document.getElementById('fieldType').value = field?.type || 'text';
        document.getElementById('fieldCategory').value = field?.category || 'general';
        document.getElementById('fieldTabName').value = field?.tabName || '';
        document.getElementById('fieldTabOrder').value = field?.tabOrder || 0;
        document.getElementById('fieldOrder').value = field?.fieldOrder || this.fields.length;
        document.getElementById('fieldSemantics').value = field?.semantics || '';
        document.getElementById('fieldPlaceholder').value = field?.placeholder || '';
        document.getElementById('fieldRequired').checked = field?.isRequired || false;
        document.getElementById('fieldActive').checked = field?.isActive !== false;
        document.getElementById('fieldReadOnly').checked = field?.readOnly || false;
        
        // Поля валидации
        document.getElementById('validationMin').value = field?.validation?.minLength || '';
        document.getElementById('validationMax').value = field?.validation?.maxLength || '';
        document.getElementById('validationPattern').value = field?.validation?.pattern || '';
        
        this.setOptions(field?.options || []);
        this.toggleOptionsFields();
        
        modal.style.display = 'block';
        modal.dataset.editId = fieldId || '';
        
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.onclick = () => modal.style.display = 'none';
        
        const saveBtn = modal.querySelector('.save-field-btn');
        saveBtn.onclick = () => this.saveField();
    }

    createFieldEditorModal() {
        let modal = document.getElementById('fieldEditorModal');
        if (modal) return modal;
        
        modal = document.createElement('div');
        modal.id = 'fieldEditorModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 650px; max-height: 85vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>Создание поля</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Название поля *</label>
                        <input type="text" id="fieldLabel" placeholder="Например: ФИО">
                    </div>
                    <div class="form-group">
                        <label>ID поля (латиницей) *</label>
                        <input type="text" id="fieldId" placeholder="full_name">
                        <small>Уникальный идентификатор, только латиница и underscore</small>
                    </div>
                    <div class="form-group">
                        <label>Тип поля</label>
                        <select id="fieldType" onchange="fieldManager.toggleOptionsFields()">
                            <option value="text">📝 Текстовое поле</option>
                            <option value="textarea">📄 Многострочный текст</option>
                            <option value="email">📧 Email</option>
                            <option value="tel">📞 Телефон</option>
                            <option value="date">📅 Дата</option>
                            <option value="number">#️⃣ Число</option>
                            <option value="radio">🔘 Радиокнопка</option>
                            <option value="select">📋 Выпадающий список</option>
                        </select>
                    </div>
                    <div id="optionsBlock" style="display:none;">
                        <div class="form-group">
                            <label>Варианты ответов</label>
                            <div id="optionsList"></div>
                            <button type="button" onclick="fieldManager.addOption()" class="btn-sm btn-success" style="margin-top:5px;">➕ Добавить вариант</button>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <label>Вкладка (ID)</label>
                            <input type="text" id="fieldCategory" placeholder="personal_info">
                        </div>
                        <div class="form-group" style="flex:2;">
                            <label>Название вкладки</label>
                            <input type="text" id="fieldTabName" placeholder="Личные данные">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Порядок вкладки</label>
                            <input type="number" id="fieldTabOrder" value="0">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <label>Порядок поля</label>
                            <input type="number" id="fieldOrder" value="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Семантика (URL)</label>
                        <input type="url" id="fieldSemantics" placeholder="http://schema.org/name">
                    </div>
                    <div class="form-group">
                        <label>Placeholder (подсказка)</label>
                        <input type="text" id="fieldPlaceholder" placeholder="Пример ввода...">
                    </div>
                    <div class="form-group">
                        <label>Валидация (опционально)</label>
                        <div class="validation-row">
                            <input type="number" id="validationMin" placeholder="Мин. длина" style="width:32%">
                            <input type="number" id="validationMax" placeholder="Макс. длина" style="width:32%">
                            <input type="text" id="validationPattern" placeholder="Регекс" style="width:32%">
                        </div>
                    </div>
                    <div class="form-group checkbox-group">
                        <label><input type="checkbox" id="fieldRequired"> Обязательное поле</label>
                        <label><input type="checkbox" id="fieldActive" checked> Активно</label>
                        <label><input type="checkbox" id="fieldReadOnly"> Только для чтения</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-modal">Отмена</button>
                    <button class="btn-primary save-field-btn">Сохранить</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    toggleOptionsFields() {
        const type = document.getElementById('fieldType').value;
        const optionsBlock = document.getElementById('optionsBlock');
        optionsBlock.style.display = (type === 'radio' || type === 'select') ? 'block' : 'none';
    }

    addOption(value = '') {
        const container = document.getElementById('optionsList');
        const div = document.createElement('div');
        div.className = 'option-row';
        div.innerHTML = `
            <input type="text" class="option-input" value="${this.escapeHtml(value)}" placeholder="Вариант">
            <button type="button" onclick="this.parentElement.remove()" class="btn-remove">✖</button>
        `;
        container.appendChild(div);
    }

    setOptions(options) {
        const container = document.getElementById('optionsList');
        container.innerHTML = '';
        if (options && options.length) {
            options.forEach(opt => this.addOption(opt));
        } else {
            this.addOption();
        }
    }

    getOptions() {
        const inputs = document.querySelectorAll('#optionsList .option-input');
        const options = [];
        inputs.forEach(input => {
            const val = input.value.trim();
            if (val) options.push(val);
        });
        return options;
    }

    async saveField() {
        const isEdit = document.getElementById('fieldEditorModal').dataset.editId !== '';
        const editId = document.getElementById('fieldEditorModal').dataset.editId;
        const fieldId = document.getElementById('fieldId').value.trim();
        const label = document.getElementById('fieldLabel').value.trim();
        const type = document.getElementById('fieldType').value;
        const options = (type === 'radio' || type === 'select') ? this.getOptions() : [];
        
        if (!label) {
            this.showToast('Введите название поля', 'warning');
            return;
        }
        
        if (!isEdit && !fieldId) {
            this.showToast('Введите ID поля', 'warning');
            return;
        }
        
        if (!isEdit && this.fields.some(f => f.id === fieldId)) {
            this.showToast('Поле с таким ID уже существует', 'warning');
            return;
        }
        
        if ((type === 'radio' || type === 'select') && options.length === 0) {
            this.showToast('Добавьте хотя бы один вариант', 'warning');
            return;
        }
        
        const fieldData = {
            label: label,
            type: type,
            category: document.getElementById('fieldCategory').value.trim() || 'general',
            tabName: document.getElementById('fieldTabName').value.trim() || label,
            tabOrder: parseInt(document.getElementById('fieldTabOrder').value) || 0,
            fieldOrder: parseInt(document.getElementById('fieldOrder').value) || 0,
            isRequired: document.getElementById('fieldRequired').checked,
            isActive: document.getElementById('fieldActive').checked,
            readOnly: document.getElementById('fieldReadOnly').checked,
            semantics: document.getElementById('fieldSemantics').value.trim(),
            placeholder: document.getElementById('fieldPlaceholder').value.trim(),
            options: options,
            validation: {
                minLength: document.getElementById('validationMin').value ? parseInt(document.getElementById('validationMin').value) : null,
                maxLength: document.getElementById('validationMax').value ? parseInt(document.getElementById('validationMax').value) : null,
                pattern: document.getElementById('validationPattern').value.trim() || null
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: window.auth.currentUser?.uid
        };
        
        try {
            if (isEdit) {
                await window.db.collection('field_definitions').doc(editId).update(fieldData);
                this.showToast('✅ Поле обновлено', 'success');
            } else {
                fieldData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                fieldData.createdBy = window.auth.currentUser?.uid;
                await window.db.collection('field_definitions').doc(fieldId).set(fieldData);
                this.showToast('✅ Поле создано', 'success');
            }
            
            document.getElementById('fieldEditorModal').style.display = 'none';
            await this.init();
        } catch (error) {
            this.showToast('Ошибка: ' + error.message, 'error');
        }
    }

    async editField(id) {
        this.openFieldEditor(id);
    }

    async deleteField(id) {
        const field = this.fields.find(f => f.id === id);
        if (!field) return;
        
        // Подсчитываем количество слушателей с заполненным полем
        let filledCount = 0;
        try {
            const students = await window.db.collection('users').where('role', '==', 'student').get();
            for (const doc of students.docs) {
                const data = doc.data();
                if (data[id] || (data.customFields && data.customFields[id])) {
                    filledCount++;
                }
            }
        } catch (e) {
            console.error('Ошибка подсчета:', e);
        }
        
        const message = `⚠️ Удаление поля "${field.label}"\n\n` +
            `• Всего слушателей с заполненным полем: ${filledCount}\n` +
            `• Данные будут безвозвратно потеряны\n\n` +
            `Введите "УДАЛИТЬ" для подтверждения:`;
        
        const confirmText = prompt(message);
        if (confirmText !== "УДАЛИТЬ") {
            this.showToast('Удаление отменено', 'warning');
            return;
        }
        
        try {
            // Удаляем значения поля у всех слушателей
            const students = await window.db.collection('users').where('role', '==', 'student').get();
            const updates = [];
            
            for (const doc of students.docs) {
                const data = doc.data();
                const updateData = {};
                
                if (data[id] !== undefined) {
                    updateData[id] = firebase.firestore.FieldValue.delete();
                }
                if (data.customFields && data.customFields[id] !== undefined) {
                    updateData['customFields.' + id] = firebase.firestore.FieldValue.delete();
                }
                
                if (Object.keys(updateData).length > 0) {
                    updates.push(window.db.collection('users').doc(doc.id).update(updateData));
                }
            }
            
            await Promise.all(updates);
            
            // Удаляем определение поля
            await window.db.collection('field_definitions').doc(id).delete();
            
            this.showToast(`✅ Поле "${field.label}" удалено`, 'success');
            await this.init();
        } catch (error) {
            this.showToast('Ошибка удаления: ' + error.message, 'error');
        }
    }

    async deleteTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;
        
        const fieldsInTab = this.fields.filter(f => f.category === tabId);
        if (fieldsInTab.length > 0) {
            this.showToast(`Сначала удалите ${fieldsInTab.length} полей во вкладке "${tab.name}"`, 'warning');
            return;
        }
        
        // Вкладка удаляется автоматически, когда в ней нет полей
        this.showToast('Вкладка удалена (в ней не осталось полей)', 'success');
        await this.init();
    }

    // Вспомогательные функции
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            return m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;';
        });
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

window.fieldManager = null;