import { existsSync, readFileSync, writeFileSync } from "fs";
import { ethers } from "ethers";

const main = () => {
  if (existsSync("assets/metadata2.json")) {
    console.log("`metadata.json` already exists in the assets folder.");
    return;
  }

  const firstImage = readFileSync("assets/minecraft.jpg");
  const secondImage = readFileSync("assets/serenity.jpg");
  const thirdImage = readFileSync("assets/meme.jpg");
  const fourthImage = readFileSync("assets/snow.jpg");

  const name = "Moments Factory";
  const description = "Where Moments are made forever! This is your moment!";
  const links = [
    { title: "Twitter", url: "https://twitter.com/" },
    { title: "Discord", url: "https://discord.com/" }
  ];
  const images = [
    [
      {
        width: 1024,
        height: 1024,
        url: "ipfs://bafkreiarzlokfitabbmouz7uxhdezs4e7gfwdiaosh6lyo362yijvvjnfi",
        verification: {
          method: "keccak256(bytes)",
          hash: ethers.keccak256(firstImage),
        },
      },
    ],
    [
      {
        width: 1024,
        height: 1024,
        url: "ipfs://bafkreibi6rbyelahjqy6di7ghb6fn6bte4jp2e7mclbxpmno4u4tmh4v7a",
        verification: {
          method: "keccak256(bytes)",
          hash: ethers.keccak256(secondImage),
        },
      },
    ],
  ];
  const icon = [
    {
      width: 1024,
      height: 1024,
      url: "ipfs://bafkreihduxcbi5clq3olyyueyt5qmzdppqsbgaj3acxbrscmikuw2pqx5u",
      verification: {
        method: "keccak256(bytes)",
        hash: ethers.keccak256(thirdImage),
      },
    },
  ];
  const assets = [
    {
      url: "ipfs://bafkreiegiqfk5drf2wi5hy3b5dyv7fbpxyfqgu7sdrp5kegkytbah5kwr4",
      fileType: "image/jpeg",
      verification: {
        method: "keccak256(bytes)",
        data: ethers.keccak256(fourthImage),
      },
    },
  ];
  const attributes = [
    {
      key: "TestAttribute1",
      value: JSON.stringify({
        title: "TestTitle",
        description: "TestDescription",
        notes: "TestNotes",
      }),
      type: "string",
    },
    {
      key: "TestAttribute2",
      value: 1,
      type: "number",
    },
  ];

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

  writeFileSync("assets/metadata2.json", JSON.stringify(json));
};

main();
