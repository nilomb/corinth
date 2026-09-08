import { routePartykitRequest } from "partyserver";
import { GameRoom } from "./room";

export { GameRoom };

interface Env {
  GameRoom: DurableObjectNamespace<GameRoom>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("corinth-party ok", { status: 200 });
    }
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
