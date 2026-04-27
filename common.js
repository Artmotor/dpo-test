// common.js - общие функции для всех ролей

// Переключение видимости пароля
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
    }
}

// Показ ошибки
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Показ успешного сообщения
function showSuccess(message, elementId = 'successMessage') {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    }
}

// Показ информационного сообщения
function showInfo(message, elementId = 'infoMessage') {
    const infoElement = document.getElementById(elementId);
    if (infoElement) {
        infoElement.textContent = message;
        infoElement.style.display = 'block';
        setTimeout(() => {
            infoElement.style.display = 'none';
        }, 5000);
    }
}

// Форматирование даты
function formatDate(timestamp) {
    if (!timestamp) return 'Не указана';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ru-RU');
}

// Форматирование даты и времени
function formatDateTime(timestamp) {
    if (!timestamp) return 'Не указано';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ru-RU');
}

// Выход из системы
async function logout() {
    try {
        await window.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Ошибка выхода:', error);
        alert('Ошибка при выходе из системы');
    }
}

// Проверка авторизации и роли
async function checkAuthAndRole(requiredRole) {
    return new Promise((resolve, reject) => {
        window.auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                reject();
                return;
            }

            try {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                const userData = userDoc.data();
                
                if (!userData || userData.role !== requiredRole) {
                    alert('У вас нет доступа к этой странице');
                    window.location.href = 'index.html';
                    reject();
                    return;
                }
                
                resolve({ user, userData });
            } catch (error) {
                console.error('Ошибка проверки роли:', error);
                reject(error);
            }
        });
    });
}