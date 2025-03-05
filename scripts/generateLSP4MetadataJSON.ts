import { existsSync, readFileSync, writeFileSync } from "fs";
import { ethers } from "ethers";

const main = () => {
  if (existsSync("assets/LikesMetadata.json")) {
    console.log("file already exists in the assets folder.");
    return;
  }

  const backgroundImage = readFileSync("assets/likesTokenBackground.jpg");
  const iconImage = readFileSync("assets/likesToken.png");

  const name = "LIKES Token";
  const description = "Social media token for the likes of the world";
  const links = [
    { title: "X", url: "https://x.com/momentsonchain" },
    { title: "Forever Moments", url: "https://forever-moments.vercel.app/" }
  ];
  const images = [
    [
      {
        width: 1024,
        height: 403,
        url: "ipfs://bafybeie2jmiilaqtvmufvmci2g5q3eaktzewz3mf6tpkpvvhpzbt7ewyym",
        verification: {
          method: "keccak256(bytes)",
          data: ethers.keccak256(backgroundImage),
        },
      },
    ],
  ];
  const icon = [
    {
      width: 400,
      height: 400,
      url: "ipfs://bafkreifxiiu6dafpo2333ntjg34jhqxfhymdbbzawyqmcrkvk5ci53jrni",
      verification: {
        method: "keccak256(bytes)",
        data: ethers.keccak256(iconImage),
      },
    },
  ];
  const assets: any[] = [];
  const attributes: any[] = [];

  const json = {
    LSP4Metadata: {
      name,
      description,
      links,
      images,
      icon,
      assets,
      attributes,
    },
  };

  writeFileSync("assets/LikesMetadata.json", JSON.stringify(json));
};

main();
