// CONTROLLERS
import { JishoBufferHandler } from '../controllers/jisho-buffer.controller';

// MODULES
import { Router } from 'express';

const jishoBufferRouter = Router();

jishoBufferRouter.route('/')
	.delete(JishoBufferHandler.removeAll);
jishoBufferRouter.route('/load')
	.post(JishoBufferHandler.load);

export default jishoBufferRouter;
