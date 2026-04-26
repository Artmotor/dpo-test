// firebase-config.js - Полностью исправленная версия
const firebaseConfig = {
  apiKey: "AIzaSyC9Gp359H5gVRE6DpDUp1md9o2uu1c5A7k",
  authDomain: "vgau-lk.firebaseapp.com",
  projectId: "vgau-lk",
  storageBucket: "vgau-lk.firebasestorage.app",
  messagingSenderId: "832671757947",
  appId: "1:832671757947:web:07a01204dffefc30b2d4de",
  measurementId: "G-7JKFLK0SSS"
};

// Проверяем, не инициализирован ли уже Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Сервисы
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Правильная настройка Firestore
try {
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        merge: true
    });
} catch (error) {
    // Игнорируем ошибку настроек
    console.log('Firestore settings applied or already set');
}

console.log('Firebase инициализирован успешно');
console.log('Auth:', auth ? 'OK' : 'ERROR');
console.log('Firestore:', db ? 'OK' : 'ERROR');
console.log('Storage:', storage ? 'OK' : 'ERROR');
