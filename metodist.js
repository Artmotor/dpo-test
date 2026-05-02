// metodist.js - исправленная версия (без дублирования функций)

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
            <td>${escapeHtml(student.fullName || 'Не указано')}</td>
            <td>${escapeHtml(student.email || 'Не указан')}</td>
            <td>${escapeHtml(student.phone || 'Не указан')}</td>
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
    
    // Загружаем динамические поля
    await loadDynamicFieldsInModal(student.customFields || {});
    
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'block';
}

// Загрузка динамических полей в модальное окно
async function loadDynamicFieldsInModal(customValues) {
    const container = document.getElementById('dynamicFieldsContainer');
    if (!container) return;
    
    const fields = await window.fieldsManager.getActiveFields();
    
    if (fields.length === 0) {
        container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Нет дополнительных полей</p>';
        return;
    }
    
    let html = '';
    for (const field of fields) {
        const value = customValues[field.id] || '';
        html += `
            <div class="dynamic-field" style="margin-bottom:20px; padding:15px; border:1px solid #e0e0e0; border-radius:8px; background:#fafafa;">
                <label style="display:block; margin-bottom:8px; font-weight:500;">
                    ${escapeHtml(field.label)}
                    ${field.isRequired ? '<span style="color:#dc3545;"> *</span>' : ''}
                </label>
                ${renderFieldInputInModal(field, value, `dynamic_${field.id}`)}
                ${field.semantics ? `<small style="display:block; margin-top:5px; color:#667eea;">🔗 ${escapeHtml(field.semantics)}</small>` : ''}
            </div>
        `;
    }
    container.innerHTML = html;
}

// Рендер поля в модальном окне
function renderFieldInputInModal(field, value, fieldId) {
    switch (field.type) {
        case 'radio':
            if (!field.options || !field.options.length) {
                return '<p style="color:red;">Нет вариантов</p>';
            }
            let radioHtml = '<div style="display:flex; flex-wrap:wrap; gap:15px;">';
            for (const opt of field.options) {
                radioHtml += `
                    <label style="display:flex; align-items:center; cursor:pointer;">
                        <input type="radio" name="${fieldId}" value="${escapeHtml(opt)}" ${value === opt ? 'checked' : ''} style="width:16px; height:16px; margin-right:8px;">
                        <span>${escapeHtml(opt)}</span>
                    </label>
                `;
            }
            radioHtml += '</div>';
            return radioHtml;
            
        case 'select':
            if (!field.options || !field.options.length) {
                return '<p style="color:red;">Нет вариантов</p>';
            }
            let selectHtml = `<select id="${fieldId}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;">`;
            selectHtml += `<option value="">-- Выберите --</option>`;
            for (const opt of field.options) {
                selectHtml += `<option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`;
            }
            selectHtml += '</select>';
            return selectHtml;
            
        case 'textarea':
            return `<textarea id="${fieldId}" rows="3" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;">${escapeHtml(value)}</textarea>`;
            
        default:
            return `<input type="${field.type || 'text'}" id="${fieldId}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:8px;">`;
    }
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
    
    // Собираем значения динамических полей
    const fields = await window.fieldsManager.getActiveFields();
    const customValues = {};
    
    for (const field of fields) {
        if (field.type === 'radio') {
            const selected = document.querySelector(`input[name="dynamic_${field.id}"]:checked`);
            customValues[field.id] = selected ? selected.value : '';
        } else {
            const element = document.getElementById(`dynamic_${field.id}`);
            if (element) {
                customValues[field.id] = element.value;
            }
        }
    }
    
    updates.customFields = customValues;
    
    try {
        await window.db.collection('users').doc(currentEditStudentId).update(updates);
        
        // Обновляем данные в массиве
        const index = allStudents.findIndex(s => s.id === currentEditStudentId);
        if (index !== -1) {
            allStudents[index] = { ...allStudents[index], ...updates };
        }
        
        displayStudents(allStudents);
        showSuccess('Данные слушателя успешно обновлены!');
        closeEditModal();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('errorMessage', 'Ошибка сохранения данных: ' + error.message);
    }
}

// Экспортируем функции в глобальную область
window.loadStudents = loadStudents;
window.displayStudents = displayStudents;
window.searchStudents = searchStudents;
window.updateStats = updateStats;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveStudentData = saveStudentData;

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
