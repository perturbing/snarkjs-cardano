{
  description = "snarkjs-cardano";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    # Function to import the default.nix for a given system
    makePackage = system: import ./default.nix {
      inherit (nixpkgs.legacyPackages.${system}) pkgs;
      nodejs = nixpkgs.legacyPackages.${system}.nodejs; # adjust nodejs attribute for the system
    };
    
    # Define a function to build the package for each supported system
    buildPackages = system: let
      nodePackages = makePackage system;
    in nodePackages."snarkjs";
    
    # List of supported systems
    supportedSystems = [
      "x86_64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];

    # Apply buildPackages to each system
    packagesForSystems = builtins.listToAttrs (map (system: 
      { name = system; value = buildPackages system; }) supportedSystems);

  in {
    packages = packagesForSystems;
    defaultPackage.x86_64-linux = packagesForSystems."x86_64-linux";
    defaultPackage.x86_64-darwin = packagesForSystems."x86_64-darwin";
    defaultPackage.aarch64-darwin = packagesForSystems."aarch64-darwin";
  };
}

