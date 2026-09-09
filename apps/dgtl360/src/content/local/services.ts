import type { Service } from '../../features/services/types/service.types';

export const services: Service[] = [
  {
    order: 1,
    slug: 'production',
    label: 'Production',
    cardHeadline: 'Hear it first. See it through.',
    preview: 'Sound + Vision',
    summary:
      'We build every production as one connected piece—sound, image and edit developed together, not stitched together after the fact. Composition, filming, photography and post-production stay tied to the same creative idea, from first take to final delivery.',
    detailDescription:
      'Production covers everything created in sound and colour. On the audio side, that includes original music, jingles, voiceovers and podcast production. Through visual, it’s TVCs, music videos, digital ads, corporate films, branded content, live productions and photography. This is all shaped through creative development before a frame is shot. Once it’s captured, post-production brings it together with motion graphics, animation, VFX, colour grading and AI-assisted content work.',
    tagline: 'Sound + Vision',
    accent: '#ff5c35',
    image: '/assets/services/production-v01.webp',
    imagePosition: '50% 50%',
    sections: [
      {
        title: 'Audio Production',
        body: 'Everything sound: original song production and mastering, catchy brand jingles, IVR phone recordings, multi-language voiceovers, and complete podcast recording and editing.',
      },
      {
        title: 'Video Production',
        body: 'Everything filmed: TV commercials, music videos, social media ads, company videos, brand stories, live event streams, and script-to-concept development.',
      },
      {
        title: 'Photography',
        body: 'Everything shot: ad campaign imagery, e-commerce product photos, lifestyle visual shoots, and live event coverage.',
      },
      {
        title: 'Motion & Post',
        body: 'Everything edited: 2D motion graphics, 3D animation, visual effects (VFX), video editing, cinematic color grading, and AI-powered content generation.',
      },
    ],
  },
  {
    order: 2,
    slug: 'brand-strategy',
    label: 'Branding & Strategy',
    cardHeadline: 'Find the idea. Build the system.',
    preview: 'Identity + System',
    summary:
      'Found the idea? Let’s build it into a distinctive identity. Positioning, naming, design and go-to-market decisions stay connected together.',
    detailDescription:
      'Branding & Strategy is where a business becomes its own unique brand. Starting with positioning, we find the right idea that makes your brand genuinely different. We build that into an identity through logo design, brand systems and artwork creation. We also connect it to a go-to-market plan covering trade marketing and business 0–1 foundations, so naming, messaging and launch all stay tied to the same strategic idea.',
    tagline: 'Identity + System',
    accent: '#2350ff',
    image: '/assets/services/brand-strategy-v01.webp',
    imagePosition: '50% 50%',
    sections: [
      {
        title: 'Brand Strategy',
        body: 'Positioning, target audience, brand purpose, values and messaging.',
      },
      {
        title: 'Brand Identity',
        body: 'Logo, colour palette, typography and visual direction.',
      },
      {
        title: 'Creative Development',
        body: 'Developing creative concepts, campaign ideas and visual content.',
      },
      {
        title: 'Campaign Strategy',
        body: 'Big ideas, campaign concepts and communication.',
      },
      {
        title: 'Brand Collateral',
        body: 'Business cards, presentations, packaging, menus, brochures, etc.',
      },
      {
        title: 'Trade Marketing',
        body: 'POSM, retail campaigns, in-store communication and activations.',
      },
      {
        title: 'Business 0–1 Solutions',
        body: 'Taking an idea from concept to launch, including brand, strategy and initial marketing setup.',
      },
    ],
  },
  {
    order: 3,
    slug: 'digital-marketing',
    label: 'Digital Marketing',
    cardHeadline: 'Digital Marketing',
    preview: 'Digital Marketing',
    summary: 'Digital Marketing.',
    detailDescription:
      'Digital Marketing covers how your brand shows up online, how well it performs and what happens once it’s live. That means digital and social media strategy, content creation across audio, video and graphics, day-to-day platform handling, targeted social and Google advertising, influencer partnerships, website design and development, and SEO—all working toward the same purpose.',
    tagline: 'Digital Marketing',
    accent: '#ff2d9a',
    image: '/assets/services/social-growth-v01.webp',
    imagePosition: '50% 50%',
    sections: [
      { title: 'Digital Marketing Strategy', body: 'No guesswork, just a clear plan! We build smart digital strategies that help your brand reach the right people and grow online.' },
      { title: 'Social Media Strategy', body: 'Good social media doesn’t happen by accident! A solid strategy keeps your brand moving, your content fresh and relevant, and your audience interested.' },
      { title: 'Content Creation', body: 'There’s a LOT of content out there. So how do you get people to stop scrolling and notice yours? That’s where we come in, turning your ideas into eye-catching content that sparks curiosity, tells your story, and keeps your brand in all the right places.' },
      { title: 'Social Media Platform Handling', body: 'You focus on your business, we’ll handle the socials! From planning and posting to engaging with your audience, we keep your platforms active, relevant, and on trend.' },
      { title: 'Social Media Advertising', body: 'It’s not just about putting money behind a post! We use your ad budget strategically, creating targeted campaigns that reach the right audience and drive real results. From awareness to leads and conversions, every ad spend counts.' },
      { title: 'Google Advertising', body: 'Smart targeting, the right placements, and campaigns built around what your brand wants to achieve, not just more clicks.' },
      { title: 'Influencer Marketing', body: 'Good brands deserve the right voices! We connect you with the right creators and build smart influencer campaigns. From the first conversation to the final post, we make sure everything comes together just right.' },
      { title: 'Website Design & Development', body: 'Your website is your digital home. Let’s make it a good one! We create modern, user-friendly websites that look great and work even better.' },
      { title: 'Search Engine Optimization', body: 'Getting found shouldn’t be left to luck! From keywords and content to website performance, we focus on what helps search engines understand your brand and reach the right people. Building your visibility naturally, one search at a time.' },
    ],
  },
  {
    order: 4,
    slug: 'web-platforms',
    label: 'Web Development',
    cardHeadline: 'Built to work. Built to last.',
    preview: 'Build + Manage',
    summary:
      'We develop the systems your business runs on, not just the site your customers see. Full-stack builds, CMS platforms and CRM workflows are designed together, so what’s under the hood holds up as well as what’s on the surface.',
    detailDescription:
      'Web Development covers the systems a business actually runs on. This is not just the site customers see, but full-stack development handled front to back, CMS solutions for easy ongoing content control, and CRM and workflow integration that keeps customer systems and business processes moving in sync.',
    tagline: 'Build + Manage',
    accent: '#ff9f1c',
    image: '/assets/services/web-platforms-v01.webp',
    imagePosition: '50% 50%',
    sections: [
      {
        title: 'Full Stack Development',
        body: 'From the first click to the backend logic behind it, we build websites and apps that work seamlessly, end to end, so nothing falls through the cracks.',
      },
      {
        title: 'CMS Solutions',
        body: 'Your content, your control. We build easy-to-manage systems so you can update your site anytime, without waiting on a developer.',
      },
      {
        title: 'CRM & Workflows',
        body: 'Less chasing, more closing. We set up smart systems that track your customers and automate the busywork, so your team can focus on what matters.',
      },
    ],
  },
  {
    order: 5,
    slug: 'apps-product',
    label: 'App Development',
    cardHeadline: 'One idea. Every platform.',
    preview: 'Build + Operate',
    summary:
      'We take an app from its initial sprint to the first screen it is intended to run on. Agile development, native builds and DevOps support stay connected end-to-end, so your product ships fast, runs smoothly and keeps working long after first use.',
    detailDescription:
      'App Development covers building and running a product end to end. Agile development augmented with bespoke AI tools, native iOS and Android builds plus progressive web apps for reaching every platform, and ongoing DevOps support keep everything running smoothly long after launch.',
    tagline: 'Build + Operate',
    accent: '#ff6247',
    image: '/assets/services/apps-product-v01.webp',
    imagePosition: '50% 50%',
    sections: [
      {
        title: 'Agile Development',
        body: 'Built in sprints, not guesswork. We move fast, adapt quickly, and keep you in the loop every step of the way.',
      },
      {
        title: 'iOS & Android Development',
        body: 'One idea, every device. We build native apps that feel right at home on iPhone and Android alike.',
      },
      {
        title: 'Progressive Web Apps (PWA)',
        body: 'All the feel of an app, none of the download. Fast, reliable, and works even when the connection doesn’t.',
      },
      {
        title: 'DevOps Augmentation',
        body: 'The engine behind the scenes. We keep your systems deploying smoothly, scaling safely, and running without the 3am surprises.',
      },
    ],
  },
  {
    order: 6,
    slug: 'business-systems',
    label: 'Digital Services',
    cardHeadline: 'Every touchpoint. One system.',
    preview: 'Service + Scale',
    summary:
      'We build the digital infrastructure behind the customer experience. POS, call centre, HR and enterprise systems are designed to work together, giving your business one connected foundation for digital workability.',
    detailDescription:
      'Digital Services covers the operational systems behind customer experiences. That includes POS systems for smooth, reliable transactions and customer service call centre solutions that keep support responsive at any volume. HRM solutions simplify people management from onboarding onward, while enterprise solutions are custom-fit for businesses operating at scale.',
    tagline: 'Service + Scale',
    accent: '#0a7f5a',
    image: '/assets/services/business-systems-v01.webp',
    imagePosition: '50% 50%',
    sections: [
      {
        title: 'POS Systems',
        body: 'Checkout that just works. Fast, reliable point-of-sale systems built to keep your business moving, one sale at a time.',
      },
      {
        title: 'Customer Service Call Center Solutions',
        body: 'Every call matters. We build systems that help your team respond faster, stay organized, and keep customers happy.',
      },
      {
        title: 'HRM Solutions',
        body: 'People are the heart of your business. We simplify hiring, payroll, and everyday HR, so your team can focus on people, not paperwork.',
      },
      {
        title: 'Enterprise Solutions',
        body: 'Big vision, solid foundation. Custom systems built to scale with you as your business grows.',
      },
    ],
  },
  {
    order: 7,
    slug: 'events-experiences',
    label: 'Events & Experiences',
    cardHeadline: 'The idea. The room. The moment.',
    preview: 'Concept + Production',
    summary:
      'We build events the same way we build brands—concept first, then everything needed to bring it into a room. Corporate, wedding, private and custom productions stay tied to one creative direction, from first plan to the last guest out the door.',
    detailDescription:
      'Events & Experiences covers everything from corporate functions and weddings to private celebrations and fully custom productions, handling concept through execution. Corporate events span conferences, seminars, AGMs, award ceremonies, retreats and gala dinners. Weddings can run from concept and planning through coordination and destination celebrations. Private and social events include birthdays, anniversaries, themed and surprise events, alongside larger community, cultural and festival experiences. When nothing fits a category, custom solutions cover event strategy, staging, AV production, entertainment booking, logistics and post-event reporting.',
    tagline: 'Concept + Production',
    accent: '#8d33ff',
    image: '/assets/services/events-experiences-v01.webp',
    imagePosition: '50% 50%',
    sections: [
      {
        title: 'Corporate Events',
        body: 'Work events don’t always have to feel like work.\n\nFrom conferences and AGMs to award nights, team days, retreats and celebrations, we bring the whole thing together—the idea, the space, the people, the production and all the little details in between.\n\nWhatever gets your team, partners or people in the same room, we make it worth showing up for.',
        items: [
          { title: 'Conferences' },
          { title: 'Seminars & Workshops' },
          { title: 'Annual General Meetings (AGMs)' },
          { title: 'Award Ceremonies' },
          { title: 'Corporate Celebrations' },
          { title: 'Dealer & Partner Events' },
          { title: 'Family Days' },
          { title: 'Team Building' },
          { title: 'Retreats' },
          { title: 'Gala Dinners' },
        ],
      },
      { title: 'Private Events', body: 'Birthdays, anniversaries, engagements, surprise parties or just a good reason to get everyone together—each one can be as simple, loud, themed or completely unexpected as you want it to be.' },
      { title: 'Social Events', body: 'People show up for what they’re into.\n\nMusic, culture, sport, a cause, a community or simply meeting new people—social events can take many forms. The idea, programming, space, entertainment, production and everything around it are built to give people a reason to come, stay and be part of it.' },
      { title: 'Weddings', body: 'Your wedding should feel like you, not like every other wedding.\n\nFrom the first idea to the day itself, every detail comes together around your story—the concept, venue, décor, invites, entertainment, photography, film and everything happening behind the scenes.\n\nYour people. Your kind of celebration. Done your way.\n\nWhatever brings the crowd together, let’s make something out of it.' },
      { title: 'Custom Event Solutions', body: 'Not every event fits into a category—and it doesn’t have to.\n\nCome with a full brief, half an idea or something that hasn’t been done before. Strategy, creative, planning, production, tech, talent, content and everything in between can be built around what the event actually needs.\n\nNo fixed formula. Just the right pieces, put together for the right reason.' },
    ],
  },
  {
    order: 8,
    slug: 'agentic-systems',
    label: 'Agentic Biz Systems',
    cardHeadline: 'Trained to think. Built to act.',
    preview: 'Agents + Automation',
    summary:
      'We design AI systems that do real work inside your business, not just answer questions. Agents, automation and integration are built as one connected layer, so the technology plugs into how your team already operates.',
    detailDescription:
      'Agentic Biz Systems covers AI that actually works inside a business: autonomous AI agents and agentic workflows that automate multi-step processes end to end. Automation solutions take repetitive work off a team’s plate, while integration services connect AI cleanly into existing systems. Everything is built to support people’s work rather than replace it.',
    tagline: 'Agents + Automation',
    accent: '#00aee8',
    image: '/assets/services/agentic-systems-v01.webp',
    imagePosition: '50% 50%',
    sections: [
      {
        title: 'Autonomous AI Agents',
        body: 'Work that happens on its own. We build AI agents that think, decide, and act, handling tasks without needing someone to babysit every step.',
      },
      {
        title: 'Agentic Workflows',
        body: 'Your processes, running themselves. We connect AI agents into your everyday workflows so tasks move forward automatically, from start to finish.',
      },
      {
        title: 'AI Automation Solutions',
        body: 'Fewer repetitive tasks, more real work. We automate the busywork with AI, so your team can spend time on what actually moves the needle.',
      },
      {
        title: 'AI Integration Services',
        body: 'AI that fits right in. We plug intelligent tools into the systems you already use, no rip-and-replace, just smarter versions of what you have.',
      },
      {
        title: 'Agentic Employee Augmentation',
        body: 'An extra set of hands that never clocks out. We pair your team with AI agents that handle the routine work, so your people can focus on the bigger picture.',
      },
    ],
  },
];

export function getService(slug: string) {
  return services.find((service) => service.slug === slug) ?? null;
}
