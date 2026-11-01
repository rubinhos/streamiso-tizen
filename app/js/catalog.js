// The library: a grid of covers, DVDs first and then CDs.
(function (S) {
  "use strict";

  var discs = {};
  var lastId = null;
  var observer = null;
  var onOpen = null, onSettings = null;

  function element(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function buildCard(disc, playing) {
    var card = element("button", "card " + disc.kind);
    card.type = "button";
    card.tabIndex = -1;
    card.setAttribute("data-focusable", "");
    card.setAttribute("data-id", disc.id);

    var cover = element("span", "cover");
    var img = document.createElement("img");
    img.alt = "";
    img.setAttribute("data-src", S.api.coverUrl(disc));
    cover.appendChild(img);
    cover.appendChild(element("span", "tag", disc.kind === "cd" ? "CD" : "DVD"));
    if (disc.watched) cover.appendChild(element("span", "seen", disc.kind === "cd" ? "Listened" : "Watched"));
    if (disc.resume && disc.resume.pct) {
      var bar = element("span", "bar-resume");
      bar.style.width = Math.min(100, disc.resume.pct) + "%";
      cover.appendChild(bar);
    }
    card.appendChild(cover);
    card.appendChild(element("span", "card-title", disc.title));
    var note = disc.id === playing ? "Now open" : disc.resume ? "Continue at " + S.formatTime(disc.resume.time) : "";
    card.appendChild(element("span", "card-resume", note));

    card.addEventListener("click", function () { open(disc); });
    card.addEventListener("focus", function () { showDetail(disc); });
    return card;
  }

  function showDetail(disc) {
    lastId = disc.id;
    S.$("detail-title").textContent = disc.title;
    var meta = [];
    if (disc.artist) meta.push(disc.artist);
    if (disc.year) meta.push(disc.year);
    if (disc.kind === "cd" && disc.track_count) meta.push(disc.track_count + " tracks");
    if (disc.genres && disc.genres.length) meta.push(disc.genres.join(", "));
    S.$("detail-meta").textContent = meta.join("  ·  ");
    S.$("detail-text").textContent = disc.synopsis || "";
  }

  function open(disc) {
    if (!disc.resume) { onOpen(disc, false); return; }
    S.dialog.show({
      title: disc.title,
      text: "You stopped at " + S.formatTime(disc.resume.time) + ".",
      buttons: [
        { label: "Continue", action: function () { onOpen(disc, true); } },
        { label: "Start over", action: function () { onOpen(disc, false); } }
      ],
      onBack: function () {}
    });
  }

  function addSection(list, title, items, playing) {
    if (!items.length) return;
    list.appendChild(element("div", "section-title", title));
    var grid = element("div", "grid");
    items.forEach(function (disc) { grid.appendChild(buildCard(disc, playing)); });
    list.appendChild(grid);
  }

  // Covers load as they come near the screen: a big library would otherwise fetch them all at once.
  function loadCovers(list) {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var img = entry.target;
        img.src = img.getAttribute("data-src");
        observer.unobserve(img);
      });
    }, { root: S.$("catalog-scroll"), rootMargin: "500px 0px" });
    Array.prototype.forEach.call(list.querySelectorAll("img[data-src]"), function (img) { observer.observe(img); });
  }

  function render(data) {
    var list = S.$("catalog-list");
    list.innerHTML = "";
    discs = {};
    data.discs.forEach(function (d) { discs[d.id] = d; });
    addSection(list, "DVDs", data.discs.filter(function (d) { return d.kind !== "cd"; }), data.playing);
    addSection(list, "Music CDs", data.discs.filter(function (d) { return d.kind === "cd"; }), data.playing);
    if (!data.discs.length) {
      list.appendChild(element("div", "empty", "No discs found. Add images to the media folders on the server."));
      ["detail-title", "detail-meta", "detail-text"].forEach(function (id) { S.$(id).textContent = ""; });
    }
    loadCovers(list);
    var again = lastId && list.querySelector('[data-id="' + lastId + '"]');
    S.focus.setScope(S.$("catalog"), again || list.querySelector(".card") || S.$("catalog-settings"));
  }

  function showError(err) {
    S.focus.setScope(S.$("catalog"), S.$("catalog-settings"));
    S.dialog.show({
      title: err.kind === "network" ? "Server unreachable" : "The server answered with an error",
      text: err.kind === "network"
        ? "No answer from " + S.api.server() + ".\nCheck that StreamISO is running and that CORS_ORIGIN=null is in its .env file."
        : err.message,
      buttons: [
        { label: "Try again", action: function () { S.catalog.show(); } },
        { label: "Settings", action: onSettings }
      ],
      onBack: function () { S.tv.exit(); }
    });
  }

  S.catalog = {
    init: function (handlers) {
      onOpen = handlers.open;
      onSettings = handlers.settings;
      S.$("catalog-settings").addEventListener("click", onSettings);
    },
    show: function () {
      S.show("catalog");
      S.focus.setScope(S.$("catalog"), S.$("catalog-settings"));
      return S.api.discs().then(render, showError);
    },
    handleKey: function (name) {
      if (name === "back") S.tv.exit();
      else if (name === "enter") S.focus.activate();
      else if (name === "left" || name === "right" || name === "up" || name === "down") S.focus.move(name);
    }
  };
})(window.Streamiso);
