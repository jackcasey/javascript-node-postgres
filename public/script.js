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
  return Object.keys(localStorage.getObject("days")).length;
}

function ViewModel() {
  var self = this;

  // check for data management URL param
  // check for custom phrase
  self.debug = ko.observable(false);

  let searchParams = new URLSearchParams(document.location.search);

  self.debug = searchParams.has("debug");

  const NUM_CATS = 5;
  const NUM_FOODS = 10;

  // Holiday seasons!
  //const FOODS = [ "🍉", "🍰", "🍩", "🍥", "🍤", "🍣", "🍙", "🥪", "🍕", "🥞" ];
  //const FOODS = ["🍗", "🍬", "🎉", "🥛", "🍂", "🧶", "🍪", "🧸", "🍫", "🎁"];
  //const FOODS = ["🍫", "🍬", "🎉", "🥚", "🌱", "🥕", "🎀", "🔔", "🌼", "🎁"];

  const CATS = ["Titan", "Apollo", "Oliver", "Donna", "Luna"];
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
  }, self);

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
        self.guessesString += "😻";

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

              self.guessesString += "😾";

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
          self.guessesString += "🐾";
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

      self.shareString(shareString);

      setDay(self.dateString(), shareString);

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

// hook up importer
function _importData(data) {
  console.log("_importData");
  console.log(data);

  Object.entries(data).forEach(function([key, value]) {
    localStorage.setItem(key, JSON.stringify(value));
  });
  migrateData();
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

window.setTimeout(() => {
    ko.applyBindings(new ViewModel());
    document.getElementsByTagName("body")[0].classList.remove("loading");
}, 500);

migrateData();
