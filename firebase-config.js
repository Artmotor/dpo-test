// firebase-config.js - ИСПРАВЛЕННАЯ версия
const firebaseConfig = {
    apiKey: "AIzaSyC9Gp359H5gVRE6DpDUp1md9o2uu1c5A7k",
    authDomain: "vgau-lk.firebaseapp.com",
    projectId: "vgau-lk",
    storageBucket: "vgau-lk.firebasestorage.app",
    messagingSenderId: "832671757947",
    appId: "1:832671757947:web:07a01204dffefc30b2d4de",
    measurementId: "G-7JKFLK0SSS"
};

// ПРОВЕРКА: правильный ли API ключ? Возможно он устарел или неактивен
// Убедитесь, что в консоли Firebase:
// 1. API ключ активен
// 2. Authentication включен
// 3. Email/Password метод входа включен

// БЕЗОПАСНАЯ инициализация Firebase
let app;
let auth;
let db;
let storage;

try {
    // Проверяем, загружен ли Firebase SDK
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK не загружен! Проверьте подключение скриптов');
        throw new Error('Firebase SDK not loaded');
    }
    
    // Проверяем, есть ли уже инициализированное приложение
    if (!firebase.apps.length) {
        console.log('Инициализация Firebase...');
        app = firebase.initializeApp(firebaseConfig);
        console.log('Firebase инициализирован успешно');
    } else {
        console.log('Firebase уже инициализирован, используем существующее приложение');
        app = firebase.apps[0];
    }
    
    // Инициализируем сервисы
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    
    // Настройка Firestore с обработкой ошибок
    try {
        // Проверяем, не используется ли уже настройка
        if (!db._settingsWritten) {
            db.settings({ 
                timestampsInSnapshots: true,
                merge: true 
            });
            db._settingsWritten = true;
            console.log('Firestore settings применены');
        }
    } catch (e) {
        console.log('Firestore settings уже настроены или не требуются');
    }
    
    // Сохраняем в глобальный объект с проверкой
    window.auth = auth;
    window.db = db;
    window.storage = storage;
    window.firebaseApp = app;
    
    console.log('Firebase готов к работе. Auth state:', auth.currentUser ? 'Пользователь есть' : 'Нет пользователя');
    
} catch (error) {
    console.error('КРИТИЧЕСКАЯ ОШИБКА инициализации Firebase:', error);
    // Показываем пользователю понятное сообщение
    document.body.innerHTML = `
        <div style="text-align: center; padding: 50px; font-family: Arial;">
            <h2>Ошибка подключения к серверу</h2>
            <p>Пожалуйста, обновите страницу или свяжитесь с администратором.</p>
            <p>Ошибка: ${error.message}</p>
            <button onclick="location.reload()">Обновить страницу</button>
        </div>
    `;
}
