const Discord = require('discord.js');
const YouTube = require('youtube-node');
const ytdl = require('ytdl-core');
const YtRegExp = require('./ytregexp.js');

const client = new Discord.Client();

const PREFIX = 'k!';
const TOKEN = 'TOKEN';
const BOT_ID = 'BOT_ID';

// YouTube-node
const GOOGLE_API_KEY = 'AIzaSyD77fn_ptp9aAgpDUrD1hd3N2flk63FQrA';
const YOUTUBE_BASE_URL = 'https://www.youtube.com/watch?v=';
const MAX_RESULTS = 5;

// ytdl
const STREAM_OPTIONS = { seek: 0, volume: 1 };

// メッセージ
const MES_CONNECT = 'ボイスチャンネルに接続しました';
const MES_DISCON = 'ボイスチャンネルから退出しました';
const MES_PLAY = '再生開始';
const MES_END = '再生終了';
const MES_PAUSE = '一時停止';
const MES_RESUME = '一時停止解除';
const MES_ADD_QUEUE = 'キューに追加しました';
const MES_FAILED_QUEUE = 'キューへの追加に失敗しました';

let voiceConnection;

// フラグ
let isResultExisting = false;
let isPlaying = false;
let forceStop = false;
let forcePrev = false;

// キュー
let queue = [];
let queueNo = 0;

// 検索結果
let results = [MAX_RESULTS];
for(let i = 0; i < MAX_RESULTS; i++) {
    results[i] = [2];
}

client.on('ready', () => {
    console.log('起動しました');
});

client.on('message', message => {
    // コマンドかどうか判定
    if (!IsCommand(message.content)) return;
    // コマンド
    let command = message.content.slice(2).split(/\s/)[0];
    // コマンドの引数(配列)
    let args = message.content.split(/\s+/).slice(1);
    
    console.log(command);
    console.log(args);

    switch (command) {
        case 'connect':
            // ボイスチャンネルにユーザーがいる時のみ接続
            if (IsUserExisting(message)) Connect(message);
            break;
        case 'discon':
            Disconnect(message);
            break;
        case 'search':
            Search(message, args);
            break;
        case 'play':
            Play(message, args);
            break;
        case 'pause':
            Pause(message);
            break;
        case 'resume':
            Resume(message);
            break;
        case 'queue':
            ShowQueue(message);
            break;
        case 'addqueue':
            AddQueue(message, args.join(''));
            break;
        case 'skip':
            Skip(message);
            break;
        case 'prev':
            Prev(message);
            break;
        case 'test':
            Test(message);
            break;
        default:
            break;
    }
});

// コマンドかどうかチェックする関数
function IsCommand(args) {
    return args.startsWith(PREFIX) ? true : false;
}

// ボイスチャンネルにユーザーがいるかチェックする関数
function IsUserExisting(event) {
    return event.member.voiceChannel ? true : false
}

function GetConnection(event) {
    return event.guild.voiceConnection;
}

// ボイスチャンネル 接続
function Connect(event) {
    event.member.voiceChannel.join()
    .then(connection => {
        voiceConnection = connection;
        event.channel.send(MES_CONNECT);
        console.log(MES_CONNECT);
    })
    .catch(console.log);
}

// ボイスチャンネル 切断
function Disconnect(event) {
    forceStop = true;
    isPlaying = false;
    // if (connection = GetConnection(event)) {
    if (voiceConnection) {
        try {
            voiceConnection.dispatcher.end();
        }
        catch(e) {
            console.log(MES_DISCON);
        }
        voiceConnection.channel.leave();
        event.channel.send(MES_DISCON);
        console.log(MES_DISCON);
    }
}

