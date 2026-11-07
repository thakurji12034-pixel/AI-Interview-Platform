const LocalStorageProvider = require('./LocalStorageProvider');

let instance = null;

function getStorageProvider() {
  if (!instance) {
    instance = new LocalStorageProvider();
  }
  return instance;
}

module.exports = {
  getStorageProvider,
  LocalStorageProvider,
};
