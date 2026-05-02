// fields-manager.js - управление динамическими полями

class FieldsManager {
    constructor() {
        this.collection = 'custom_fields';
        this.cache = null;
        this.cacheTime = null;
        this.cacheTTL = 60000; // 60 секунд кэширования
    }

    // Очистка кэша
    clearCache() {
        this.cache = null;
        this.cacheTime = null;
    }

    // Получить все поля (с кэшированием)
    async getAllFields(forceRefresh = false) {
        // Проверяем кэш
        if (!forceRefresh && this.cache && this.cacheTime && (Date.now() - this.cacheTime) < this.cacheTTL) {
            console.log('📦 Использование кэша полей, полей:', this.cache.length);
            return this.cache;
        }
        
        try {
            const snapshot = await window.db.collection(this.collection).get();
            const fields = [];
            snapshot.forEach(doc => {
                fields.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Сортируем по порядку
            fields.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            // Сохраняем в кэш
            this.cache = fields;
            this.cacheTime = Date.now();
            
            console.log('✅ Загружено полей:', fields.length);
            return fields;
        } catch (error) {
            console.error('Ошибка загрузки полей:', error);
            // Возвращаем кэш если есть, даже если он устарел
            if (this.cache) {
                console.log('⚠️ Возврат устаревшего кэша из-за ошибки');
                return this.cache;
            }
            return [];
        }
    }

    // Получить активные поля
    async getActiveFields(forceRefresh = false) {
        const allFields = await this.getAllFields(forceRefresh);
        const activeFields = allFields.filter(field => field.isActive !== false);
        console.log(`✅ Активных полей: ${activeFields.length} из ${allFields.length}`);
        return activeFields;
    }

    // Получить поле по ID
    async getFieldById(fieldId) {
        try {
            const doc = await window.db.collection(this.collection).doc(fieldId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения поля:', error);
            return null;
        }
    }

    // Валидация данных поля
    validateFieldData(fieldData, isNew = true) {
        const errors = [];
        
        // Проверка ID для нового поля
        if (isNew) {
            if (!fieldData.id || typeof fieldData.id !== 'string') {
                errors.push('ID поля обязателен');
            } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldData.id)) {
                errors.push('ID поля должен содержать только латиницу, цифры и underscores, начинаться с буквы или "_"');
            } else if (fieldData.id.length < 2 || fieldData.id.length > 50) {
                errors.push('ID поля должен быть от 2 до 50 символов');
            }
        }
        
        // Проверка названия
        if (!fieldData.label || typeof fieldData.label !== 'string' || fieldData.label.trim() === '') {
            errors.push('Название поля обязательно');
        } else if (fieldData.label.length < 2 || fieldData.label.length > 100) {
            errors.push('Название поля должно быть от 2 до 100 символов');
        }
        
        // Проверка типа
        const validTypes = ['text', 'textarea', 'email', 'tel', 'date', 'number', 'radio', 'select'];
        if (!fieldData.type || !validTypes.includes(fieldData.type)) {
            errors.push(`Некорректный тип поля. Допустимые типы: ${validTypes.join(', ')}`);
        }
        
        // Проверка опций для radio и select
        if ((fieldData.type === 'radio' || fieldData.type === 'select')) {
            if (!fieldData.options || !Array.isArray(fieldData.options) || fieldData.options.length === 0) {
                errors.push('Для полей типа "Радиокнопка" и "Выпадающий список" нужно указать хотя бы один вариант');
            } else if (fieldData.options.length > 50) {
                errors.push('Не более 50 вариантов для выбора');
            } else {
                // Проверка дубликатов
                const uniqueOptions = new Set(fieldData.options);
                if (uniqueOptions.size !== fieldData.options.length) {
                    errors.push('Варианты ответов не должны повторяться');
                }
                // Проверка пустых вариантов
                if (fieldData.options.some(opt => !opt || opt.trim() === '')) {
                    errors.push('Варианты ответов не могут быть пустыми');
                }
            }
        }
        
        // Проверка URL семантики
        if (fieldData.semantics && typeof fieldData.semantics === 'string') {
            const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
            if (fieldData.semantics.trim() !== '' && !urlPattern.test(fieldData.semantics)) {
                errors.push('Семантика должна быть корректным URL');
            }
        }
        
        // Проверка порядка
        if (fieldData.order !== undefined && (typeof fieldData.order !== 'number' || fieldData.order < 0)) {
            errors.push('Порядок отображения должен быть неотрицательным числом');
        }
        
        return { isValid: errors.length === 0, errors };
    }

    // Добавить поле
    async addField(fieldData) {
        try {
            // Валидация
            const validation = this.validateFieldData(fieldData, true);
            if (!validation.isValid) {
                throw new Error(`Ошибка валидации: ${validation.errors.join(', ')}`);
            }
            
            // Проверяем существование поля
            const existingField = await this.getFieldById(fieldData.id);
            if (existingField) {
                throw new Error(`Поле с ID "${fieldData.id}" уже существует`);
            }
            
            // Получаем текущие поля для определения порядка
            const fields = await this.getAllFields(true);
            const newOrder = fieldData.order !== undefined ? fieldData.order : fields.length;
            
            const newField = {
                label: fieldData.label.trim(),
                type: fieldData.type,
                isRequired: fieldData.isRequired === true,
                isActive: fieldData.isActive !== false,
                semantics: fieldData.semantics?.trim() || '',
                placeholder: fieldData.placeholder?.trim() || '',
                order: newOrder,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: window.auth.currentUser?.uid || null,
                createdByEmail: window.auth.currentUser?.email || null
            };
            
            // Добавляем опции для radio/select
            if (fieldData.type === 'radio' || fieldData.type === 'select') {
                newField.options = fieldData.options.map(opt => opt.trim());
            }
            
            await window.db.collection(this.collection).doc(fieldData.id).set(newField);
            
            // Очищаем кэш
            this.clearCache();
            
            console.log(`✅ Поле "${fieldData.label}" создано`);
            return { id: fieldData.id, ...newField };
            
        } catch (error) {
            console.error('Ошибка добавления поля:', error);
            throw error;
        }
    }

    // Обновить поле
    async updateField(fieldId, updates) {
        try {
            // Получаем текущее поле
            const currentField = await this.getFieldById(fieldId);
            if (!currentField) {
                throw new Error(`Поле с ID "${fieldId}" не найдено`);
            }
            
            // Подготавливаем обновления
            const updateData = {};
            
            if (updates.label !== undefined) {
                updateData.label = updates.label.trim();
            }
            
            if (updates.type !== undefined) {
                const validTypes = ['text', 'textarea', 'email', 'tel', 'date', 'number', 'radio', 'select'];
                if (!validTypes.includes(updates.type)) {
                    throw new Error(`Некорректный тип поля: ${updates.type}`);
                }
                updateData.type = updates.type;
            }
            
            if (updates.isRequired !== undefined) {
                updateData.isRequired = updates.isRequired === true;
            }
            
            if (updates.isActive !== undefined) {
                updateData.isActive = updates.isActive !== false;
            }
            
            if (updates.semantics !== undefined) {
                updateData.semantics = updates.semantics?.trim() || '';
            }
            
            if (updates.placeholder !== undefined) {
                updateData.placeholder = updates.placeholder?.trim() || '';
            }
            
            if (updates.order !== undefined) {
                if (typeof updates.order !== 'number' || updates.order < 0) {
                    throw new Error('Порядок отображения должен быть неотрицательным числом');
                }
                updateData.order = updates.order;
            }
            
            // Обновляем опции для radio/select
            if (updates.options !== undefined) {
                if (currentField.type === 'radio' || currentField.type === 'select') {
                    if (!Array.isArray(updates.options) || updates.options.length === 0) {
                        throw new Error('Для полей типа "Радиокнопка" и "Выпадающий список" нужно указать хотя бы один вариант');
                    }
                    if (updates.options.length > 50) {
                        throw new Error('Не более 50 вариантов для выбора');
                    }
                    // Проверка дубликатов
                    const uniqueOptions = new Set(updates.options);
                    if (uniqueOptions.size !== updates.options.length) {
                        throw new Error('Варианты ответов не должны повторяться');
                    }
                    updateData.options = updates.options.map(opt => opt.trim());
                }
            }
            
            // Валидация обновленных данных
            const testField = { ...currentField, ...updateData };
            const validation = this.validateFieldData(testField, false);
            if (!validation.isValid) {
                throw new Error(`Ошибка валидации: ${validation.errors.join(', ')}`);
            }
            
            updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            updateData.updatedBy = window.auth.currentUser?.uid || null;
            updateData.updatedByEmail = window.auth.currentUser?.email || null;
            
            await window.db.collection(this.collection).doc(fieldId).update(updateData);
            
            // Очищаем кэш
            this.clearCache();
            
            console.log(`✅ Поле "${fieldId}" обновлено`);
            return true;
            
        } catch (error) {
            console.error('Ошибка обновления поля:', error);
            throw error;
        }
    }

    // Принудительно удалить значения поля у всех пользователей
    async cleanupFieldValues(fieldId) {
        try {
            console.log(`🧹 Очистка значений поля ${fieldId} у всех пользователей...`);
            
            // Получаем всех пользователей с ролью student
            const studentsSnapshot = await window.db.collection('users')
                .where('role', '==', 'student')
                .get();
            
            let cleanedCount = 0;
            const updatePromises = [];
            
            for (const doc of studentsSnapshot.docs) {
                const userData = doc.data();
                if (userData.customFields && userData.customFields[fieldId] !== undefined) {
                    const updatedCustomFields = { ...userData.customFields };
                    delete updatedCustomFields[fieldId];
                    updatePromises.push(
                        window.db.collection('users').doc(doc.id).update({
                            customFields: updatedCustomFields,
                            customFieldsCleanedAt: firebase.firestore.FieldValue.serverTimestamp()
                        })
                    );
                    cleanedCount++;
                }
            }
            
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                console.log(`✅ Очищено ${cleanedCount} записей для поля ${fieldId}`);
            } else {
                console.log(`ℹ️ Нет записей для очистки поля ${fieldId}`);
            }
            
            return cleanedCount;
            
        } catch (error) {
            console.error('Ошибка очистки значений поля:', error);
            throw error;
        }
    }

