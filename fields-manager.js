// fields-manager.js - управление динамическими полями (расширенная версия)

class FieldsManager {
    constructor() {
        this.collection = 'custom_fields';
        this.cache = null;
        this.cacheTime = null;
        this.cacheTTL = 60000;
    }

    clearCache() {
        this.cache = null;
        this.cacheTime = null;
    }

    async getAllFields(forceRefresh = false) {
        if (!forceRefresh && this.cache && this.cacheTime && (Date.now() - this.cacheTime) < this.cacheTTL) {
            return this.cache;
        }
        try {
            const snapshot = await window.db.collection(this.collection).get();
            const fields = [];
            snapshot.forEach(doc => fields.push({ id: doc.id, ...doc.data() }));
            fields.sort((a, b) => (a.order || 0) - (b.order || 0));
            this.cache = fields;
            this.cacheTime = Date.now();
            return fields;
        } catch (error) {
            console.error('Ошибка загрузки полей:', error);
            return this.cache || [];
        }
    }

    async getActiveFields(forceRefresh = false) {
        const allFields = await this.getAllFields(forceRefresh);
        return allFields.filter(field => field.isActive !== false);
    }

    async getFieldById(fieldId) {
        try {
            const doc = await window.db.collection(this.collection).doc(fieldId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (error) {
            console.error('Ошибка получения поля:', error);
            return null;
        }
    }

    // Валидация ID поля
    validateFieldId(id) {
        if (!id || typeof id !== 'string') return false;
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id);
    }

    // Добавить поле
    async addField(fieldData) {
        if (!this.validateFieldId(fieldData.id)) {
            throw new Error('ID поля должен содержать только латиницу, цифры и _, начинаться с буквы');
        }
        
        const existing = await this.getFieldById(fieldData.id);
        if (existing) throw new Error(`Поле с ID "${fieldData.id}" уже существует`);
        
        const newField = {
            label: fieldData.label.trim(),
            type: fieldData.type,
            isRequired: fieldData.isRequired === true,
            isActive: fieldData.isActive !== false,
            semantics: fieldData.semantics?.trim() || '',
            placeholder: fieldData.placeholder?.trim() || '',
            order: fieldData.order || 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: window.auth.currentUser?.uid || null
        };
        
        if (fieldData.type === 'radio' || fieldData.type === 'select') {
            newField.options = fieldData.options.map(opt => opt.trim());
        }
        
        await window.db.collection(this.collection).doc(fieldData.id).set(newField);
        this.clearCache();
        return { id: fieldData.id, ...newField };
    }

    // Обновить поле (с поддержкой переименования ID)
    async updateField(fieldId, updates, newId = null) {
        const currentField = await this.getFieldById(fieldId);
        if (!currentField) throw new Error(`Поле с ID "${fieldId}" не найдено`);
        
        // Если ID меняется
        if (newId && newId !== fieldId) {
            if (!this.validateFieldId(newId)) {
                throw new Error('Новый ID должен содержать только латиницу, цифры и _, начинаться с буквы');
            }
            const existing = await this.getFieldById(newId);
            if (existing) throw new Error(`Поле с ID "${newId}" уже существует`);
            
            // Создаем поле с новым ID
            const newField = { ...currentField, ...updates, id: newId };
            delete newField.id;
            await window.db.collection(this.collection).doc(newId).set(newField);
            
            // Удаляем старое поле
            await window.db.collection(this.collection).doc(fieldId).delete();
            
            // Мигрируем данные у слушателей
            await this.migrateFieldData(fieldId, newId);
            
            this.clearCache();
            return { success: true, migrated: true, oldId: fieldId, newId: newId };
        }
        
        // Обычное обновление
        const updateData = {
            ...(updates.label && { label: updates.label.trim() }),
            ...(updates.type && { type: updates.type }),
            ...(updates.isRequired !== undefined && { isRequired: updates.isRequired }),
            ...(updates.isActive !== undefined && { isActive: updates.isActive }),
            ...(updates.semantics !== undefined && { semantics: updates.semantics?.trim() || '' }),
            ...(updates.placeholder !== undefined && { placeholder: updates.placeholder?.trim() || '' }),
            ...(updates.order !== undefined && { order: updates.order }),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if ((updates.type === 'radio' || updates.type === 'select') && updates.options) {
            updateData.options = updates.options.map(opt => opt.trim());
        }
        
        await window.db.collection(this.collection).doc(fieldId).update(updateData);
        this.clearCache();
        return { success: true, migrated: false };
    }

    // Миграция данных при переименовании поля
    async migrateFieldData(oldId, newId) {
        console.log(`🔄 Миграция данных: ${oldId} -> ${newId}`);
        
        const studentsSnapshot = await window.db.collection('users')
            .where('role', '==', 'student')
            .get();
        
        const updatePromises = [];
        let count = 0;
        
        for (const doc of studentsSnapshot.docs) {
            const data = doc.data();
            if (data.customFields && data.customFields[oldId] !== undefined) {
                const value = data.customFields[oldId];
                const newCustomFields = { ...data.customFields };
                delete newCustomFields[oldId];
                newCustomFields[newId] = value;
                updatePromises.push(
                    window.db.collection('users').doc(doc.id).update({
                        customFields: newCustomFields,
                        customFieldsMigratedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                );
                count++;
            }
        }
        
        if (updatePromises.length) {
            await Promise.all(updatePromises);
            console.log(`✅ Перенесено ${count} записей`);
        }
        
        return count;
    }

    // Очистка значений поля
    async cleanupFieldValues(fieldId) {
        const studentsSnapshot = await window.db.collection('users')
            .where('role', '==', 'student')
            .get();
        
        const updatePromises = [];
        let cleanedCount = 0;
        
        for (const doc of studentsSnapshot.docs) {
            const data = doc.data();
            if (data.customFields && data.customFields[fieldId] !== undefined) {
                const newCustomFields = { ...data.customFields };
                delete newCustomFields[fieldId];
                updatePromises.push(
                    window.db.collection('users').doc(doc.id).update({
                        customFields: newCustomFields,
                        customFieldsCleanedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                );
                cleanedCount++;
            }
        }
        
        if (updatePromises.length) await Promise.all(updatePromises);
        return cleanedCount;
    }

    // Удаление поля
    async deleteField(fieldId) {
        const field = await this.getFieldById(fieldId);
        if (!field) throw new Error(`Поле с ID "${fieldId}" не найдено`);
        
        const cleanedCount = await this.cleanupFieldValues(fieldId);
        await window.db.collection(this.collection).doc(fieldId).delete();
        this.clearCache();
        
        return { success: true, cleanedCount, fieldName: field.label };
    }

    // Сохранение значений
    async saveFieldValues(userId, values) {
        const userRef = window.db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) throw new Error('Пользователь не найден');
        
        const currentCustom = userDoc.data().customFields || {};
        await userRef.update({
            customFields: { ...currentCustom, ...values },
            customFieldsUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    }

    // Получение значений
    async getFieldValues(userId) {
        const userDoc = await window.db.collection('users').doc(userId).get();
        return userDoc.exists ? (userDoc.data().customFields || {}) : {};
    }

    // Проверка обязательных полей
    async checkRequiredFields(userId) {
        const fields = await this.getActiveFields();
        const values = await this.getFieldValues(userId);
        const requiredFields = fields.filter(f => f.isRequired);
        const missingFields = requiredFields.filter(f => {
            const val = values[f.id];
            return !val || (typeof val === 'string' && val.trim() === '');
        });
        return { allFilled: missingFields.length === 0, missingFields };
    }
}

window.fieldsManager = new FieldsManager();
console.log('✅ fields-manager.js загружен (расширенная версия)');
