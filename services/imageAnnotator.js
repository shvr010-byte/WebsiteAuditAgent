const sharp = require("sharp");

async function annotateImage(
    imagePath,
    box,
    label,
    outputPath
) {

    if (!box) {
        return null;
    }

    const metadata =
        await sharp(imagePath).metadata();

    const imageWidth =
        metadata.width;

    const imageHeight =
        metadata.height;


    // ========================================================
    // CROP SETTINGS
    // ========================================================

    const padding = 180;

    let left =
        Math.floor(
            box.x - padding
        );

    let top =
        Math.floor(
            box.y - padding
        );

    let width =
        Math.ceil(
            box.width + padding * 2
        );

    let height =
        Math.ceil(
            box.height + padding * 2
        );


    // Keep crop inside image

    left =
        Math.max(
            0,
            left
        );

    top =
        Math.max(
            0,
            top
        );


    if (
        left + width >
        imageWidth
    ) {

        width =
            imageWidth - left;

    }


    if (
        top + height >
        imageHeight
    ) {

        height =
            imageHeight - top;

    }


    // Minimum useful crop size

    width =
        Math.max(
            width,
            300
        );

    height =
        Math.max(
            height,
            200
        );


    // Don't exceed image boundaries

    width =
        Math.min(
            width,
            imageWidth - left
        );

    height =
        Math.min(
            height,
            imageHeight - top
        );


    // ========================================================
    // CREATE RED BOX RELATIVE TO CROPPED IMAGE
    // ========================================================

    const relativeX =
        box.x - left;

    const relativeY =
        box.y - top;


    const svg = `
<svg
    width="${width}"
    height="${height}"
>

    <rect
        x="${relativeX}"
        y="${relativeY}"
        width="${box.width}"
        height="${box.height}"
        fill="none"
        stroke="red"
        stroke-width="5"
    />

    <rect
        x="${Math.max(0, relativeX)}"
        y="${Math.max(0, relativeY - 35)}"
        width="120"
        height="30"
        rx="4"
        fill="red"
    />

    <text
        x="${Math.max(8, relativeX + 8)}"
        y="${Math.max(21, relativeY - 14)}"
        font-size="18"
        fill="white"
        font-family="Arial"
    >
        ${label}
    </text>

</svg>
`;


    // ========================================================
    // CROP + ANNOTATE
    // ========================================================

    await sharp(imagePath)
        .extract({

            left,
            top,
            width,
            height

        })
        .composite([

            {
                input:
                    Buffer.from(svg)
            }

        ])
        .jpeg({

            quality: 85

        })
        .toFile(
            outputPath
        );


    return outputPath;
}


module.exports =
    annotateImage;