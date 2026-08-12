// CONTROLLERS
import { WordBufferHandler } from '../controllers/word-buffer.controller';

// MODULES
import { Router } from 'express';

const wordBufferRouter = Router();

wordBufferRouter.route('/')
	.get(WordBufferHandler.findAll);
wordBufferRouter.route('/filter')
	.post(WordBufferHandler.filter);
wordBufferRouter.route('/:w_basic_form')
	.get(WordBufferHandler.findMany);
wordBufferRouter.route('/:w_basic_form/:wt_name')
	.get(WordBufferHandler.find);

export default wordBufferRouter;
