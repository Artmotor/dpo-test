// firebase-config.js
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
        console.log('✅ Firebase инициализирован');
    }
    
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    
    // Убираем storage - он не нужен и вызывает ошибку
    // window.storage = firebase.storage();
    
    // Настройки Firestore
    try {
        window.db.settings({ 
            ignoreUndefinedProperties: true,
            merge: true
        });
        console.log('✅ Firestore настроен');
    } catch (e) {
        console.log('⚠️ Firestore settings не требуются');
    }
    
    // Проверка подключения
    window.db.collection('users').limit(1).get()
        .then(() => console.log('✅ Firestore доступен'))
        .catch(err => console.error('❌ Ошибка Firestore:', err.message));
    
    console.log('🔥 Firebase готов к работе');
} else {
    console.error('❌ Firebase SDK не загружен!');
}
