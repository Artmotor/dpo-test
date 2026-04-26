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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Включаем офлайн-режим
db.enablePersistence().catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Множественные вкладки - офлайн режим ограничен');
  } else if (err.code == 'unimplemented') {
    console.warn('Браузер не поддерживает офлайн режим');
  }
});
