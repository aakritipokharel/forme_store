const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const uploadRoot = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (request, file, callback) => {
    const kind = request.query.kind;
    if (!['product', 'category'].includes(kind)) {
      callback(Object.assign(new Error('Upload kind must be product or category'), { status: 400 }));
      return;
    }
    const destination = path.join(uploadRoot, `${kind}s`);
    fs.mkdir(destination, { recursive: true }, (error) => callback(error, destination));
  },
  filename: (request, file, callback) => {
    callback(null, `${randomUUID()}${allowedTypes.get(file.mimetype) || '.upload'}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (request, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(Object.assign(new Error('Only JPEG, PNG, and WebP images are allowed'), { status: 400 }));
      return;
    }
    callback(null, true);
  },
});

module.exports = {
  imageUpload,
  uploadRoot,
};
