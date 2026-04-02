import gradio as gr
import os
import io
import base64
import asyncio
from runware import Runware, IImageInference

async def runware_inference(full_prompt, default_negative, img_str):
    api_key = os.environ.get("RUNWARE_API_KEY")
    if not api_key:
        raise gr.Error("Please set the RUNWARE_API_KEY environment variable. You can get one for free at runware.ai!")

    runware = Runware(api_key=api_key)
    await runware.connect()

    request_image = IImageInference(
        positivePrompt=full_prompt,
        negativePrompt=default_negative,
        model="runwayml/stable-diffusion-v1-5", # Runware standard SD 1.5
        seedImage=img_str,
        strength=0.75,
        steps=25,
        width=512,
        height=512,
    )

    images = await runware.imageInference(request_image)
    return images[0].imageURL

async def generate_room(image, prompt, items, style, negative_prompt):
    # 1. Image Preprocessing to Base64
    init_image = image.convert("RGB").resize((512, 512))
    buffered = io.BytesIO()
    init_image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

    # 2. Build full prompt
    full_prompt = f"highly detailed, beautiful {style} style, photorealistic"
    if prompt:
        full_prompt += f", {prompt}"
    if items:
        full_prompt += f", featuring {items}"
        
    # Default negative prompt
    default_negative = "blurry, distorted, ugly, bad anatomy, watermark, text, signature"
    if negative_prompt:
        default_negative += f", {negative_prompt}"

    # 3. Connection to Runware API
    try:
        image_url = await runware_inference(full_prompt, default_negative, img_str)
        return image_url
    except Exception as e:
        raise gr.Error(f"Runware API Error: {str(e)}")

with gr.Blocks(theme=gr.themes.Soft()) as demo:
    gr.Markdown("# Aethra - Make It Your Way (AI Generation Engine)\n\n**Note: This is now powered by Runware for ultra-fast generation!**")
    
    with gr.Row():
        with gr.Column():
            input_image = gr.Image(type="pil", label="Upload Room Photo")
            aesthetic_style = gr.Dropdown(
                choices=["Minimalist", "Bohemian", "Industrial", "Cottagecore", "Japandi"],
                value="Minimalist",
                label="Aesthetic Style"
            )
            custom_prompt = gr.Textbox(label="Custom Describe (Optional)")
            owned_items = gr.Textbox(label="Owned Items (Optional)")
            negative_prompt = gr.Textbox(label="Negative Prompt", value="blurry, distorted, ugly")
            
            generate_btn = gr.Button("Generate Design")
            
        with gr.Column():
            output_image = gr.Image(label="Generated Concept")
            
    generate_btn.click(
        fn=generate_room,
        inputs=[input_image, custom_prompt, owned_items, aesthetic_style, negative_prompt],
        outputs=output_image
    )

if __name__ == "__main__":
    demo.launch(server_port=7860, share=True)
