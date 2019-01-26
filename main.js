var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', socket => {
    socket.on("user-connection", data => {
        socket_user_connection(socket, data);
    })
    socket.on("host-request", data => {
        socket_create_room(socket);
    })
});

io.on("disconnect", socket => {

})
let port = process.env.PORT;
http.listen(port, function () {
    load_propmts();
    console.log('listening on *:'+port);
});

let rooms = [];

const memesFolder = './public/memes/';
let memes = [];

let VOTE_LIKE = "like";
let VOTE_ANGRY = "angry";
let VOTE_HEART = "heart";
let VOTE_TIME = 15;
let PROMPT_TIME = 90;
let SCORE_TIME = 3;

let last_server_to_user_emit = [];

function load_propmts() {
    //memes
    fs.open("./memes.json", 'r', (err, fileToRead) => {
        if (!err) {
            fs.readFile(fileToRead, {
                encoding: 'utf-8'
            }, function (err, data) {
                memes = JSON.parse(data);
            });
        } else {
            console.log(err);
        }
    });
}

function create_game() {
    return game = {
        players: [],
        min_players: 2,
        max_players: 8,
        started: false
    }
}

function emit_players(room, event, data) {
    room.players.forEach(player => {
        player.socket.emit(event, data);
    })
}

function socket_create_room(socket) {
    let room = create_game();
    room.host = socket;

    let roomNumber = rooms.length;
    rooms.push(room);

    socket.emit("success-host-request", {
        roomNumber: roomNumber
    });

    socket.on("start_game", data => {
        if (room.players.length < room.min_players) {
            socket.emit("not-enough-to-start-game");
            return;
        }
        socket.emit("start-game")
        start_room(room);
    })
}

function socket_user_connection(socket, data) {
    let username = data.username;
    let roomNumber = data.roomNumber;

    if (username.length === 0) {
        socket.emit("bad-username");
        return;
    }

    room = rooms[roomNumber];
    if (room === undefined) {
        socket.emit("room-doesnt-exists");
        return;
    }

    let player = room.players.find(player => player.username === username)
    if (room.started) {
        socket.emit("room-started");
        return;
    } else {
        if (room.players.length < room.max_players) {
            player = {
                username: username,
                socket: socket,
                connected: true
            };
            room.players.push(player);
            init_player(player, room);
        } else {
            socket.emit("player-not-found");
            return;
        }
    }

    socket.on("disconnect", data => {
        room.host.emit("user-disconnected", {
            username: username
        });
        disconnect_player(room, username);
    })

    socket.emit("success-user-connection", {game_started:room.started});

    let idx = room.players.indexOf(player);
    
    socket.on("get-last-emit", data => {
        if (last_server_to_user_emit[idx] !== undefined) {
            socket.emit(last_server_to_user_emit.event, last_server_to_user_emit.data);
        }
    })

    room.host.emit("user-connected", {
        username: username
    });

}

function disconnect_player(room, username) {
    let player = room.players.find(p => p.username === username)
    let idx = room.players.indexOf(player);
    if (room.started) {

        if (idx !== undefined) {
            room.players[idx].connected = false;
        }
    } else {
        room.players.splice(idx, 1);
    }
}

function init_player(player, room) {
    player.prompt_answers = [];
    player.prompt_assignments = [];
    player.prompt_ratings = [];

    player.socket.on("prompt_answer", answer => {
        room.host.emit("player_prompt_answer", {username:player.username});
        player.prompt_answers[room.prompt_number] = answer;
    })

    player.socket.on("prompt-vote", answer => {
        let vote_num = 1;
        
        if(room.prompt_number >= 2 ){
            vote_num++;
        }
        
        room.players[room.current_player_prompt].prompt_ratings[room.prompt_number][answer.vote] += vote_num;
        room.host.emit("player-vote", {
            vote_type: answer.vote
        });
    })
}

async function start_room(room) {
    room.started = true;
    room.prompt_number = 0;
    room.current_player_prompt = -1;

    await room_start_prompt(room);
    await room_start_vote(room);
    await room_show_score(room);
    
    room.prompt_number++;
    await room_start_prompt(room);
    await room_start_vote(room);
    await room_show_score(room);
    
    room.prompt_number++;
    await room_start_prompt(room, true);
    await room_start_vote(room);
    await room_show_score(room);
    await room_show_winners(room);
    
}

function room_show_winners(room) {
    let highest_likes = room_get_highest_vote(room, VOTE_LIKE);
    let highest_heart = room_get_highest_vote(room, VOTE_HEART);
    let highest_angry = room_get_highest_vote(room, VOTE_ANGRY);
    let data = {
        like: highest_likes,
        heart: highest_heart,
        angry: highest_angry
    };
    console.log(data);
    room.host.emit("show-winners", data)
}

function room_get_highest_vote(room, vote_type) {

    let scores = calc_player_scores(room);

    let user_votes = [];

    scores.forEach(player => {

        if (user_votes.length === 0 || user_votes[0].votes === player[vote_type]) {
            user_votes.push({
                username: player.username,
                votes: player[vote_type]
            });
        } else if (user_votes[0].votes < player[vote_type]) {
            user_votes = [];
            user_votes.push({
                username: player.username,
                votes: player[vote_type]
            });
        }

    })

    return user_votes;
}

