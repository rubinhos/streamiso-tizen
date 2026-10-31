<p align="center">
  <img src="app/img/logo.svg" alt="Streamiso" width="420">
</p>

# Streamiso for Samsung TV

A Samsung TV (Tizen) app for [Streamiso](https://github.com/rubinhos/streamiso), the self-hosted library that plays your
DVD images and audio CD images with their real menus. It has its own screens and controls, made for the remote. You need a
running Streamiso server. To learn more about Streamiso itself, see [its repository](https://github.com/rubinhos/streamiso).

> **Vibe coded:** written with an AI assistant ([Claude](https://claude.ai)) and tested by the author.
> **Early prototype:** tested on one TV, a 2020 model with Tizen 5.5.

| | |
|---|---|
| ![Catalog](docs/screenshots/catalog.jpg) | ![DVD controls](docs/screenshots/dvd-bar.jpg) |

## Installing

### Prerequisites

- A PC and a Samsung TV on the same network
- [Tizen Studio](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html), with
  **Certificate Manager**, **TV Extensions** and **Samsung Certificate Extension** from its Package Manager
- A Samsung account, for the certificate
- `tizen` and `sdb` on your `PATH` (in `tizen-studio/tools/ide/bin` and `tizen-studio/tools`)

### 1. Set up the server

Add this to Streamiso's `.env`, then run `docker compose up -d`:

```ini
CORS_ORIGIN=null
```

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
tizen install -n Streamiso.wgt -t YOUR_DEVICE_NAME
```

If the install fails with error 1010, check the certificate.

### 6. Open the app

Open **Streamiso** in **Apps**, enter your server's address (for example `192.168.0.10:8080`) and choose
**Save and connect**. The app remembers it, and you can change it later in **Settings**.

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the remote's keys, running the app on a PC, the tests and what still needs checking on a TV.

## License

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE). "Streamiso" is not affiliated with Stremio or with Samsung.
