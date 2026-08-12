// CONTROLLERS
import { SentenceBufferHandler } from '../controllers/sentence-buffer.controller';

// MODULES
import { Router } from 'express';

const sentenceBufferRouter = Router();

sentenceBufferRouter.route('/section/:section_no')
	.get(SentenceBufferHandler.findBySection);
sentenceBufferRouter.route('/word-buffer/:w_basic_form/:wt_name')
	.get(SentenceBufferHandler.findByWordBuffer);

export default sentenceBufferRouter;

