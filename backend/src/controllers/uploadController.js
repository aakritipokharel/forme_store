const fs = require('node:fs/promises');
const path = require('node:path');
const { uploadRoot } = require('../middleware/imageUpload');

const signatures = {
  'image/jpeg': (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (buffer) => (
    buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ),
};

const uploadImage = async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ success: false, message: 'Choose an image to upload' });
  }
  const filePath = path.join(uploadRoot, `${request.query.kind}s`, request.file.filename);
  const contents = await fs.readFile(filePath);
  const isValidImage = signatures[request.file.mimetype]?.(contents);
  if (!isValidImage) {
    await fs.unlink(filePath);
    return response.status(400).json({
      success: false,
      message: 'The uploaded file contents do not match a supported image format',
    });
  }
  return response.status(201).json({
    success: true,
    data: { image: `/uploads/${request.query.kind}s/${request.file.filename}` },
  });
};

module.exports = { uploadImage };
