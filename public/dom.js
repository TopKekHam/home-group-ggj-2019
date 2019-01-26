document.on = (event_name, callback) => {
  this.addEventListener(event_name, callback);
}

function select(selector) {

  let items = document.querySelectorAll(selector);

  items.forEach(item => {
    item.on = (event_name, callback) => {
      item.addEventListener(event_name, callback);
    }
  })

  if (items.length == 1) {
    items = items[0];
  }

  return items;
}

function create_and_append(container , type) {
  let elm = document.createElement(type);
  container.appendChild(elm);
  return elm;
}

function make_obserable(item) {

  if (typeof item !== "object")
    throw new Error("You can only make object obserable");

  item.subs = [];

  item.notify = (data) => {
    item.subs.forEach(sub => {
      sub(data);
    })
  }

  item.sub = (callback) => {
    item.subs.push(callback);
  }
}

function make_event_emmiter(item) {

  let event_emmiter = {}

  if (item !== undefined) {
    if (typeof item !== "object")
      throw new Error("You can only make object obserable");
    event_emmiter = item;
  }

  event_emmiter.events = {}

  event_emmiter.on = (event_name, callback) => {
    if(event_emmiter[event_name] === undefined)
      event_emmiter[event_name] = [];

    event_emmiter[event_name].push(callback);
  }

  event_emmiter.emit = (event_name, data) => {
    if(event_emmiter[event_name] !== undefined) {
      event_emmiter[event_name].forEach(callback => {
        callback(data);
      })
    }
  }

  return event_emmiter;
}