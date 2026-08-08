// CONTROLLERS
import { WordTypeHandler } from '../controllers/word-type.controller';

// MODULES
import { Router } from 'express';

const wordTypeRouter = Router();

wordTypeRouter.route('/')
	.get(WordTypeHandler.findAll);

export default wordTypeRouter;
