import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function analyzeImage() {
  try {
    const zai = await ZAI.create();
    
    const imageBuffer = fs.readFileSync('/home/z/my-project/upload/pasted_image_1779182589119.png');
    const base64Image = imageBuffer.toString('base64');
    
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe what you see in this screenshot. What is on the screen? Is there any error or loading issue?'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });
    
    console.log(response.choices[0]?.message?.content);
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeImage();
