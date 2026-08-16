const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Use memory storage with strict 5MB limit and image MIME-type filter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed."));
    }
  },
});

const uploadToCloudinary = (buffer, foldername) => {
  return new Promise((resolve, reject) => {
    let options = {
      folder: foldername,
    };

    if (foldername === "logiclab_avatars") {
      options.transformation = [
        { width: 300, height: 300, crop: "fill", gravity: "face" },
      ];
    } else if (foldername === "logiclab_posts") {
      options.transformation = [
        { width: 1200, crop: "limit" },
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    throw err;
  }
};

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary };

