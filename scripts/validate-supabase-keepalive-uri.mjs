import { pathToFileURL } from "node:url";

const projectRef = "kewynepvspcmrujustds";
const directHost = `db.${projectRef}.supabase.co`;
const poolerHost = "aws-0-us-east-1.pooler.supabase.com";

const expectedConfiguration =
  `Expected configuration: direct host ${directHost}, username slabberjaws_keepalive, database postgres, port 5432 (or omitted for PostgreSQL's default); or shared session pooler host ${poolerHost}, username slabberjaws_keepalive.${projectRef}, database postgres, port 5432.`;

export class ConnectionUriValidationError extends Error {
  constructor(category) {
    super(category);
    this.name = "ConnectionUriValidationError";
    this.category = category;
  }
}

function invalid(category) {
  throw new ConnectionUriValidationError(category);
}

export function validateKeepaliveConnectionUri(value) {
  if (typeof value !== "string" || value.length === 0) invalid("Invalid URI");

  let url;
  try {
    url = new URL(value);
  } catch {
    invalid("Invalid URI");
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    invalid("Wrong protocol");
  }

  // URL normalizes hostnames to lowercase; exact host matching rejects lookalikes.
  const hostname = url.hostname.toLowerCase();
  const isDirect = hostname === directHost;
  const isSessionPooler = hostname === poolerHost;
  if (!isDirect && !isSessionPooler) invalid("Wrong hostname");

  let username;
  try {
    username = decodeURIComponent(url.username);
  } catch {
    invalid("Invalid URI");
  }
  const expectedUsername = isDirect
    ? "slabberjaws_keepalive"
    : `slabberjaws_keepalive.${projectRef}`;
  if (username !== expectedUsername) invalid("Wrong database username");

  let database;
  try {
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    invalid("Invalid URI");
  }
  if (database !== "postgres") invalid("Wrong database name");

  if (url.password.length === 0) invalid("Missing password");

  // The direct endpoint defaults to 5432 if omitted. The shared session
  // pooler must explicitly use 5432; neither route may target another port.
  if (isSessionPooler ? url.port !== "5432" : url.port !== "" && url.port !== "5432") {
    invalid("Wrong port");
  }

  return Object.freeze({ connectionType: isDirect ? "direct" : "session-pooler" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = validateKeepaliveConnectionUri(process.env.DATABASE_URL);
    console.log(
      `Connection target validated (${result.connectionType}; credential omitted).`,
    );
  } catch (error) {
    const category =
      error instanceof ConnectionUriValidationError ? error.category : "Invalid URI";
    console.error(`::error title=${category}::${category}. ${expectedConfiguration}`);
    process.exitCode = 1;
  }
}


