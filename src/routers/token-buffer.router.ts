// CONTROLLERS
import { TokenBufferHandler } from '../controllers/token-buffer.controller';

// MODULES
import { Router } from 'express';

const tokenBufferRouter = Router();

tokenBufferRouter.route('/')
	.get(TokenBufferHandler.removeAll);
tokenBufferRouter.route('/tokenize')
	.post(TokenBufferHandler.tokenize);

export default tokenBufferRouter;
