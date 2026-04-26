// auth.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)
class AuthService {
    /**
     * Регистрация нового пользователя
     */
    static async register(email, password, userData) {
        console.log('Начинаем регистрацию...');
        
        try {
            // Проверяем, что Firebase инициализирован
            if (!auth) {
                throw new Error('Firebase не инициализирован');
            }
            
            // Создаем пользователя
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Пользователь создан:', user.uid);
            
            // Создаем документ в Firestore
            const userDoc = {
                userID: user.uid,
                fields: {
                    email: { 
                        value: email, 
                        label: 'Email', 
                        type: 'email', 
                        editable: false 
                    },
                    fullName: { 
                        value: userData.fullName, 
                        label: 'ФИО', 
                        type: 'text', 
                        editable: true 
                    },
                    phone: { 
                        value: userData.phone, 
                        label: 'Телефон', 
                        type: 'phone', 
                        editable: true 
                    },
                    passportNumber: { 
                        value: '', 
                        label: 'Серия и номер паспорта', 
                        type: 'text', 
                        editable: true 
                    },
                    passportIssueDate: { 
                        value: '', 
                        label: 'Дата выдачи паспорта', 
                        type: 'date', 
                        editable: true 
                    },
                    passportIssuedBy: { 
                        value: '', 
                        label: 'Кем выдан паспорт', 
                        type: 'text', 
                        editable: true 
                    },
                    passportUnitCode: { 
                        value: '', 
                        label: 'Код подразделения', 
                        type: 'text', 
                        editable: true 
                    },
                    registrationAddress: { 
                        value: '', 
                        label: 'Адрес регистрации', 
                        type: 'text', 
                        editable: true 
                    },
                    actualAddress: { 
                        value: '', 
                        label: 'Фактический адрес', 
                        type: 'text', 
                        editable: true 
                    }
                },
                documents: {
                    passportMain: null,
                    passportRegistration: null,
                    snils: null,
                    inn: null,
                    nameChange: null,
                    diploma: null
                },
                role: 'listener',
                course: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('listeners').doc(user.uid).set(userDoc);
            
            console.log('Документ создан в Firestore');
            
            return { success: true, user };
            
        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'Ошибка регистрации';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Этот email уже зарегистрирован';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Неверный формат email';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Регистрация отключена. Включите Email/Password в Firebase Console';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Пароль должен содержать минимум 6 символов';
                    break;
                case 'auth/configuration-not-found':
                    errorMessage = 'Firebase Authentication не настроена. Проверьте Firebase Console';
                    break;
                default:
                    errorMessage = `Ошибка: ${error.message}`;
            }
            
            return { success: false, error: errorMessage };
        }
    }
    
    /**
     * Вход пользователя
     */
    static async login(email, password) {
        console.log('Выполняем вход...');
        
        try {
            if (!auth) {
                throw new Error('Firebase не инициализирован');
            }
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('Вход выполнен:', userCredential.user.uid);
            
            return { success: true, user: userCredential.user };
            
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Ошибка входа';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Пользователь не найден';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Неверный пароль';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Неверный формат email';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'Неверный email или пароль';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Слишком много попыток. Попробуйте позже';
                    break;
                default:
                    errorMessage = `Ошибка: ${error.message}`;
            }
            
            return { success: false, error: errorMessage };
        }
    }
    
    /**
     * Выход
     */
    static async signOut() {
        try {
            await auth.signOut();
            window.location.href = '/index.html';
        } catch (error) {
            console.error('SignOut error:', error);
        }
    }
    
    /**
     * Показать уведомление
     */
    static showToast(message, type = 'info') {
        // Пробуем Bootstrap Toast
        const toastEl = document.getElementById('liveToast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toastEl && toastMessage) {
            toastMessage.textContent = message;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
            return;
        }
        
        // Запасной вариант - алерт
        if (type === 'error' || type === 'danger') {
            const errorAlert = document.getElementById('errorAlert');
            const errorMessage = document.getElementById('errorMessage');
            if (errorAlert && errorMessage) {
                errorMessage.textContent = message;
                errorAlert.classList.remove('d-none');
                setTimeout(() => errorAlert.classList.add('d-none'), 5000);
                return;
            }
        }
        
        if (type === 'success') {
            const successAlert = document.getElementById('successAlert');
            const successMessage = document.getElementById('successMessage');
            if (successAlert && successMessage) {
                successMessage.textContent = message;
                successAlert.classList.remove('d-none');
                setTimeout(() => successAlert.classList.add('d-none'), 5000);
                return;
            }
        }
        
        // Если ничего не найдено - console.log
        console.log(`${type}: ${message}`);
    }
}

// Инициализация форм при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена, инициализация форм...');
    
    // Проверяем состояние Firebase
    if (typeof auth === 'undefined') {
        console.error('Firebase Auth не инициализирован!');
        AuthService.showToast('Ошибка инициализации Firebase', 'danger');
        return;
    }
    
    // Проверяем, авторизован ли уже пользователь
    auth.onAuthStateChanged((user) => {
        if (user && window.location.pathname.includes('index.html')) {
            // Пользователь уже авторизован, перенаправляем
            checkUserRoleAndRedirect(user);
        }
    });
    
    // Форма входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const loginBtn = document.getElementById('loginButton');
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            // Блокируем кнопку
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Вход...';
            
            const result = await AuthService.login(email, password);
            
            if (result.success) {
                AuthService.showToast('Вход выполнен!', 'success');
                setTimeout(() => {
                    checkUserRoleAndRedirect(result.user);
                }, 500);
            } else {
                AuthService.showToast(result.error, 'danger');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Войти';
            }
        });
    }
    
    // Форма регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const registerBtn = document.getElementById('registerButton');
            const userData = {
                fullName: document.getElementById('regFullName').value.trim(),
                phone: document.getElementById('regPhone').value.trim()
            };
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            
            // Базовая валидация
            if (password.length < 6) {
                AuthService.showToast('Пароль должен содержать минимум 6 символов', 'danger');
                return;
            }
            
            // Блокируем кнопку
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Регистрация...';
            
            const result = await AuthService.register(email, password, userData);
            
            if (result.success) {
                AuthService.showToast('Регистрация успешна! Выполняем вход...', 'success');
                setTimeout(() => {
                    checkUserRoleAndRedirect(result.user);
                }, 1000);
            } else {
                AuthService.showToast(result.error, 'danger');
                registerBtn.disabled = false;
                registerBtn.innerHTML = '<i class="bi bi-person-check me-2"></i>Зарегистрироваться';
            }
        });
    }
});

/**
 * Проверка роли и перенаправление
 */
// В auth.js замените функцию checkUserRoleAndRedirect на эту:
async function checkUserRoleAndRedirect(user) {
    console.log('checkUserRoleAndRedirect вызван для:', user.uid);
    
    try {
        const userDoc = await db.collection('listeners').doc(user.uid).get();
        
        if (userDoc.exists) {
            const role = userDoc.data().role;
            console.log('Роль найдена:', role);
            
            if (role === 'methodist') {
                window.location.replace('/methodist-cabinet.html');
            } else {
                window.location.replace('/student-cabinet.html');
            }
        } else {
            console.error('Документ не найден');
            await auth.signOut();
            window.location.replace('/index.html');
        }
    } catch (error) {
        console.error('Ошибка проверки роли:', error.message);
        console.error('Полная ошибка:', error);
        window.location.replace('/dashboard.html');
    }
}
