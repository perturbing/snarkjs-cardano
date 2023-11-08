{
  description = "snarkjs-cardano";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    # Define pkgs for a specific system
    pkgs = nixpkgs.legacyPackages.x86_64-linux;

    # Import the nodePackages function from default.nix and pass pkgs to it
    nodePackages = import ./default.nix {
      inherit pkgs;
      inherit (pkgs) nodejs; # Make sure to pass nodejs here if it's required
    };
    
    # Access your package from the resulting set
    snarkjs-cardano-package = nodePackages."snarkjs";
  in {
    packages.x86_64-linux.snarkjs-cardano = snarkjs-cardano-package;
    defaultPackage.x86_64-linux = snarkjs-cardano-package;
  };
}

