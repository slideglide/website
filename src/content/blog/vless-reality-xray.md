---
title: Getting around internet censorship with your own VLESS + REALITY server
date: 2026-11-06
description: Rent a cheap server, set up Xray, and get your own VPN that's really hard to detect.
---

"Just use a VPN" is great advice until your country starts blocking VPNs. Commercial VPN apps get banned, their servers end up on blocklists, and protocols like OpenVPN and WireGuard are pretty easy to spot anyway.

So let's make our own. Nobody has your server on a list, and with this setup your traffic just looks like someone browsing a normal website.

We'll be using [Xray](https://github.com/XTLS/Xray-core) with VLESS + REALITY. It sounds scarier than it is. If you're okay with copying commands into a terminal, you'll be fine, and it should take around half an hour.

## First, what this won't do

Using stuff like this is illegal or risky in some countries, so check where you stand before you start. You know your situation better than any blog post does.

It also doesn't make you anonymous. Websites see your server instead of you, but if you log in to something, it still knows it's you. Your hosting provider knows who's paying for the server too, and they can see its traffic.

If your safety actually depends on staying anonymous, use [Tor](https://www.torproject.org/). This guide is about getting past blocks, not hiding who you are.

## How it works

Censors don't only look at where your traffic is going. They also look at what it looks like, which is called deep packet inspection. That's why a brand new WireGuard server can get blocked even if nobody has ever seen it before.

There are three parts to this setup:

- **VLESS** carries your traffic. It doesn't encrypt anything by itself.
- **REALITY** does the encryption and the disguise. Your connection looks like a TLS 1.3 visit to a real website you pick, which we'll call the target. You don't need a domain or a certificate.
- **XTLS Vision** gets rid of the pattern you'd normally get from running TLS inside TLS, since that's another way tunnels get caught.

My favourite bit is what happens when a censor gets suspicious and connects to your server to check it out. Without your keys, they just get passed along to the real target, so they see that website and its real certificate.

## What you need

You need a small Debian or Ubuntu server outside the censored network, and SSH access to it. The cheapest plan most providers sell is enough for personal use. Port 443 has to be free too, so don't run a web server on the same box.

Anything in `CAPITALS` below is a placeholder for your own value.

## Secure the server

SSH in and update everything:

```bash
sudo apt update && sudo apt upgrade -y
```

Use SSH keys instead of a password if you can. Then set up the firewall. Allow SSH **before** you enable it, or you'll lock yourself out:

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 443/tcp
sudo ufw enable
```

## Install Xray

This is the official install script. It has to run as root, so stick `sudo` in front of `bash` if you're not logged in as root:

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
```

Don't like piping random scripts into bash? Fair. You can [read it first](https://github.com/XTLS/Xray-install).

## Generate your keys

Run these and save the output somewhere private:

```bash
xray uuid
xray x25519
openssl rand -hex 8
```

| Command | What you get | Called below |
|---|---|---|
| `xray uuid` | Your user ID | `YOUR_UUID` |
| `xray x25519`, the `PrivateKey` line | The server's secret key | `YOUR_PRIVATE_KEY` |
| `xray x25519`, the `Password (PublicKey)` line | The key your client uses | `YOUR_PUBLIC_KEY` |
| `openssl rand -hex 8` | A short ID | `YOUR_SHORT_ID` |

Yes, newer versions really do call the public key `Password (PublicKey)`. It's confusing, and older guides just say public key.

Treat all of these like passwords. Anyone with your UUID, public key and short ID can use your server.

## Pick a target website

This is the site your traffic pretends to be. It should be outside your country, not blocked there, and support TLS 1.3 and HTTP/2. It also shouldn't redirect anywhere, so if `example.com` sends you to `www.example.com`, use the `www` one. If it's hosted close to your server, even better.

Here are a few good ones to start with:

- `www.intel.com`
- `www.oracle.com`
- `www.cisco.com`
- `www.adobe.com`
- `www.asus.com`
- `aws.amazon.com`

They all passed these checks and worked in a real REALITY tunnel when tested from Türkiye in November 2026. Websites change though, and results can depend on where you are, so test yours on your server:

```bash
xray tls ping TARGET_DOMAIN
curl -sI --http2 https://TARGET_DOMAIN | head -1
```

You're looking for `TLS Version: TLS 1.3` and `HTTP/2 200`. If you get a `301` or `302` instead, it's redirecting, so try where it points or pick another site.

Big names aren't automatically good picks. Xray warns about `www.microsoft.com`, `www.apple.com` and `www.icloud.com` because they're so overused that they make blocks more likely in China. If that's not your situation, you may not care, but a less common target can't hurt. Skip anything that's often censored itself, like Wikipedia.

## Set up the config

Open the config file:

```bash
sudo nano /usr/local/etc/xray/config.json
```

Replace whatever's in there with this, using your own values:

```json
{
  "log": { "loglevel": "warning" },
  "inbounds": [
    {
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [{ "id": "YOUR_UUID", "flow": "xtls-rprx-vision" }],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "raw",
        "security": "reality",
        "realitySettings": {
          "target": "TARGET_DOMAIN:443",
          "serverNames": ["TARGET_DOMAIN"],
          "privateKey": "YOUR_PRIVATE_KEY",
          "shortIds": ["YOUR_SHORT_ID"]
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"],
        "routeOnly": true
      }
    }
  ],
  "outbounds": [
    { "protocol": "freedom", "tag": "direct" },
    { "protocol": "blackhole", "tag": "block" }
  ],
  "routing": {
    "rules": [
      { "ip": ["geoip:private"], "outboundTag": "block" },
      { "protocol": ["bittorrent"], "outboundTag": "block" }
    ]
  }
}
```

Those routing rules at the bottom keep the tunnel out of your server's private network and block BitTorrent. Your hosting provider will thank you for that second one.

You can also block traffic going back to your own country, so local sites never see you coming from this server. The REALITY project suggests it. Add this to `rules` with your country code in lowercase:

```json
{ "ip": ["geoip:COUNTRY_CODE"], "outboundTag": "block" }
```

The installer only comes with data for `cn`, `ru` and `ir`. For anywhere else, grab the full data first:

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ update-geodata
```

## Start it up

Fix the permissions so Xray can read its config, test it, and start the service:

```bash
sudo chown root:xray /usr/local/etc/xray/config.json
sudo chmod 640 /usr/local/etc/xray/config.json
xray run -test -c /usr/local/etc/xray/config.json
sudo systemctl enable xray
sudo systemctl restart xray
sudo systemctl status xray
```

The test should say `Configuration OK`, and the status should say `active (running)`. If it doesn't, the logs usually tell you why:

```bash
sudo journalctl -u xray -e
```

## Connect your devices

Fill in this link, keep it all on one line, and copy it:

```text
vless://YOUR_UUID@SERVER_IP:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=TARGET_DOMAIN&fp=chrome&pbk=YOUR_PUBLIC_KEY&sid=YOUR_SHORT_ID&type=tcp#my-server
```

Then use "import from clipboard" in one of these apps:

| Platform | App |
|---|---|
| Windows, Linux, macOS | [v2rayN](https://github.com/2dust/v2rayN) |
| Android | [v2rayNG](https://github.com/2dust/v2rayNG) |
| iOS | [V2Box](https://apps.apple.com/us/app/v2box-v2ray-client/id6446814690) (free) or [Shadowrocket](https://apps.apple.com/us/app/shadowrocket/id932747118) (paid) |

On a computer, turn on TUN mode if you want everything to go through the tunnel. System proxy mode only covers apps that bother to respect it.

## Make sure it works

With the tunnel on, this should print your server's IP, not yours:

```bash
curl https://api.ipify.org
```

Now turn the tunnel off and pretend to be a censor poking at your server:

```bash
curl -sv --resolve TARGET_DOMAIN:443:SERVER_IP https://TARGET_DOMAIN/ -o /dev/null 2>&1 | grep -E 'subject:|issuer:'
```

You should see the target website's real certificate. If you do, the disguise is working.

## Keeping it alive

Update every now and then, because censors keep changing their methods and Xray keeps up. Just run the install command again, and update your apps too. If you're connected to SSH through this tunnel when you do it, add `--manually-restart-later` to the end of the command so the restart doesn't kick you out.

Be careful who you give your link to. If you want to share with a friend, add another entry under `clients` so they get their own UUID.

And keep a backup plan, because your server's IP can still get blocked. Rebuilding on a new one doesn't take long once you've done it, but set up the backup now. Your hosting provider's site might be harder to reach later.

That's it, enjoy the open internet!
