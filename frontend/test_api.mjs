async function main() {
  try {
    const r1 = await fetch("https://494736aa67ac4a5b20.gradio.live/info");
    if (r1.ok) {
      console.log(await r1.text());
      return;
    }
  } catch (e) {}
  
  try {
    const r2 = await fetch("https://494736aa67ac4a5b20.gradio.live/api/info");
    if (r2.ok) {
      console.log(await r2.text());
      return;
    }
  } catch (e) {}
  
  try {
    // If we pass an invalid param we can see error
    const r3 = await fetch("https://494736aa67ac4a5b20.gradio.live/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [] })
    });
    console.log(r3.status, await r3.text());
  } catch (e) {
    console.error(e);
  }
}
main();
