/**
 * Storage provider interface for resume documents
 */
class StorageProvider {
  /**
   * Saves a file buffer to storage
   * @param {string} filename - Unique storage identifier
   * @param {Buffer} buffer - File buffer
   * @param {string} mimeType - File MIME type
   * @returns {Promise<string>} Stored path or URI
   */
  async save(_filename, _buffer, _mimeType) {
    throw new Error('save() must be implemented by subclass');
  }

  /**
   * Reads a file buffer from storage
   * @param {string} filename - Stored filename
   * @returns {Promise<Buffer>}
   */
  async read(_filename) {
    throw new Error('read() must be implemented by subclass');
  }

  /**
   * Deletes a file from storage
   * @param {string} filename - Stored filename
   * @returns {Promise<boolean>}
   */
  async delete(_filename) {
    throw new Error('delete() must be implemented by subclass');
  }
}

module.exports = StorageProvider;
