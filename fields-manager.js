// fields-manager.js - управление динамическими полями

class FieldsManager {
    constructor() {
        this.collection = 'custom_fields';
        this.cache = null;
        this.cacheTime = null;
        this.cacheTTL = 60000; // 60 секунд кэширования
        
        // Предустановленные (системные) поля с семантикой
        this.systemFields = [
            {
                id: 'fullName',
                label: 'ФИО',
                type: 'text',
                isRequired: true,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/фио',
                placeholder: 'Иванов Иван Иванович',
                order: 1,
                category: 'personal'
            },
            {
                id: 'email',
                label: 'Email',
                type: 'email',
                isRequired: true,
                isActive: true,
                isSystem: true,
                isEditable: false, // Email нельзя редактировать через форму
                semantics: 'http://schemas.titul24.ru/simplex/email',
                placeholder: 'example@mail.ru',
                order: 2,
                category: 'personal'
            },
            {
                id: 'phone',
                label: 'Телефон',
                type: 'tel',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/телефон',
                placeholder: '+7 (XXX) XXX-XX-XX',
                order: 3,
                category: 'personal'
            },
            {
                id: 'education',
                label: 'Образование',
                type: 'select',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/образование',
                placeholder: 'Выберите уровень образования',
                options: ['высшее', 'среднее-специальное', 'среднее'],
                order: 4,
                category: 'personal'
            },
            {
                id: 'actualAddress',
                label: 'Фактический адрес',
                type: 'textarea',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/фактическийАдрес',
                placeholder: 'Индекс, город, улица, дом, квартира',
                order: 5,
                category: 'address'
            },
            {
                id: 'registrationAddress',
                label: 'Адрес прописки',
                type: 'textarea',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/адресПрописки',
                placeholder: 'Индекс, город, улица, дом, квартира',
                order: 6,
                category: 'address'
            },
            {
                id: 'passportNumber',
                label: 'Номер паспорта',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/паспортНомер',
                placeholder: 'XXXX XXXXXX',
                order: 7,
                category: 'documents'
            },
            {
                id: 'passportIssuedBy',
                label: 'Кем выдан паспорт',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/паспортКемВыдан',
                placeholder: 'Название органа, выдавшего паспорт',
                order: 8,
                category: 'documents'
            },
            {
                id: 'passportIssueDate',
                label: 'Когда выдан паспорт',
                type: 'date',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/паспортДатаВыдачи',
                placeholder: 'Дата выдачи паспорта',
                order: 9,
                category: 'documents'
            },
            {
                id: 'snils',
                label: 'СНИЛС',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/снилс',
                placeholder: 'XXX-XXX-XXX XX',
                order: 10,
                category: 'documents'
            }
        ];
    }

    // Очистка кэша
    clearCache() {
        this.cache = null;
        this.cacheTime = null;
    }

    // Получить все поля (системные + пользовательские)
    async getAllFields(forceRefresh = false) {
        // Проверяем кэш
        if (!forceRefresh && this.cache && this.cacheTime && (Date.now() - this.cacheTime) < this.cacheTTL) {
            console.log('📦 Использование кэша полей, полей:', this.cache.length);
            return this.cache;
        }
        
        try {
            // Получаем пользовательские поля из Firestore
            const snapshot = await window.db.collection(this.collection).get();
            const customFields = [];
            snapshot.forEach(doc => {
                customFields.push({
                    id: doc.id,
                    ...doc.data(),
                    isSystem: false
                });
            });
            
            // Объединяем системные и пользовательские поля
            const allFields = [...this.systemFields, ...customFields];
            
            // Сортируем по порядку
            allFields.sort((a, b) => (a.order || 999) - (b.order || 999));
            
            // Сохраняем в кэш
            this.cache = allFields;
            this.cacheTime = Date.now();
            
            console.log('✅ Загружено полей:', allFields.length, '(системных:', this.systemFields.length, ', пользовательских:', customFields.length, ')');
            return allFields;
        } catch (error) {
            console.error('Ошибка загрузки полей:', error);
            if (this.cache) {
                console.log('⚠️ Возврат устаревшего кэша');
                return this.cache;
            }
            return this.systemFields; // Возвращаем хотя бы системные поля
        }
    }

    // Получить активные поля
    async getActiveFields(forceRefresh = false) {
        const allFields = await this.getAllFields(forceRefresh);
        const activeFields = allFields.filter(field => field.isActive !== false);
        console.log(`✅ Активных полей: ${activeFields.length} из ${allFields.length}`);
        return activeFields;
    }

    // Получить поля по категории
    async getFieldsByCategory(category, forceRefresh = false) {
        const allFields = await this.getAllFields(forceRefresh);
        return allFields.filter(field => field.category === category);
    }

    // Получить системные поля
    getSystemFields() {
        return [...this.systemFields];
    }

