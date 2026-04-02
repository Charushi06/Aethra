import { Client } from "@gradio/client";
const app = await Client.connect("https://494736aa67ac4a5b20.gradio.live/");
console.log(JSON.stringify(app.config.dependencies, null, 2));
