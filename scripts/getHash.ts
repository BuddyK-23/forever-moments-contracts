import { readFileSync } from "fs";
import { ethers } from "ethers";

const filePath = "./assets/profile-buddyk-barista.png"; // Replace with your actual file path
const imageBuffer = readFileSync(filePath);

const hash = ethers.keccak256(imageBuffer);
console.log("Keccak-256 Hash:", hash);