function room_show_score(room) {
    return new Promise((res, rej) => {
        room.host.emit("show-score", {
            scores: calc_player_scores(room)
        });
        create_timer(SCORE_TIME, () => {}, () => {
            res();
        })
    })
}

function calc_player_scores(room) {
    let scores = [];
    room.players.forEach(player => {
        let score = {
            username: player.username
        };
        score[VOTE_LIKE] = 0;
        score[VOTE_HEART] = 0;
        score[VOTE_ANGRY] = 0;
        player.prompt_ratings.forEach(rating => {
            score[VOTE_LIKE] += rating[VOTE_LIKE];
            score[VOTE_HEART] += rating[VOTE_HEART];
            score[VOTE_ANGRY] += rating[VOTE_ANGRY];
        })
        scores.push(score);
    })
    return scores;
}

function room_start_vote(room) {
    return new Promise(async (res, rej) => {

        for (let idx = 0; idx < room.players.length; idx++) {
            room.current_player_prompt = idx;
            let player = room.players[idx];
            room.host.emit("start-vote", {
                username: player.username,
                prompt: player.prompt_assignments[room.prompt_number],
                promp_answer: player.prompt_answers[room.prompt_number]
            })

            await start_vote(room, idx);
        }
        res();
    })
}

function start_vote(room, player_idx) {
    return new Promise((res, rej) => {
        room.players[player_idx].prompt_ratings[room.prompt_number] = {};
        room.players[player_idx].prompt_ratings[room.prompt_number][VOTE_ANGRY] = 0;
        room.players[player_idx].prompt_ratings[room.prompt_number][VOTE_HEART] = 0;
        room.players[player_idx].prompt_ratings[room.prompt_number][VOTE_LIKE] = 0;
        room.players.forEach((player, idx) => {
            if (idx != player_idx) {
                player.socket.emit("start-vote");
                last_server_to_user_emit[idx] = {
                    event: "start-vote",
                    data: ""
                }
            }
        })

        let timer = create_timer(VOTE_TIME, () => {
            if (prompt_vote_got_all_answers(room, player_idx)) {
                timer.on_end();
            }
        }, () => {
            room.players.forEach((player, idx) => {
                if (idx != player_idx) {
                    player.socket.emit("end-vote");
                    last_server_to_user_emit[idx] = {
                        event: "end-vote",
                        data: ""
                    }
                }
            })
            res();
        })
    })
}

function room_start_prompt(room, not_random) {
    return new Promise((res, rej) => {
        let prompt = get_random_propmt();
        room.players.forEach((player, idx) => {
            if(not_random === false || not_random === undefined)
            {
                prompt = get_random_propmt();
            }

            player.socket.emit("prompt", {
                prompt: prompt
            })

            last_server_to_user_emit[idx] = {
                event: "prompt",
                data: prompt
            }

            player.prompt_assignments[room.prompt_number] = prompt;
        })

        let meme_timer = create_timer(PROMPT_TIME, () => {
            room.host.emit("prompt-timer-tick", {
                current_time: meme_timer.time
            });

            if (prompt_got_all_answers(room)) {
                clearInterval(meme_timer.interval);
                create_timer(2,()=>{}, ()=> {
                    res()
                })
            }
        }, () => {
            room.host.emit("prompt-timer-tick", {
                current_time: meme_timer.time
            });
            room.host.emit("end-of-prompt");
            emit_players(room, "end-of-prompt");

        })
        room.host.emit("prompt-timer-tick", {
            current_time: meme_timer.time
        });

        room.host.emit("prompt")
    });
}

function prompt_vote_got_all_answers(room, player_idx) {
    let rating_count = 0;
    rating_count += room.players[player_idx].prompt_ratings[VOTE_ANGRY];
    rating_count += room.players[player_idx].prompt_ratings[VOTE_HEART];
    rating_count += room.players[player_idx].prompt_ratings[VOTE_LIKE];
    if (rating_count === room.players.length - 1) {
        return true;
    }
    return false;
}

function prompt_got_all_answers(room) {
    let got_all = true;
    room.players.forEach(player => {
        if (player.prompt_answers[room.prompt_number] === undefined) {
            got_all = false;
        }
    })

    return got_all;
}

function create_timer(time, on_tick, on_end) {
    let timer = {
        time: time,
        on_tick: on_tick,
        on_end: on_end,
    }
    timer.interval = setInterval(() => {
        timer.time--;
        if (timer.time === 0) {
            if (timer.on_end !== undefined) {
                timer.on_end();
            }
            clearInterval(timer.interval);
        } else {
            if (timer.on_tick !== undefined) {
                timer.on_tick()
            }
        }
    }, 1000);
    return timer;
}

function get_random_propmt() {
    let rnd_number = Math.floor(Math.random() * memes.length);
    let meme = memes[rnd_number];
    return meme;
}