    // Получить пользовательские поля
    async getCustomFields(forceRefresh = false) {
        const allFields = await this.getAllFields(forceRefresh);
        return allFields.filter(field => !field.isSystem);
    }

    // Получить поле по ID (включая системные)
    async getFieldById(fieldId) {
        // Сначала ищем среди системных
        const systemField = this.systemFields.find(f => f.id === fieldId);
        if (systemField) {
            return { ...systemField, isSystem: true };
        }
        
        // Затем в Firestore
        try {
            const doc = await window.db.collection(this.collection).doc(fieldId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data(), isSystem: false };
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения поля:', error);
            return null;
        }
    }

    // Обновить системное поле (только отдельные свойства)
    async updateSystemField(fieldId, updates) {
        const systemField = this.systemFields.find(f => f.id === fieldId);
        if (!systemField) {
            throw new Error(`Системное поле ${fieldId} не найдено`);
        }
        
        // Разрешенные для обновления свойства системных полей
        const allowedUpdates = ['isActive', 'isRequired', 'placeholder', 'order'];
        const filteredUpdates = {};
        
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }
        
        // Сохраняем настройки системного поля в отдельной коллекции
        const settingsRef = window.db.collection('system_fields_settings').doc(fieldId);
        await settingsRef.set({
            ...filteredUpdates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: window.auth.currentUser?.uid || null
        }, { merge: true });
        
        // Обновляем локальный кэш
        const index = this.systemFields.findIndex(f => f.id === fieldId);
        if (index !== -1) {
            this.systemFields[index] = { ...this.systemFields[index], ...filteredUpdates };
        }
        this.clearCache();
        
