document.on("DOMContentLoaded", e => {

  var socket = io('/');
  let VOTE_LIKE = "like";
  let VOTE_ANGRY = "angry";
  let VOTE_HEART = "heart";

  let emojis = {};
  emojis[VOTE_ANGRY] = '😡';
  emojis[VOTE_HEART] = '❤';
  emojis[VOTE_LIKE] = '👍';

  let sounds = {};

  socket.on('room-started', data => {alert("game inproggres")});

  socket.on("success-host-request", data => {
    load_host(data.roomNumber);
  })

  socket.on("success-user-connection", data => {
    load_user()
    if (data.game_started) {
      socket.emit("get-last-emit");
      console.log("user_get_last_emit");
    }
  })

  select("#connect_btn").on("click", e => {
    let username = select("#username-field").value;
    let roomNumber = select("#room-field").value;
    socket.emit("user-connection", {
      username: username,
      roomNumber: roomNumber
    });
  })

  select("#host_btn").on("click", e => {
    socket.emit("host-request");
  })


  async function load_user() {

    socket.on("prompt", data => {
      user_clear_screen();
      console.log(data);
      show_prompt_meme(data.prompt, "#prompt-container", "input");
    });

    socket.on("end-of-prompt", data => {
      user_clear_screen();
    })

    socket.on("start-vote", data => {
      user_clear_screen();
      let btn_angry = create_vote_button(socket, VOTE_ANGRY);
      let btn_heart = create_vote_button(socket, VOTE_HEART);
      let btn_like = create_vote_button(socket, VOTE_LIKE);
      select("#prompt-container").appendChild(btn_like);
      select("#prompt-container").appendChild(btn_heart);
      select("#prompt-container").appendChild(btn_angry);
    })

    socket.on("end-vote", data => {
      user_clear_screen();
    })

    let userHTML = await fetch("/user.html").then(data => data.text())
    document.body.innerHTML = userHTML;
  }

  function create_vote_button(socket, vote_type) {
    let elm = document.createElement("button");

    elm.classList.add("login-width-btn");
    elm.classList.add("login-btn");
    elm.classList.add("vote_btn");

    elm.innerHTML = emojis[vote_type];

    elm.addEventListener("click", e => {
      socket.emit("prompt-vote", {
        vote: vote_type
      });
      user_clear_screen();
    })

    return elm;
  }

  function show_prompt_meme(prompt, container_selector, field_type, data) {

    let div = create_meme_element(prompt);
    let text_fields = create_meme_text_fields(prompt, div, field_type)
    create_meme_submit_button(div, text_fields);

    select(container_selector).appendChild(div);
  }

  function create_meme_element(prompt) {
    let div = document.createElement("div");
    div.classList.add("meme-container");

    let img = document.createElement("img");
    img.classList.add("prompt-meme");
    img.src = prompt.imgSrc;
    div.appendChild(img);

    return div;
  }

  function create_meme_text_fields(prompt, container, field_type, prompt_answers) {
    let text_fields = [];
    let font_size = 16;
    let pad = font_size / 4;
    prompt["text_fields"].forEach((text_field, idx) => {

      let elm_text_field = {};

      elm_text_field = document.createElement("input");
      elm_text_field.setAttribute("type", "text");
      elm_text_field.classList.add("prompt-meme-text-field");

      if (field_type === "input") {
        elm_text_field.classList.add("text-field-red")
        elm_text_field.value = "meme here";
        elm_text_field.addEventListener("input", e => {
          e.target.style.left = `calc(${e.target.def_x} - ${e.target.value.length * pad}px)`;
          e.target.style.width = 24 + (e.target.value.length * pad * 2) + "px";
        })
      }
      if (field_type === "p") {
        elm_text_field.value = prompt_answers[idx];
      }

      elm_text_field.style.left = `calc(${text_field.x} - ${elm_text_field.value.length * pad}px)`;
      elm_text_field.style.top = text_field.y;
      elm_text_field.style.width = 24 + (elm_text_field.value.length * pad * 2) + "px";

      elm_text_field.def_x = text_field.x;
      elm_text_field.def_y = text_field.y;

      text_fields.push(elm_text_field);
      container.appendChild(elm_text_field);
    })
    return text_fields;
  }

  function host_create_meme_text_fields(prompt, container, prompt_answer) {
    create_meme_text_fields(prompt, container, "p", prompt_answer);
  }

  function host_create_vote_fields(container) {
    let elm = create_and_append(container, "div");
  
    elm.classList.add("meme-vote-container");
  
    elm.appendChild(host_create_vote_field(VOTE_LIKE));
    elm.appendChild(host_create_vote_field(VOTE_HEART));
    elm.appendChild(host_create_vote_field(VOTE_ANGRY));
  }

  function host_create_vote_field(vote_type) {
    let elm_vote = document.createElement("div");

    let elm_text = document.createElement("h3");
    elm_text.innerHTML = emojis[vote_type];

    elm_vote.appendChild(elm_text);

    let elm_number = document.createElement("p");
    elm_number.id = "vote_" + vote_type;
    elm_number.innerHTML = "0";

    elm_vote.appendChild(elm_number)

    return elm_vote;
  }

  function host_update_vote_field(vote_type, number) {
    let new_number = Number(select("#vote_" + vote_type).innerHTML) + 1;
    select("#vote_" + vote_type).innerHTML = new_number;
  }

  function host_create_prompt(container) {

    let elm_game_instruction = document.createElement("h1");
    elm_game_instruction.id = "game_instruction"

    let elm_game_timer = document.createElement("h1");
    elm_game_timer.id = "game_timer";

    container.appendChild(elm_game_instruction);
    container.appendChild(elm_game_timer);
  }


  function create_meme_submit_button(container, text_fields) {
    let btn_submit = document.createElement("button");
    btn_submit.innerText = "submit";
    btn_submit.addEventListener("click", e => {
      let answer = text_fields.map(elm => elm.value);
      socket.emit("prompt_answer", answer);
      user_clear_screen();
    })
    btn_submit.classList.add("prompt-meme-btn");
    btn_submit.classList.add("login-input");
    btn_submit.classList.add("login-btn");
    btn_submit.classList.add("login-width-btn");
    container.appendChild(btn_submit);
  }

  function user_clear_screen() {
    select("#prompt-container").innerHTML = "";
  }

  function host_create_user_score(score) {

    let div = document.createElement("div");
    div.classList.add("flex")
    div.classList.add("f-2rem");
    div.classList.add("player-score");

    let elm_username = create_and_append(div, "p");
    elm_username.innerHTML = score.username;

    let elm_like = create_and_append(div, "p");
    elm_like.innerHTML = `${emojis[VOTE_LIKE]} ${score[VOTE_LIKE]}`;

    let elm_heart = create_and_append(div, "p");
    elm_heart.innerHTML = `${emojis[VOTE_HEART]} ${score[VOTE_HEART]}`;

    let elm_angry = create_and_append(div, "p");
    elm_angry.innerHTML = `${emojis[VOTE_ANGRY]} ${score[VOTE_ANGRY]}`;

    return div;
  }

  function host_create_winners(vote_type, players) {
    let div = document.createElement("div");
    let h3_vote_type = create_and_append(div, "h3");

    h3_vote_type.innerHTML = `most ${emojis[vote_type]}:`;

    players.forEach(player => {
      let div_player = create_and_append(div, "div");
      let p_username = create_and_append(div_player, "p");
      p_username.innerHTML = player.username;
      let p_score = create_and_append(div_player, "p");
      p_score.innerHTML = player.votes;
    })

    return div;
  }

  function host_create_user_lobby_label(text) {
    let c_time = new Date();
    let time = c_time.getHours() + ":" + c_time.getMinutes() + "AM/PM";
    let html = `<p class="lobby-user">the group</p>
                <p>${text}</p>
                <p class="text-right-muted">${time}</p>`;
    let elm = document.createElement("div");
    elm.classList.add("lobby-message");
    elm.innerHTML = html;
    return elm;
  }

  function load_sounds() {
    sounds.bg = new Audio("/sounds/bg.wav");
    sounds.game_start = new Audio("/sounds/start_game.wav");
    //sounds.vote = new Audio("/sounds/vote.wav");
    //sounds.player_connected = 
    //sounds.player_disconnected = new Audio("/sounds/player_disconnected.wav");
  }

  async function load_host(roomNumber) {
    load_sounds();

    sounds.bg.play();
    sounds.bg.loop = true;

    let hostHTML = await fetch("/host.html").then(data => data.text())
    document.body.innerHTML = hostHTML;
    select("#room_number").innerHTML = roomNumber;

    select("#start_game_btn").on("click", e => {
      socket.emit("start_game");
    })

    socket.on("user-connected", data => {
      new Audio("/sounds/player_connected.wav").play();
      let text_message = `<b>${data.username}</b> connected to the room.`;
      let elm_message = host_create_user_lobby_label(text_message);
      select("#users").appendChild(elm_message);
    })

    socket.on("user-disconnected", data => {
      new Audio("/sounds/player_disconnected.wav").play();
      let text_message = `<b>${data.username}</b> disconnected from the room.`;
      let elm_message = host_create_user_lobby_label(text_message);
      select("#users").appendChild(elm_message);
    })

    socket.on("not-enough-to-start-game", data => {
      alert("not enough players minimum is 4")
    })

    socket.on("start-game", data => {
      sounds.bg.pause();
      sounds.game_start.play();
      select("#lobby").setAttribute("hidden", true);
      select("#game").removeAttribute("hidden");
    })

    socket.on("prompt", prompt => {
      host_clear_screen();
      host_create_prompt(select("#game"));
      select("#game_instruction").innerHTML = "<p>Look at your phone you have a meme</p><p>Fill the text field with your dankest ideas!</p>"
    })

    socket.on("prompt-timer-tick", timer => {
      let current_time = timer.current_time;
      select("#game_timer").innerHTML = `${Math.floor(current_time / 60)} : ${current_time % 60}`;
    })

    socket.on("start-vote", vote => {
      host_clear_screen();

      let elm_username = document.createElement("h1");
      elm_username.innerHTML = vote.username;
      select("#game").appendChild(elm_username);

      let elm = create_meme_element(vote.prompt);
      select("#game").appendChild(elm);

      host_create_meme_text_fields(vote.prompt, elm, vote.promp_answer);
      host_create_vote_fields(select("#game"));
    })

    socket.on("player-vote", vote => {
      new Audio("/sounds/vote.wav").play();
      host_update_vote_field(vote.vote_type);
    })

    socket.on("show-score", data => {
      new Audio("/sounds/score.wav").play();
      host_clear_screen();
      data.scores.forEach(score => {
        let elm_score = host_create_user_score(score);
        select("#game").appendChild(elm_score);
      })
    })

    socket.on("show-winners", data => {
      host_clear_screen();

      let container = document.createElement("div");
      container.classList.add("winners-contianer");
      container.appendChild(host_create_winners(VOTE_LIKE, data.like))
      container.appendChild(host_create_winners(VOTE_HEART, data.heart))
      container.appendChild(host_create_winners(VOTE_ANGRY, data.angry))
      select("#game").appendChild(container);

      let p_text = create_and_append(select("#game"), "p");
      p_text.classList.add("f-2rem");
      p_text.innerHTML = "Thank you for playing enjoy GGJ 2019!";
      
      
      select("#game").appendChild(p_text);
    })

  }

  function host_clear_screen() {
    select("#game").innerHTML = "";
  }

})