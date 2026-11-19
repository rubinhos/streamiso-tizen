// The first screen on the first launch, and the Settings screen after that: the server's addresses and key.
(function (S) {
  "use strict";

  var onDone = null;
  var message;
  var editing = null;  // the field being typed in
  var choice = "auto";

  var CHOICE_NAMES = { auto: "Automatic", first: "Address", second: "Second address" };

  function input(id) { return S.$(id); }

  function diagnostics() {
    var lines = ["App version  0.1.0", "Engine       " + navigator.userAgent];
    var mode = S.stream.mode();
    lines.push("WebRTC       " + (mode === "none" ? "not available in this engine" : "available"));
    lines.push("Video route  " + (mode === "iframe" ? "Neko page in an iframe" : mode === "client" ? "built-in Neko client" : "none"));
    lines.push("Server       " + (S.api.server() || "none yet"));
    return lines.join("\n");
  }

  function showChoices() {
    S.$("settings-choice").textContent = "Use: " + CHOICE_NAMES[choice];
    S.$("settings-diag").textContent = diagnostics();
  }

  // Automatic, the address, the second address (only offered once one is typed).
  function nextServerChoice() {
    var list = input("server2-input").value.trim() ? S.api.choices : ["auto", "first"];
    choice = list[(list.indexOf(choice) + 1) % list.length];
    showChoices();
  }

  function startEditing(field) {
    S.focus.lock(true);
    editing = field;
    field.classList.add("editing");
    input(field.getAttribute("data-input")).focus();
  }

  function stopEditing() {
    if (!S.focus.isLocked() || !editing) return;
    var field = editing, el = input(field.getAttribute("data-input"));
    editing = null;
    S.focus.lock(false);
    field.classList.remove("editing");
    if (document.activeElement === el) el.blur();
    S.focus.focus(field);
    showChoices();
  }

  function fail(text) {
    message.className = "message";
    message.textContent = text;
  }

  // Checks the addresses that will be used, then saves. With Automatic, one of the two answering is enough.
  function save() {
    var first = S.api.normalize(input("server-input").value);
    var secondText = input("server2-input").value.trim();
    var second = secondText ? S.api.normalize(secondText) : "";
    var key = input("key-input").value.trim();
    if (!first) return fail("That does not look like an address. Try 192.168.0.10:8080.");
    if (secondText && !second) return fail("The second address does not look like an address. Try 100.101.102.103:8080.");
    if (choice === "second" && !second) choice = "auto";
    var list = choice === "first" || !second ? [first] : choice === "second" ? [second] : [first, second];
    message.className = "message ok";
    message.textContent = "Connecting to " + list.join(" or ") + "...";
    var problems = [];
    function attempt(i) {
      if (i >= list.length) return fail(problems.join("\n"));
      S.api.discsFrom(list[i], key).then(function () {
        S.api.save({ first: first, second: second, key: key, choice: choice, server: list[i] });
        input("server-input").value = first;
        input("server2-input").value = second;
        message.textContent = "";
        onDone();
      }, function (err) {
        if (err.kind === "network") {
          problems.push("No answer from " + list[i] + ". Check that StreamISO is running there.");
          attempt(i + 1);
        } else if (err.status === 403) {
          fail(list[i] + " refused the key: " + err.message + ".");
        } else {
          fail("The server answered with an error: " + err.message);
        }
      });
    }
    attempt(0);
  }

  S.settings = {
    init: function () {
      message = S.$("settings-message");
      showChoices();
      ["server-input", "server2-input", "key-input"].forEach(function (id) {
        input(id).addEventListener("blur", function () { setTimeout(stopEditing, 0); });
      });
      S.$("settings").addEventListener("click", function (e) {
        var act = e.target.closest("[data-act]");
        if (!act) return;
        var name = act.getAttribute("data-act");
        if (name === "edit") {
          // The TV's keyboard opens when the input gets the focus, so it gets it only on purpose.
          startEditing(act);
        } else if (name === "save") {
          save();
        } else if (name === "choice") {
          nextServerChoice();
        } else if (name === "cancel") {
          S.settings.back();
        }
      });
    },
    show: function (done) {
      onDone = done;
      var saved = S.api.saved();
      var configured = !!saved.first;
      input("server-input").value = saved.first.replace(/^http:\/\//, "");
      input("server2-input").value = saved.second.replace(/^http:\/\//, "");
      input("key-input").value = saved.key;
      choice = saved.choice;
      message.textContent = "";
      showChoices();
      S.$("settings-title").textContent = configured ? "Settings" : "Connect to your server";
      S.$("settings-back").hidden = !configured;
      S.show("settings");
      S.focus.setScope(S.$("settings"), configured ? S.$("settings-save") : S.$("server-field"));
    },
    back: function () {
      if (S.api.saved().first) onDone();
      else S.tv.exit();
    },
    // Keys while a field is being edited. The handler must not cancel them: the on-screen keyboard
    // needs them, and Samsung's guide says not to call preventDefault here.
    handleEditingKey: function (e) {
      var done = e.keyCode === 65376 || e.keyCode === 65385 || e.keyCode === 10009 || e.keyCode === 13 || e.keyCode === 27;
      if (done) stopEditing();
    },
    handleKey: function (name) {
      if (name === "back") S.settings.back();
      else if (name === "enter") S.focus.activate();
      else if (name === "left" || name === "right" || name === "up" || name === "down") S.focus.move(name);
    }
  };
})(window.Streamiso);
