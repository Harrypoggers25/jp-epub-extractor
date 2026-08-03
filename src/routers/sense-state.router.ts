// CONTROLLERS
import { SenseStateHandler } from '../controllers/sense-state.controller';

// MODULES
import { Router } from 'express';

const senseStateRouter = Router();

senseStateRouter.route('/')
	.post(SenseStateHandler.create)
	.get(SenseStateHandler.findAll)
	.delete(SenseStateHandler.removeAll)
senseStateRouter.route('/:ss_key')
	.get(SenseStateHandler.find)
	.patch(SenseStateHandler.update)
	.delete(SenseStateHandler.remove);

export default senseStateRouter;
