export type ServiceSection = {
  title: string;
  body?: string;
  items?: Array<{
    title: string;
    description?: string;
  }>;
};

export type Service = {
  order: number;
  slug: string;
  label: string;
  cardHeadline: string;
  preview: string;
  summary: string;
  detailDescription: string;
  tagline: string;
  accent: string;
  image: string;
  imageAlt?: string;
  imagePosition?: string;
  sections: ServiceSection[];
};

export type HomeService = Pick<
  Service,
  | 'order'
  | 'slug'
  | 'label'
  | 'cardHeadline'
  | 'preview'
  | 'summary'
  | 'detailDescription'
  | 'accent'
  | 'image'
  | 'imagePosition'
>;
