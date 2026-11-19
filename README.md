<p align="center">
  <img src="app/img/logo.svg" alt="StreamISO" width="420">
</p>

# StreamISO for Samsung TV

A Samsung TV (Tizen) app for [StreamISO](https://github.com/rubinhos/streamiso), the self-hosted library that plays your
DVD images and audio CD images with their real menus. It has its own screens and controls, made for the remote. You need a
running StreamISO server. To learn more about StreamISO itself, see [its repository](https://github.com/rubinhos/streamiso).

> **Vibe coded:** written with an AI assistant ([Claude](https://claude.ai)) and tested by the author.
> **Early prototype:** tested on one TV, a 2020 model with Tizen 5.5.

| | |
|---|---|
| ![Catalog](docs/screenshots/catalog.jpg) | ![DVD controls](docs/screenshots/dvd-bar.jpg) |

## Which TVs

Samsung TVs from 2020 on (Tizen 5.5 or newer). The code is kept to what Chromium M69, the 2020 engine, understands, and
the video route is chosen by what the engine can do, not by the model:

| Model year | Tizen | Engine | Video route | Status |
|---|---|---|---|---|
| 2020 | 5.5 | Chromium M69 | Built-in client | Tested |
| 2021 (for example AU8000) | 6.0 | Chromium M76 | Built-in client | Expected to work, not tested |
| 2022 and later | 6.5+ | Chromium M85+ | Neko page in an iframe | Expected to work, not tested |

Older TVs have not been tried.

## Installing

### Prerequisites

- A PC and a Samsung TV on the same network
- [Tizen Studio](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html), with
  **Certificate Manager**, **TV Extensions** and **Samsung Certificate Extension** from its Package Manager
- A Samsung account, for the certificate
- `tizen` and `sdb` on your `PATH` (in `tizen-studio/tools/ide/bin` and `tizen-studio/tools`)

### 1. Set up the server

The app runs from a packaged page, and StreamISO refuses API calls from other origins unless they carry its key.
Add a key of your choice to StreamISO's `.env`, then run `docker compose up -d`:

```ini
API_KEY=pick-any-key
```

Type the same key in the app's Settings. The Settings screen also takes a second address for the same server, such as
its Tailscale address, used when the first one does not answer (or always, if you choose it there).

### 2. Turn on developer mode on the TV

1. Open **Apps** and enter `12345`.
2. Set **Developer mode** to **On**, and enter your PC's IP address.
3. Restart the TV.

### 3. Connect to the TV

```sh
sdb connect YOUR_TV_IP
sdb devices
```

Note the device name that `sdb devices` shows, for example `UN58TU7020`.

### 4. Create a certificate

In Tizen Studio, open **Tools > Certificate Manager** and add a **Samsung** profile for **TV**, with the TV still connected.

### 5. Build and install

```sh
git clone https://github.com/rubinhos/streamiso-tizen.git
cd streamiso-tizen/app
tizen build-web -e ".*"
tizen package -t wgt -s YOUR_PROFILE -o .. -- .buildResult
cd ..
tizen install -n StreamISO.wgt -t YOUR_DEVICE_NAME
```

If the install fails with error 1010, check the certificate.

**More than one TV:** a Samsung certificate only works on the TVs it lists (by their DUID). For another TV, turn on its
developer mode, connect it with `sdb connect`, and in **Certificate Manager** create a new profile, or edit the
distributor certificate of the one you have, with that TV connected so its DUID is added. Then package again and install
with that TV's device name.

### 6. Open the app

Open **StreamISO** in **Apps**. The first screen asks for:

- **Address:** your server's address, for example `192.168.0.10:8080` (the port is 8080 if you leave it out).
- **Second address** (optional): another way to reach the same server, such as its Tailscale address (see
  [Using it away from home](#using-it-away-from-home-tailscale)).
- **API key:** the `API_KEY` from the server's `.env`.
- **Use:** **Automatic** tries the address first and, if it does not answer within 4 seconds, the second one. Or choose
  always the address, or always the second address.

Press OK on a field to type, then choose **Save and connect**. The app remembers it all, and you can change it later in
**Settings**, which also shows the address in use.

If the video stops while a disc plays (the network or the server), the app opens the stream again by itself, without
reopening the disc. If it keeps stopping, it says so and offers to try again.

## Using it away from home (Tailscale)

StreamISO has no login, so do not open its ports on your router. To reach the server from another place, use
[Tailscale](https://tailscale.com), a private VPN between your own devices, set up on the server as the
[StreamISO README](https://github.com/rubinhos/streamiso#watching-from-another-network-tailscale) describes (Tailscale
on the server, and its Tailscale IP added to `SERVER_IP`).

Samsung TVs have no Tailscale app, so a TV can only use it through a device on its own network that does: a router with
Tailscale (OpenWrt, GL.iNet and some others offer it), or a PC or Raspberry Pi set up as a
[subnet router](https://tailscale.com/kb/1019/subnets) for that network, with the TV's network sending the
`100.64.0.0/10` range to it. Then, in the app's Settings, keep the home address as the first one, type the server's
Tailscale address (`100.101.102.103:8080`) as the second one, and leave **Use: Automatic**.

A TV that stays at home does not need any of this: the home address is enough.

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the remote's keys, running the app on a PC, the tests and what still needs checking on a TV.

## License

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE). "StreamISO" is not affiliated with Stremio or with Samsung.
