// Professional E2E Encryption Implementation
// Based on Signal Protocol: X3DH + Double Ratchet
// Uses Web Crypto API for all cryptographic operations

// ===================== CONSTANTS =====================

const AES_GCM_PARAMS: AesKeyGenParams = { name: 'AES-GCM', length: 256 }
const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' }
const HKDF_PARAMS: HkdfParams = { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new Uint8Array(0) }

// ===================== X3DH (Extended Triple Diffie-Hellman) =====================
// Initial key agreement protocol

export interface X3DHKeyBundle {
  identityKey: string       // Long-term identity key (public)
  signedPreKey: string      // Medium-term signed pre-key (public)
  signedPreKeySignature: string
  oneTimePreKeys: string[]  // One-time pre-keys (public)
  registrationId: number
}

export interface X3DHKeyPair {
  identityKeyPair: CryptoKeyPair
  signedPreKeyPair: CryptoKeyPair
  signedPreKeySignature: ArrayBuffer
  oneTimePreKeyPairs: CryptoKeyPair[]
}

// Generate a full X3DH key bundle
export async function generateX3DHBundle(): Promise<{
  keyPair: X3DHKeyPair
  publicBundle: X3DHKeyBundle
}> {
  // Generate identity key pair (long-term)
  const identityKeyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits'])

  // Generate signed pre-key pair (medium-term)
  const signedPreKeyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits'])

  // Sign the signed pre-key with identity key
  const signature = await signPreKey(identityKeyPair.privateKey, await crypto.subtle.exportKey('raw', signedPreKeyPair.publicKey))

  // Generate one-time pre-keys
  const oneTimePreKeyPairs: CryptoKeyPair[] = []
  const oneTimePreKeys: string[] = []

  for (let i = 0; i < 10; i++) {
    const keyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits'])
    oneTimePreKeyPairs.push(keyPair)
    const exported = await crypto.subtle.exportKey('raw', keyPair.publicKey)
    oneTimePreKeys.push(bufferToBase64(exported))
  }

  const publicBundle: X3DHKeyBundle = {
    identityKey: bufferToBase64(await crypto.subtle.exportKey('raw', identityKeyPair.publicKey)),
    signedPreKey: bufferToBase64(await crypto.subtle.exportKey('raw', signedPreKeyPair.publicKey)),
    signedPreKeySignature: bufferToBase64(signature),
    oneTimePreKeys,
    registrationId: Math.floor(Math.random() * 16384),
  }

  return {
    keyPair: {
      identityKeyPair,
      signedPreKeyPair,
      signedPreKeySignature: signature,
      oneTimePreKeyPairs,
    },
    publicBundle,
  }
}

// Sign a pre-key with identity key
async function signPreKey(identityPrivateKey: CryptoKey, preKeyData: ArrayBuffer): Promise<ArrayBuffer> {
  const privateKey = await importOrGenerateSigningKey(identityPrivateKey)
  return crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, preKeyData)
}

