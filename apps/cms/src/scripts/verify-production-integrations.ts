import { randomUUID } from 'node:crypto'

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

import { getEmailAdapter } from '../services/email'
import { inspectUploadedMedia } from '../services/malware-scan'
import { getMediaStorageConfiguration } from '../services/media-storage'

const required = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the production integration test.`)
  return value
}

const assertProduction = () => {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('NODE_ENV=production is required for the production integration test.')
  }
}

const verifyEmail = async () => {
  const recipient = required('PRODUCTION_INTEGRATION_TEST_RECIPIENT').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error('PRODUCTION_INTEGRATION_TEST_RECIPIENT must be a valid email address.')
  }

  const adapter = getEmailAdapter()
  if (!adapter) throw new Error('The production email adapter is unavailable.')
  const transport = adapter({ payload: undefined as never })
  const result = await transport.sendEmail({
    html: '<p>DGTL CMS production integration verification succeeded.</p>',
    subject: 'DGTL CMS production integration verification',
    text: 'DGTL CMS production integration verification succeeded.',
    to: recipient,
  })

  if (!result || typeof result !== 'object' || !('id' in result)) {
    throw new Error('Resend did not return a delivery identifier.')
  }
  console.log('PASS: Resend accepted the production verification email.')
}

const verifyObjectStorage = async () => {
  const configuration = getMediaStorageConfiguration()
  if (configuration.kind !== 's3') throw new Error('Production media storage must use S3-compatible storage.')

  const client = new S3Client({
    credentials: {
      accessKeyId: configuration.accessKeyID,
      secretAccessKey: configuration.secretAccessKey,
    },
    endpoint: configuration.endpoint,
    forcePathStyle: configuration.forcePathStyle,
    region: configuration.region,
  })
  const key = `_production-readiness/${randomUUID()}.txt`
  const content = `DGTL CMS storage verification ${new Date().toISOString()}`

  try {
    await client.send(
      new PutObjectCommand({
        Body: content,
        Bucket: configuration.bucket,
        ContentType: 'text/plain; charset=utf-8',
        Key: key,
      }),
    )
    const object = await client.send(
      new GetObjectCommand({ Bucket: configuration.bucket, Key: key }),
    )
    const returned = await object.Body?.transformToString()
    if (returned !== content) throw new Error('Object storage returned different bytes than were uploaded.')
    console.log('PASS: private S3-compatible media storage accepted and returned test bytes.')
  } finally {
    await client.send(new DeleteObjectCommand({ Bucket: configuration.bucket, Key: key }))
    client.destroy()
  }
}

const verifyClamAV = async () => {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const clean = Buffer.concat([pngSignature, Buffer.from('DGTL CMS harmless scanner verification')])
  await inspectUploadedMedia(clean, 'image/png')

  // EICAR is the antivirus industry's harmless detection test pattern.
  const eicar = Buffer.from(
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
    'ascii',
  )
  let rejected = false
  try {
    await inspectUploadedMedia(Buffer.concat([pngSignature, eicar]), 'image/png')
  } catch (error) {
    rejected = error instanceof Error && error.message.includes('rejected by the malware scanner')
  }
  if (!rejected) throw new Error('ClamAV did not reject the EICAR verification payload.')
  console.log('PASS: ClamAV accepted a harmless file and rejected the EICAR test payload.')
}

const main = async () => {
  assertProduction()
  await verifyObjectStorage()
  await verifyClamAV()
  await verifyEmail()
  console.log('Production email, media storage, and antivirus integration checks passed.')
}

await main()
