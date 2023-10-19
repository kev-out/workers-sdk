import assert from "node:assert";
import http from "node:http";
import consumers from "node:stream/consumers";
import { DEV_REGISTRY_PORT } from "./constants";
import type { WorkerDefinition, WorkerRegistry } from "./constants";

let workers: WorkerRegistry = {};

function jsonResponse(res: http.ServerResponse, value: unknown) {
	res.writeHead(200, { "content-type": "application/json" });
	res.end(JSON.stringify(value));
}
function notFoundResponse(res: http.ServerResponse) {
	res.writeHead(404);
	res.end();
}

let exitTimeout: NodeJS.Timeout | undefined;
function resetExitTimeout() {
	clearTimeout(exitTimeout);
	exitTimeout = setTimeout(exit, 10_000);
}
function exit() {
	process.exit(0);
}

// TODO(now): consider adding WebSocket endpoint (in addition to polling for
//  back compat) for efficient updates

const requestListener: http.RequestListener = async (req, res) => {
	resetExitTimeout();
	const { pathname } = new URL(req.url ?? "", "http://localhost/");
	let match: RegExpMatchArray | null;
	if (req.method === "GET" && /^\/workers\/?$/.test(pathname)) {
		// GET /workers
		return jsonResponse(res, workers);
	} else if (
		req.method === "POST" &&
		(match = /^\/workers\/(?<id>[^/]+)\/?$/.exec(pathname)) !== null
	) {
		// POST /workers/:id
		assert(match.groups !== undefined);
		const id: string = match.groups.id;
		workers[id] = (await consumers.json(req)) as WorkerDefinition;
		return jsonResponse(res, null);
	} else if (
		req.method === "DELETE" &&
		(match = /^\/workers\/(?<id>[^/]+)?\/?$/.exec(pathname)) !== null
	) {
		// DELETE /workers/:id?
		const id: string | undefined = match.groups?.id;
		if (id === undefined) {
			workers = {};
		} else {
			delete workers[id];
		}
		return jsonResponse(res, null);
	} else {
		return notFoundResponse(res);
	}
};

if (require.main === module) {
	const server = http.createServer(requestListener);
	try {
		server.listen(DEV_REGISTRY_PORT);
		process.send?.({ type: "ready" });
		resetExitTimeout();
	} catch (error) {
		process.send?.({ type: "error", error });
		process.exitCode = 1;
	} finally {
		process.disconnect();
	}
}
