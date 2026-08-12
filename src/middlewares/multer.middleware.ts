// MODULES
import multer from "multer";
import path from 'node:path';

const storage = multer.diskStorage({
	destination: "epubs/",
	filename: (_, file, cb) => {
		const ext = path.extname(file.originalname);
		const filename = `book${ext}`;

		cb(null, filename);
	},
});

export const upload = multer({
	storage,
	fileFilter: (_, file, cb) => {
		if (file.mimetype !== 'application/epub+zip') {
			cb(null, false);
			return;
		}
		cb(null, true);
	}
});

