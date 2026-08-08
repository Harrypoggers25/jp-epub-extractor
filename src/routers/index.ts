// MODULES
import { Router } from "express";

// ROUTERS
import wordRouter from "./word.router";
import wordTypeRouter from "./word-types.router";
import cleanedBufferRouter from "./cleaned-buffer.router";
import senseStateRouter from "./sense-state.router";

const router = Router();

router.use('/api/words', wordRouter);
router.use('/api/word-types', wordTypeRouter);
router.use('/api/cleaned-buffers', cleanedBufferRouter);
router.use('/api/sense-states', senseStateRouter);

router.get('/', (_, res) => {
	res.render('index');
});

export default router;