// YouTube検索
function Search(event, args) {
    // 引数の数をチェック
    if (args.length <= 0) return;
    let youtube = new YouTube();

    // APIキーの設定, 動画のみ検索
    youtube.setKey(GOOGLE_API_KEY);
    youtube.addParam('type', 'video');

    // 引数を結合(半角スペース)
    let query = args.join(' ');

    youtube.search(query, MAX_RESULTS, function(error, result) {
        if (error) {
            console.log(error);
            return;
        }
        let items = result['items'];
        let titles = [], ids = [];

        // 検索結果からタイトルとIDを抽出
        for (let i in items) {
            titles.push(items[i]['snippet']['title']);
            ids.push(items[i]['id']['videoId']);
        }

        // 配列resultsにタイトルとIDを入れる
        for (let i = 0; i < MAX_RESULTS; i++) {
            results[i][0] = titles[i];
            results[i][1] = ids[i];
        }

        // 検索結果を表示
        let embed = new Discord.RichEmbed()
            .setTitle('🎧 YouTube 検索結果')
            .setColor(15019303)
            .setTimestamp()
        for(let i = 0; i < MAX_RESULTS; i++) {
            embed.addField(i + ". " + results[i][0], YOUTUBE_BASE_URL + results[i][1]);
        }
        isResultExisting = true;
        event.channel.send({embed});
    });
}

function Play(event, args) {
    if (!voiceConnection) return;

    // 引数が1個以上ならキューに追加
    if (args.length > 0) AddQueue(event, args.join(''));

    if (isPlaying) return;
    // キューを再生
    PlayQueue(event);
    isPlaying = true;

    // 再生終了時の処理
    voiceConnection.dispatcher.on('end', () => {
        if (forceStop) return;
        if ((queue.length - 1) > queueNo) {
            queueNo++;
            PlayQueue(event);
        }
        console.log(MES_END);
    });
}

function PlayQueue(event) {
    forceStop = false;
    let stream = ytdl(queue[queueNo], { filter: 'audioonly' });
    voiceConnection.playStream(stream, STREAM_OPTIONS);
    event.channel.send(MES_PLAY + ': ' + queue[queueNo]);
    console.log(MES_PLAY + ': ' + queue[queueNo]);
}

function Pause(event) {
    if (!voiceConnection) return;
    voiceConnection.dispatcher.pause();
    console.log(MES_PAUSE);
}

function Resume(event) {
    if (!voiceConnection) return;
    voiceConnection.dispatcher.resume();
    console.log(MES_RESUME);
}

function ShowQueue(event) {
    if (queue.length <= 0) return;
    let embed = new Discord.RichEmbed()
        .setTitle('🎧 キュー')
        .setColor(15019303)
        .setTimestamp()
    for(let i = 0; i < queue.length; i++) {
        embed.addField(i + ". " + YOUTUBE_BASE_URL + queue[i]);
    }
    event.channel.send({embed});
}

function AddQueue(event, args) {
    if (YtRegExp.isURL(args) || YtRegExp.isID(args)) {
        let id = YtRegExp.getID(args);
        queue.push(id);
        event.channel.send(MES_ADD_QUEUE + ': ' + id);
        console.log(MES_ADD_QUEUE + ': ' + id);
    } else {
        event.channel.send(MES_FAILED_QUEUE);
        console.log(MES_FAILED_QUEUE);
    }
}

function Skip(event) {
    if (!voiceConnection) return;
    if ((queue.length - 1) <= queueNo) return;
    forceStop = true;
    try {
        //voiceConnection.dispatcher.end();
        voiceConnection.dispatcher.stopPlaying();
    }
    catch(e) {
        console.log(e);
    }
    queueNo++;
    PlayQueue(event);
}

function Prev(event) {
    if (!voiceConnection) return;
    if (queue.length <= 0 && queueNo <= 0) return;
    forceStop = true;
    try {
        //voiceConnection.dispatcher.end();
        voiceConnection.dispatcher.stopPlaying();
    }
    catch(e) {
        console.log(e);
    }
    queueNo--;
    PlayQueue(event);
}

function Test(event) {
    console.log('Queue: ' + queue.length);
    console.log('QueueNum: ' + queueNo);
    PlayQueue(event);
}

client.login(TOKEN);
