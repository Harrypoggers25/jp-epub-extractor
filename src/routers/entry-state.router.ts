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
entryStateRouter.route('/unmerge/:es_id')
	.post(EntryStateHandler.unmerge);
entryStateRouter.route('/merge/:es_id1/:es_id2')
	.post(EntryStateHandler.merge);

export default entryStateRouter;
