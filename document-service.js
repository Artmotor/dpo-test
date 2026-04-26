// document-service.js - Сервис работы с документами
class DocumentService {
    /**
     * Загрузка документа
     * @param {string} userId - ID пользователя
     * @param {File} file - Файл документа
     * @param {string} docType - Тип документа
     * @returns {Promise<Object>} - Результат загрузки
     */
    static async uploadDocument(userId, file, docType) {
        try {
            // Проверка размера
            if (!ImageCompressor.validateFileSize(file, 5)) {
                throw new Error('Файл слишком большой. Максимальный размер: 5 МБ');
            }
            
            // Проверка типа
            if (!ImageCompressor.validateFileType(file)) {
                throw new Error('Неподдерживаемый формат файла. Разрешены: JPEG, PNG, WebP, GIF');
            }
            
            // Создаем превью
            const thumbnail = await ImageCompressor.createThumbnail(file, 150);
            
            // Сжимаем для хранения
            const compressedBlob = await ImageCompressor.compressForStorage(file, 1920, 0.8);
            
            // Путь в Storage
            const storagePath = `documents/${userId}/${docType}_${Date.now()}.jpg`;
            
            // Загружаем в Storage
            const storageRef = storage.ref(storagePath);
            const uploadTask = await storageRef.put(compressedBlob);
            
            // Получаем URL
            const downloadURL = await storageRef.getDownloadURL();
            
            // Метаданные для Firestore
            const docData = {
                storagePath: storagePath,
                fileName: file.name,
                uploadDate: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending',
                verifiedBy: null,
                thumbnail: thumbnail,
                fileSize: compressedBlob.size,
                downloadURL: downloadURL
            };
            
            // Сохраняем в Firestore
            await db.collection('listeners').doc(userId).update({
                [`documents.${docType}`]: docData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true, path: storagePath, thumbnail: thumbnail };
        } catch (error) {
            console.error('Upload error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Получение URL документа
     * @param {string} userId - ID пользователя
     * @param {string} docType - Тип документа
     * @returns {Promise<string|null>} - URL документа
     */
    static async getDocumentUrl(userId, docType) {
        try {
            const userDoc = await db.collection('listeners').doc(userId).get();
            const docData = userDoc.data()?.documents?.[docType];
            
            if (docData?.storagePath) {
                const storageRef = storage.ref(docData.storagePath);
                return await storageRef.getDownloadURL();
            }
            
            if (docData?.downloadURL) {
                return docData.downloadURL;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting document URL:', error);
            return null;
        }
    }
    
    /**
     * Верификация документа методистом
     * @param {string} listenerId - ID слушателя
     * @param {string} docType - Тип документа
     * @param {string} methodistId - ID методиста
     * @param {string} status - Статус (verified/rejected)
     * @returns {Promise<void>}
     */
    static async verifyDocument(listenerId, docType, methodistId, status) {
        await db.collection('listeners').doc(listenerId).update({
            [`documents.${docType}.status`]: status,
            [`documents.${docType}.verifiedBy`]: methodistId,
            [`documents.${docType}.verifiedAt`]: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    /**
     * Удаление документа
     * @param {string} userId - ID пользователя
     * @param {string} docType - Тип документа
     * @returns {Promise<void>}
     */
    static async deleteDocument(userId, docType) {
        try {
            // Получаем данные документа
            const userDoc = await db.collection('listeners').doc(userId).get();
            const docData = userDoc.data()?.documents?.[docType];
            
            if (docData?.storagePath) {
                // Удаляем из Storage
                const storageRef = storage.ref(docData.storagePath);
                await storageRef.delete().catch((err) => {
                    console.warn('Storage delete warning:', err);
                });
            }
            
            // Удаляем метаданные из Firestore
            await db.collection('listeners').doc(userId).update({
                [`documents.${docType}`]: firebase.firestore.FieldValue.delete(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Delete document error:', error);
            throw error;
        }
    }
    
    /**
     * Получение статистики по документам
     * @param {string} listenerId - ID слушателя
     * @returns {Promise<Object>} - Статистика
     */
    static async getDocumentStats(listenerId) {
        const userDoc = await db.collection('listeners').doc(listenerId).get();
        const docs = userDoc.data()?.documents || {};
        
        const stats = {
            total: 0,
            uploaded: 0,
            pending: 0,
            verified: 0,
            rejected: 0,
            totalSize: 0
        };
        
        const docTypes = ['passportMain', 'passportRegistration', 'snils', 'inn', 'nameChange', 'diploma'];
        
        stats.total = docTypes.length;
        
        docTypes.forEach(type => {
            const doc = docs[type];
            if (doc) {
                stats.uploaded++;
                stats[doc.status] = (stats[doc.status] || 0) + 1;
                stats.totalSize += doc.fileSize || 0;
            }
        });
        
        return stats;
    }
}