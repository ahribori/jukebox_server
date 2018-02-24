import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const dataDirPath = path.resolve('data');
const playlistItemsPath = path.join(dataDirPath, 'playlistItems.json');

router.get('/', (req, res) => {
    if (fs.existsSync(playlistItemsPath)) {
        return res.json(require(playlistItemsPath));
    }
    return res.json([]);
});

export default router;