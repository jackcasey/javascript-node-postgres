Storage.prototype.setObject = function(key, value) {
  this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function(key) {
  var value = this.getItem(key);
  return value && JSON.parse(value);
}

function setDay(dateString, shareString) {
  const days = localStorage.getObject("days");
  days[dateString] = shareString;
  localStorage.setObject("days", days);
}

function getNumDays() {
  var days = localStorage.getObject("days");
  if (days == null) return 0;
  return Object.keys(days).length || 0;
}

function requestCreateAccount(phrase, callback) {
  var xhr = new XMLHttpRequest();
  // add phrase query parameter
  vm.fetching(true);
  xhr.open("POST", "/add_user?phrase=" + phrase, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var data = JSON.parse(xhr.responseText);
      vm.fetching(false);
      callback(data);
    }
  };
  xhr.send();

}

function requestNewAccountPhrase(callback) {
  var xhr = new XMLHttpRequest();
  vm.fetching(true);
  xhr.open("GET", "/generate_phrase", true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var data = JSON.parse(xhr.responseText);
      vm.fetching(false);
      callback(data.mnemonic);
    }
  };
  xhr.send();
}

function requestConnectToAccount(phrase, callback) {
  var xhr = new XMLHttpRequest();
  // add phrase query parameter
  vm.fetching(true);
  xhr.open("GET", "/get_user?phrase=" + phrase, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var data = JSON.parse(xhr.responseText);
      vm.fetching(false);
      if (data.days) {
        ingestDays(data.days);
      }
      callback(data);
    }
  };
  xhr.send();
}

function ingestDays(newDays) {
  const days = localStorage.getObject("days");
  Object.entries(newDays).forEach(function([key, value]) {
    days[key] = value;
  });
  localStorage.setObject("days", days);
  if (vm) {
    vm.checkDone();
    vm.ended.valueHasMutated();
  }
}

function pushDays() {
  const days = localStorage.getObject("days");
  var xhr = new XMLHttpRequest();
  // add phrase query parameter
  if (vm)
    vm.fetching(true);
  var phrase = localStorage.getItem("accountPhrase");
  if (phrase == null) {
    return;
  }
  xhr.open("POST", "/add_days?phrase=" + phrase, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var data = JSON.parse(xhr.responseText);
      if (vm)
        vm.fetching(false);
      if (data.days) {
        ingestDays(data.days);
      }
    }
  };
  const body = JSON.stringify(days);
  console.log("POSTING: body: \n" + body);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(body);
}


var vm;

