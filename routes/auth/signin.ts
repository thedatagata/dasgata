import { Handlers } from "$fresh/server.ts";
import { getUserOAuth } from "../../utils/oauth.ts";

export const handler: Handlers = {
  async GET(req) {
    return await getUserOAuth().signIn(req);
  },
};
