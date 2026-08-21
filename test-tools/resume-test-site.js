const http = require("http");

const host = "127.0.0.1";
const port = 43127;

let checkoutReleased = false;
let checkoutArmed = false;
const waitingCheckoutResponses = new Set();

function sendHtml(response, body) {
    response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(body);
}

function sendJson(response, statusCode, body) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(JSON.stringify(body));
}

function completeCheckout(response) {
    if (response.destroyed || response.writableEnded) {
        return;
    }

    sendHtml(
        response,
        `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Resume Test - Checkout</title></head>
<body>
    <h1>Checkout</h1>
    <p>The third page was released and processed.</p>
</body>
</html>`
    );
}

const server = http.createServer((request, response) => {
    const requestUrl = new URL(
        request.url,
        `http://${request.headers.host || `${host}:${port}`}`
    );

    if (
        (request.method === "GET" || request.method === "HEAD") &&
        requestUrl.pathname === "/login"
    ) {
        sendHtml(
            response,
            `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Resume Test - Login</title></head>
<body>
    <h1>Login</h1>
    <p>First crawlable page.</p>
    <a href="/account">Continue to account</a>
</body>
</html>`
        );
        return;
    }

    if (
        (request.method === "GET" || request.method === "HEAD") &&
        requestUrl.pathname === "/account"
    ) {
        sendHtml(
            response,
            `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Resume Test - Account</title></head>
<body>
    <h1>Account</h1>
    <p>Second crawlable page.</p>
    <a href="/checkout">Continue to checkout</a>
</body>
</html>`
        );
        return;
    }

    if (
        (request.method === "GET" || request.method === "HEAD") &&
        requestUrl.pathname === "/checkout"
    ) {
        const isTopLevelNavigation =
            request.method === "GET" &&
            request.headers["sec-fetch-mode"] === "navigate" &&
            request.headers["sec-fetch-dest"] === "document";

        // Link verification uses HEAD or a non-navigation GET. It must
        // always complete so pages 1 and 2 can finish normally.
        if (!isTopLevelNavigation) {
            completeCheckout(response);
            return;
        }

        // The crawler is the first top-level browser navigation to this
        // URL. Let it discover the page, then arm the processing block.
        if (!checkoutArmed) {
            completeCheckout(response);
            checkoutArmed = true;

            console.log(
                "Checkout discovered by crawler. Audit-stage block armed."
            );
            return;
        }

        if (checkoutReleased) {
            completeCheckout(response);
            return;
        }

        waitingCheckoutResponses.add(response);

        response.on("close", () => {
            waitingCheckoutResponses.delete(response);
        });

        console.log(
            `Checkout request waiting (${waitingCheckoutResponses.size} open request(s)).`
        );
        return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/release") {
        checkoutReleased = true;

        const waitingCount = waitingCheckoutResponses.size;

        for (const checkoutResponse of waitingCheckoutResponses) {
            completeCheckout(checkoutResponse);
        }
        waitingCheckoutResponses.clear();

        console.log(
            `Checkout released (${waitingCount} waiting request(s) completed).`
        );

        sendJson(response, 200, {
            released: true,
            armed: checkoutArmed,
            completedWaitingRequests: waitingCount
        });
        return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/status") {
        sendJson(response, 200, {
            checkoutArmed,
            checkoutReleased,
            waitingCheckoutRequests: waitingCheckoutResponses.size
        });
        return;
    }

    sendJson(response, 404, {
        error: "Not found"
    });
});

server.listen(port, host, () => {
    console.log(`Resume test site: http://${host}:${port}/login`);
    console.log("Crawlable pages: /login, /account, /checkout");
    console.log("Checkout will arm after crawler discovery.");
    console.log("Audit-stage checkout navigation blocks until POST /release.");
});

function stopServer(signal) {
    console.log(`\n${signal} received. Stopping resume test site...`);

    for (const response of waitingCheckoutResponses) {
        response.destroy();
    }
    waitingCheckoutResponses.clear();

    server.close(() => {
        process.exit(0);
    });
}

process.on("SIGINT", () => stopServer("SIGINT"));
process.on("SIGTERM", () => stopServer("SIGTERM"));
