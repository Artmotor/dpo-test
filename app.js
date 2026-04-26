// app.js - Исправленный роутинг
console.log('app.js загружен');

auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? 'User logged in' : 'No user');
    
    if (!user) {
        console.log('Перенаправление на логин');
        window.location.replace('/index.html');
        return;
    }
    
    try {
        console.log('Загрузка данных пользователя:', user.uid);
        const userDoc = await db.collection('listeners').doc(user.uid).get();
        
        if (!userDoc.exists) {
            console.log('Документ пользователя не найден');
            await auth.signOut();
            window.location.replace('/index.html');
            return;
        }
        
        const userData = userDoc.data();
        const role = userData.role;
        
        console.log('Роль пользователя:', role);
        
        if (role === 'methodist') {
            console.log('Перенаправление в кабинет методиста');
            window.location.replace('/methodist-cabinet.html');
        } else if (role === 'listener') {
            console.log('Перенаправление в кабинет слушателя');
            window.location.replace('/student-cabinet.html');
        } else {
            console.log('Неизвестная роль:', role);
            await auth.signOut();
            window.location.replace('/index.html');
        }
    } catch (error) {
        console.error('Ошибка при определении роли:', error);
        setTimeout(() => {
            window.location.replace('/index.html');
        }, 2000);
    }
});
