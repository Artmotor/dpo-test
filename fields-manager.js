// fields-manager.js - Управление полями для методиста
let allFields = {};
let customFields = [];
const systemFieldIds = [
    'fullName', 'email', 'phone', 'passportNumber', 'passportIssueDate',
    'passportIssuedBy', 'passportUnitCode', 'registrationAddress', 'actualAddress'
];

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '/index.html';
        return;
    }
    
    const userDoc = await db.collection('listeners').doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'methodist') {
        window.location.href = '/dashboard.html';
        return;
    }
    
    document.getElementById('methodistName').textContent = 
        userDoc.data().fields?.fullName?.value || 'Методист';
    
    await loadFields();
});

async function loadFields() {
    const doc = await db.collection('metadata').doc('listenerFields').get();
    
    if (doc.exists) {
        allFields = doc.data().fields || {};
    } else {
        // Инициализация с дефолтными полями
        allFields = {};
        await db.collection('metadata').doc('listenerFields').set({ fields: allFields });
    }
    
    // Отделяем системные поля от пользовательских
    customFields = Object.entries(allFields).filter(([id]) => !systemFieldIds.includes(id));
    
    renderFieldsTable();
    updateFieldsCount();
}

function renderFieldsTable() {
    const container = document.getElementById('fieldsTableContainer');
    const noFields = document.getElementById('noFields');
    
    if (customFields.length === 0) {
        container.innerHTML = '';
        noFields.classList.remove('d-none');
        return;
    }
    
    noFields.classList.add('d-none');
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th>ID поля</th>
                        <th>Название</th>
                        <th>Тип</th>
                        <th>Обязательное</th>
                        <th>Редактируемое</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${customFields.map(([fieldId, fieldData]) => {
                        const typeLabels = {
                            'text': 'Текст',
                            'number': 'Число',
                            'date': 'Дата',
                            'phone': 'Телефон',
                            'email': 'Email'
                        };
                        
                        return `
                            <tr>
                                <td><code>${fieldId}</code></td>
                                <td><strong>${fieldData.label}</strong></td>
                                <td><span class="badge bg-primary rounded-pill">${typeLabels[fieldData.type] || fieldData.type}</span></td>
                                <td>${fieldData.required ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-x-circle text-muted"></i>'}</td>
                                <td>${fieldData.editable !== false ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-x-circle text-muted"></i>'}</td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary rounded-pill" 
                                                onclick="editField('${fieldId}')">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-danger rounded-pill" 
                                                onclick="deleteField('${fieldId}')">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function updateFieldsCount() {
    document.getElementById('fieldsCount').textContent = `${customFields.length} полей`;
}

// Добавление нового поля
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addFieldForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addNewField();
        });
    }
});

async function addNewField() {
    const fieldId = document.getElementById('fieldId').value.trim();
    const fieldLabel = document.getElementById('fieldLabel').value.trim();
    const fieldType = document.getElementById('fieldType').value;
    const required = document.getElementById('fieldRequired').checked;
    const editable = document.getElementById('fieldEditable').checked;
    
    // Валидация
    if (!fieldId.match(/^[a-zA-Z0-9_]+$/)) {
        AuthService.showToast('ID поля должен содержать только латинские буквы, цифры и _', 'danger');
        return;
    }
    
    if (systemFieldIds.includes(fieldId)) {
        AuthService.showToast('Это системное поле, его нельзя переопределить', 'danger');
        return;
    }
    
    if (allFields[fieldId]) {
        AuthService.showToast('Поле с таким ID уже существует', 'danger');
        return;
    }
    
    // Добавляем поле
    allFields[fieldId] = {
        label: fieldLabel,
        type: fieldType,
        required: required,
        editable: editable
    };
    
    // Сохраняем в Firestore
    await db.collection('metadata').doc('listenerFields').set({
        fields: allFields
    });
    
    // Обновляем всех существующих слушателей (добавляем новое поле)
    const listeners = await db.collection('listeners')
        .where('role', '==', 'listener')
        .get();
    
    const batch = db.batch();
    listeners.docs.forEach(doc => {
        batch.update(doc.ref, {
            [`fields.${fieldId}`]: {
                value: '',
                label: fieldLabel,
                type: fieldType,
                editable: editable
            }
        });
    });
    
    await batch.commit();
    
    // Очищаем форму
    document.getElementById('addFieldForm').reset();
    
    // Обновляем список
    await loadFields();
    
    AuthService.showToast(`Поле "${fieldLabel}" успешно добавлено`, 'success');
}

// Редактирование поля
function editField(fieldId) {
    const fieldData = allFields[fieldId];
    if (!fieldData) return;
    
    document.getElementById('editFieldId').value = fieldId;
    document.getElementById('editFieldIdInput').value = fieldId;
    document.getElementById('editFieldLabel').value = fieldData.label;
    document.getElementById('editFieldType').value = fieldData.type;
    document.getElementById('editFieldRequired').checked = fieldData.required;
    document.getElementById('editFieldEditable').checked = fieldData.editable !== false;
    
    const modal = new bootstrap.Modal(document.getElementById('editFieldModal'));
    modal.show();
}

async function saveFieldEdit() {
    const oldFieldId = document.getElementById('editFieldId').value;
    const newFieldId = document.getElementById('editFieldIdInput').value.trim();
    const label = document.getElementById('editFieldLabel').value.trim();
    const type = document.getElementById('editFieldType').value;
    const required = document.getElementById('editFieldRequired').checked;
    const editable = document.getElementById('editFieldEditable').checked;
    
    // Валидация
    if (!newFieldId.match(/^[a-zA-Z0-9_]+$/)) {
        AuthService.showToast('ID поля должен содержать только латинские буквы, цифры и _', 'danger');
        return;
    }
    
    if (systemFieldIds.includes(oldFieldId)) {
        AuthService.showToast('Системные поля нельзя редактировать', 'danger');
        return;
    }
    
    // Если ID изменился, проверяем что новый не занят
    if (newFieldId !== oldFieldId && allFields[newFieldId]) {
        AuthService.showToast('Поле с таким ID уже существует', 'danger');
        return;
    }
    
    // Удаляем старое поле
    delete allFields[oldFieldId];
    
    // Добавляем обновленное
    allFields[newFieldId] = {
        label: label,
        type: type,
        required: required,
        editable: editable
    };
    
    // Сохраняем в Firestore
    await db.collection('metadata').doc('listenerFields').set({
        fields: allFields
    });
    
    // Обновляем всех слушателей
    const listeners = await db.collection('listeners')
        .where('role', '==', 'listener')
        .get();
    
    const batch = db.batch();
    
    listeners.docs.forEach(doc => {
        const data = doc.data();
        const fields = data.fields || {};
        
        // Удаляем старый ID
        if (fields[oldFieldId]) {
            batch.update(doc.ref, {
                [`fields.${oldFieldId}`]: firebase.firestore.FieldValue.delete()
            });
        }
        
        // Добавляем/обновляем с новым ID
        batch.update(doc.ref, {
            [`fields.${newFieldId}`]: {
                value: fields[oldFieldId]?.value || '',
                label: label,
                type: type,
                editable: editable
            }
        });
    });
    
    await batch.commit();
    
    // Закрываем модальное окно
    const modal = bootstrap.Modal.getInstance(document.getElementById('editFieldModal'));
    modal.hide();
    
    // Обновляем список
    await loadFields();
    
    AuthService.showToast(`Поле "${label}" обновлено`, 'success');
}

// Удаление поля
async function deleteField(fieldId) {
    if (!confirm(`Удалить поле "${allFields[fieldId]?.label}"? Это действие нельзя отменить.`)) {
        return;
    }
    
    if (systemFieldIds.includes(fieldId)) {
        AuthService.showToast('Системные поля нельзя удалить', 'danger');
        return;
    }
    
    // Удаляем из конфигурации
    delete allFields[fieldId];
    
    await db.collection('metadata').doc('listenerFields').set({
        fields: allFields
    });
    
    // Удаляем поле у всех слушателей
    const listeners = await db.collection('listeners')
        .where('role', '==', 'listener')
        .get();
    
    const batch = db.batch();
    listeners.docs.forEach(doc => {
        batch.update(doc.ref, {
            [`fields.${fieldId}`]: firebase.firestore.FieldValue.delete()
        });
    });
    
    await batch.commit();
    
    // Обновляем список
    await loadFields();
    
    AuthService.showToast('Поле удалено', 'info');
}