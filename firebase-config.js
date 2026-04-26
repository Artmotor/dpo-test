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
firebase.initializeApp(firebaseConfig);

// Сервисы
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Настройка кеширования (новый способ)
const firestoreSettings = {
  cache: {
    sizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  }
};

db.settings(firestoreSettings).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Офлайн-режим отключен (множественные вкладки)');
  } else if (err.code === 'unimplemented') {
    console.warn('Браузер не поддерживает офлайн-режим');
  } else {
    console.warn('Ошибка настройки кеша:', err);
  }
});

console.log('Firebase инициализирован');