// Import or generate a signing key from ECDH private key
async function importOrGenerateSigningKey(ecdhPrivateKey: CryptoKey): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.exportKey('raw', ecdhPrivateKey)
  return crypto.subtle.importKey('raw', rawKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

// ===================== DOUBLE RATCHET =====================

export interface RatchetState {
  // DH ratchet keys
  dhSendingKeyPair: CryptoKeyPair | null
  dhRemotePublicKey: CryptoKey | null

  // Chain keys
  sendingChainKey: CryptoKey | null
  receivingChainKey: CryptoKey | null

  // Root key
  rootKey: CryptoKey | null

  // Message counters
  sendingCounter: number
  receivingCounter: number
  previousSendingCounter: number

  // Skipped message keys (for out-of-order messages)
  skippedMessageKeys: Record<string, string>

  // Device ID
  remoteDeviceId: number
}

export interface RatchetMessage {
  dhPublicKey: string      // Current DH public key
  counter: number           // Message counter
  previousCounter: number   // Previous counter (for skipped messages)
  ciphertext: string        // Encrypted message
  iv: string                // AES-GCM IV
}

// Initialize a new Double Ratchet session (sender)
export async function initRatchetAsSender(
  sharedSecret: ArrayBuffer,
  remoteIdentityKey: string,
  remoteSignedPreKey: string,
  localIdentityKeyPair: CryptoKeyPair
): Promise<{ state: RatchetState; firstMessage: RatchetMessage }> {
  // Generate initial DH key pair
  const dhKeyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits'])

  // Import remote public key
  const remotePubKey = await crypto.subtle.importKey(
    'raw',
    base64ToBuffer(remoteSignedPreKey),
    ECDH_PARAMS,
    false,
    ['deriveKey', 'deriveBits']
  )

  // Perform DH
  const dhOutput = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: remotePubKey },
    dhKeyPair.privateKey,
    256
  )

  // Initialize root key with HKDF
  const rootKey = await initRootKey(sharedSecret, dhOutput)

  // Create initial state
  const state: RatchetState = {
    dhSendingKeyPair: dhKeyPair,
    dhRemotePublicKey: remotePubKey,
    sendingChainKey: null,
    receivingChainKey: null,
    rootKey,
    sendingCounter: 0,
    receivingCounter: 0,
    previousSendingCounter: 0,
    skippedMessageKeys: {},
    remoteDeviceId: 0,
  }

  // Derive sending chain key
  if (state.rootKey) {
    const chainKey = await deriveChainKey(state.rootKey, new TextEncoder().encode('sending'))
    state.sendingChainKey = chainKey.chainKey
    state.rootKey = chainKey.rootKey
  }

  // Send first message
  const firstMessage = await encryptWithRatchet(state, '')

  return { state, firstMessage }
}

// Initialize a new Double Ratchet session (receiver)
export async function initRatchetAsReceiver(
  sharedSecret: ArrayBuffer,
  remoteIdentityKey: string,
  remoteDhPublicKey: string,
  localIdentityKeyPair: CryptoKeyPair,
  localSignedPreKeyPair: CryptoKeyPair
): Promise<RatchetState> {
  // Import remote DH public key
  const remotePubKey = await crypto.subtle.importKey(
    'raw',
    base64ToBuffer(remoteDhPublicKey),
    ECDH_PARAMS,
    false,
    ['deriveKey', 'deriveBits']
  )

  // Perform DH with our signed pre-key
  const dhOutput = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: remotePubKey },
    localSignedPreKeyPair.privateKey,
    256
  )

  // Initialize root key
  const rootKey = await initRootKey(sharedSecret, dhOutput)

  // Create state
  const state: RatchetState = {
    dhSendingKeyPair: null,
    dhRemotePublicKey: remotePubKey,
    sendingChainKey: null,
    receivingChainKey: null,
    rootKey,
    sendingCounter: 0,
    receivingCounter: 0,
    previousSendingCounter: 0,
    skippedMessageKeys: {},
    remoteDeviceId: 0,
  }

  // Derive receiving chain key
  if (state.rootKey) {
    const chainKey = await deriveChainKey(state.rootKey, new TextEncoder().encode('receiving'))
    state.receivingChainKey = chainKey.chainKey
    state.rootKey = chainKey.rootKey
  }

  return state
}

// Encrypt a message with Double Ratchet
export async function encryptWithRatchet(
  state: RatchetState,
  plaintext: string
): Promise<RatchetMessage> {
  // Generate new DH key pair if needed
  if (!state.dhSendingKeyPair) {
    state.dhSendingKeyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits'])
  }

  // Derive message key from sending chain
  const messageKeyResult = await deriveMessageKey(state.sendingChainKey!, state.sendingCounter)
  const messageKey = messageKeyResult.messageKey

  // Encrypt with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    messageKey,
    encoded
  )

  // Get public key
  const pubKeyRaw = await crypto.subtle.exportKey('raw', state.dhSendingKeyPair.publicKey)

  const message: RatchetMessage = {
    dhPublicKey: bufferToBase64(pubKeyRaw),
    counter: state.sendingCounter,
    previousCounter: state.previousSendingCounter,
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
  }

  // Update counters
  state.previousSendingCounter = state.sendingCounter
  state.sendingCounter++

  return message
}

