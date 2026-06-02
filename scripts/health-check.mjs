import net from "node:net";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const dbHost = process.env.HEALTH_DB_HOST ?? "localhost";
const dbPort = Number(process.env.HEALTH_DB_PORT ?? "5432");
const redisHost = process.env.HEALTH_REDIS_HOST ?? "localhost";
const redisPort = Number(process.env.HEALTH_REDIS_PORT ?? "6379");

function checkPort(host, port, label) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(2500);
    socket.on("connect", () => {
      socket.destroy();
      resolve(`${label}:ok`);
    });
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`${label}:timeout`));
    });
    socket.on("error", () => reject(new Error(`${label}:down`)));
  });
}

async function checkApi() {
  const res = await fetch(`${apiUrl}/portfolio`);
  if (!res.ok) throw new Error("api:down");
  const body = await res.json();
  if (!body?.data?.cash && body?.data?.cash !== 0) throw new Error("api:invalid");
  return "api:ok";
}

async function main() {
  const checks = [
    checkPort(dbHost, dbPort, "postgres"),
    checkPort(redisHost, redisPort, "redis"),
    checkApi()
  ];

  const results = await Promise.allSettled(checks);
  const failed = results.filter((r) => r.status === "rejected");
  for (const r of results) {
    if (r.status === "fulfilled") console.log(r.value);
    else console.error(r.reason.message);
  }

  if (failed.length) process.exit(1);
  console.log("health:all-ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