        console.log(`✅ Системное поле "${fieldId}" обновлено`);
        return true;
    }

    // Получить настройки системного поля
    async getSystemFieldSettings(fieldId) {
        try {
            const doc = await window.db.collection('system_fields_settings').doc(fieldId).get();
            if (doc.exists) {
                return doc.data();
            }
            return {};
        } catch (error) {
            console.error('Ошибка получения настроек поля:', error);
            return {};
        }
    }

    // Добавить пользовательское поле
    async addField(fieldData) {
        try {
            // Проверяем, нет ли поля с таким ID среди системных
            if (this.systemFields.some(f => f.id === fieldData.id)) {
                throw new Error(`ID "${fieldData.id}" зарезервирован для системного поля`);
            }
            
            // Проверяем существование
            const existingField = await this.getFieldById(fieldData.id);
            if (existingField) {
                throw new Error(`Поле с ID "${fieldData.id}" уже существует`);
            }
            
            const newField = {
                label: fieldData.label.trim(),
                type: fieldData.type,
                isRequired: fieldData.isRequired === true,
                isActive: fieldData.isActive !== false,
                semantics: fieldData.semantics?.trim() || '',
                placeholder: fieldData.placeholder?.trim() || '',
                order: fieldData.order || 0,
                category: fieldData.category || 'custom',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: window.auth.currentUser?.uid || null,
                createdByEmail: window.auth.currentUser?.email || null
            };
            
            // Добавляем опции для radio/select
            if (fieldData.type === 'radio' || fieldData.type === 'select') {
                if (!fieldData.options || fieldData.options.length === 0) {
                    throw new Error('Для выбранного типа поля нужно добавить варианты ответов');
                }
                newField.options = fieldData.options.map(opt => opt.trim());
            }
            
            await window.db.collection(this.collection).doc(fieldData.id).set(newField);
            
            // Очищаем кэш
            this.clearCache();
            
            console.log(`✅ Пользовательское поле "${fieldData.label}" создано`);
            return { id: fieldData.id, ...newField, isSystem: false };
            
        } catch (error) {
            console.error('Ошибка добавления поля:', error);
            throw error;
        }
    }

    // Обновить пользовательское поле
    async updateField(fieldId, updates) {
        try {
            const currentField = await this.getFieldById(fieldId);
            if (!currentField) {
                throw new Error(`Поле с ID "${fieldId}" не найдено`);
            }
            
            if (currentField.isSystem) {
                return await this.updateSystemField(fieldId, updates);
            }
            
            const updateData = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: window.auth.currentUser?.uid || null,
                updatedByEmail: window.auth.currentUser?.email || null
            };
            
            const allowedUpdates = ['label', 'type', 'isRequired', 'isActive', 'semantics', 'placeholder', 'order', 'category', 'options'];
            for (const key of allowedUpdates) {
                if (updates[key] !== undefined) {
                    updateData[key] = updates[key];
                }
            }
            
            await window.db.collection(this.collection).doc(fieldId).update(updateData);
            this.clearCache();
            
            console.log(`✅ Пользовательское поле "${fieldId}" обновлено`);
            return true;
            
        } catch (error) {
            console.error('Ошибка обновления поля:', error);
            throw error;
        }
    }

    // Удалить пользовательское поле
    async deleteField(fieldId, options = {}) {
        const { skipCleanup = false } = options;
        
        try {
            const field = await this.getFieldById(fieldId);
            if (!field) {
                throw new Error(`Поле с ID "${fieldId}" не найдено`);
            }
            
            if (field.isSystem) {
                throw new Error(`Системное поле "${field.label}" нельзя удалить, можно только отключить`);
            }
            
            let cleanedCount = 0;
            
            if (!skipCleanup) {
                cleanedCount = await this.cleanupFieldValues(fieldId);
            }
            
            await window.db.collection(this.collection).doc(fieldId).delete();
            this.clearCache();
            
            console.log(`✅ Пользовательское поле "${field.label}" удалено. Очищено записей: ${cleanedCount}`);
            return { success: true, cleanedCount, fieldName: field.label };
            
        } catch (error) {
            console.error('Ошибка удаления поля:', error);
            throw error;
        }
    }

    // Очистить значения поля у всех пользователей
    async cleanupFieldValues(fieldId) {
        try {
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
            }
            
            return cleanedCount;
            
        } catch (error) {
            console.error('Ошибка очистки значений поля:', error);
            throw error;
        }
    }

    // Сохранить значения полей для слушателя (включая системные)
    async saveFieldValues(userId, values) {
        try {
            if (!userId) {
                throw new Error('ID пользователя обязателен');
            }
            
            const allFields = await this.getActiveFields();
            const requiredFields = allFields.filter(f => f.isRequired);
            
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
            
            // Разделяем системные поля и пользовательские
            const systemFieldsIds = this.systemFields.map(f => f.id);
            const systemUpdates = {};
            const customUpdates = {};
            
            for (const [key, value] of Object.entries(values)) {
                if (systemFieldsIds.includes(key)) {
                    systemUpdates[key] = value;
                } else {
                    customUpdates[key] = value;
                }
            }
            
            const userRef = window.db.collection('users').doc(userId);
            
            // Обновляем системные поля напрямую в документе
            if (Object.keys(systemUpdates).length > 0) {
                await userRef.update(systemUpdates);
            }
            
            // Обновляем пользовательские поля в customFields
            if (Object.keys(customUpdates).length > 0) {
                const userDoc = await userRef.get();
                const currentCustomFields = userDoc.data()?.customFields || {};
                const updatedCustomFields = { ...currentCustomFields, ...customUpdates };
                
                await userRef.update({
                    customFields: updatedCustomFields,
                    customFieldsUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
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
            if (!userDoc.exists) {
                return {};
            }
            
            const userData = userDoc.data();
            const values = {};
            
            // Получаем значения системных полей
            for (const field of this.systemFields) {
                values[field.id] = userData[field.id] || '';
            }
            
            // Получаем значения пользовательских полей
            const customFields = userData.customFields || {};
            for (const [key, value] of Object.entries(customFields)) {
                values[key] = value;
            }
            
            return values;
            
        } catch (error) {
            console.error('Ошибка получения значений полей:', error);
            return {};
        }
    }

    // Проверить заполнение обязательных полей
    async checkRequiredFields(userId) {
        try {
            const allFields = await this.getActiveFields();
            const values = await this.getFieldValues(userId);
            
            const requiredFields = allFields.filter(f => f.isRequired);
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

    // Сбросить кэш системных полей (при обновлении из админки)
    async refreshSystemFields() {
        // Загружаем настройки системных полей из Firestore
        try {
            const snapshot = await window.db.collection('system_fields_settings').get();
            const settings = {};
            snapshot.forEach(doc => {
                settings[doc.id] = doc.data();
            });
            
            // Применяем настройки к системным полям
            for (const field of this.systemFields) {
                const fieldSettings = settings[field.id];
                if (fieldSettings) {
                    if (fieldSettings.isActive !== undefined) field.isActive = fieldSettings.isActive;
                    if (fieldSettings.isRequired !== undefined) field.isRequired = fieldSettings.isRequired;
                    if (fieldSettings.placeholder !== undefined) field.placeholder = fieldSettings.placeholder;
                    if (fieldSettings.order !== undefined) field.order = fieldSettings.order;
                }
            }
            
            this.clearCache();
            console.log('✅ Системные поля обновлены из настроек');
        } catch (error) {
            console.error('Ошибка обновления системных полей:', error);
        }
    }
}

// Создаем глобальный экземпляр
window.fieldsManager = new FieldsManager();

// Инициализация
window.fieldsManager.refreshSystemFields();

console.log('✅ fields-manager.js загружен');
console.log('📋 Системные поля:', window.fieldsManager.systemFields.map(f => `${f.id} (${f.label})`).join(', '));
