require('dotenv').config();
import express from 'express';
import cors from 'cors';

const router = express.Router();

import playlist from './playlist';

const { CORS_WHITELIST } = process.env;
const whitelist = CORS_WHITELIST && CORS_WHITELIST !== '' ? CORS_WHITELIST.split(',') : [];

const corsOptions = {
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(null, false)
        }
    }
};

router.use('*', cors(corsOptions), (req, res, next) => {
    next();
});

router.get('/', (req, res) => {
    res.json('OK');
});

router.use('/api/playlist', playlist);

export default router;