function ViewModel() {
  var self = this;

  // check for data management URL param
  // check for custom phrase
  self.debug = ko.observable(true);
  // self.debug(searchParams.has("debug"));

  let searchParams = new URLSearchParams(document.location.search);

  //self.debug = searchParams.has("debug");

  const NUM_CATS = 5;
  const NUM_FOODS = 10;

  const FOODS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const BIRTHDAY_COUNT = 365;

  self.dateString = ko.observable("");
  self.guessesString = "";

  self.foods = ko.observableArray();

  self.started = ko.observable(false);
  self.won = ko.observable(false);
  self.lost = ko.observable(false);
  self.ended = ko.observable(false);

  self.timeStart = ko.observable(-1);
  self.timeEnd = ko.observable(-1);

  self.accountSetup = ko.observable(false);
  self.candidatePhrase = ko.observable(null);
  self.currentPhrase = ko.observable(localStorage.getItem("accountPhrase") || null);
  self.synced = ko.computed(() => self.currentPhrase() != null);
  self.connectingAccount = ko.observable(false);
  self.creatingAccount = ko.observable(false);
  self.error = ko.observable("");
  self.fetching = ko.observable(false);

  self.holiday = false;
  self.holidayText = "";
  self.itemCategory = "food";

  self.nearbyGuessEmoji = "😾";
  self.incorrectGuessEmoji = "🐾";
  self.correctGuessEmoji = "😻";

  /* XMAS */
  // self.holiday = true;
  // self.correctGuessEmoji = "😸";
  // self.itemCategory = "item";
  // self.holidayText = "🔔 Holiday Edition 🔔";

  /* HALLOWEEN */
  // self.holiday = true;
  // self.correctGuessEmoji = "🙀";
  // self.itemCategory = "item";
  // self.holidayText = "🎃 Holiday Edition 🎃";

  /* LUNAR NEW YEAR */
  // self.holiday = true;
  // self.incorrectGuessEmoji = "🧧";
  // self.itemCategory = "item";
  // self.holidayText = "🧧 Happy Lunar New Year! 🧧";

  self.timeString = ko.computed({
    read: function () {
      if (self.timeStart() == -1) return "";

      var t = Date.now();

      var t = self.timeEnd() == -1 ? Date.now() : self.timeEnd();

      var dt = t - self.timeStart();

      var secs = Math.floor(dt / 1000);
      var mins = Math.floor(secs / 60);

      secs = secs - mins * 60;

      if (secs < 10) return "" + mins + ":0" + secs;

      return "" + mins + ":" + secs;
    },
  });

  self.restarts = ko.observable(-1);

  self.shareString = ko.observable("");

  // preferred food
  self.target = ko.observableArray();

  // guess
  self.guesses = ko.observableArray();

  // food to choose
  self.palette = ko.observableArray();

  // cat of the day
  self.cat = ko.observable();

  // 365th day?
  self.daysPlayed = ko.observable(getNumDays() + (self.won() ? 0 : 1));
  self.yearPlayed = ko.observable(self.daysPlayed() == BIRTHDAY_COUNT);

  // shuffle foods order in palette
  var shuffled = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => 0.5 - Math.random());
  for (let i = 0; i < NUM_FOODS; i++) {
    self.palette.push({ sample: shuffled[i] });
  }

  self.guessRow = ko.observable(0);
  self.guessCol = ko.observable(0);

  self.help = function () {
    self.started(false);
  };

  self.start = function () {
    self.started(true);
    self.ended(false);

    //self.guessesString = "";
  };

  self.end = function () {
    self.ended(true);

    console.log("end");
  };

  self.numDays = ko.pureComputed(function () {
    if (self.ended())
      // this just forces ko to compute numDays by adding an observable
      return getNumDays();
    else return getNumDays();
  }, self).extend({notify: 'always'});

  // Set up a new level
  self.restart = function () {
    self.restarts(self.restarts() + 1);

    self.dateString(new Date().toDateString());

    self.rng = new Math.seedrandom(self.dateString());

    //shuffle foods
    self.foods([...FOODS]);

    self.target.removeAll();
    for (let i = 0; i < NUM_CATS; i++) {
      self.target.push(Math.floor(self.rng() * NUM_FOODS)); // which foods are the cats after
    }

    self.guessRow(0);
    self.guessCol(0);
    self.guesses.removeAll();
    for (let j = 0; j < NUM_CATS; j++) {
      var guess = ko.observableArray();

      for (let i = 0; i < NUM_CATS; i++) {
        guess.push({
          sample: ko.observable(-1),
          status: ko.observable("unchecked"),
        });
      }

      self.guesses.push(guess);
    }

    self.won(false);
    self.lost(false);

    self.ended(false);

    // set cat of the day
    self.cat(Math.floor(self.rng() * NUM_CATS));

    self.checkDone();
  };

  self.checkDone = function () {
    // don't show if player has won today's puzzle
    if (localStorage.getObject("days")[self.dateString()] != null) {
      self.won(true);
      self.ended(true);
    }
  };

  self.restart();

  self.chooseSample = function (data, event) {
    if (self.guessCol() < NUM_CATS) {
      var guess = self.guesses()[self.guessRow()];
      var guessItem = guess()[self.guessCol()];

      guessItem.sample(data.sample);

      self.guessCol(self.guessCol() + 1);
    }
  };

  self.back = function () {
    var col = self.guessCol() - 1;

    if (col >= 0) {
      var guess = self.guesses()[self.guessRow()];
      var guessItem = guess()[col];

      guessItem.sample(-1);

      self.guessCol(col);
    }
  };

  //self.firstGuess = true;

  self.submitGuess = function () {
    var numCorrect = 0;

    var guess = self.guesses()[self.guessRow()];

    if (self.timeStart() == -1) {
      self.timeStart(Date.now());

      /*
                    window.setInterval(function() {
                        console.log(self.timeString());
                    }, 10);
                    */
    }

    for (let i = 0; i < NUM_CATS; i++) {
      var target = self.target()[i];
      var guessItem = guess()[i];

      if (target == guessItem.sample()) {
        guessItem.status("correct");

        self.guessesString += self.correctGuessEmoji;

        numCorrect++;
      } else {
        guessItem.status("incorrect");

        var max_d = NUM_CATS;

        for (let j = 0; j < NUM_CATS; j++) {
          var otherItem = guess()[j];

          if (target == otherItem.sample()) {
            var d = Math.abs(i - j);

            if (d < max_d) {
              max_d = d;

              self.guessesString += self.nearbyGuessEmoji;

              if (j < i) {
                guessItem.status("left");
              } else {
                guessItem.status("right");
              }

              break;
            }
          }
        }

        if (guessItem.status() == "incorrect") {
          self.guessesString += self.incorrectGuessEmoji;
        }
      }
    }

    self.guessesString += "\n";
    console.log(self.guessesString);

    // check if complete
    if (numCorrect == 5) {
      console.log("All 5 correct! Congratulations!");
      self.won(true);

      self.timeEnd(Date.now());

      var numGuesses = 5 * self.restarts() + self.guessRow() + 1;

      var shareString = "https://purrdle.app\n";

      shareString += self.dateString() + "\n";

      shareString += self.guessesString;

      shareString += "Solved in " + self.timeString() + "\n";

      const days = getNumDays();

      if (days == 0) shareString += "1 day of happy cats!";
      else shareString += days + 1 + " days of happy cats!";

      if (self.yearPlayed()) shareString += " 🎂";

      if (days + 1 >= 100)
        shareString += "\n⭐ Feline Friend (100 days)";

      if (days + 1 >= 200)
        shareString += "\n💖 Kitty Caretaker (200 days)";

      if (days + 1 >= 300)
        shareString += "\n🎉 Purrfectionist (300 days)";

      if (days + 1 >= 400)
        shareString += "\n😺 Pawsitively Purrsistent (400 days)";

      if (days + 1 >= 500)
        shareString += "\n😸 Purrfect Pal (500 days)";

      if (days + 1 >= 600)
        shareString += "\n🌟 Catty Companion (600 days)";

      /*
      if (days + 1 >= 700)
        shareString += "\n (700 days)";

      if (days + 1 >= 800)
        shareString += "\n (800 days)";

      if (days + 1 >= 900)
        shareString += "\n (900 days)";

      if (days + 1 >= 1000)
        shareString += "\n (1000 days)!";
      */

      // shareString += "\n" + getMedals();

      self.shareString(shareString);

      setDay(self.dateString(), shareString);
      this.ended.valueHasMutated();

      console.log(localStorage);
      // update exportURI
      updateExportURI();

    } else if (self.guessRow() == 4) {
      self.lost(true);
    }

    // next row
    self.guessRow(self.guessRow() + 1);
    self.guessCol(0);
  };

  self.share = function () {
    // doesn't work on Android (Chrome)
    //navigator.clipboard.writeText(localStorage.getItem(self.dateString()));//self.shareString());

    const element = document.createElement("textarea");
    const days = localStorage.getObject("days");
    element.value = days[self.dateString()];
    document.body.appendChild(element);
    element.select();
    document.execCommand("copy");
    document.body.removeChild(element);
    alert("📋 Results copied to clipboard!");
  };

  /*
    // temporary measure for score recovery
    self.recoverCount = 0;

    self.recover = function() {
        self.recoverCount++;

        console.log(self.recoverCount);

        if (self.recoverCount == 10) {

            for (i = 0; i < 100; i++)
            {
                localStorage.setItem("recover_" + i, "");
            }

            alert("Secret unlocked: happy cats rescued!");
            self.recoverCount = -1;
        }
    }

    window.setInterval(function() {
        if (self.recoverCount > 0) {
            self.recoverCount--;
            console.log(self.recoverCount);
        }
    }, 500);
  */

  self.loadAccountSetup = function() {
    this.candidatePhrase(null);
    this.accountSetup(!this.accountSetup());
  };

  self.createAccount = function() {
    console.log("createAccount");
    this.creatingAccount(true);
    this.candidatePhrase(null);
    requestNewAccountPhrase((mnemonic) => {
      this.candidatePhrase(mnemonic);
    });
  };

  self.connectToAccount = function() {
    this.connectingAccount(true);
  };

  self.newCandidatePhrase = function() {
    this.createAccount();
  }

  self.acceptPhrase = function() {
    this.error(null);
    requestCreateAccount(this.candidatePhrase(), (data) => {
      if (data.error) {
        this.error(data.error);
      } else {
        localStorage.setItem("accountPhrase", this.candidatePhrase());
        this.currentPhrase(this.candidatePhrase());
        pushDays();
      }
    });
  }

  self.tryConnect = function() {
    this.error(null);
    requestConnectToAccount(this.candidatePhrase(), (data) => {
      if (data.error) {
        this.error(data.error);
      } else {
        localStorage.setItem("accountPhrase", this.candidatePhrase());
        this.currentPhrase(this.candidatePhrase());
        this.ended.valueHasMutated();
        pushDays();
      }
    });
  };

}

