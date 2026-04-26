// app.js - Роутинг и перенаправление по ролям
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '/index.html';
        return;
    }
    
    try {
        const userDoc = await db.collection('listeners').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Если документ не найден, выходим
            await auth.signOut();
            window.location.href = '/index.html';
            return;
        }
        
        const userData = userDoc.data();
        const role = userData.role;
        
        // Перенаправляем в зависимости от роли
        if (role === 'methodist') {
            window.location.href = '/methodist-cabinet.html';
        } else if (role === 'listener') {
            window.location.href = '/student-cabinet.html';
        } else {
            // Неизвестная роль
            await auth.signOut();
            window.location.href = '/index.html';
        }
    } catch (error) {
        console.error('Ошибка при определении роли:', error);
        AuthService.showToast('Ошибка загрузки профиля', 'danger');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
    }
});