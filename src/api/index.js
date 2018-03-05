import express from 'express';
import cors from 'cors';
const router = express.Router();

import playlist from './playlist';

router.get('/', (req, res) => {
    res.json('OK');
});

router.use('/api', cors());
router.use('/api/playlist', playlist);

export default router;