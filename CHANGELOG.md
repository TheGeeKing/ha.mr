# Changelog

## [1.1.1](https://github.com/TheGeeKing/ha.mr/compare/ha.mr-v1.1.0...ha.mr-v1.1.1) (2026-08-20)


### Bug Fixes

* accept URLs without an explicit protocol ([ce52fa5](https://github.com/TheGeeKing/ha.mr/commit/ce52fa55a307ed3683b9a8c580f408875cf2aced))
* preserve encoded query parameter values ([27be787](https://github.com/TheGeeKing/ha.mr/commit/27be7872d563fd5ce8b1549d70e7aa08f4a90454))
* preserve equals signs in query parameter values ([c593840](https://github.com/TheGeeKing/ha.mr/commit/c5938402d18907c6bd06ca273e78a5d10f8ab102))
* reject unsupported URL protocols and credentials ([57bd2f1](https://github.com/TheGeeKing/ha.mr/commit/57bd2f10fd4177f74cef62e205d435e7ed99d490))
* use an absolute path for the main script ([f539a8c](https://github.com/TheGeeKing/ha.mr/commit/f539a8c6fe6519a1ac651cf6d382cbaf0a28c092))
* wrap long redirect links on mobile ([14d2aff](https://github.com/TheGeeKing/ha.mr/commit/14d2affcf7cb81bdf47af20e0cfde08f41491d15))


### Performance Improvements

* switch QR generation to lean-qr ([5001c3d](https://github.com/TheGeeKing/ha.mr/commit/5001c3d27f0b17997fa66ba4709a223be1884a8c))

## [1.1.0](https://github.com/TheGeeKing/ha.mr/compare/ha.mr-v1.0.1...ha.mr-v1.1.0) (2026-08-18)


### Features

* add flake.nix ([4a8b9ad](https://github.com/TheGeeKing/ha.mr/commit/4a8b9ad4cd0bdfe534b4ae072d496cc12c4c1d4e))
* show confirmation dialog before redirect ([36c95d6](https://github.com/TheGeeKing/ha.mr/commit/36c95d674a5a7170e821b02f9bfb8f9b6e79049e))


### Bug Fixes

* dark mode contrast for yellow warning box ([46a5c30](https://github.com/TheGeeKing/ha.mr/commit/46a5c30399e9aead1ba64b4b896ace1edce7906a))
* deduplicate index and 404 by deploying GitHub Pages on /docs ([36e0657](https://github.com/TheGeeKing/ha.mr/commit/36e0657cb30637a0921b1e894149ff9573dbd5c1))
* encode IPv6 addresses without version bump ([bac662d](https://github.com/TheGeeKing/ha.mr/commit/bac662d94d3a81142c3b3fa7de43820cb8d18392))
* missing files in web host root ([54cbcb0](https://github.com/TheGeeKing/ha.mr/commit/54cbcb0ef049399aa7e8bb8406bec88b4c91562c))
* preserve docs module paths in Nix package ([c61600a](https://github.com/TheGeeKing/ha.mr/commit/c61600ace15899df2fd960b1552e9c6a226d35aa))
* preserve percent-encoded reserved path characters ([bdf0d77](https://github.com/TheGeeKing/ha.mr/commit/bdf0d77d2ffaa4b56808eda24d4809a74192c265))


### Performance Improvements

* lazy-load QR code generator when enabled ([aeddcc7](https://github.com/TheGeeKing/ha.mr/commit/aeddcc74473f94c13fd4f0c1d8d9ea318a43345f))
* optimize Huffman dictionaries ([69968fe](https://github.com/TheGeeKing/ha.mr/commit/69968fe0d19eeb4fe034029bc6d855eb7ab4850a))

## [1.0.1](https://github.com/TheGeeKing/ha.mr/compare/ha.mr-v1.0.0...ha.mr-v1.0.1) (2026-08-16)


### Bug Fixes

* specify repository when uploading release assets ([a5dbb49](https://github.com/TheGeeKing/ha.mr/commit/a5dbb497321496d3a06665fac655d42b83db2013))

## 1.0.0 (2026-08-16)


### Features

* add production Compose deployment using GHCR image ([bb7f743](https://github.com/TheGeeKing/ha.mr/commit/bb7f7435ecb57e2f60f2881744603ac8b72a0320))
* add system-aware dark theme ([7a5f333](https://github.com/TheGeeKing/ha.mr/commit/7a5f333f480979b675ab4740a5109c81c7c116f7))
* optimize default QR error correction ([831a00b](https://github.com/TheGeeKing/ha.mr/commit/831a00b703d28b05093e53c08b8e6f8184e49da9))
* publish container image to GHCR ([#3](https://github.com/TheGeeKing/ha.mr/issues/3)) ([2ca0246](https://github.com/TheGeeKing/ha.mr/commit/2ca024657abe2b43b4e0ba4676f0d4d286d336c5))
* release CLI as cross-platform QuickJS binaries ([2266b9c](https://github.com/TheGeeKing/ha.mr/commit/2266b9c6f3d5439960446599534db2c62e0b2eea))


### Bug Fixes

* adjust color of input field responsively ([d47b958](https://github.com/TheGeeKing/ha.mr/commit/d47b958fc38e4acdf0fc2283947f94e990137cff))
* preserve QRCode copyright notice ([3236e6e](https://github.com/TheGeeKing/ha.mr/commit/3236e6e53df97ac43ccdcc7fce3157148b86b195))
* preserve typed QR optimization ([1f9a434](https://github.com/TheGeeKing/ha.mr/commit/1f9a43413ae893619229e0d4cf3b0c005d9f1fc8))
* undefined `search` reference and misplaced index suffix ([b12948b](https://github.com/TheGeeKing/ha.mr/commit/b12948bbef0697d96c23fa922c2887789017df69))
