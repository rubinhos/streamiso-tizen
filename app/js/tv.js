// What only exists on a Samsung TV: the remote's keys, the screen saver, closing the app. On a PC these
// do nothing, and keyboard keys stand in for the remote.
(function (S) {
  "use strict";

  // Everything but the first group has to be registered. Codes are from Samsung's remote control guide.
  var KEYS = {
    37: "left", 38: "up", 39: "right", 40: "down", 13: "enter", 10009: "back",
    10252: "playpause", 415: "play", 19: "pause", 413: "stop",
    417: "forward", 412: "rewind", 10233: "next", 10232: "prev", 457: "info",
    27: "back"  // Esc on a PC keyboard
  };
  // Letters for trying the media keys on a PC keyboard.
  var PC_KEYS = { " ": "playpause", s: "stop", f: "forward", r: "rewind", n: "next", p: "prev", i: "info" };
  var REGISTER = ["MediaPlayPause", "MediaPlay", "MediaPause", "MediaStop", "MediaFastForward", "MediaRewind",
    "MediaTrackNext", "MediaTrackPrevious", "Info"];

  function hasTizen() { return typeof window.tizen !== "undefined" && !!window.tizen.application; }

  S.tv = {
    isTv: hasTizen,
    keyName: function (e) { return KEYS[e.keyCode] || (hasTizen() ? null : PC_KEYS[e.key]) || null; },
    // Only asks for the keys this TV has: registering an unknown key throws.
    registerKeys: function () {
      if (!hasTizen() || !window.tizen.tvinputdevice) return;
      try {
        var supported = {};
        window.tizen.tvinputdevice.getSupportedKeys().forEach(function (k) { supported[k.name] = true; });
        window.tizen.tvinputdevice.registerKeyBatch(REGISTER.filter(function (name) { return supported[name]; }));
      } catch (e) { /* the media keys stay with the TV, and the on-screen controls still work */ }
    },
    keepScreenOn: function (on) {
      try {
        var common = window.webapis.appcommon;
        var state = common.AppCommonScreenSaverState;
        common.setScreenSaver(on ? state.SCREEN_SAVER_OFF : state.SCREEN_SAVER_ON);
      } catch (e) { /* not on a TV */ }
    },
    exit: function () {
      S.tv.exited = true;
      try { window.tizen.application.getCurrentApplication().exit(); } catch (e) { /* not on a TV */ }
    }
  };
})(window.Streamiso);
