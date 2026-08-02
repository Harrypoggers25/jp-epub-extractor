// CONTROLLERS
import { WordHandler } from '../controllers/word.controller';

// MODULES
import { Router } from 'express';

const wordRouter = Router();

wordRouter.route('/')
	.post(WordHandler.create)
	.get(WordHandler.findAll);
wordRouter.route('/:w_basic_form')
	.get(WordHandler.find);
wordRouter.route('/:site_id')
	.delete(WordHandler.remove);

export default wordRouter;
