function createBatches(items, batchSize = 4) {

    if (!Array.isArray(items) || items.length === 0) {
        return [];
    }

    const batches = [];

    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }

    return batches;

}

module.exports = createBatches;