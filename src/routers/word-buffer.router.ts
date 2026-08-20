// CONTROLLERS
import { WordBufferHandler } from '../controllers/word-buffer.controller';

// MODULES
import { Router } from 'express';

const wordBufferRouter = Router();

wordBufferRouter.route('/')
	.get(WordBufferHandler.findAll);
wordBufferRouter.route('/count')
	.get(WordBufferHandler.count);
wordBufferRouter.route('/filter')
	.post(WordBufferHandler.filter);
wordBufferRouter.route('/confirm')
	.post(WordBufferHandler.confirm);
wordBufferRouter.route('/:w_basic_form')
	.get(WordBufferHandler.findMany);
wordBufferRouter.route('/:w_basic_form/:wt_name')
	.get(WordBufferHandler.find);
wordBufferRouter.route('/transform/:w_basic_form/:wt_name')
	.post(WordBufferHandler.transform);

export default wordBufferRouter;