// Decrypt a message with Double Ratchet
export async function decryptWithRatchet(
  state: RatchetState,
  message: RatchetMessage,
  privateKeyBase64: string
): Promise<string> {
  // Import sender's DH public key
  const senderPubKey = await crypto.subtle.importKey(
    'raw',
    base64ToBuffer(message.dhPublicKey),
    ECDH_PARAMS,
    false,
    ['deriveKey', 'deriveBits']
  )

  // Check if we need to ratchet
  const remoteKeyChanged = !state.dhRemotePublicKey ||
    bufferToBase64(await crypto.subtle.exportKey('raw', state.dhRemotePublicKey)) !== message.dhPublicKey

  if (remoteKeyChanged) {
    // Store skipped message keys for current receiving chain
    if (state.receivingChainKey) {
      await storeSkippedMessageKeys(state, message.counter)
    }

    // Perform DH ratchet
    await performDHRatchet(state, senderPubKey, privateKeyBase64)

  // Derive receiving chain key for new DH pair
  if (state.rootKey) {
    const chainKey = await deriveChainKey(state.rootKey, new TextEncoder().encode('receiving'))
    state.receivingChainKey = chainKey.chainKey
    state.rootKey = chainKey.rootKey
    state.receivingCounter = 0
  }
  }

  // Check for skipped messages
  if (message.counter > state.receivingCounter) {
    // Store current key and advance
    await storeSkippedMessageKeys(state, message.counter)
  }

  // Derive message key
  const messageKeyResult = await deriveMessageKey(state.receivingChainKey!, message.counter)
  const messageKey = messageKeyResult.messageKey

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToBuffer(message.iv)) },
    messageKey,
    base64ToBuffer(message.ciphertext)
  )

  state.receivingCounter = Math.max(state.receivingCounter, message.counter + 1)

  return new TextDecoder().decode(decrypted)
}

// ===================== KEY DERIVATION =====================

// Initialize root key with HKDF
async function initRootKey(sharedSecret: ArrayBuffer, dhOutput: ArrayBuffer): Promise<CryptoKey> {
  const ikm = new Uint8Array([...new Uint8Array(sharedSecret), ...new Uint8Array(dhOutput)])

  // HKDF extract
  const prk = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(32), // salt
    { name: 'HKDF', hash: 'SHA-256' },
    false,
    ['deriveKey']
  )

  const rootKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('haven-ratchet-root') },
    prk,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'deriveKey', 'deriveBits']
  )

  return rootKey
}

// Derive chain key from root key
async function deriveChainKey(
  rootKey: CryptoKey,
  salt: Uint8Array
): Promise<{ chainKey: CryptoKey; rootKey: CryptoKey }> {
  const saltBuffer = new Uint8Array(salt).buffer as ArrayBuffer

  const derived = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: saltBuffer, info: new TextEncoder().encode('haven-chain') },
    rootKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'deriveKey', 'deriveBits']
  )

  return { chainKey: derived, rootKey: derived }
}

// Derive message key from chain key
async function deriveMessageKey(
  chainKey: CryptoKey,
  counter: number
): Promise<{ messageKey: CryptoKey; chainKey: CryptoKey }> {
  const counterBytes = new Uint8Array(8)
  new DataView(counterBytes.buffer).setBigUint64(0, BigInt(counter))
  const counterBuffer = counterBytes.buffer as ArrayBuffer

  const derived = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: counterBuffer, info: new TextEncoder().encode('haven-message') },
    chainKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return { messageKey: derived, chainKey: derived }
}

