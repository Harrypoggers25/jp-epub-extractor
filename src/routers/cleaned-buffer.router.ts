// CONTROLLERS
import { CleanedBufferHandler } from '../controllers/cleaned-buffer.controller';

// MODULES
import { Router } from 'express';

const cleanedBufferRouter = Router();

cleanedBufferRouter.route('/')
	.get(CleanedBufferHandler.findAll);
cleanedBufferRouter.route('/:w_basic_form')
	.get(CleanedBufferHandler.findMany);
cleanedBufferRouter.route('/:w_basic_form/:wt_name')
	.get(CleanedBufferHandler.find);

export default cleanedBufferRouter;
