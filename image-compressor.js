// image-compressor.js - Сжатие изображений
class ImageCompressor {
    /**
     * Создание превью изображения
     * @param {File} file - Исходный файл
     * @param {number} maxSize - Максимальный размер превью в пикселях
     * @returns {Promise<string>} - Base64 строка превью
     */
    static async createThumbnail(file, maxSize = 150) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Масштабирование с сохранением пропорций
                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Качество 0.6 для экономии места
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
                
                img.src = e.target.result;
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Сжатие изображения для хранения в Storage
     * @param {File} file - Исходный файл
     * @param {number} maxSize - Максимальный размер в пикселях
     * @param {number} quality - Качество сжатия (0-1)
     * @returns {Promise<Blob>} - Сжатый Blob
     */
    static async compressForStorage(file, maxSize = 1920, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Масштабирование если изображение больше максимального
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        } else {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Проверяем поддержку WebP
                    const useWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Ошибка создания Blob'));
                        }
                    }, useWebP ? 'image/webp' : 'image/jpeg', quality);
                };
                
                img.src = e.target.result;
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Проверка размера файла
     * @param {File} file - Файл для проверки
     * @param {number} maxMB - Максимальный размер в МБ
     * @returns {boolean}
     */
    static validateFileSize(file, maxMB = 5) {
        const maxBytes = maxMB * 1024 * 1024;
        return file.size <= maxBytes;
    }
    
    /**
     * Проверка типа файла (только изображения)
     * @param {File} file - Файл для проверки
     * @returns {boolean}
     */
    static validateFileType(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        return allowedTypes.includes(file.type);
    }
}