// Perform DH ratchet step
async function performDHRatchet(
  state: RatchetState,
  newRemotePublicKey: CryptoKey,
  privateKeyBase64: string
): Promise<void> {
  // Generate new DH key pair
  const newKeyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits'])

  // DH1: new remote public + old sending private
  if (state.dhSendingKeyPair && state.rootKey) {
    const dh1 = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: newRemotePublicKey },
      state.dhSendingKeyPair.privateKey,
      256
    )
    const rootKeyResult = await deriveChainKey(state.rootKey, new Uint8Array(dh1))
    state.rootKey = rootKeyResult.rootKey
  }

  // DH2: new local + new remote
  if (state.rootKey) {
    const dh2 = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: newRemotePublicKey },
      newKeyPair.privateKey,
      256
    )
    const rootKeyResult = await deriveChainKey(state.rootKey, new Uint8Array(dh2))
    state.rootKey = rootKeyResult.rootKey
  }

  state.dhSendingKeyPair = newKeyPair
  state.dhRemotePublicKey = newRemotePublicKey
}

// Store skipped message keys for out-of-order messages
async function storeSkippedMessageKeys(
  state: RatchetState,
  untilCounter: number
): Promise<void> {
  if (!state.receivingChainKey) return

  for (let i = state.receivingCounter; i < untilCounter; i++) {
    const key = await deriveMessageKey(state.receivingChainKey, i)
    state.skippedMessageKeys[`${i}`] = bufferToBase64(await crypto.subtle.exportKey('raw', key.messageKey))
  }
}

// ===================== AES-GCM FILE ENCRYPTION =====================

export async function encryptFileBuffer(
  fileBuffer: ArrayBuffer,
  recipientPublicKeyBase64: string
): Promise<{ encryptedData: string; encryptedKey: string; iv: string }> {
  const recipientPublicKey = await crypto.subtle.importKey(
    'raw',
    base64ToBuffer(recipientPublicKeyBase64),
    ECDH_PARAMS,
    false,
    ['deriveKey']
  )

  // Generate ephemeral key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits'])

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    256
  )

  // Derive AES key from shared secret using HKDF
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF', hash: 'SHA-256' },
    false,
    ['deriveKey']
  )

  const aesKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('haven-file-encryption') },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  // Encrypt file
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    fileBuffer
  )

  // Export ephemeral public key
  const ephemeralPubKey = await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey)

  return {
    encryptedData: bufferToBase64(encryptedContent),
    encryptedKey: bufferToBase64(ephemeralPubKey),
    iv: bufferToBase64(iv),
  }
}

export async function decryptFileBuffer(
  encryptedDataBase64: string,
  ephemeralPubKeyBase64: string,
  ivBase64: string,
  privateKeyBase64: string
): Promise<ArrayBuffer> {
  // Import keys
  const ephemeralPubKey = await crypto.subtle.importKey(
    'raw',
    base64ToBuffer(ephemeralPubKeyBase64),
    ECDH_PARAMS,
    false,
    ['deriveKey']
  )

  const privateKey = await crypto.subtle.importKey(
    'raw',
    base64ToBuffer(privateKeyBase64),
    ECDH_PARAMS,
    false,
    ['deriveKey', 'deriveBits']
  )

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: ephemeralPubKey },
    privateKey,
    256
  )

  // Derive AES key
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF', hash: 'SHA-256' },
    false,
    ['deriveKey']
  )

  const aesKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('haven-file-encryption') },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToBuffer(ivBase64)) },
    aesKey,
    base64ToBuffer(encryptedDataBase64)
  )

  return decrypted
}

// ===================== MESSAGE ENCRYPTION (Simple E2E) =====================

const RSA_KEY_PARAMS: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

// Generate RSA key pair for a user
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    RSA_KEY_PARAMS,
    true,
    ['encrypt', 'decrypt']
  )

  const pubKey = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const privKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

  return {
    publicKey: bufferToBase64(pubKey),
    privateKey: bufferToBase64(privKey),
  }
}

// Import RSA keys
async function importRSAPublicKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    base64ToBuffer(base64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  )
}

async function importRSAPrivateKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    base64ToBuffer(base64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  )
}

