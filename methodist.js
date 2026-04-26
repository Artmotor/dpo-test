// methodist.js
let allListeners = [];
let selectedListenerId = null;

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
    
    document.getElementById('methodistName').textContent = userDoc.data().fields?.fullName?.value || 'Методист';
    
    await loadListeners();
    
    // Обновляем счетчики
    document.getElementById('totalListeners').textContent = allListeners.length;
    const withCourse = allListeners.filter(l => l.course).length;
    document.getElementById('enrolledListeners').textContent = withCourse;
});

async function loadListeners() {
    const snapshot = await db.collection('listeners')
        .where('role', '==', 'listener')
        .orderBy('createdAt', 'desc')
        .get();
    
    allListeners = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    renderListenersTable();
}

function renderListenersTable() {
    const tbody = document.getElementById('listenersTableBody');
    
    tbody.innerHTML = allListeners.map(listener => {
        const fields = listener.fields || {};
        const fullName = fields.fullName?.value || 'Не указано';
        const phone = fields.phone?.value || '-';
        const email = fields.email?.value || '-';
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-circle bg-primary text-white me-2">
                            ${fullName.charAt(0)}
                        </div>
                        <strong>${fullName}</strong>
                    </div>
                </td>
                <td>${email}</td>
                <td>${phone}</td>
                <td>
                    <span class="badge bg-${listener.course ? 'success' : 'secondary'} rounded-pill">
                        ${listener.course || 'Не зачислен'}
                    </span>
                </td>
                <td>${listener.createdAt?.toDate().toLocaleDateString() || '-'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary rounded-pill" 
                                onclick="viewListener('${listener.id}')" 
                                data-bs-toggle="modal" data-bs-target="#listenerModal">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-success rounded-pill" 
                                onclick="enrollToCourse('${listener.id}')">
                            <i class="bi bi-mortarboard"></i>
                        </button>
                        <button class="btn btn-outline-danger rounded-pill" 
                                onclick="deleteListener('${listener.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function viewListener(listenerId) {
    selectedListenerId = listenerId;
    const listener = allListeners.find(l => l.id === listenerId);
    if (!listener) return;
    
    const fields = listener.fields || {};
    
    // Заполняем модальное окно
    document.getElementById('modalListenerName').textContent = fields.fullName?.value || 'Слушатель';
    
    let fieldsHtml = '';
    Object.entries(fields).forEach(([fieldId, fieldData]) => {
        fieldsHtml += `
            <div class="col-md-6 mb-3">
                <label class="form-label text-muted small">${fieldData.label}</label>
                <input type="text" class="form-control form-control-sm" 
                       value="${fieldData.value || ''}" 
                       onchange="updateListenerField('${listenerId}', '${fieldId}', this.value)">
            </div>
        `;
    });
    
    document.getElementById('modalFields').innerHTML = fieldsHtml;
    
    // Документы
    renderListenerDocuments(listener);
}

async function updateListenerField(listenerId, fieldId, value) {
    await db.collection('listeners').doc(listenerId).update({
        [`fields.${fieldId}.value`]: value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function enrollToCourse(listenerId) {
    const course = prompt('Введите название курса:');
    if (course) {
        await db.collection('listeners').doc(listenerId).update({
            course: course,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await loadListeners();
        AuthService.showToast('Слушатель зачислен на курс', 'success');
    }
}

async function deleteListener(listenerId) {
    if (!confirm('Удалить слушателя? Это действие нельзя отменить.')) return;
    
    // Удаляем документы из Storage
    const listener = allListeners.find(l => l.id === listenerId);
    if (listener?.documents) {
        for (const doc of Object.values(listener.documents)) {
            if (doc?.storagePath) {
                await storage.ref(doc.storagePath).delete().catch(() => {});
            }
        }
    }
    
    await db.collection('listeners').doc(listenerId).delete();
    await loadListeners();
    AuthService.showToast('Слушатель удален', 'info');
}

function renderListenerDocuments(listener) {
    const container = document.getElementById('modalDocuments');
    const docs = listener.documents || {};
    
    const docTypes = {
        passportMain: 'Паспорт (главная)',
        passportRegistration: 'Паспорт (прописка)',
        snils: 'СНИЛС',
        inn: 'ИНН',
        nameChange: 'Смена фамилии',
        diploma: 'Диплом'
    };
    
    container.innerHTML = Object.entries(docTypes).map(([docId, label]) => {
        const doc = docs[docId];
        if (!doc) {
            return `<div class="col-6 mb-3">
                <span class="text-muted">${label}: не загружен</span>
            </div>`;
        }
        
        return `
            <div class="col-6 mb-3">
                <div class="card bg-light">
                    <div class="card-body p-2 text-center">
                        <img src="${doc.thumbnail}" class="img-fluid rounded mb-2" style="max-height:100px; cursor:pointer"
                             onclick="viewFullDocument('${listener.id}', '${docId}')">
                        <small class="d-block">${label}</small>
                        <span class="badge bg-${doc.status === 'verified' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'} rounded-pill">
                            ${doc.status}
                        </span>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-success rounded-pill" 
                                    onclick="verifyDocument('${listener.id}', '${docId}', 'verified')">
                                ✓
                            </button>
                            <button class="btn btn-sm btn-danger rounded-pill" 
                                    onclick="verifyDocument('${listener.id}', '${docId}', 'rejected')">
                                ✗
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function verifyDocument(listenerId, docType, status) {
    await DocumentService.verifyDocument(listenerId, docType, auth.currentUser.uid, status);
    await loadListeners();
    viewListener(listenerId); // Обновляем модальное окно
}

async function viewFullDocument(listenerId, docType) {
    const url = await DocumentService.getDocumentUrl(listenerId, docType);
    if (url) window.open(url, '_blank');
}