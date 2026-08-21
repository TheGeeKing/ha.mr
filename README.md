# ha.mr

Compresses links and optimizes QR codes entirely in the browser, without a back-end database.

## Production deployment

Run the latest image published to GitHub Container Registry:

```sh
docker compose -f compose.production.yml up -d
```

The site is available on port `80` by default. To use another host port, create a `.env` file next to the Compose file:

```dotenv
APP_PORT=8080
```

Then run the same `docker compose` command. The site will be available on the configured port.

On Linux, you can also set the port for a single command without creating a `.env` file:

```sh
APP_PORT=8080 docker compose -f compose.production.yml up -d
```

## CLI development

### QuickJS-NG

Download the [QuickJS-NG `qjs` executable](https://github.com/quickjs-ng/quickjs/releases) for your platform, rename it to `qjs` (`qjs.exe` on Windows), and add it to `PATH`.

Build the QuickJS bundle and run it through the interpreter:

```sh
npm run dev:quickjs -- https://www.example.com
```

Build a native executable for the current platform:

```sh
npm run build:cli:local
```

Run `dist/hamr.exe` on Windows or `dist/hamr` on Linux and macOS.

### Node.js

```sh
npm run build
```

```sh
node dist/node.js https://www.example.com
```

## How

1. Common parts of the link (e.g. protocol, `www.` prefix, `index.html`) are manually detected and reduced to individual bits. If present, the port is encoded as a raw numeric value.
2. Second-level and top-level domains are matched against a Huffman-coded dictionary of the most common websites and TLDs.
3. The rest of the link is split into parts, and each segment is either fitted to a predefined character set, or Huffman coded.
4. For links, the output is encoded in the full character set of a URL. (I've been informed that square brackets `[]` are not supposed to be a part of this set, but it's too late to change that now.)
5. For QR codes, the output uses the alphanumeric character set to remove overhead compared to other QR code generators.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Acknowledgements

- https://www.npmjs.com/package/lean-qr
- https://github.com/smythp/reddit_links_dataset
- https://github.com/ada-url/url-dataset
