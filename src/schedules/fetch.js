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

const convertYoutubeTimeFormatToSecond = (duration) => {
    let a = duration.match(/\d+/g);

    if (duration.indexOf('M') >= 0 && duration.indexOf('H') === -1 && duration.indexOf('S') === -1) {
        a = [0, a[0], 0];
    }
    if (duration.indexOf('H') >= 0 && duration.indexOf('M') === -1) {
        a = [a[0], 0, a[1]];
    }
    if (duration.indexOf('H') >= 0 && duration.indexOf('M') === -1 && duration.indexOf('S') === -1) {
        a = [a[0], 0, 0];
    }

    duration = 0;

    if (a.length === 3) {
        duration = duration + parseInt(a[0]) * 3600;
        duration = duration + parseInt(a[1]) * 60;
        duration = duration + parseInt(a[2]);
    }
    if (a.length === 2) {
        duration = duration + parseInt(a[0]) * 60;
        duration = duration + parseInt(a[1]);
    }
    if (a.length === 1) {
        duration = duration + parseInt(a[0]);
    }

    return duration;
};

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
            const savetime = new Date().getTime();
            const playlists = JSON.parse(body);
            let item;
            if (playlists.items && playlists.items.length > 0) {
                item = playlists.items[0];
            }
            fs.writeFileSync(playlistPath, JSON.stringify({ savetime, playlists }, null, '\t'), 'utf-8');
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

                // 첫번 째 곡이 대문용인지 확인
                if (items.length > 0) {
                    const { videoId } = items[0].snippet.resourceId;
                    const q2 = `https://www.googleapis.com/youtube/v3/videos?key=${KEY}&part=id,contentDetails&id=${videoId}`;
                    console.log(q2);
                    request(q2, (err, response, body) => {
                        if (err) {
                            return reject(err);
                        }
                        const { duration } = JSON.parse(body).items[0].contentDetails;
                        const durationSecond = convertYoutubeTimeFormatToSecond(duration);

                        if (durationSecond < 30) {
                            // 동영상 길이가 30초보다 작으면 목록에서 제거
                            items.shift();
                        }

                        fs.writeFileSync(playlistItemsPath, JSON.stringify(items, null, '\t'), 'utf-8');
                        return resolve(items);
                    });
                }
            });
        };
        fetch();
    });
};

const fetchedToday = () => {
    const playlist = fs.existsSync(playlistPath) && JSON.parse(fs.readFileSync(playlistPath, 'utf-8'));
    if (playlist) {
        const saveTime = playlist.savetime;
        const savedDate = new Date(saveTime);
        const currentDate = new Date();
        if (savedDate.getFullYear() === currentDate.getFullYear() &&
            savedDate.getMonth() === currentDate.getMonth() &&
            savedDate.getDate() === currentDate.getDate()) {
            return true;
        }
    }
    return false;
};

const transaction = () => {
    if (fetchedToday()) {
        return;
    }
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

const job = new CronJob('0 0 * * * *', () => {
    transaction();
});

job.start();
