# Development

The app is plain HTML, CSS and JavaScript in `app/`, with no framework and no build step. It has no dependencies at run time
besides Samsung's own `tizen` and `webapis`. Keep the code to what Chromium M69 understands, the engine Samsung lists for 2020 TVs.

## Run it on a PC

The simulated server uses only Python's standard library. All its titles and covers are invented.

```sh
python tools/mock_server.py
# or
docker run --rm -p 8090:8090 -p 8091:8091 -v "$PWD:/repo:ro" python:3.12-slim python /repo/tools/mock_server.py
```

- **App:** <http://localhost:8090/app/>, with `localhost:8090` as the server's address.
- **Tests:** <http://localhost:8090/tests/>. They press keys in the real app, and check the focus and the commands sent.

## The remote

| Where | Arrows and OK | Back |
|---|---|---|
| Catalog | Move and open | Leave the app |
| Settings | Move, OK to type | Return to the catalog |
| DVD menu, bar closed | Go to the disc's menu | Open the bar |
| DVD film, bar closed | Arrows go to the disc, OK opens the bar | Open the bar |
| DVD, bar open | Move between the controls | Close the bar |
| CD | Move through the tracks and controls | Return to the catalog |

- The bar closes by itself after 6 seconds, and then the arrows go to the disc's menu again. Info also opens it.
- A menu is recognized by title 0 or no duration. Some menus report a duration, so for 5 seconds after an arrow, OK goes to
  the disc even during what looks like the film.
- The back arrow in the bar, or Stop, leaves a DVD.
- **Progress line:** press Up from the buttons to reach it, then Left and Right to move. The jump happens when you stop
  pressing, or right away with OK. Holding the key moves faster.
- Media keys work anywhere in the player, when the remote has them.
- On a PC keyboard: Esc is Back, Space is play or pause, and S, F, R, N, P and I are stop, forward, rewind, next, previous and info.

## The video

The app picks one of two routes. **Settings** shows which one it is using.

- **Neko page in an iframe,** as Streamiso's `docs/API.md` describes, on engines that can run that page.
- **Built-in client** (a WebSocket, `RTCPeerConnection` and a `<video>`) on older engines. The current Neko page uses syntax
  (`?.`, `??`, `||=`) that Chromium M69 cannot parse.

The built-in client reads Neko's login answer. A 2020 TV read it without any setting on the server, but a desktop browser
needs CORS on Neko. Without the answer the client falls back to Neko's older socket, which connected less reliably in
testing. If you need it, in the `neko` service of Streamiso's `docker-compose.yml`:

```yaml
NEKO_SERVER_CORS: "${CORS_ORIGIN:-}"
```

Pin `NEKO_IMAGE` to a release when using the built-in client, since it depends on Neko's protocol.

The focus stays in the app, which takes it back whenever the stream's page asks for it. DVD menu moves go to `POST /api/player/cmd`.

## Tested and not tested

**Tested on a PC (Edge), against the simulated server:** focus movement, the rule for each key, the opening order
(`resume_apply`, then `start`), the errors and the first launch. Real key presses were used too.

**Tested against a real Neko, from a PC:** both video routes connect and deliver the picture.

**Not tested, because it needs a TV.** Check these on one:

1. **Video:** does a DVD play? Is the picture full size, without flicker? Samsung's specification does not settle whether
   installed apps on 2020 TVs have WebRTC.
2. **Sound:** if "Press any key to turn the sound on" stays up after a key press, sound is blocked.
3. **Settings:** which engine and video route show up?
4. **DVD menu:** do the arrows and OK work, including in the first 20 seconds, when the stream's page asks for the focus?
5. **Back:** in each row of the table above. A long press on the Smart Remote sends Exit, which the TV handles.
6. **Media keys:** which ones the remote has, and whether they work.
7. **Typing the address:** does the keyboard open with OK, and does the focus return when you finish or cancel?
8. **Screen saver:** leave a disc playing for longer than it takes to start.
9. **Home button during a film:** it should pause. See what happens when you return.


**Seen on a 2020 TV (Tizen 5.5, Chromium M69):** the app installs and opens, and opens a disc on a real server. Its engine has
`RTCPeerConnection`, and with the fallback variants in `stream.js` it completes the WebRTC connection with Neko.
