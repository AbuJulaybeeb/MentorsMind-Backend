import v1Router from "./src/routes/v1";
import v2Router from "./src/routes/v2";
import routes from "./src/routes";

console.log("Checking routers...");
console.log("v1Router type:", typeof v1Router);
console.log("v2Router type:", typeof v2Router);
console.log("routes type:", typeof routes);

if (typeof v1Router !== "function") {
  console.error("ERROR: v1Router is not a function!");
}
if (typeof v2Router !== "function") {
  console.error("ERROR: v2Router is not a function!");
}
if (typeof routes !== "function") {
  console.error("ERROR: routes is not a function!");
}

process.exit(0);
