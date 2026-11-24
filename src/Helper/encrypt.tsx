import CryptoJS from 'crypto-js';

// Get the secret key from env
const SECRET_KEY = import.meta.env.VITE_SECRET_KEY;

// Parse key and IV
const key = CryptoJS.enc.Hex.parse(SECRET_KEY);
const iv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000'); // 16-byte IV (all 0s for now)

// Encrypt and encode to URL-safe base64
function urlSafeBase64Encode<T>(data: T): string {
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        iv: iv,
    }).toString();

    return ciphertext.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Encrypt data normally
function encryptData<T>(data: T): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        iv: iv,
    }).toString();
}

export { encryptData, urlSafeBase64Encode };
