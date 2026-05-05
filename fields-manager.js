// fields-manager.js - управление динамическими полями

class FieldsManager {
    constructor() {
        this.collection = 'custom_fields';
        this.cache = null;
        this.cacheTime = null;
        this.cacheTTL = 60000;
        
        // ========== РАСШИРЕННЫЕ СИСТЕМНЫЕ ПОЛЯ ==========
        this.systemFields = [
            // === РАЗДЕЛ 1: ЛИЧНАЯ ИНФОРМАЦИЯ ===
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
                category: 'personal',
                section: 'personal'
            },
            {
                id: 'birthDate',
                label: 'Дата рождения',
                type: 'date',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/датаРождения',
                placeholder: 'Выберите дату рождения',
                order: 2,
                category: 'personal',
                section: 'personal'
            },
            {
                id: 'email',
                label: 'Email',
                type: 'email',
                isRequired: true,
                isActive: true,
                isSystem: true,
                isEditable: false,
                semantics: 'http://schemas.titul24.ru/simplex/email',
                placeholder: 'example@mail.ru',
                order: 3,
                category: 'personal',
                section: 'personal'
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
                order: 4,
                category: 'personal',
                section: 'personal'
            },
            {
                id: 'inn',
                label: 'ИНН',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/инн',
                placeholder: '12 цифр без пробелов',
                order: 5,
                category: 'personal',
                section: 'personal'
            },
            
            // === РАЗДЕЛ 2: ОБРАЗОВАНИЕ ===
            {
                id: 'educationLevel',
                label: 'Уровень образования',
                type: 'select',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/уровеньОбразования',
                placeholder: 'Выберите уровень образования',
                options: ['Высшее (ВО)', 'Среднее профессиональное (СПО)', 'Среднее общее', 'Основное общее'],
                order: 10,
                category: 'education',
                section: 'education'
            },
            {
                id: 'educationInstitution',
                label: 'Место обучения (наименование учреждения, организации, предприятия)',
                type: 'textarea',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/местоОбучения',
                placeholder: 'Полное наименование учебного заведения',
                order: 11,
                category: 'education',
                section: 'education'
            },
            {
                id: 'diplomaSeries',
                label: 'Диплом серия',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/дипломСерия',
                placeholder: 'АА',
                order: 12,
                category: 'education',
                section: 'education'
            },
            {
                id: 'diplomaNumber',
                label: 'Диплом номер',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/дипломНомер',
                placeholder: '123456',
                order: 13,
                category: 'education',
                section: 'education'
            },
            {
                id: 'diplomaIssueDate',
                label: 'Диплом когда выдан',
                type: 'date',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/дипломДатаВыдачи',
                placeholder: 'Дата выдачи диплома',
                order: 14,
                category: 'education',
                section: 'education'
            },
            {
                id: 'diplomaLastName',
                label: 'Фамилия, указанная в дипломе (если менялась)',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/фамилияВДипломе',
                placeholder: 'Фамилия, если отличается от текущей',
                order: 15,
                category: 'education',
                section: 'education'
            },
            
            // === РАЗДЕЛ 3: РАБОТА ===
            {
                id: 'workPlace',
                label: 'Место работы (название организации)',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/местоРаботы',
                placeholder: 'ООО "Ромашка"',
                order: 20,
                category: 'work',
                section: 'work'
            },
            {
                id: 'workAddress',
                label: 'Адрес организации',
                type: 'textarea',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/адресОрганизации',
                placeholder: 'Индекс, город, улица, дом',
                order: 21,
                category: 'work',
                section: 'work'
            },
            {
                id: 'position',
                label: 'Должность',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/должность',
                placeholder: 'Ведущий специалист',
                order: 22,
                category: 'work',
                section: 'work'
            },
            
            // === РАЗДЕЛ 4: ПАСПОРТНЫЕ ДАННЫЕ ===
            {
                id: 'passportSeries',
                label: 'Паспорт серия',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/паспортСерия',
                placeholder: '12 34',
                order: 30,
                category: 'documents',
                section: 'documents'
            },
            {
                id: 'passportNumber',
                label: 'Паспорт номер',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/паспортНомер',
                placeholder: '567890',
                order: 31,
                category: 'documents',
                section: 'documents'
            },
            {
                id: 'passportIssueDate',
                label: 'Паспорт когда выдан',
                type: 'date',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/паспортДатаВыдачи',
                placeholder: 'Дата выдачи паспорта',
                order: 32,
                category: 'documents',
                section: 'documents'
            },
            {
                id: 'passportIssuedBy',
                label: 'Паспорт кем выдан',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/паспортКемВыдан',
                placeholder: 'Отделом УФМС России',
                order: 33,
                category: 'documents',
                section: 'documents'
            },
            {
                id: 'passportDepartmentCode',
                label: 'Номер подразделения (паспорт)',
                type: 'text',
                isRequired: false,
                isActive: true,
                isSystem: true,
                isEditable: true,
                semantics: 'http://schemas.titul24.ru/simplex/паспортКодПодразделения',
                placeholder: '123-456',
                order: 34,
                category: 'documents',
                section: 'documents'
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
                placeholder: '123-456-789 00',
                order: 35,
                category: 'documents',
                section: 'documents'
            },
            
            // === РАЗДЕЛ 5: АДРЕСА ===
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
                order: 40,
                category: 'address',
                section: 'address'
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
                order: 41,
                category: 'address',
                section: 'address'
            }
        ];
        
        // Группировка разделов для отображения
        this.sections = {
            personal: { title: '👤 Личная информация', icon: '👤', order: 1 },
            education: { title: '🎓 Образование', icon: '🎓', order: 2 },
            work: { title: '💼 Место работы', icon: '💼', order: 3 },
            documents: { title: '📄 Паспортные данные', icon: '📄', order: 4 },
            address: { title: '🏠 Адреса', icon: '🏠', order: 5 },
            custom: { title: '📋 Дополнительные поля', icon: '📋', order: 6 }
        };
    }

    // Получить все системные поля
    getSystemFields() {
        return [...this.systemFields];
    }
    
    // Получить системные поля по разделу
    getSystemFieldsBySection(section) {
        return this.systemFields.filter(f => f.section === section);
    }
    
    // Получить все разделы
    getSections() {
        return this.sections;
    }
    
    // Получить активные системные поля по разделу
    async getActiveSystemFieldsBySection(section) {
        const allFields = await this.getAllFields();
        return allFields.filter(f => f.section === section && f.isActive !== false);
    }
    
    // Остальные методы остаются без изменений...
    // (getAllFields, getActiveFields, getFieldById и т.д.)
    
    clearCache() {
        this.cache = null;
        this.cacheTime = null;
    }

    async getAllFields(forceRefresh = false) {
        if (!forceRefresh && this.cache && this.cacheTime && (Date.now() - this.cacheTime) < this.cacheTTL) {
            console.log('📦 Использование кэша полей, полей:', this.cache.length);
            return this.cache;
        }
        
        try {
            const snapshot = await window.db.collection(this.collection).get();
            const customFields = [];
            snapshot.forEach(doc => {
                customFields.push({
                    id: doc.id,
                    ...doc.data(),
                    isSystem: false
                });
            });
            
            // Получаем настройки системных полей
            const settingsSnapshot = await window.db.collection('system_fields_settings').get();
            const settings = {};
            settingsSnapshot.forEach(doc => {
                settings[doc.id] = doc.data();
            });
            
            // Применяем настройки к системным полям
            const systemFieldsWithSettings = this.systemFields.map(field => {
                const fieldSettings = settings[field.id];
                if (fieldSettings) {
                    return {
                        ...field,
                        isActive: fieldSettings.isActive !== undefined ? fieldSettings.isActive : field.isActive,
                        isRequired: fieldSettings.isRequired !== undefined ? fieldSettings.isRequired : field.isRequired,
                        placeholder: fieldSettings.placeholder || field.placeholder,
                        order: fieldSettings.order || field.order,
                        options: fieldSettings.options || field.options
                    };
                }
                return field;
            });
            
            const allFields = [...systemFieldsWithSettings, ...customFields];
            allFields.sort((a, b) => (a.order || 999) - (b.order || 999));
            
            this.cache = allFields;
            this.cacheTime = Date.now();
            
            console.log(`✅ Загружено полей: ${allFields.length} (системных: ${systemFieldsWithSettings.length}, пользовательских: ${customFields.length})`);
            return allFields;
        } catch (error) {
            console.error('Ошибка загрузки полей:', error);
            if (this.cache) return this.cache;
            return this.systemFields;
        }
    }

    async getActiveFields(forceRefresh = false) {
        const allFields = await this.getAllFields(forceRefresh);
        return allFields.filter(field => field.isActive !== false);
    }

    async getFieldById(fieldId) {
        const systemField = this.systemFields.find(f => f.id === fieldId);
        if (systemField) {
            const settings = await this.getSystemFieldSettings(fieldId);
            return { ...systemField, ...settings, isSystem: true };
        }
        
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

    async getSystemFieldSettings(fieldId) {
        try {
            const doc = await window.db.collection('system_fields_settings').doc(fieldId).get();
            return doc.exists ? doc.data() : {};
        } catch (error) {
            console.error('Ошибка получения настроек поля:', error);
            return {};
        }
    }

    async updateSystemField(fieldId, updates) {
        const systemField = this.systemFields.find(f => f.id === fieldId);
        if (!systemField) {
            throw new Error(`Системное поле ${fieldId} не найдено`);
        }
        
        const allowedUpdates = ['isActive', 'isRequired', 'placeholder', 'order', 'options'];
        const filteredUpdates = {};
        
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }
        
        const settingsRef = window.db.collection('system_fields_settings').doc(fieldId);
        await settingsRef.set({
            ...filteredUpdates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: window.auth.currentUser?.uid || null
        }, { merge: true });
        
        this.clearCache();
        console.log(`✅ Системное поле "${fieldId}" обновлено`);
        return true;
    }

    async addField(fieldData) {
        if (this.systemFields.some(f => f.id === fieldData.id)) {
            throw new Error(`ID "${fieldData.id}" зарезервирован для системного поля`);
        }
        
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
            section: fieldData.section || 'custom',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: window.auth.currentUser?.uid || null,
            createdByEmail: window.auth.currentUser?.email || null
        };
        
        if (fieldData.type === 'radio' || fieldData.type === 'select') {
            if (!fieldData.options || fieldData.options.length === 0) {
                throw new Error('Для выбранного типа поля нужно добавить варианты ответов');
            }
            newField.options = fieldData.options.map(opt => opt.trim());
        }
        
        await window.db.collection(this.collection).doc(fieldData.id).set(newField);
        this.clearCache();
        
        console.log(`✅ Пользовательское поле "${fieldData.label}" создано`);
        return { id: fieldData.id, ...newField, isSystem: false };
    }

    async updateField(fieldId, updates) {
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
        
        const allowedUpdates = ['label', 'type', 'isRequired', 'isActive', 'semantics', 'placeholder', 'order', 'category', 'section', 'options'];
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                updateData[key] = updates[key];
            }
        }
        
        await window.db.collection(this.collection).doc(fieldId).update(updateData);
        this.clearCache();
        
        console.log(`✅ Пользовательское поле "${fieldId}" обновлено`);
        return true;
    }

    async deleteField(fieldId, options = {}) {
        const { skipCleanup = false } = options;
        
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
    }

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
            return 0;
        }
    }

    async saveFieldValues(userId, values) {
        try {
            if (!userId) throw new Error('ID пользователя обязателен');
            
            const allFields = await this.getActiveFields();
            const requiredFields = allFields.filter(f => f.isRequired);
            
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
            
            if (Object.keys(systemUpdates).length > 0) {
                await userRef.update(systemUpdates);
            }
            
            if (Object.keys(customUpdates).length > 0) {
                const userDoc = await userRef.get();
                const currentCustomFields = userDoc.data()?.customFields || {};
                await userRef.update({
                    customFields: { ...currentCustomFields, ...customUpdates },
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

    async getFieldValues(userId) {
        try {
            if (!userId) return {};
            
            const userDoc = await window.db.collection('users').doc(userId).get();
            if (!userDoc.exists) return {};
            
            const userData = userDoc.data();
            const values = {};
            
            for (const field of this.systemFields) {
                values[field.id] = userData[field.id] || '';
            }
            
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
            return { allFilled: false, missingFields: [], totalRequired: 0, filledRequired: 0, error: error.message };
        }
    }
}

window.fieldsManager = new FieldsManager();
console.log('✅ fields-manager.js загружен');
console.log('📋 Системные поля по разделам:');
for (const [key, section] of Object.entries(window.fieldsManager.sections)) {
    const fields = window.fieldsManager.getSystemFieldsBySection(key);
    console.log(`   ${section.title}: ${fields.length} полей`);
}