// Encrypt a message for a recipient
export async function encryptMessage(plaintext: string, recipientPublicKeyBase64: string): Promise<string> {
  const recipientPublicKey = await importRSAPublicKey(recipientPublicKeyBase64)

  // Generate a random AES key
  const aesKey = await crypto.subtle.generateKey(AES_GCM_PARAMS, true, ['encrypt', 'decrypt'])

  // Encrypt message with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoded
  )

  // Export AES key
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey)

  // Encrypt AES key with recipient's RSA public key
  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    rawAesKey
  )

  // Combine: encryptedAesKey (256 bytes) + iv (12 bytes) + encryptedContent
  const combined = new Uint8Array(
    encryptedAesKey.byteLength + iv.byteLength + encryptedContent.byteLength
  )
  combined.set(new Uint8Array(encryptedAesKey), 0)
  combined.set(iv, encryptedAesKey.byteLength)
  combined.set(new Uint8Array(encryptedContent), encryptedAesKey.byteLength + iv.byteLength)

  return bufferToBase64(combined.buffer)
}

// Decrypt a message with user's private key
export async function decryptMessage(encryptedBase64: string, senderPublicKeyBase64: string, privateKeyBase64: string): Promise<string> {
  try {
    const privateKey = await importRSAPrivateKey(privateKeyBase64)
    const combined = new Uint8Array(base64ToBuffer(encryptedBase64))

    const encryptedAesKey = combined.slice(0, 256)
    const iv = combined.slice(256, 268)
    const encryptedContent = combined.slice(268)

    // Decrypt AES key with RSA private key
    const rawAesKey = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedAesKey
    )

    // Import AES key
    const aesKey = await crypto.subtle.importKey(
      'raw',
      rawAesKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    // Decrypt content
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedContent
    )

    return new TextDecoder().decode(decrypted)
  } catch {
    return '⚠️ فشل فك التشفير'
  }
}

// Alias for encryptFileBuffer
export async function encryptFile(
  fileBuffer: ArrayBuffer,
  recipientPublicKeyBase64: string
): Promise<{ encryptedData: string; encryptedKey: string; iv: string }> {
  return encryptFileBuffer(fileBuffer, recipientPublicKeyBase64)
}

// Alias for decryptFileBuffer
export async function decryptFile(
  encryptedDataBase64: string,
  encryptedKeyBase64: string,
  ivBase64: string,
  privateKeyBase64: string
): Promise<ArrayBuffer> {
  return decryptFileBuffer(encryptedDataBase64, encryptedKeyBase64, ivBase64, privateKeyBase64)
}

// ===================== KEY MANAGEMENT =====================

// Store/retrieve keys from localStorage
export function storeKeys(userId: string, publicKey: string, privateKey: string) {
  localStorage.setItem(`haven_pk_${userId}`, publicKey)
  localStorage.setItem(`haven_sk_${userId}`, privateKey)
}

export function getStoredPublicKey(userId: string): string | null {
  return localStorage.getItem(`haven_pk_${userId}`)
}

export function getStoredPrivateKey(userId: string): string | null {
  return localStorage.getItem(`haven_sk_${userId}`)
}

export function hasStoredKeys(userId: string): boolean {
  return !!localStorage.getItem(`haven_sk_${userId}`)
}

// ===================== KEY ROTATION (Forward Secrecy) =====================

export async function rotateKeys(userId: string): Promise<{ publicKey: string; privateKey: string }> {
  const newKeys = await generateKeyPair()
  storeKeys(userId, newKeys.publicKey, newKeys.privateKey)

  await fetch('/api/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ publicKey: newKeys.publicKey, rotated: true }),
  })

  localStorage.setItem(`haven_key_rotation_${userId}`, Date.now().toString())
  return newKeys
}

export function shouldRotateKeys(userId: string): boolean {
  const lastRotation = localStorage.getItem(`haven_key_rotation_${userId}`)
  if (!lastRotation) return true
  const hours24 = 24 * 60 * 60 * 1000
  return Date.now() - parseInt(lastRotation, 10) > hours24
}

export function markKeysRotated(userId: string) {
  localStorage.setItem(`haven_key_rotation_${userId}`, Date.now().toString())
}

// ===================== HELPER FUNCTIONS =====================

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
