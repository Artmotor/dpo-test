// app.js - Роутинг и перенаправление по ролям (Production)
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.replace('/index.html');
        return;
    }
    
    try {
        const userDoc = await db.collection('listeners').doc(user.uid).get();
        
        if (!userDoc.exists) {
            await auth.signOut();
            window.location.replace('/index.html');
            return;
        }
        
        const userData = userDoc.data();
        const role = userData.role;
        
        // Перенаправляем в зависимости от роли
        if (role === 'methodist') {
            window.location.replace('/methodist-cabinet.html');
        } else if (role === 'listener') {
            window.location.replace('/student-cabinet.html');
        } else {
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
