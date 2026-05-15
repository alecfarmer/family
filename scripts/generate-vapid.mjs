#!/usr/bin/env node
// Run once to generate VAPID keys for Web Push.
// Usage: node scripts/generate-vapid.mjs
// Paste the output into .env.local

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("# Paste these into .env.local");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=your-email@example.com`);
