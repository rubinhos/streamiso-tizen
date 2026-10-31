// Shows the WebRTC stream. There are two ways, with the same interface:
//   open(url, mount, events) -> { unlock(), close() }
//   events: onReady(), onAudio(ok), onKey(action)
//
// The iframe is the route docs/API.md describes. The Neko page needs a newer engine than Tizen 5.5 gives
// installed apps (it uses ?. ?? and ||=), and it would not load there. So when this engine cannot parse that
// syntax, the app talks to Neko by itself: a WebSocket for the signalling, RTCPeerConnection and a <video>.
(function (S) {
  "use strict";

  function parses(code) {
    try { new Function(code); return true; } catch (e) { return false; }
  }

  function canLoadNekoPage() {
    return parses("var a={};a?.b;a??1;a.c||=1;");
  }

  function openIframe(url, mount, events) {
    var frame = document.createElement("iframe");
    frame.tabIndex = -1;
    frame.setAttribute("allow", "autoplay");
    frame.src = url;
    function onMessage(e) {
      var data = e.data;
      if (e.source !== frame.contentWindow || !data || data.streamiso !== true) return;
      if (data.type === "video-ready") events.onReady();
      else if (data.type === "audio-state") events.onAudio(!!data.ok);
      // A key that reached the page while it held the focus, before the app took the focus back.
      else if (data.type === "key" && typeof data.action === "string") events.onKey(data.action);
    }
    window.addEventListener("message", onMessage);
    mount.appendChild(frame);
    return {
      unlock: function () {
        if (frame.contentWindow) frame.contentWindow.postMessage({ streamiso: true, type: "start" }, "*");
      },
      close: function () {
        window.removeEventListener("message", onMessage);
        frame.src = "about:blank";
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      }
    };
  }

  // Neko's login answer can only be read with NEKO_SERVER_CORS set. Without it, each attempt still leaves a
  // session on the server, so the app stops trying after the first failure.
  var loginBlocked = false;

  function login(base, user, password) {
    if (loginBlocked) return Promise.resolve(null);
    return fetch(base + "/api/login", {
      method: "POST",
      // text/plain needs no preflight, which Neko answers with an error when CORS is off.
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ username: user, password: password })
    }).then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (data) {
      return data && data.token ? data.token : null;
    }).catch(function () {
      loginBlocked = true;
      return null;
    });
  }

  function openClient(url, mount, events) {
    var parts = /^(https?):\/\/([^\/?#]+)/i.exec(url);
    var base = parts[1] + "://" + parts[2];
    var user = (/[?&]usr=([^&]*)/.exec(url) || [])[1] || "tv";
    var password = decodeURIComponent((/[?&]pwd=([^&]*)/.exec(url) || [])[1] || "");
    var socketBase = base.replace(/^http/i, "ws");
    var closed = false, ws = null, pc = null, token = null, legacy = false, reported = null;

    var video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    // Muted first, because an engine may refuse to autoplay with sound. unlock() turns the sound on.
    video.muted = true;
    mount.appendChild(video);

    function reportAudio() {
      var ok = !video.paused && !video.muted;
      if (ok !== reported) { reported = ok; events.onAudio(ok); }
    }
    var audioTimer = setInterval(reportAudio, 1000);

    video.addEventListener("playing", function ready() {
      if (!video.videoWidth) { setTimeout(ready, 200); return; }
      events.onReady();
    });

    function send(event, payload) {
      var body = legacy ? payload : { event: event, payload: payload };
      if (legacy) body.event = event;
      if (ws && ws.readyState === 1) ws.send(JSON.stringify(body));
    }

    function onOffer(sdp) {
      if (!pc) {
        pc = new RTCPeerConnection({ iceServers: [], sdpSemantics: "unified-plan" });
        pc.onicecandidate = function (e) {
          if (!e.candidate) return;
          if (legacy) send("signal/candidate", { data: JSON.stringify(e.candidate) });
          else send("signal/candidate", e.candidate.toJSON());
        };
        pc.ontrack = function (e) {
          // One stream for both tracks: assigning srcObject again would abort the pending play().
          if (!video.srcObject) video.srcObject = new MediaStream();
          video.srcObject.addTrack(e.track);
          var played = video.play();
          if (played && played.catch) played.catch(function () { /* unlock() tries again */ });
        };
      }
      pc.setRemoteDescription({ type: "offer", sdp: sdp }).then(function () {
        return pc.createAnswer();
      }).then(function (answer) {
        return pc.setLocalDescription(answer);
      }).then(function () {
        if (legacy) send("signal/answer", { displayname: user, sdp: pc.localDescription.sdp });
        else send("signal/answer", { sdp: pc.localDescription.sdp });
      }).catch(function () { /* the player's timeout reports a stream that never starts */ });
    }

    function connect(socketUrl) {
      ws = new WebSocket(socketUrl);
      ws.onopen = function () { if (!legacy) send("signal/request", { video: {}, audio: {} }); };
      ws.onmessage = function (e) {
        var msg = JSON.parse(e.data);
        var data = legacy ? msg : (msg.payload || {});
        if (msg.event === "system/heartbeat") send("client/heartbeat", {});
        else if (msg.event === "signal/provide" || msg.event === "signal/offer") onOffer(data.sdp);
        else if (msg.event === "signal/candidate" && pc) {
          var candidate = legacy && typeof data.data === "string" ? JSON.parse(data.data) : data;
          pc.addIceCandidate(candidate).catch(function () { /* one bad candidate is not fatal */ });
        }
      };
    }

    login(base, user, password).then(function (result) {
      if (closed) {
        if (result) fetch(base + "/api/logout", { method: "POST", headers: { Authorization: "Bearer " + result } }).catch(function () {});
        return;
      }
      token = result;
      if (token) {
        connect(socketBase + "/api/ws?token=" + encodeURIComponent(token));
      } else {
        // The older socket takes the password in the URL, so it needs no login and no CORS.
        legacy = true;
        connect(socketBase + "/ws?password=" + encodeURIComponent(password) + "&username=" + encodeURIComponent(user));
      }
    });

    return {
      unlock: function () {
        video.muted = false;
        var played = video.play();
        if (played && played.catch) played.catch(function () { /* still blocked: reportAudio says so */ });
        setTimeout(reportAudio, 300);
      },
      close: function () {
        closed = true;
        clearInterval(audioTimer);
        if (ws) { ws.onmessage = null; ws.close(); }
        if (pc) pc.close();
        video.srcObject = null;
        if (video.parentNode) video.parentNode.removeChild(video);
        if (token) fetch(base + "/api/logout", { method: "POST", headers: { Authorization: "Bearer " + token } }).catch(function () {});
      }
    };
  }

  S.stream = {
    mode: function () {
      if (typeof window.RTCPeerConnection !== "function") return "none";
      return canLoadNekoPage() ? "iframe" : "client";
    },
    open: function (url, mount, events) {
      return (S.stream.mode() === "iframe" ? openIframe : openClient)(url, mount, events);
    },
    openClient: openClient,
    openIframe: openIframe
  };
})(window.Streamiso);
