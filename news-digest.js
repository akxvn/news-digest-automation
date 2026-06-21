#!/usr/bin/env node
const https = require('https');
const nodemailer = require('nodemailer');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;

if (!GEMINI_API_KEY || !EMAIL_USER || !EMAIL_PASSWORD || !RECIPIENT_EMAIL) {
  console.error('Missing environment variables');
  process.exit(1);
}

async function callGeminiAPI(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{parts: [{text: prompt}]}]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const text = response.candidates[0].content.parts[0].text;
          resolve(text);
        } catch(e) { reject(new Error('Gemini API error')); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendEmail(html) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {user: EMAIL_USER, pass: EMAIL_PASSWORD}
  });

  const today = new Date().toISOString().split('T')[0];
  return transporter.sendMail({
    from: EMAIL_USER,
    to: RECIPIENT_EMAIL,
    subject: `Daily News Digest - ${today}`,
    html: html
  });
}

async function main() {
  try {
    console.log('Generating daily news digest...');
    const prompt = `Scan web for latest 24-48 hours news. Create HTML email with today's date.

SECTION 1: India Startup & VC News - 4-6 stories. Each: headline + 2-3 sentence summary + "why it matters". End with one finance term explained.

SECTION 2: India Macro News - 4-6 stories (RBI, SEBI, policy, trade, GST). Each: headline + summary + "why it matters". End with one finance term.

SECTION 3: Global Macro News - 4-6 stories (US Fed, VC trends, geopolitics). Each: headline + summary + "why it matters". End with one finance term.

Close with "Pattern of the Day" - one insight connecting all three.

Format as clean HTML.`;

    const html = await callGeminiAPI(prompt);
    await sendEmail(html);
    console.log('Done!');
  } catch(error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
