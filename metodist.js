// metodist.js - исправленная версия

let allStudents = [];
let currentEditStudentId = null;

// Загрузка списка слушателей
async function loadStudents() {
    console.log('Загрузка списка слушателей...');
    try {
        const snapshot = await window.db.collection('users')
            .where('role', '==', 'student')
            .orderBy('createdAt', 'desc')
            .get();
        
        console.log('Найдено слушателей:', snapshot.size);
        
        allStudents = [];
        snapshot.forEach(doc => {
            allStudents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayStudents(allStudents);
        updateStats();
    } catch (error) {
        console.error('Ошибка загрузки студентов:', error);
        showError('errorMessage', 'Ошибка загрузки списка слушателей: ' + error.message);
    }
}

// Отображение списка слушателей
function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет слушателей</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.fullName || 'Не указано'}</td>
            <td>${student.email || 'Не указан'}</td>
            <td>${student.phone || 'Не указан'}</td>
            <td>${student.emailVerified ? '✅ Подтвержден' : '⏳ Не подтвержден'}</td>
            <td>${formatDate(student.createdAt)}</td>
            <td>
                <button class="edit-btn" onclick="openEditModal('${student.id}')">✏️ Редактировать</button>
            </td>
        </tr>
    `).join('');
}

// Поиск слушателей
function searchStudents() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    const filtered = allStudents.filter(student => 
        (student.fullName && student.fullName.toLowerCase().includes(searchTerm)) ||
        (student.email && student.email.toLowerCase().includes(searchTerm)) ||
        (student.phone && student.phone.toLowerCase().includes(searchTerm))
    );
    
    displayStudents(filtered);
}

// Обновление статистики
function updateStats() {
    const total = allStudents.length;
    const verified = allStudents.filter(s => s.emailVerified).length;
    const active = allStudents.filter(s => {
        const lastLogin = s.lastLogin?.toDate();
        if (!lastLogin) return false;
        const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLogin <= 30;
    }).length;
    
    const totalElem = document.getElementById('totalStudents');
    const verifiedElem = document.getElementById('verifiedStudents');
    const activeElem = document.getElementById('activeStudents');
    
    if (totalElem) totalElem.textContent = total;
    if (verifiedElem) verifiedElem.textContent = verified;
    if (activeElem) activeElem.textContent = active;
}

// Открытие модального окна для редактирования
async function openEditModal(studentId) {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    currentEditStudentId = studentId;
    
    // Заполняем readonly поля
    const fullNameInput = document.getElementById('editFullName');
    const emailInput = document.getElementById('editEmail');
    const phoneInput = document.getElementById('editPhone');
    const educationInput = document.getElementById('editEducation');
    
    if (fullNameInput) fullNameInput.value = student.fullName || '';
    if (emailInput) emailInput.value = student.email || '';
    if (phoneInput) phoneInput.value = student.phone || '';
    if (educationInput) educationInput.value = student.education || '';
    
    // Заполняем редактируемые поля
    const actualAddressInput = document.getElementById('editActualAddress');
    const registrationAddressInput = document.getElementById('editRegistrationAddress');
    const passportNumberInput = document.getElementById('editPassportNumber');
    const passportIssuedByInput = document.getElementById('editPassportIssuedBy');
    const passportIssueDateInput = document.getElementById('editPassportIssueDate');
    const snilsInput = document.getElementById('editSnils');
    
    if (actualAddressInput) actualAddressInput.value = student.actualAddress || '';
    if (registrationAddressInput) registrationAddressInput.value = student.registrationAddress || '';
    if (passportNumberInput) passportNumberInput.value = student.passportNumber || '';
    if (passportIssuedByInput) passportIssuedByInput.value = student.passportIssuedBy || '';
    if (passportIssueDateInput) passportIssueDateInput.value = student.passportIssueDate || '';
    if (snilsInput) snilsInput.value = student.snils || '';
    
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'block';
}

// Закрытие модального окна
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
    currentEditStudentId = null;
}

// Сохранение данных слушателя
async function saveStudentData() {
    if (!currentEditStudentId) return;
    
    const actualAddress = document.getElementById('editActualAddress')?.value || '';
    const registrationAddress = document.getElementById('editRegistrationAddress')?.value || '';
    const passportNumber = document.getElementById('editPassportNumber')?.value || '';
    const passportIssuedBy = document.getElementById('editPassportIssuedBy')?.value || '';
    const passportIssueDate = document.getElementById('editPassportIssueDate')?.value || '';
    const snils = document.getElementById('editSnils')?.value || '';
    
    const updates = {
        actualAddress: actualAddress,
        registrationAddress: registrationAddress,
        passportNumber: passportNumber,
        passportIssuedBy: passportIssuedBy,
        passportIssueDate: passportIssueDate,
        snils: snils,
        updatedByMetodist: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await window.db.collection('users').doc(currentEditStudentId).update(updates);
        
        // Обновляем данные в массиве
        const index = allStudents.findIndex(s => s.id === currentEditStudentId);
        if (index !== -1) {
            allStudents[index] = { ...allStudents[index], ...updates };
        }
        
        displayStudents(allStudents);
        showSuccess('Данные слушателя успешно обновлены!', 'successMessage');
        closeEditModal();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('errorMessage', 'Ошибка сохранения данных: ' + error.message);
    }
}

// Функции для форматирования
function formatDate(timestamp) {
    if (!timestamp) return 'Не указана';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ru-RU');
    } catch (e) {
        return 'Не указана';
    }
}

function formatDateTime(timestamp) {
    if (!timestamp) return 'Не указано';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('ru-RU');
    } catch (e) {
        return 'Не указано';
    }
}

function showSuccess(message, elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Инициализация страницы методиста
async function initMetodistPage() {
    console.log('Инициализация страницы методиста...');
    
    const user = window.auth.currentUser;
    if (!user) {
        console.log('Пользователь не авторизован, перенаправление на главную');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const userDoc = await window.db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            console.log('Документ пользователя не найден');
            await window.auth.signOut();
            window.location.href = 'index.html';
            return;
        }
        
        const userData = userDoc.data();
        console.log('Роль пользователя:', userData.role);
        
        if (userData.role !== 'metodist') {
            console.log('Не методист, перенаправление на страницу слушателя');
            window.location.href = 'student-cabinet.html';
            return;
        }
        
        console.log('Доступ разрешен, загрузка данных');
        await loadStudents();
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        window.location.href = 'index.html';
    }
}

// Проверка авторизации при загрузке страницы
window.auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed in metodist:', user?.email);
    
    if (user && user.emailVerified) {
        await initMetodistPage();
    } else if (user && !user.emailVerified) {
        alert('Пожалуйста, подтвердите email');
        await window.auth.signOut();
        window.location.href = 'index.html';
    } else {
        window.location.href = 'index.html';
    }
});
