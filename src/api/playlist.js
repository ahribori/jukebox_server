import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const dataDirPath = path.resolve('data');
const playlistItemsPath = path.join(dataDirPath, 'playlistItems.json');

router.get('/', (req, res) => {
    if (fs.existsSync(playlistItemsPath)) {
        const playlist = fs.readFileSync(playlistItemsPath, 'utf-8');
        return res.json(JSON.parse(playlist));
    }
    return res.json([]);
});

export default router;