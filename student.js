// student.js
let currentUserData = null;
let isEditMode = false;
let allFields = {};

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '/index.html';
        return;
    }
    
    const userDoc = await db.collection('listeners').doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'listener') {
        window.location.href = '/dashboard.html';
        return;
    }
    
    currentUserData = userDoc.data();
    document.getElementById('userName').textContent = currentUserData.fields?.fullName?.value || 'Слушатель';
    
    // Загружаем конфигурацию полей
    const fieldsDoc = await db.collection('metadata').doc('listenerFields').get();
    if (fieldsDoc.exists) {
        allFields = fieldsDoc.data().fields || {};
    }
    
    renderProfile();
    renderDocuments();
    updateCourseInfo();
});

function renderProfile() {
    const container = document.getElementById('profileFields');
    let html = '';
    
    const fields = currentUserData.fields || {};
    
    // Сначала отображаем стандартные поля
    const standardOrder = [
        'fullName', 'email', 'phone', 'passportNumber', 'passportIssueDate',
        'passportIssuedBy', 'passportUnitCode', 'registrationAddress', 'actualAddress'
    ];
    
    standardOrder.forEach(fieldId => {
        if (fields[fieldId]) {
            html += createFieldHTML(fieldId, fields[fieldId]);
        }
    });
    
    // Затем дополнительные поля от методиста
    Object.entries(fields).forEach(([fieldId, fieldData]) => {
        if (!standardOrder.includes(fieldId) && fieldId !== 'email') {
            html += createFieldHTML(fieldId, fieldData);
        }
    });
    
    container.innerHTML = html;
}

function createFieldHTML(fieldId, fieldData) {
    const value = fieldData.value || '';
    const label = fieldData.label || fieldId;
    const type = fieldData.type || 'text';
    
    if (isEditMode && fieldData.editable !== false) {
        return `
            <div class="col-md-6">
                <div class="form-floating">
                    <input type="${type}" class="form-control" id="field_${fieldId}" 
                           value="${value}" placeholder="${label}">
                    <label>${label}</label>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="col-md-6">
                <div class="field-display p-3 bg-light rounded-3">
                    <small class="text-muted d-block">${label}</small>
                    <strong class="d-block">${value || '<span class="text-muted">Не указано</span>'}</strong>
                </div>
            </div>
        `;
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const saveBtn = document.getElementById('saveButton');
    
    if (isEditMode) {
        saveBtn.classList.remove('d-none');
    } else {
        saveBtn.classList.add('d-none');
    }
    
    renderProfile();
}

async function saveProfile() {
    const updates = {};
    const fields = currentUserData.fields || {};
    
    Object.entries(fields).forEach(([fieldId, fieldData]) => {
        if (fieldData.editable !== false) {
            const input = document.getElementById(`field_${fieldId}`);
            if (input) {
                updates[`fields.${fieldId}.value`] = input.value;
            }
        }
    });
    
    updates['updatedAt'] = firebase.firestore.FieldValue.serverTimestamp();
    
    await db.collection('listeners').doc(auth.currentUser.uid).update(updates);
    
    isEditMode = false;
    document.getElementById('saveButton').classList.add('d-none');
    
    // Обновляем локальные данные
    const doc = await db.collection('listeners').doc(auth.currentUser.uid).get();
    currentUserData = doc.data();
    renderProfile();
    
    AuthService.showToast('Данные сохранены!', 'success');
}

// Документы
const documentTypes = [
    { id: 'passportMain', label: 'Паспорт (первая страница)', icon: 'bi-file-earmark-person' },
    { id: 'passportRegistration', label: 'Паспорт (прописка)', icon: 'bi-file-earmark-text' },
    { id: 'snils', label: 'СНИЛС', icon: 'bi-file-earmark-medical' },
    { id: 'inn', label: 'ИНН', icon: 'bi-file-earmark-bar-graph' },
    { id: 'nameChange', label: 'Документ о смене фамилии', icon: 'bi-file-earmark-diff' },
    { id: 'diploma', label: 'Диплом об образовании', icon: 'bi-file-earmark-check' }
];

function renderDocuments() {
    const container = document.getElementById('documentsGrid');
    const docs = currentUserData.documents || {};
    
    container.innerHTML = documentTypes.map(docType => {
        const doc = docs[docType.id];
        return createDocumentCard(docType, doc);
    }).join('');
}

function createDocumentCard(docType, docData) {
    const isUploaded = docData && docData.status;
    const statusColors = {
        'pending': 'warning',
        'verified': 'success',
        'rejected': 'danger'
    };
    
    return `
        <div class="col-md-4 col-lg-3">
            <div class="card h-100 border-0 shadow-sm rounded-4">
                <div class="card-body text-center p-4">
                    <i class="bi ${docType.icon} display-3 text-primary mb-3"></i>
                    <h6 class="fw-bold">${docType.label}</h6>
                    
                    ${isUploaded ? `
                        <div class="mt-3">
                            <img src="${docData.thumbnail}" class="img-thumbnail rounded-3 mb-2" 
                                 style="max-height: 150px; cursor: pointer;" 
                                 onclick="viewDocument('${docType.id}')">
                            <span class="badge bg-${statusColors[docData.status]} rounded-pill">
                                ${docData.status === 'pending' ? 'На проверке' : 
                                  docData.status === 'verified' ? 'Проверено' : 'Отклонено'}
                            </span>
                            <button class="btn btn-sm btn-outline-danger rounded-pill mt-2 d-block w-100" 
                                    onclick="deleteDocument('${docType.id}')">
                                <i class="bi bi-trash me-1"></i>Удалить
                            </button>
                        </div>
                    ` : `
                        <div class="mt-3">
                            <label class="btn btn-outline-primary rounded-pill">
                                <i class="bi bi-cloud-upload me-1"></i>Загрузить
                                <input type="file" class="d-none" accept="image/*,.pdf" 
                                       onchange="uploadDocument('${docType.id}', this)">
                            </label>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

async function uploadDocument(docTypeId, input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        AuthService.showToast('Файл слишком большой. Максимум 5 МБ', 'danger');
        return;
    }
    
    const user = auth.currentUser;
    const result = await DocumentService.uploadDocument(user.uid, file, docTypeId);
    
    if (result.success) {
        AuthService.showToast('Документ загружен и отправлен на проверку', 'success');
        const doc = await db.collection('listeners').doc(user.uid).get();
        currentUserData = doc.data();
        renderDocuments();
    } else {
        AuthService.showToast('Ошибка загрузки документа', 'danger');
    }
}

async function viewDocument(docTypeId) {
    const user = auth.currentUser;
    const url = await DocumentService.getDocumentUrl(user.uid, docTypeId);
    if (url) {
        window.open(url, '_blank');
    }
}

async function deleteDocument(docTypeId) {
    if (!confirm('Удалить документ?')) return;
    
    const user = auth.currentUser;
    await DocumentService.deleteDocument(user.uid, docTypeId);
    
    const doc = await db.collection('listeners').doc(user.uid).get();
    currentUserData = doc.data();
    renderDocuments();
    AuthService.showToast('Документ удален', 'info');
}

function updateCourseInfo() {
    const course = currentUserData.course;
    document.getElementById('currentCourse').textContent = course || 'Не назначен';
    document.getElementById('courseStatus').textContent = course ? 'Вы зачислены на курс' : '';
}