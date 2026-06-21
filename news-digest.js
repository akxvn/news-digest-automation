#!/usr/bin/env node
const https = require('https');
const nodemailer = require('nodemailer');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;

if (!ANTHROPIC_API_KEY || !EMAIL_USER || !EMAIL_PASSWORD || !RECIPIENT_EMAIL) {
  console.error('Missing environment variables');
  process.exit(1);
}

async function callClaudeAPI(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [{role: 'user', content: prompt}]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
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
          resolve(response.content[0].text);
        } catch(e) { reject(e); }
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
    const prompt = `Scan web for latest 24-48 hours news. Create HTML email with today's date and intro.

SECTION 1: India Startup & VC News - 4-6 stories (funding, IPOs, acquisitions). Each: headline + 2-3 sentence summary + "why it matters". End with one finance term explained with example.

SECTION 2: India Macro News - 4-6 stories (RBI, SEBI, policy, trade, GST). Each: headline + 2-3 sentence summary + "why it matters". End with one finance term explained.

SECTION 3: Global Macro News - 4-6 stories (US Fed, VC trends, geopolitics, capital flows). Each: headline + 2-3 sentence summary + "why it matters". End with one finance term explained.

Close with "Pattern of the Day" - one insight connecting all three sections.

Format as clean HTML with CSS styling.`;

    const html = await callClaudeAPI(prompt);
    console.log('Sending email...');
    await sendEmail(html);
    console.log('Done!');
  } catch(error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
