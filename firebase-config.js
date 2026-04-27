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

// Инициализация Firebase
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase инициализирован');
        
        // Явно получаем сервисы, чтобы убедиться, что они загружены
        window.auth = firebase.auth();
        window.db = firebase.firestore();
        // Убираем storage, так как он не используется в текущем коде и вызывает ошибку
        // window.storage = firebase.storage(); 
        
        console.log('Firebase сервисы готовы: Auth + Firestore');
    } else {
        console.log('Firebase уже инициализирован');
        window.auth = firebase.auth();
        window.db = firebase.firestore();
    }
} else {
    console.error('Firebase SDK не загружен! Проверьте подключение скриптов в HTML.');
}
