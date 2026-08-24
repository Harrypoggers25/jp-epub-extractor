// CONTROLLERS
import { UnsureEntryStateHandler } from '../controllers/unsure-entry-state.controller';

// MODULES
import { Router } from 'express';

const unsureEntryStateRouter = Router();

unsureEntryStateRouter.route('/')
	.post(UnsureEntryStateHandler.create)
	.get(UnsureEntryStateHandler.findAll)
	.delete(UnsureEntryStateHandler.removeAll)
unsureEntryStateRouter.route('/sync')
	.post(UnsureEntryStateHandler.sync);
unsureEntryStateRouter.route('/:es_id')
	.get(UnsureEntryStateHandler.find)
	.patch(UnsureEntryStateHandler.update)
	.delete(UnsureEntryStateHandler.remove);
unsureEntryStateRouter.route('/unmerge/:es_id')
	.post(UnsureEntryStateHandler.unmerge);
unsureEntryStateRouter.route('/merge/:es_id1/:es_id2')
	.post(UnsureEntryStateHandler.merge);

export default unsureEntryStateRouter;

