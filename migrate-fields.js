// migrate-fields.js - выполнить в консоли браузера один раз

async function migrateFieldsToDynamic() {
    console.log('🚀 Начинаем миграцию полей...');
    
    // Старые поля, которые нужно перенести
    const oldFields = [
        { id: 'fullName', label: 'ФИО', type: 'text', category: 'personal', tabName: 'Личные данные', tabOrder: 1, fieldOrder: 1, isRequired: true, isActive: true, readOnly: false, semantics: 'http://schema.org/name', placeholder: 'Иванов Иван Иванович' },
        { id: 'email', label: 'Email', type: 'email', category: 'personal', tabName: 'Личные данные', tabOrder: 1, fieldOrder: 2, isRequired: true, isActive: true, readOnly: true, semantics: 'http://schema.org/email', placeholder: 'example@mail.ru' },
        { id: 'phone', label: 'Телефон', type: 'tel', category: 'personal', tabName: 'Личные данные', tabOrder: 1, fieldOrder: 3, isRequired: false, isActive: true, readOnly: false, semantics: 'http://schema.org/telephone', placeholder: '+7 (XXX) XXX-XX-XX' },
        { id: 'education', label: 'Образование', type: 'select', category: 'personal', tabName: 'Личные данные', tabOrder: 1, fieldOrder: 4, isRequired: false, isActive: true, readOnly: false, semantics: 'http://schema.org/education', placeholder: '', options: ['высшее', 'среднее-специальное', 'среднее'] },
        
        { id: 'passportNumber', label: 'Номер паспорта', type: 'text', category: 'documents', tabName: 'Паспортные данные', tabOrder: 2, fieldOrder: 1, isRequired: false, isActive: true, readOnly: false, semantics: 'http://schemas.titul24.ru/simplex/passportNumber', placeholder: 'Серия и номер паспорта' },
        { id: 'passportIssuedBy', label: 'Кем выдан паспорт', type: 'text', category: 'documents', tabName: 'Паспортные данные', tabOrder: 2, fieldOrder: 2, isRequired: false, isActive: true, readOnly: false, semantics: 'http://schemas.titul24.ru/simplex/passportIssuedBy', placeholder: 'Кем выдан' },
        { id: 'passportIssueDate', label: 'Когда выдан паспорт', type: 'date', category: 'documents', tabName: 'Паспортные данные', tabOrder: 2, fieldOrder: 3, isRequired: false, isActive: true, readOnly: false, semantics: 'http://schemas.titul24.ru/simplex/passportIssueDate', placeholder: '' },
        { id: 'snils', label: 'СНИЛС', type: 'text', category: 'documents', tabName: 'Паспортные данные', tabOrder: 2, fieldOrder: 4, isRequired: false, isActive: true, readOnly: false, semantics: 'http://schemas.titul24.ru/simplex/snils', placeholder: 'Номер СНИЛС' },
        
        { id: 'actualAddress', label: 'Фактический адрес', type: 'textarea', category: 'address', tabName: 'Адреса', tabOrder: 3, fieldOrder: 1, isRequired: false, isActive: true, readOnly: false, semantics: 'http://schema.org/address', placeholder: 'Индекс, город, улица, дом, кв.' },
        { id: 'registrationAddress', label: 'Адрес прописки', type: 'textarea', category: 'address', tabName: 'Адреса', tabOrder: 3, fieldOrder: 2, isRequired: false, isActive: true, readOnly: false, semantics: 'http://schema.org/address', placeholder: 'Индекс, город, улица, дом, кв.' }
    ];
    
    let created = 0;
    let skipped = 0;
    
    for (const field of oldFields) {
        const docRef = window.db.collection('field_definitions').doc(field.id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            field.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            field.createdBy = window.auth.currentUser?.uid;
            field.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            await docRef.set(field);
            console.log(`✅ Создано поле: ${field.label} (${field.id})`);
            created++;
        } else {
            console.log(`⏭️ Поле уже существует: ${field.id}`);
            skipped++;
        }
    }
    
    // Переносим существующие дополнительные поля из custom_fields
    const customFieldsSnapshot = await window.db.collection('custom_fields').get();
    let customMigrated = 0;
    
    for (const doc of customFieldsSnapshot.docs) {
        const oldField = doc.data();
        const newField = {
            id: doc.id,
            label: oldField.label,
            type: oldField.type || 'text',
            category: 'custom',
            tabName: 'Дополнительные поля',
            tabOrder: 10,
            fieldOrder: oldField.order || 0,
            isRequired: oldField.isRequired || false,
            isActive: oldField.isActive !== false,
            readOnly: false,
            semantics: oldField.semantics || '',
            placeholder: oldField.placeholder || '',
            options: oldField.options || [],
            validation: { minLength: null, maxLength: null, pattern: null },
            createdAt: oldField.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const newDocRef = window.db.collection('field_definitions').doc(doc.id);
        const exists = await newDocRef.get();
        
        if (!exists.exists) {
            await newDocRef.set(newField);
            console.log(`✅ Перенесено дополнительное поле: ${newField.label}`);
            customMigrated++;
        }
    }
    
    console.log(`\n📊 ИТОГО:`);
    console.log(`   Создано стандартных полей: ${created}`);
    console.log(`   Пропущено (уже есть): ${skipped}`);
    console.log(`   Перенесено дополнительных полей: ${customMigrated}`);
    console.log(`\n🎉 Миграция завершена!`);
    
    return { created, skipped, customMigrated };
}

// Запуск миграции (выполнить в консоли)
// migrateFieldsToDynamic();