// MODULES
import { Router } from "express";

// ROUTERS
import bookRouter from "./book-buffer.router"
import wordRouter from "./word.router";
import wordBufferRouter from "./word-buffer.router";
import wordTypeRouter from "./word-types.router";
import entryStateRouter from "./entry-state.router";
import sentenceBufferRouter from "./sentence-buffer.router";
import jishoBufferRouter from "./jisho-buffer.router";
import tokenBufferRouter from "./token-buffer.router";

const router = Router();

router.use('/api/word-types', wordTypeRouter);
router.use('/api/book-buffers', bookRouter);
router.use('/api/sentence-buffers', sentenceBufferRouter);
router.use('/api/token-buffers', tokenBufferRouter);
router.use('/api/jisho-buffers', jishoBufferRouter);
router.use('/api/word-buffers', wordBufferRouter);
router.use('/api/entry-states', entryStateRouter);
router.use('/api/words', wordRouter);

router.get('/book', (_, res) => {
	res.render('book');
});

router.get('/review', (_, res) => {
	res.render('review');
});

router.get('/word', (_, res) => {
	res.render('word');
});

router.get('/review/unsure', (_, res) => {
	res.render('unsure-review');
});

export default router;
