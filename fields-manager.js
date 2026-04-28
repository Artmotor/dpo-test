// fields-manager.js - управление динамическими полями

class FieldsManager {
    constructor() {
        this.collection = 'custom_fields';
    }

    // Получить все поля
    async getAllFields() {
        try {
            const snapshot = await window.db.collection(this.collection).get();
            const fields = [];
            snapshot.forEach(doc => {
                fields.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return fields.sort((a, b) => (a.order || 0) - (b.order || 0));
        } catch (error) {
            console.error('Ошибка загрузки полей:', error);
            return [];
        }
    }

    // Получить активные поля
    async getActiveFields() {
        const allFields = await this.getAllFields();
        return allFields.filter(field => field.isActive !== false);
    }

    // Добавить поле
    async addField(fieldData) {
        try {
            const fields = await this.getAllFields();
            const newOrder = fields.length;
            
            const newField = {
                ...fieldData,
                order: newOrder,
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: window.auth.currentUser?.uid
            };
            
            await window.db.collection(this.collection).doc(fieldData.id).set(newField);
            return { id: fieldData.id, ...newField };
        } catch (error) {
            console.error('Ошибка добавления поля:', error);
            throw error;
        }
    }

    // Обновить поле
    async updateField(fieldId, updates) {
        try {
            await window.db.collection(this.collection).doc(fieldId).update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: window.auth.currentUser?.uid
            });
            return true;
        } catch (error) {
            console.error('Ошибка обновления поля:', error);
            throw error;
        }
    }

    // Удалить поле и все его значения у слушателей
    async deleteField(fieldId) {
        try {
            // 1. Удаляем значения поля у всех слушателей
            const studentsSnapshot = await window.db.collection('users')
                .where('role', '==', 'student')
                .get();
            
            const updatePromises = [];
            studentsSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.customFields && userData.customFields[fieldId] !== undefined) {
                    const updatedCustomFields = { ...userData.customFields };
                    delete updatedCustomFields[fieldId];
                    updatePromises.push(
                        window.db.collection('users').doc(doc.id).update({
                            customFields: updatedCustomFields,
                            lastFieldUpdate: firebase.firestore.FieldValue.serverTimestamp()
                        })
                    );
                }
            });
            
            await Promise.all(updatePromises);
            
            // 2. Удаляем само поле
            await window.db.collection(this.collection).doc(fieldId).delete();
            
            console.log(`✅ Поле удалено. Обновлено ${updatePromises.length} слушателей.`);
            return true;
        } catch (error) {
            console.error('Ошибка удаления поля:', error);
            throw error;
        }
    }

    // Сохранить значения полей для слушателя
    async saveFieldValues(userId, values) {
        try {
            const userRef = window.db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                throw new Error('Пользователь не найден');
            }
            
            const currentData = userDoc.data();
            const customFields = currentData.customFields || {};
            const updatedFields = { ...customFields, ...values };
            
            await userRef.update({
                customFields: updatedFields,
                lastFieldUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Ошибка сохранения полей:', error);
            throw error;
        }
    }

    // Получить значения полей для слушателя
    async getFieldValues(userId) {
        try {
            const userDoc = await window.db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                return userDoc.data().customFields || {};
            }
            return {};
        } catch (error) {
            console.error('Ошибка получения значений полей:', error);
            return {};
        }
    }

    // Проверить заполнение обязательных полей
    async checkRequiredFields(userId) {
        const fields = await this.getActiveFields();
        const values = await this.getFieldValues(userId);
        
        const requiredFields = fields.filter(f => f.isRequired);
        const missingFields = requiredFields.filter(f => {
            const value = values[f.id];
            return !value || value.trim() === '';
        });
        
        return {
            allFilled: missingFields.length === 0,
            missingFields: missingFields
        };
    }
}

// Создаем глобальный экземпляр
window.fieldsManager = new FieldsManager();
