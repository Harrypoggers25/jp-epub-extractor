// CONTROLLERS
import { WordTypeHandler } from '../controllers/word-type.controller';

// MODULES
import { Router } from 'express';

const wordTypeRouter = Router();

wordTypeRouter.route('/')
	.get(WordTypeHandler.findAll);
wordTypeRouter.route('/:wt_name')
	.get(WordTypeHandler.find)
	.patch(WordTypeHandler.update);

export default wordTypeRouter;
