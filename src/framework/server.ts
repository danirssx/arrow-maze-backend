import { createApp } from "./app.js";
import { loadEnvironment } from "./config/environment.js";

const environment = loadEnvironment();
const app = createApp();

app.listen(environment.port, () => {
  console.warn(`Arrow Maze API listening on port ${environment.port}`);
});
