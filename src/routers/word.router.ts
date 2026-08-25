// CONTROLLERS
import { WordHandler } from '../controllers/word.controller';

// MODULES
import { Router } from 'express';

const wordRouter = Router();

wordRouter.route('/')
	.get(WordHandler.findAll);
wordRouter.route('/:w_basic_form')
	.get(WordHandler.findMany);
wordRouter.route('/:w_basic_form/:wt_name')
	.get(WordHandler.find)
	.delete(WordHandler.remove);
wordRouter.route('/transform/:w_basic_form/:wt_name')
	.post(WordHandler.transform);
wordRouter.route('/merge/:es_id1/:es_id2')
	.post(WordHandler.merge);

export default wordRouter;
