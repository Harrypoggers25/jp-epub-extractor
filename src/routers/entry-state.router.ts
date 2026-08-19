// CONTROLLERS
import { EntryStateHandler } from '../controllers/entry-state.controller';

// MODULES
import { Router } from 'express';

const entryStateRouter = Router();

entryStateRouter.route('/')
	.post(EntryStateHandler.create)
	.get(EntryStateHandler.findAll)
	.delete(EntryStateHandler.removeAll)
entryStateRouter.route('/sync')
	.post(EntryStateHandler.sync);
entryStateRouter.route('/:es_id')
	.get(EntryStateHandler.find)
	.patch(EntryStateHandler.update)
	.delete(EntryStateHandler.remove);

export default entryStateRouter;
