import path from 'path';
import express from 'express';
import multer from 'multer';
const storageCloud = multer.memoryStorage();
const uploadImg = multer({ storageCloud });
import { v2 as cloudinary } from 'cloudinary';
const router = express.Router();
cloudinary.config({
  cloud_name: 'dqveua4tx',
  api_key: '447855287612825',
  api_secret: 'hmXoYACGI6QJUEWsPCwV_kJPByA',
});
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

function fileFilter(req, file, cb) {
  const filetypes = /jpe?g|png|webp/;
  const mimetypes = /image\/jpe?g|image\/png|image\/webp/;

  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = mimetypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Images only!'), false);
  }
}

const upload = multer({ storage, fileFilter });
const uploadSingleImage = upload.single('image');

router.post('/', (req, res) => {
  uploadSingleImage(req, res, function (err) {
    if (err) {
      res.status(400).send({ message: err.message });
    }

    res.status(200).send({
      message: 'Image uploaded successfully',
      image: `/${req.file.path}`,
    });
  });
});
router.post('/cloud', uploadImg.single('image'), (req, res) => {
  const imageData = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;
  const dataUri = `data:${mimeType};base64,${imageData}`;
  cloudinary.uploader.upload(
    dataUri,
    { folder: 'uploads' },
    (error, result) => {
      console.log('uploading....');

      if (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
      } else {
        console.log('successful');
        var secureUrl = result.secure_url;
        res.status(200).json({ url: secureUrl });
      }
    }
  );
});

export default router;
