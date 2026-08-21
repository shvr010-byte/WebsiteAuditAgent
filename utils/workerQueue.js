async function workerQueue(items, worker, concurrency = 3) {

    const results = [];
    let currentIndex = 0;

    async function runWorker() {

        while (true) {

            const index = currentIndex++;

            if (index >= items.length) {
                break;
            }

            try {

                results[index] = await worker(items[index], index);

            } catch (err) {

                console.error(
                    `Worker Error (${items[index]}):`,
                    err.message
                );

                results[index] = {
                    error: err.message
                };

            }

        }

    }

    const workers = [];

    for (let i = 0; i < concurrency; i++) {
        workers.push(runWorker());
    }

    await Promise.all(workers);

    return results;
}

module.exports = workerQueue;