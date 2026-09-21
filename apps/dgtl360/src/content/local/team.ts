export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  image: string | null;
};

// User-supplied details. Photos are temporary dummy portraits, not the named people.
// Keep bios within 250 characters; do not infer roles from similarly named profiles.
export const teamMembers: TeamMember[] = [
  { name: 'Riz Razak', role: 'CEO & Founder', bio: 'Riz Razak is the CEO and founder of DGTL 360, a creative, technology and business solutions agency.', linkedin: 'https://www.linkedin.com/in/rizrazak/', image: '/assets/team/dummy-1.jpg' },
  { name: 'Lavanga Kapugamage', role: 'Digital Marketing Specialist', bio: 'Digital marketing specialist, content creator and social media strategist.', linkedin: 'https://www.linkedin.com/in/lavanga-kapugamage-a430b7216/', image: '/assets/team/dummy-2.jpg' },
  { name: 'Kasuni Madushika', role: 'Content Strategist', bio: 'Works across content strategy, personal branding, content creation, social media management, digital marketing, public relations and customer success.', linkedin: 'https://www.linkedin.com/in/kasuni-madushika-55a4871b0/', image: '/assets/team/dummy-3.jpg' },
  { name: 'Sunera Bandara', role: 'DGTL 360 Team', bio: '', linkedin: 'https://www.linkedin.com/in/sunera-bandara/', image: '/assets/team/dummy-4.jpg' },
  { name: 'Rehan Amaratunga', role: 'Business Development & Creative Analysis', bio: 'Works in business development and creative analysis.', linkedin: 'https://www.linkedin.com/in/rehan-amaratunga/', image: '/assets/team/dummy-5.jpg' },
  { name: 'Nipuna Janaranjana', role: 'AI/ML Developer', bio: 'AI/ML developer and AI programmer. Undergraduate at the University of Sri Jayawardenepura.', linkedin: 'https://www.linkedin.com/in/nipuna-janaranjana-936960285/', image: '/assets/team/dummy-6.jpg' },
  { name: 'Prasad Jayanga', role: 'Creative Expert', bio: 'Creative expert working across products, brands, content and digital marketing.', linkedin: 'https://www.linkedin.com/in/prasad-jayanga-34a58336/', image: '/assets/team/dummy-7.jpg' },
];
