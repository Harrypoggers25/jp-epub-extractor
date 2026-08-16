// CONTROLLERS
import { TokenBufferHandler } from '../controllers/token-buffer.controller';

// MODULES
import { Router } from 'express';

const tokenBufferRouter = Router();

tokenBufferRouter.route('/')
	.delete(TokenBufferHandler.removeAll);
tokenBufferRouter.route('/count')
	.get(TokenBufferHandler.count);
tokenBufferRouter.route('/tokenize')
	.post(TokenBufferHandler.tokenize);

export default tokenBufferRouter;
