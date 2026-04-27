// student.js - скрипт для личного кабинета слушателя

let currentUserData = null;
let currentEditMode = null;

// Переключение вкладок
function switchTab(tabName) {
    const tabs = ['profile', 'documents', 'address'];
    tabs.forEach(tab => {
        const tabElement = document.getElementById(`${tab}Tab`);
        const btnElement = document.querySelector(`[onclick="switchTab('${tab}')"]`);
        if (tabElement) {
            if (tab === tabName) {
                tabElement.classList.add('active');
                if (btnElement) btnElement.classList.add('active');
            } else {
                tabElement.classList.remove('active');
                if (btnElement) btnElement.classList.remove('active');
            }
        }
    });
}

// Загрузка данных пользователя
async function loadUserData() {
    const user = window.auth.currentUser;
    if (!user) return;

    try {
        const doc = await window.db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            currentUserData = doc.data();
            displayProfileData();
            displayDocumentsData();
            displayAddressData();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('errorMessage', 'Ошибка загрузки данных');
    }
}

// Отображение данных профиля
function displayProfileData() {
    const container = document.getElementById('profileInfo');
    container.innerHTML = `
        <div class="info-row">
            <span class="info-label">ФИО:</span>
            <span class="info-value">${currentUserData.fullName || 'Не указано'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${currentUserData.email || 'Не указан'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Телефон:</span>
            <span class="info-value">${currentUserData.phone || 'Не указан'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Образование:</span>
            <span class="info-value">${currentUserData.education || 'Не указано'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Дата регистрации:</span>
            <span class="info-value">${formatDate(currentUserData.createdAt)}</span>
        </div>
    `;
}

// Отображение паспортных данных
function displayDocumentsData() {
    const container = document.getElementById('documentsInfo');
    container.innerHTML = `
        <div class="info-row">
            <span class="info-label">Номер паспорта:</span>
            <span class="info-value">${currentUserData.passportNumber || 'Не указан'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Кем выдан:</span>
            <span class="info-value">${currentUserData.passportIssuedBy || 'Не указано'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Когда выдан:</span>
            <span class="info-value">${currentUserData.passportIssueDate || 'Не указано'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">СНИЛС:</span>
            <span class="info-value">${currentUserData.snils || 'Не указан'}</span>
        </div>
    `;
}

// Отображение адресов
function displayAddressData() {
    const container = document.getElementById('addressInfo');
    container.innerHTML = `
        <div class="info-row">
            <span class="info-label">Фактический адрес:</span>
            <span class="info-value">${currentUserData.actualAddress || 'Не указан'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Адрес прописки:</span>
            <span class="info-value">${currentUserData.registrationAddress || 'Не указан'}</span>
        </div>
    `;
}

// Редактирование профиля
function editProfile() {
    currentEditMode = 'profile';
    const container = document.getElementById('profileInfo');
    container.innerHTML = `
        <div class="form-group">
            <label>ФИО</label>
            <input type="text" id="editFullName" value="${currentUserData.fullName || ''}">
        </div>
        <div class="form-group">
            <label>Телефон</label>
            <input type="tel" id="editPhone" value="${currentUserData.phone || ''}">
        </div>
        <div class="form-group">
            <label>Образование</label>
            <select id="editEducation">
                <option value="высшее" ${currentUserData.education === 'высшее' ? 'selected' : ''}>Высшее</option>
                <option value="среднее-специальное" ${currentUserData.education === 'среднее-специальное' ? 'selected' : ''}>Среднее специальное</option>
                <option value="среднее" ${currentUserData.education === 'среднее' ? 'selected' : ''}>Среднее</option>
            </select>
        </div>
        <div class="form-actions">
            <button class="save-btn" onclick="saveProfile()">Сохранить</button>
            <button class="cancel-btn" onclick="cancelEdit()">Отмена</button>
        </div>
    `;
}

// Сохранение профиля
async function saveProfile() {
    const user = window.auth.currentUser;
    if (!user) return;

    const updates = {
        fullName: document.getElementById('editFullName').value,
        phone: document.getElementById('editPhone').value,
        education: document.getElementById('editEducation').value
    };

    try {
        await window.db.collection('users').doc(user.uid).update(updates);
        currentUserData = { ...currentUserData, ...updates };
        displayProfileData();
        showSuccess('Данные успешно обновлены!', 'successMessage');
        currentEditMode = null;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('errorMessage', 'Ошибка сохранения данных');
    }
}

