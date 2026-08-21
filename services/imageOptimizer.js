const sharp = require("sharp");
const path = require("path");
async function optimizeImage(imagePath) {
console.log("Optimizing:", imagePath);

    const outputPath = imagePath.replace(".png", "-ai.jpg");

    await sharp(imagePath)
        .resize({
            width: 1280,
            withoutEnlargement: true
        })
        .jpeg({
            quality: 82
        })
        .toFile(outputPath);

    return outputPath;
}

module.exports = optimizeImage;