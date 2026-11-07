const fs = require('fs');
const path = require('path');
const StorageProvider = require('./StorageProvider');

class LocalStorageProvider extends StorageProvider {
  constructor(baseDir) {
    super();
    this.baseDir = baseDir || path.resolve(__dirname, '../../../storage/resumes');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  _getFilePath(filename) {
    // Prevent path traversal
    const safeName = path.basename(filename);
    return path.join(this.baseDir, safeName);
  }

  async save(filename, buffer) {
    const filePath = this._getFilePath(filename);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  async read(filename) {
    const filePath = this._getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }
    return fs.promises.readFile(filePath);
  }

  async delete(filename) {
    const filePath = this._getFilePath(filename);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }
}

module.exports = LocalStorageProvider;
