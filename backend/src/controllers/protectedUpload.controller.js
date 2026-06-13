'use strict';

const asyncHandler = require('../utils/asyncHandler');
const protectedUploadService = require('../services/protectedUpload.service');

function serveUpload(kind) {
  return asyncHandler(async (req, res) => {
    const file = await protectedUploadService.resolveProtectedUpload({
      user: req.user,
      kind,
      filename: req.params.filename,
    });

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(file.filePath);
  });
}

module.exports = {
  serveResume: serveUpload('resume'),
  serveSnapshot: serveUpload('snapshot'),
};