// Редактирование документов
function editDocuments() {
    currentEditMode = 'documents';
    const container = document.getElementById('documentsInfo');
    container.innerHTML = `
        <div class="form-group">
            <label>Номер паспорта</label>
            <input type="text" id="editPassportNumber" value="${currentUserData.passportNumber || ''}" placeholder="Серия и номер паспорта">
        </div>
        <div class="form-group">
            <label>Кем выдан паспорт</label>
            <input type="text" id="editPassportIssuedBy" value="${currentUserData.passportIssuedBy || ''}" placeholder="Кем выдан">
        </div>
        <div class="form-group">
            <label>Когда выдан паспорт</label>
            <input type="date" id="editPassportIssueDate" value="${currentUserData.passportIssueDate || ''}">
        </div>
        <div class="form-group">
            <label>СНИЛС</label>
            <input type="text" id="editSnils" value="${currentUserData.snils || ''}" placeholder="Номер СНИЛС">
        </div>
        <div class="form-actions">
            <button class="save-btn" onclick="saveDocuments()">Сохранить</button>
            <button class="cancel-btn" onclick="cancelEdit()">Отмена</button>
        </div>
    `;
}

// Сохранение документов
async function saveDocuments() {
    const user = window.auth.currentUser;
    if (!user) return;

    const updates = {
        passportNumber: document.getElementById('editPassportNumber').value,
        passportIssuedBy: document.getElementById('editPassportIssuedBy').value,
        passportIssueDate: document.getElementById('editPassportIssueDate').value,
        snils: document.getElementById('editSnils').value
    };

    try {
        await window.db.collection('users').doc(user.uid).update(updates);
        currentUserData = { ...currentUserData, ...updates };
        displayDocumentsData();
        showSuccess('Данные успешно обновлены!', 'successMessage');
        currentEditMode = null;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('errorMessage', 'Ошибка сохранения данных');
    }
}

// Редактирование адресов
function editAddress() {
    currentEditMode = 'address';
    const container = document.getElementById('addressInfo');
    container.innerHTML = `
        <div class="form-group">
            <label>Фактический адрес</label>
            <input type="text" id="editActualAddress" value="${currentUserData.actualAddress || ''}" placeholder="Индекс, город, улица, дом, кв.">
        </div>
        <div class="form-group">
            <label>Адрес прописки</label>
            <input type="text" id="editRegistrationAddress" value="${currentUserData.registrationAddress || ''}" placeholder="Индекс, город, улица, дом, кв.">
        </div>
        <div class="form-actions">
            <button class="save-btn" onclick="saveAddress()">Сохранить</button>
            <button class="cancel-btn" onclick="cancelEdit()">Отмена</button>
        </div>
    `;
}

// Сохранение адресов
async function saveAddress() {
    const user = window.auth.currentUser;
    if (!user) return;

    const updates = {
        actualAddress: document.getElementById('editActualAddress').value,
        registrationAddress: document.getElementById('editRegistrationAddress').value
    };

    try {
        await window.db.collection('users').doc(user.uid).update(updates);
        currentUserData = { ...currentUserData, ...updates };
        displayAddressData();
        showSuccess('Данные успешно обновлены!', 'successMessage');
        currentEditMode = null;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('errorMessage', 'Ошибка сохранения данных');
    }
}

// Отмена редактирования
function cancelEdit() {
    if (currentEditMode === 'profile') {
        displayProfileData();
    } else if (currentEditMode === 'documents') {
        displayDocumentsData();
    } else if (currentEditMode === 'address') {
        displayAddressData();
    }
    currentEditMode = null;
}

// Инициализация
window.auth.onAuthStateChanged(async (user) => {
    if (user && user.emailVerified) {
        await loadUserData();
    } else if (user && !user.emailVerified) {
        alert('Пожалуйста, подтвердите email');
        window.location.href = 'index.html';
    } else {
        window.location.href = 'index.html';
    }
});