function syncData() {
  if (localStorage.getItem("accountPhrase") != null) {
    pushDays();
  }
}

function migrateData() {
  var currentVersion = localStorage.getItem("saveVersion") || "0";
  // Migrate 0 => 1
  if (currentVersion == "0") {
    const days = {};
    Object.keys(localStorage).forEach(function (key) {
      days[key] = localStorage.getItem(key);
    });
    localStorage.clear();
    localStorage.setObject("days", days);
    localStorage.setItem("saveVersion", "1");
  }
}

// hook up exporter
function updateExportURI()
{
  migrateData();
  var data = JSON.stringify(localStorage.getItem("days"));

  const link = document.getElementById("exporter")
  if (link == null) return;

  link.setAttribute('download', 'purrdle_export.json');
  link.setAttribute('href', 'data:,' + encodeURI(data));
}

updateExportURI();

function pasteData() {
  if (confirm("Warning: importing data will overwrite existing progress. Are you sure you want to import data?"))
  {
    var data = prompt("Paste data here:");
    if (data != null) {
      localStorage.clear();
      _importData(JSON.parse(data));
      alert("Data imported. Returning to Purrdle.");
      window.location = window.location + "";
    }
  }
}

function copyData() {
  migrateData();
  var data = JSON.stringify(localStorage.getItem("days"));
  const element = document.createElement("textarea");
  element.value = data;
  document.body.appendChild(element);
  element.select();
  document.execCommand("copy");
  document.body.removeChild(element);
  alert("Data copied to clipboard!");
}

