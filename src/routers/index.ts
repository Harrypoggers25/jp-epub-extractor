// MODULES
import { Router } from "express";

// ROUTERS
import wordRouter from "./word.router";
import cleanedBufferRouter from "./cleaned-buffer.router";

const router = Router();

router.use('/api/words', wordRouter);
router.use('/api/cleaned-buffers', cleanedBufferRouter);

router.get('/', (_, res) => {
	res.render('index');
});

export default router;