    // Удалить поле и все его значения у слушателей
    async deleteField(fieldId, options = {}) {
        const { skipCleanup = false } = options;
        
        try {
            console.log('🗑️ Удаление поля:', fieldId);
            
            // Получаем информацию о поле перед удалением
            const field = await this.getFieldById(fieldId);
            if (!field) {
                throw new Error(`Поле с ID "${fieldId}" не найдено`);
            }
            
            let cleanedCount = 0;
            
            // 1. Очищаем значения поля у всех слушателей (если не пропущено)
            if (!skipCleanup) {
                cleanedCount = await this.cleanupFieldValues(fieldId);
            }
            
            // 2. Удаляем само поле
            await window.db.collection(this.collection).doc(fieldId).delete();
            
            // Очищаем кэш
            this.clearCache();
            
            console.log(`✅ Поле "${field.label}" полностью удалено. Очищено записей: ${cleanedCount}`);
            
            return { 
                success: true, 
                cleanedCount,
                fieldName: field.label 
            };
            
        } catch (error) {
            console.error('Ошибка удаления поля:', error);
            throw error;
        }
    }

    // Сохранить значения полей для слушателя
    async saveFieldValues(userId, values) {
        try {
            if (!userId) {
                throw new Error('ID пользователя обязателен');
            }
            
            // Получаем активные поля для валидации
            const activeFields = await this.getActiveFields();
            const requiredFields = activeFields.filter(f => f.isRequired);
            
            // Проверяем обязательные поля
            const missingFields = [];
            for (const field of requiredFields) {
                const value = values[field.id];
                if (!value || (typeof value === 'string' && value.trim() === '')) {
                    missingFields.push(field.label);
                }
            }
            
            if (missingFields.length > 0) {
                throw new Error(`Заполните обязательные поля: ${missingFields.join(', ')}`);
            }
            
            // Очищаем значения для полей, которые больше не существуют
            const existingFieldIds = new Set(activeFields.map(f => f.id));
            const cleanedValues = {};
            
            for (const [key, value] of Object.entries(values)) {
                if (existingFieldIds.has(key)) {
                    // Очищаем значения от лишних пробелов
                    if (typeof value === 'string') {
                        cleanedValues[key] = value.trim();
                    } else {
                        cleanedValues[key] = value;
                    }
                } else {
                    console.log(`ℹ️ Пропуск несуществующего поля: ${key}`);
                }
            }
            
            const userRef = window.db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                throw new Error('Пользователь не найден');
            }
            
            const currentData = userDoc.data();
            const customFields = currentData.customFields || {};
            const updatedFields = { ...customFields, ...cleanedValues };
            
            await userRef.update({
                customFields: updatedFields,
                customFieldsUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Значения полей сохранены');
            return true;
            
        } catch (error) {
            console.error('Ошибка сохранения полей:', error);
            throw error;
        }
    }

    // Получить значения полей для слушателя
    async getFieldValues(userId) {
        try {
            if (!userId) {
                return {};
            }
            
            const userDoc = await window.db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const customFields = userDoc.data().customFields || {};
                
                // Очищаем значения для уже несуществующих полей
                const activeFields = await this.getActiveFields();
                const existingFieldIds = new Set(activeFields.map(f => f.id));
                const cleanedFields = {};
                
                let hasOrphaned = false;
                for (const [key, value] of Object.entries(customFields)) {
                    if (existingFieldIds.has(key)) {
                        cleanedFields[key] = value;
                    } else {
                        hasOrphaned = true;
                        console.log(`🧹 Обнаружено устаревшее поле: ${key}`);
                    }
                }
                
                // Если есть устаревшие поля, обновляем документ
                if (hasOrphaned && Object.keys(cleanedFields).length !== Object.keys(customFields).length) {
                    await userDoc.ref.update({
                        customFields: cleanedFields,
                        customFieldsCleanedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('✅ Устаревшие поля очищены автоматически');
                }
                
                return cleanedFields;
            }
            return {};
        } catch (error) {
            console.error('Ошибка получения значений полей:', error);
            return {};
        }
    }

    // Проверить заполнение обязательных полей
    async checkRequiredFields(userId) {
        try {
            const fields = await this.getActiveFields();
            const values = await this.getFieldValues(userId);
            
            const requiredFields = fields.filter(f => f.isRequired);
            const missingFields = requiredFields.filter(f => {
                const value = values[f.id];
                return !value || (typeof value === 'string' && value.trim() === '');
            });
            
            return {
                allFilled: missingFields.length === 0,
                missingFields: missingFields,
                totalRequired: requiredFields.length,
                filledRequired: requiredFields.length - missingFields.length
            };
        } catch (error) {
            console.error('Ошибка проверки обязательных полей:', error);
            return {
                allFilled: false,
                missingFields: [],
                totalRequired: 0,
                filledRequired: 0,
                error: error.message
            };
        }
    }

    // Получить статистику по полю (сколько слушателей заполнили)
    async getFieldStatistics(fieldId) {
        try {
            const studentsSnapshot = await window.db.collection('users')
                .where('role', '==', 'student')
                .get();
            
            let filledCount = 0;
            let totalCount = studentsSnapshot.size;
            
            for (const doc of studentsSnapshot.docs) {
                const data = doc.data();
                if (data.customFields && data.customFields[fieldId]) {
                    const value = data.customFields[fieldId];
                    if (value && (typeof value !== 'string' || value.trim() !== '')) {
                        filledCount++;
                    }
                }
            }
            
            return {
                total: totalCount,
                filled: filledCount,
                empty: totalCount - filledCount,
                percentage: totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0
            };
        } catch (error) {
            console.error('Ошибка получения статистики поля:', error);
            return null;
        }
    }

    // Пересчитать порядок полей
    async reorderFields(fieldIds) {
        try {
            const updates = [];
            for (let i = 0; i < fieldIds.length; i++) {
                updates.push(
                    window.db.collection(this.collection).doc(fieldIds[i]).update({
                        order: i,
                        reorderedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                );
            }
            await Promise.all(updates);
            this.clearCache();
            console.log('✅ Порядок полей обновлен');
            return true;
        } catch (error) {
            console.error('Ошибка переупорядочивания полей:', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр
window.fieldsManager = new FieldsManager();

// Вспомогательная функция для отладки (вызывать из консоли)
window.debugFields = {
    // Показать все поля
    async showAllFields() {
        const fields = await window.fieldsManager.getAllFields(true);
        console.table(fields.map(f => ({
            ID: f.id,
            Название: f.label,
            Тип: f.type,
            Обязательное: f.isRequired ? '✅' : '❌',
            Активно: f.isActive !== false ? '✅' : '❌',
            Порядок: f.order
        })));
        return fields;
    },
    
    // Показать значения полей пользователя
    async showUserFields(userId = null) {
        const uid = userId || window.auth.currentUser?.uid;
        if (!uid) {
            console.log('❌ Пользователь не авторизован');
            return;
        }
        const values = await window.fieldsManager.getFieldValues(uid);
        console.table(values);
        return values;
    },
    
    // Очистить все устаревшие поля у всех пользователей
    async cleanupAllOrphanedFields() {
        console.log('🔍 Поиск устаревших полей...');
        
        const fields = await window.fieldsManager.getAllFields(true);
        const existingFieldIds = new Set(fields.map(f => f.id));
        
        const studentsSnapshot = await window.db.collection('users')
            .where('role', '==', 'student')
            .get();
        
        let totalCleaned = 0;
        let usersWithIssues = 0;
        
        for (const doc of studentsSnapshot.docs) {
            const data = doc.data();
            if (data.customFields) {
                let needsUpdate = false;
                const cleanedFields = { ...data.customFields };
                
                for (const fieldId in data.customFields) {
                    if (!existingFieldIds.has(fieldId)) {
                        delete cleanedFields[fieldId];
                        needsUpdate = true;
                        totalCleaned++;
                    }
                }
                
                if (needsUpdate) {
                    await doc.ref.update({
                        customFields: cleanedFields,
                        customFieldsCleanedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    usersWithIssues++;
                }
            }
        }
        
        console.log(`✅ Очистка завершена!`);
        console.log(`   - Удалено устаревших записей: ${totalCleaned}`);
        console.log(`   - Обработано пользователей: ${usersWithIssues}`);
        
        return { totalCleaned, usersWithIssues };
    },
    
    // Показать статистику по полю
    async showFieldStats(fieldId) {
        const stats = await window.fieldsManager.getFieldStatistics(fieldId);
        if (stats) {
            console.table([{
                'Всего слушателей': stats.total,
                'Заполнили': stats.filled,
                'Не заполнили': stats.empty,
                'Заполненность': `${stats.percentage}%`
            }]);
        }
        return stats;
    }
};

console.log('✅ fields-manager.js загружен');
console.log('💡 Для отладки доступны функции: window.debugFields.showAllFields(), window.debugFields.cleanupAllOrphanedFields()');
