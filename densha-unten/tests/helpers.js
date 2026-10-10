import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateRoute, validateVehicle } from "../route/loader.js";

const here = fileURLToPath(new URL(".", import.meta.url));
export const readJSON = rel => JSON.parse(readFileSync(here + "../" + rel, "utf8"));
export const toyokoRaw = () => readJSON("data/routes/toyoko.json");
export const toyoko = () => validateRoute(toyokoRaw());
export const vehicle5050 = () => validateVehicle(readJSON("data/vehicles/5050.json"));
