// metodist.js - скрипт для панели методиста

let allStudents = [];
let currentEditStudentId = null;

// Загрузка списка слушателей
async function loadStudents() {
    try {
        const snapshot = await window.db.collection('users')
            .where('role', '==', 'student')
            .orderBy('createdAt', 'desc')
            .get();
        
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
        showError('errorMessage', 'Ошибка загрузки списка слушателей');
    }
}

// Отображение списка слушателей
function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');
    
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
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
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
    
    document.getElementById('totalStudents').textContent = total;
    document.getElementById('verifiedStudents').textContent = verified;
    document.getElementById('activeStudents').textContent = active;
}

// Открытие модального окна для редактирования
async function openEditModal(studentId) {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    currentEditStudentId = studentId;
    
    // Заполняем readonly поля
    document.getElementById('editFullName').value = student.fullName || '';
    document.getElementById('editEmail').value = student.email || '';
    document.getElementById('editPhone').value = student.phone || '';
    document.getElementById('editEducation').value = student.education || '';
    
    // Заполняем редактируемые поля
    document.getElementById('editActualAddress').value = student.actualAddress || '';
    document.getElementById('editRegistrationAddress').value = student.registrationAddress || '';
    document.getElementById('editPassportNumber').value = student.passportNumber || '';
    document.getElementById('editPassportIssuedBy').value = student.passportIssuedBy || '';
    document.getElementById('editPassportIssueDate').value = student.passportIssueDate || '';
    document.getElementById('editSnils').value = student.snils || '';
    
    document.getElementById('editModal').style.display = 'block';
}

// Закрытие модального окна
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditStudentId = null;
}

// Сохранение данных слушателя
async function saveStudentData() {
    if (!currentEditStudentId) return;
    
    const updates = {
        actualAddress: document.getElementById('editActualAddress').value,
        registrationAddress: document.getElementById('editRegistrationAddress').value,
        passportNumber: document.getElementById('editPassportNumber').value,
        passportIssuedBy: document.getElementById('editPassportIssuedBy').value,
        passportIssueDate: document.getElementById('editPassportIssueDate').value,
        snils: document.getElementById('editSnils').value,
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
        showError('errorMessage', 'Ошибка сохранения данных');
    }
}

// Инициализация
window.auth.onAuthStateChanged(async (user) => {
    if (user && user.emailVerified) {
        try {
            const userDoc = await window.db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            if (userData && userData.role === 'metodist') {
                await loadStudents();
            } else {
                alert('У вас нет доступа к этой странице');
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Ошибка:', error);
            window.location.href = 'index.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});