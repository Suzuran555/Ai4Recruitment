import { auth } from ".";
import { headers } from "next/headers";

export const getSession = async () =>
  auth.api.getSession({ headers: await headers() });
