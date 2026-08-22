// CONTROLLERS
import { UnsureWordBufferHandler } from '../controllers/unsure-word-buffer.controller';

// MODULES
import { Router } from 'express';

const unsureWordBufferRouter = Router();

unsureWordBufferRouter.route('/')
	.get(UnsureWordBufferHandler.findAll);
unsureWordBufferRouter.route('/count')
	.get(UnsureWordBufferHandler.count);
unsureWordBufferRouter.route('/confirm')
	.post(UnsureWordBufferHandler.confirm);
unsureWordBufferRouter.route('/:w_basic_form')
	.get(UnsureWordBufferHandler.findMany);
unsureWordBufferRouter.route('/:w_basic_form/:wt_name')
	.get(UnsureWordBufferHandler.find);
unsureWordBufferRouter.route('/transform/:w_basic_form/:wt_name')
	.post(UnsureWordBufferHandler.transform);

export default unsureWordBufferRouter;
