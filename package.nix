{
  lib,
  buildNpmPackage,
  importNpmLock,
  makeWrapper,
  nodejs,
}:
buildNpmPackage {
  pname = "hamr";
  version = "1.0.1";
  src = ./.;

  npmDeps = importNpmLock { npmRoot = ./.; };
  npmConfigHook = importNpmLock.npmConfigHook;

  nativeBuildInputs = [ makeWrapper ];

  installPhase = ''
    runHook preInstall
    mkdir -p $out/bin $out/lib/hamr
    cp dist/*.js $out/lib/hamr
    makeWrapper ${lib.getExe nodejs} $out/bin/hamr \
      --add-flags "$out/lib/hamr/node.js"
    runHook postInstall
  '';

  meta = {
    description = "Static URL compressor and QR code optimizer";
    homepage = "https://github.com/p2r3/ha.mr";
    mainProgram = "hamr";
    license = lib.licenses.mit;
  };
}
