require('dotenv').config();
import cron from 'cron';
import fs from 'fs';
import path from 'path';
import request from 'request';

const dataDirPath = path.resolve('data');
const playlistPath = path.join(dataDirPath, 'playlist.json');
const playlistItemsPath = path.join(dataDirPath, 'playlistItems.json');
fs.existsSync(dataDirPath) || fs.mkdirSync(dataDirPath);

const CronJob = cron.CronJob;

const KEY = process.env.YOUTUBE_KEY;
const SEARCH = process.env.YOUTUBE_SEARCH;

const requestTop100Playlist = () => {
    if (!KEY || !SEARCH || KEY === '' || SEARCH === '') {
        return Promise.reject(new Error('YOUTUBE_KEY and YOUTUBE_SEARCH are required'));
    }
    const q = encodeURIComponent(SEARCH);
    const query = `https://www.googleapis.com/youtube/v3/search?key=${KEY}&part=id&type=playlist&q=${q}`;
    console.log(query);
    return new Promise((resolve, reject) => {
        request(query, (err, response, body) => {
            if (err) {
                return reject(err);
            }
            const playlists = JSON.parse(body);
            let item;
            if (playlists.items && playlists.items.length > 0) {
                item = playlists.items[0];
            }
            fs.writeFileSync(playlistPath, JSON.stringify(playlists, null, '\t'), 'utf-8');
            return resolve(item);
        });
    });
};

const requestPlaylistItems = (item) => {
    const query = (playlistId, pageToken) => {
        if (pageToken) {
            return `https://www.googleapis.com/youtube/v3/playlistItems?key=${KEY}&part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${pageToken}`;
        } else {
            return `https://www.googleapis.com/youtube/v3/playlistItems?key=${KEY}&part=snippet&playlistId=${playlistId}&maxResults=50`;
        }
    };
    return new Promise((resolve, reject) => {
        if (!item) {
            return reject(new Error('Item not exist'))
        }
        const { playlistId } = item.id;
        let items = [];
        const fetch = (pageToken) => {
            const q = query(playlistId, pageToken);
            console.log(q);
            request(q, (err, response, body) => {
                if (err) {
                    return reject(err);
                }
                const playlistItems = JSON.parse(body);
                items = items.concat(playlistItems.items);
                if (playlistItems.nextPageToken) {
                    return fetch(playlistItems.nextPageToken);
                }
                fs.writeFileSync(playlistItemsPath, JSON.stringify(items, null, '\t'), 'utf-8');
                return resolve(items);
            });
        };
        fetch();
    });
};

const transaction = () => {
    requestTop100Playlist()
        .then(requestPlaylistItems)
        .then((items) => {
            console.log(items.length);
        })
        .catch(e => {
            console.log(e);
        });
};
transaction();

const job = new CronJob('0 0 0 * * *', () => {
    transaction();
});

job.start();
