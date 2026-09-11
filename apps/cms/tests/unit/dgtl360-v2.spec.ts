import { describe, expect, it } from 'vitest'
import { mapBlock } from '../../src/services/public-api'
import { TeamShowcase } from '../../src/blocks'

const base = { blockType: 'teamShowcase', heading: 'Our team', instruction: 'Select a profile', kicker: 'The crew' }
const person = { number: '01', name: 'Test Person', role: 'Design', description: 'Designs useful websites.' }
const image = { id: 17, url: '/media/profile.jpg', alt: 'Profile', classification: 'public', scanStatus: 'clean', checksum: 'a'.repeat(64) }

describe('DGTL360 v2 team delivery', () => {
  it('delivers named profiles, validated links and tenant-scoped media', () => {
    const block = mapBlock({ ...base, members: [{ ...person, image, linkedin: 'https://www.linkedin.com/in/example/' }] }, 'client-02-main')
    expect(block).toMatchObject({ members: [{ ...person, linkedin: 'https://www.linkedin.com/in/example/', image: { alt: 'Profile', url: expect.stringContaining('/sites/client-02-main/media/17?v=') } }] })
  })
  it('keeps old profile documents valid without new optional fields or biography', () => {
    expect(mapBlock({ ...base, members: [{ number: '01', role: 'Engineering' }] }, 'client-02-main')).toMatchObject({ members: [{ number: '01', role: 'Engineering', description: '', image: null }] })
  })
  it.each(['javascript:alert(1)', 'http://linkedin.com/in/test/', 'https://linkedin.com.attacker.test/in/test/', 'https://user:password@www.linkedin.com/in/test/'])('omits unsafe profile URL %s', linkedin => {
    expect(mapBlock({ ...base, members: [{ ...person, linkedin }] }, 'client-02-main')).toMatchObject({ members: [{ linkedin: undefined }] })
  })
  it.each([{ classification: 'private-admin' }, { scanStatus: 'pending' }, { scanStatus: 'rejected' }])('hides nonpublic or unapproved portraits %j', restriction => {
    expect(mapBlock({ ...base, members: [{ ...person, image: { ...image, ...restriction } }] }, 'client-02-main')).toMatchObject({ members: [{ image: null }] })
  })
  it('models individual portraits as a media relationship, preserving existing tenant validation', () => {
    const members = TeamShowcase.fields.find(field => 'name' in field && field.name === 'members')
    expect(members && 'fields' in members && members.fields).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'image', type: 'upload', relationTo: 'media' })]))
  })
})