// hook up importer
function _importData(data) {
  console.log("_importData");
  console.log(data);

  Object.entries(data).forEach(function([key, value]) {
    localStorage.setItem(key, value);
  });
  migrateData();
}

function accountSetup() {
  vm.loadAccountSetup();
}

function getMedals() {
  const days = localStorage.getObject("days");

  var easter = isEmojiInDays(days, "🐰") || playedInTimePeriod("2024-04-04", "2024-04-05");
  var halloween = isEmojiInDays(days, "🙀") || playedInTimePeriod("2024-10-21", "2024-11-01");

  medals = [];
  if (easter) medals.push("🐰");
  if (halloween) medals.push("🎃");
  return medals.join(",");
}

function playedInTimePeriod(start, end) {
  start = new Date(start);
  end = new Date(end);
  const days = localStorage.getObject("days");
  var count = 0;
  Object.keys(days).forEach((key) => {
    var date = new Date(key);
    if (date >= start && date <= end) {
      count++;
    }
  });
  return count > 0;
}

function isEmojiInDays(days, emoji) {
  var found = false;
  Object.keys(days).forEach((key) => {
    if (days[key].includes(emoji)) {
      found = true;
    }
  });
  return found;
}

function importData() {
  const [file] = document.querySelector("input[type=file]").files;
  const reader = new FileReader();

  reader.onload = function(event) {
    console.log("onload");
    console.log(event.target.result);

    if (confirm("Warning: importing data will overwrite existing progress. Are you sure you want to import data?"))
    {
      localStorage.clear();

      let parsedJSON = JSON.parse(event.target.result);
      _importData(parsedJSON);

      alert("Data imported. Returning to Purrdle.");

      window.location = window.location.href.split("?")[0];
    }
    else
    {
      alert("Import cancelled.");
    }
  }

  reader.readAsText(file);
}

function clearLocalData() {
  if (confirm("Warning: this will clear all local data. Are you sure you want to clear all data?"))
  {
    localStorage.clear();
    document.location.reload();
  }
}

function addDummyDay() {
  var days = localStorage.getObject("days");
  days["test: " + new Date().getTime()] = "Dummy day!";
  localStorage.setObject("days", days);
  vm.ended.valueHasMutated();
}

window.setTimeout(() => {
    vm = new ViewModel();
    ko.applyBindings(vm);
    document.getElementsByTagName("body")[0].classList.remove("loading");
}, 500);

migrateData();
syncData();
