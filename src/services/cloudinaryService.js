const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

/**
 * CloudinaryService - Servicio para gestión de archivos en Cloudinary
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja operaciones con Cloudinary
 * - Open/Closed: Abierto para extensión (nuevos métodos)
 * - Dependency Inversion: Abstracción de almacenamiento en la nube
 */
class CloudinaryService {
    constructor() {
        // Configurar Cloudinary con variables de entorno
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
    }

    /**
     * Subir archivo a Cloudinary desde buffer
     * @param {Buffer} fileBuffer - Buffer del archivo
     * @param {Object} options - Opciones de upload
     * @param {string} options.folder - Carpeta en Cloudinary  
     * @param {string} options.originalName - Nombre original del archivo
     * @param {string} options.resourceType - Tipo de recurso ('image', 'video', 'raw', 'auto')
     * @returns {Promise<Object>} - Resultado de Cloudinary con url y public_id
     */
    async uploadFile(fileBuffer, options = {}) {
        try {
            const {
                folder = 'gestion-proyectos',
                originalName = 'file',
                resourceType = 'auto'
            } = options;

            // Convertir buffer a stream para Cloudinary
            const stream = Readable.from(fileBuffer);

            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: folder,
                        resource_type: resourceType,
                        public_id: originalName.split('.')[0], // Usar nombre sin extensión
                        use_filename: true,
                        unique_filename: false  // No agregar UUID
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Error uploading to Cloudinary:', error);
                            reject(error);
                        } else {
                            resolve({
                                url: result.secure_url,
                                public_id: result.public_id,
                                format: result.format,
                                resource_type: result.resource_type,
                                bytes: result.bytes
                            });
                        }
                    }
                );

                stream.pipe(uploadStream);
            });
        } catch (error) {
            console.error('Error en CloudinaryService.uploadFile:', error);
            throw error;
        }
    }

    /**
     * Eliminar archivo de Cloudinary
     * @param {string} publicId - Public ID del archivo en Cloudinary
     * @param {string} resourceType - Tipo de recurso ('image', 'video', 'raw')
     * @returns {Promise<Object>} - Resultado de la eliminación
     */
    async deleteFile(publicId, resourceType = 'image') {
        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType
            });

            return result;
        } catch (error) {
            console.error('Error deleting from Cloudinary:', error);
            throw error;
        }
    }

    /**
     * Obtener URL de un archivo
     * @param {string} publicId - Public ID del archivo
     * @returns {string} - URL segura del archivo
     */
    getFileUrl(publicId) {
        return cloudinary.url(publicId, {
            secure: true
        });
    }

    /**
     * Determinar resource_type basado en MIME type
     * @param {string} mimeType - MIME type del archivo
     * @returns {string} - Resource type para Cloudinary
     */
    getResourceType(mimeType) {
        if (mimeType.startsWith('image/')) {
            return 'image';
        } else if (mimeType.startsWith('video/')) {
            return 'video';
        } else {
            return 'raw'; // Para PDFs, documentos, etc.
        }
    }
}

module.exports = CloudinaryService;
