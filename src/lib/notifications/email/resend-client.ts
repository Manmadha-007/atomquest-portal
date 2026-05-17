import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

// Create a single instance of the Resend client
// If the API key is missing (e.g., in local dev without the env var), it safely remains null
export const resend = apiKey ? new Resend(apiKey) : null;
