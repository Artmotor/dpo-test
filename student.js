// student.js - скрипт для личного кабинета слушателя

let currentUserData = null;
let currentEditMode = null;

// Переключение вкладок
function switchTab(tabName) {
    const tabs = ['profile', 'documents', 'address', 'additionalFields'];
    tabs.forEach(tab => {
        const tabElement = document.getElementById(`${tab}Tab`);
        const btnElement = document.querySelector(`.tab-btn[onclick*="${tab}"]`) || 
                           document.querySelector(`.tab-btn:nth-child(${tabs.indexOf(tab) + 1})`);
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
    
    // Загружаем дополнительные поля при переключении на соответствующую вкладку
    if (tabName === 'additionalFields' && typeof window.loadCustomFields === 'function') {
        setTimeout(() => window.loadCustomFields(), 100);
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    const user = window.auth.currentUser;
    if (!user) {
        console.log('Пользователь не авторизован');
        return;
    }

    try {
        const doc = await window.db.collection('users').doc(user.uid).get();
        
        if (!doc.exists) {
            console.log('Документ пользователя не найден, создаем...');
            const defaultData = {
                fullName: user.email.split('@')[0],
                email: user.email,
                phone: '',
                education: '',
                role: 'student',
                emailVerified: user.emailVerified,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                actualAddress: '',
                registrationAddress: '',
                passportNumber: '',
                passportIssuedBy: '',
                passportIssueDate: '',
                snils: '',
                customFields: {}
            };
            await window.db.collection('users').doc(user.uid).set(defaultData);
            currentUserData = defaultData;
        } else {
            currentUserData = doc.data();
            if (!currentUserData.customFields) {
                currentUserData.customFields = {};
            }
        }
        
        // Отображаем данные
        displayProfileData();
        displayDocumentsData();
        displayAddressData();
        
        // Обновляем имя пользователя в хедере
        const userNameSpan = document.getElementById('userName');
        if (userNameSpan) {
            userNameSpan.textContent = currentUserData.fullName || currentUserData.email;
        }
        
        // Загружаем дополнительные поля
        if (typeof window.loadCustomFields === 'function') {
            setTimeout(() => window.loadCustomFields(), 500);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('errorMessage', 'Ошибка загрузки данных: ' + error.message);
    }
}

// Отображение данных профиля
function displayProfileData() {
    const container = document.getElementById('profileInfo');
    if (!container) return;
    
    container.innerHTML = `
        <div class="info-row">
            <span class="info-label">ФИО:</span>
            <span class="info-value">${escapeHtml(currentUserData?.fullName || 'Не указано')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${escapeHtml(currentUserData?.email || 'Не указан')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Телефон:</span>
            <span class="info-value">${escapeHtml(currentUserData?.phone || 'Не указан')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Образование:</span>
            <span class="info-value">${escapeHtml(currentUserData?.education || 'Не указано')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Дата регистрации:</span>
            <span class="info-value">${formatDate(currentUserData?.createdAt)}</span>
        </div>
    `;
}

// Отображение паспортных данных
function displayDocumentsData() {
    const container = document.getElementById('documentsInfo');
    if (!container) return;
    
    container.innerHTML = `
        <div class="info-row">
            <span class="info-label">Номер паспорта:</span>
            <span class="info-value">${escapeHtml(currentUserData?.passportNumber || 'Не указан')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Кем выдан:</span>
            <span class="info-value">${escapeHtml(currentUserData?.passportIssuedBy || 'Не указано')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Когда выдан:</span>
            <span class="info-value">${escapeHtml(currentUserData?.passportIssueDate || 'Не указано')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">СНИЛС:</span>
            <span class="info-value">${escapeHtml(currentUserData?.snils || 'Не указан')}</span>
        </div>
    `;
}

// Отображение адресов
function displayAddressData() {
    const container = document.getElementById('addressInfo');
    if (!container) return;
    
    container.innerHTML = `
        <div class="info-row">
            <span class="info-label">Фактический адрес:</span>
            <span class="info-value">${escapeHtml(currentUserData?.actualAddress || 'Не указан')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Адрес прописки:</span>
            <span class="info-value">${escapeHtml(currentUserData?.registrationAddress || 'Не указан')}</span>
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
            <input type="text" id="editFullName" value="${escapeHtml(currentUserData?.fullName || '')}">
        </div>
        <div class="form-group">
            <label>Телефон</label>
            <input type="tel" id="editPhone" value="${escapeHtml(currentUserData?.phone || '')}">
        </div>
        <div class="form-group">
            <label>Образование</label>
            <select id="editEducation">
                <option value="высшее" ${currentUserData?.education === 'высшее' ? 'selected' : ''}>Высшее</option>
                <option value="среднее-специальное" ${currentUserData?.education === 'среднее-специальное' ? 'selected' : ''}>Среднее специальное</option>
                <option value="среднее" ${currentUserData?.education === 'среднее' ? 'selected' : ''}>Среднее</option>
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
        fullName: document.getElementById('editFullName')?.value || '',
        phone: document.getElementById('editPhone')?.value || '',
        education: document.getElementById('editEducation')?.value || ''
    };

    try {
        await window.db.collection('users').doc(user.uid).update(updates);
        currentUserData = { ...currentUserData, ...updates };
        displayProfileData();
        showSuccess('Данные успешно обновлены!');
        currentEditMode = null;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('errorMessage', 'Ошибка сохранения данных: ' + error.message);
    }
}

// Редактирование документов
function editDocuments() {
    currentEditMode = 'documents';
    const container = document.getElementById('documentsInfo');
    container.innerHTML = `
        <div class="form-group">
            <label>Номер паспорта</label>
            <input type="text" id="editPassportNumber" value="${escapeHtml(currentUserData?.passportNumber || '')}" placeholder="Серия и номер паспорта">
        </div>
        <div class="form-group">
            <label>Кем выдан паспорт</label>
            <input type="text" id="editPassportIssuedBy" value="${escapeHtml(currentUserData?.passportIssuedBy || '')}" placeholder="Кем выдан">
        </div>
        <div class="form-group">
            <label>Когда выдан паспорт</label>
            <input type="date" id="editPassportIssueDate" value="${currentUserData?.passportIssueDate || ''}">
        </div>
        <div class="form-group">
            <label>СНИЛС</label>
            <input type="text" id="editSnils" value="${escapeHtml(currentUserData?.snils || '')}" placeholder="Номер СНИЛС">
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
        passportNumber: document.getElementById('editPassportNumber')?.value || '',
        passportIssuedBy: document.getElementById('editPassportIssuedBy')?.value || '',
        passportIssueDate: document.getElementById('editPassportIssueDate')?.value || '',
        snils: document.getElementById('editSnils')?.value || ''
    };

    try {
        await window.db.collection('users').doc(user.uid).update(updates);
        currentUserData = { ...currentUserData, ...updates };
        displayDocumentsData();
        showSuccess('Данные успешно обновлены!');
        currentEditMode = null;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('errorMessage', 'Ошибка сохранения данных: ' + error.message);
    }
}

// Редактирование адресов
function editAddress() {
    currentEditMode = 'address';
    const container = document.getElementById('addressInfo');
    container.innerHTML = `
        <div class="form-group">
            <label>Фактический адрес</label>
            <input type="text" id="editActualAddress" value="${escapeHtml(currentUserData?.actualAddress || '')}" placeholder="Индекс, город, улица, дом, кв.">
        </div>
        <div class="form-group">
            <label>Адрес прописки</label>
            <input type="text" id="editRegistrationAddress" value="${escapeHtml(currentUserData?.registrationAddress || '')}" placeholder="Индекс, город, улица, дом, кв.">
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
        actualAddress: document.getElementById('editActualAddress')?.value || '',
        registrationAddress: document.getElementById('editRegistrationAddress')?.value || ''
    };

    try {
        await window.db.collection('users').doc(user.uid).update(updates);
        currentUserData = { ...currentUserData, ...updates };
        displayAddressData();
        showSuccess('Данные успешно обновлены!');
        currentEditMode = null;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('errorMessage', 'Ошибка сохранения данных: ' + error.message);
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

// Выход из системы
async function logout() {
    try {
        await window.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showError('errorMessage', 'Ошибка при выходе из системы');
    }
}

// Показ сообщения об ошибке
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        console.error(message);
        alert(message);
    }
}

// Показ сообщения об успехе
function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    } else {
        console.log(message);
    }
}

// Форматирование даты
function formatDate(timestamp) {
    if (!timestamp) return 'Не указана';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ru-RU');
    } catch (e) {
        return 'Не указана';
    }
}

// Экранирование HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Экспортируем функции в глобальную область
window.switchTab = switchTab;
window.loadUserData = loadUserData;
window.editProfile = editProfile;
window.saveProfile = saveProfile;
window.editDocuments = editDocuments;
window.saveDocuments = saveDocuments;
window.editAddress = editAddress;
window.saveAddress = saveAddress;
window.cancelEdit = cancelEdit;
window.logout = logout;
window.showError = showError;
window.showSuccess = showSuccess;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализация student.js');
});

// Слушатель авторизации
window.auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed in student:', user?.email);
    
    if (user) {
        if (!user.emailVerified) {
            showError('errorMessage', 'Пожалуйста, подтвердите email перед входом. Проверьте вашу почту.');
            setTimeout(async () => {
                await window.auth.signOut();
                window.location.href = 'index.html';
            }, 3000);
        } else {
            await loadUserData();
            if (typeof window.loadCustomFields === 'function') {
                setTimeout(() => window.loadCustomFields(), 500);
            }
        }
    } else {
        console.log('Пользователь не авторизован, перенаправление на главную');
        window.location.href = 'index.html';
    }
});

console.log('✅ student.js загружен');
