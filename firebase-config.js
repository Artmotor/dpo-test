// firebase-config.js - ФИНАЛЬНАЯ версия
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
    } else {
        console.log('Firebase уже инициализирован');
    }
    
    // Сервисы
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.storage = firebase.storage();
    
    // Настройка Firestore
    try {
        window.db.settings({
            merge: true
        });
        console.log('Firestore settings применены');
    } catch (e) {
        console.log('Firestore settings не требуются');
    }
    
    console.log('Firebase готов к работе');
} else {
    console.error('Firebase SDK не загружен!');
}
