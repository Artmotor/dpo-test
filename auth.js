// auth.js
class AuthService {
    static async register(email, password, userData) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Создаем документ слушателя
            await db.collection('listeners').doc(user.uid).set({
                userID: user.uid,
                fields: {
                    email: { value: email, label: 'Email', type: 'email', editable: false },
                    fullName: { value: userData.fullName, label: 'ФИО', type: 'text', editable: true },
                    phone: { value: userData.phone, label: 'Телефон', type: 'phone', editable: true },
                    passportNumber: { value: '', label: 'Серия и номер паспорта', type: 'text', editable: true },
                    passportIssueDate: { value: '', label: 'Дата выдачи паспорта', type: 'date', editable: true },
                    passportIssuedBy: { value: '', label: 'Кем выдан паспорт', type: 'text', editable: true },
                    passportUnitCode: { value: '', label: 'Код подразделения', type: 'text', editable: true },
                    registrationAddress: { value: '', label: 'Адрес регистрации', type: 'text', editable: true },
                    actualAddress: { value: '', label: 'Фактический адрес', type: 'text', editable: true }
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
            });
            
            return { success: true, user };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: AuthService.getErrorMessage(error.code) };
        }
    }
    
    static async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: AuthService.getErrorMessage(error.code) };
        }
    }
    
    static async signOut() {
        await auth.signOut();
        window.location.href = '/index.html';
    }
    
    static getErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'Этот email уже зарегистрирован',
            'auth/invalid-email': 'Неверный формат email',
            'auth/weak-password': 'Пароль должен содержать минимум 6 символов',
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/invalid-credential': 'Неверные учетные данные',
            'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже'
        };
        return messages[code] || 'Произошла ошибка. Попробуйте снова.';
    }
    
    static showToast(message, type = 'info') {
        const toastEl = document.getElementById('liveToast');
        const toastMessage = document.getElementById('toastMessage');
        if (toastEl && toastMessage) {
            toastMessage.textContent = message;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            const result = await AuthService.login(email, password);
            if (result.success) {
                window.location.href = '/dashboard.html';
            } else {
                AuthService.showToast(result.error, 'danger');
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userData = {
                fullName: document.getElementById('regFullName').value,
                phone: document.getElementById('regPhone').value
            };
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            
            const result = await AuthService.register(email, password, userData);
            if (result.success) {
                AuthService.showToast('Регистрация успешна! Выполняем вход...', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1500);
            } else {
                AuthService.showToast(result.error, 'danger');
            }
        });
    }
});