// CONTROLLERS
import { BookBufferHandler } from '../controllers/book-buffer.controller';

// MIDDLEWARES
import { upload } from '../middlewares/multer.middleware';

// MODULES
import { Router } from 'express';

const bookBufferRouter = Router();

bookBufferRouter.route('/')
	.get(BookBufferHandler.findAll);
bookBufferRouter.route('/upload')
	.post(upload.single('file'), BookBufferHandler.upload);
bookBufferRouter.route('/current')
	.get(BookBufferHandler.findCurrent)
	.delete(BookBufferHandler.removeCurrent);
bookBufferRouter.route('/confirm')
	.post(BookBufferHandler.confirm);
bookBufferRouter.route('/:book_id')
	.get(BookBufferHandler.find);

export default bookBufferRouter;
